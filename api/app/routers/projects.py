from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import logging
from app.database import get_db, SessionLocal

logger = logging.getLogger(__name__)
from app.models.user import User
from app.models.project import Project
from app.models.product import Product
from app.schemas.project import ProjectResponse, ProjectListResponse
from app.services.pdf_service import (
    extract_text_from_pdf, 
    parse_products_from_text,
    parse_products_from_pdf_vision
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/projects", tags=["Projects"])


def extraction_is_valid(extracao) -> bool:
    """Helper to check if extraction result is valid."""
    return hasattr(extracao, 'documento_valido') and extracao.documento_valido and extracao.lotes

async def process_pdf_background(project_id: str, file_bytes: bytes, pages_config: str = None):
    """Executado em segundo plano para extrair dados com IA sem travar a interface."""
    db: Session = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return

        # 1. Tenta extrair texto padrão (agora no background para velocidade)
        raw_text = extract_text_from_pdf(file_bytes)
        project.pdf_raw_text = raw_text
        db.commit()
        
        # 2. Se falhar ou for muito curto, usa VISION
        if not raw_text or len(raw_text) < 100:
            logger.info(f"PDF {project_id} sem texto. Ativando GPT-4o Vision OCR...")
            extracao = parse_products_from_pdf_vision(file_bytes)
        else:
            # Parse products via LLM (Texto)
            extracao = parse_products_from_text(raw_text)
        
        if not extraction_is_valid(extracao):
            # Document is invalid or empty
            project.status = "ERROR" # Ou outro status de erro que preferir
            db.commit()
            return
            
        for lote in extracao.lotes:
            lote_num = str(lote.numero_lote) if lote.numero_lote else None
            for item in lote.itens:
                product = Product(
                    project_id=project.id,
                    numero_lote=lote_num,
                    name=f"Item {item.numero_item} - {item.descricao}" if item.numero_item else item.descricao,
                    description=item.descricao,
                    quantity=int(item.quantidade) if item.quantidade else 1,
                    unidade_medida=item.unidade_medida,
                    valor_unitario_estimado=item.valor_unitario_estimado,
                    valor_total_estimado=item.valor_total_estimado
                )
                db.add(product)

        project.status = "READY"
        db.commit()
        db.refresh(project)
        
        # Busca automática no ML/Shopee em segundo plano
        from app.services.marketplace_service import search_and_save_offers
        await search_and_save_offers(str(project.id), db)
        
    except Exception as e:
        logger.error(f"Erro fatal processando PDF background do projeto {project_id}: {e}")
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if project:
                project.status = "ERROR"
                db.commit()
        except:
            pass
    finally:
        db.close()


@router.post("/upload", response_model=ProjectResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    name: str = Form("Novo Projeto"),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são aceitos")

    file_bytes = await file.read()
    if len(file_bytes) > 50 * 1024 * 1024:  # Set to 50MB for application-level limit
        raise HTTPException(status_code=400, detail="Arquivo muito grande (máximo permitido: 50MB)")

    # Cria o projeto como "PROCESSING" IMEDIATAMENTE
    # Sem extrair texto agora para não travar a conexão
    project = Project(
        user_id=current_user.id,
        name=name,
        pdf_filename=file.filename,
        pdf_raw_text="", # Será preenchido no background
        status="PROCESSING",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Manda todo o processamento para o background
    if background_tasks:
        background_tasks.add_task(process_pdf_background, str(project.id), file_bytes)

    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        pdf_filename=project.pdf_filename,
        status=project.status,
        created_at=project.created_at,
        product_count=0,
    )


@router.post("/manual", response_model=ProjectResponse)
async def upload_manual(
    name: str = Form("Projeto Manual"),
    product_name: str = Form(...),
    quantity: int = Form(1),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Create project
    project = Project(
        user_id=current_user.id,
        name=name,
        pdf_filename="Manual Input",
        pdf_raw_text=f"{product_name} - {quantity} un",
        status="PROCESSING",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Create manual product
    product = Product(
        project_id=project.id,
        name=product_name,
        quantity=quantity,
    )
    db.add(product)

    project.status = "READY"
    db.commit()
    db.refresh(project)

    # Automatic search in background to not block the response
    from app.services.marketplace_service import search_and_save_offers
    if background_tasks:
        background_tasks.add_task(search_and_save_offers, str(project.id), db)

    product_count = db.query(Product).filter(Product.project_id == project.id).count()

    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        pdf_filename=project.pdf_filename,
        status=project.status,
        created_at=project.created_at,
        product_count=product_count,
    )


@router.get("", response_model=ProjectListResponse)
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import func
    
    # FIX: Group By to avoid N+1 count queries
    projects_with_counts = db.query(
        Project,
        func.count(Product.id).label("product_count")
    ).outerjoin(
        Product, Project.id == Product.project_id
    ).filter(
        Project.user_id == current_user.id
    ).group_by(
        Project.id
    ).order_by(
        Project.created_at.desc()
    ).all()

    items = []
    for p, count in projects_with_counts:
        items.append(ProjectResponse(
            id=str(p.id),
            name=p.name,
            pdf_filename=p.pdf_filename,
            status=p.status,
            created_at=p.created_at,
            product_count=count,
        ))

    return ProjectListResponse(projects=items, total=len(items))


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    count = db.query(Product).filter(Product.project_id == project.id).count()

    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        pdf_filename=project.pdf_filename,
        status=project.status,
        created_at=project.created_at,
        product_count=count,
    )


@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    db.delete(project)
    db.commit()
    return {"detail": "Projeto removido com sucesso"}
