from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.product import Product
from app.schemas.project import ProjectResponse, ProjectListResponse
from app.services.pdf_service import extract_text_from_pdf, parse_products_from_text
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/projects", tags=["Projects"])


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
    if len(file_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Arquivo muito grande (máx 10MB)")

    # Extract text
    raw_text = extract_text_from_pdf(file_bytes)

    # Create project
    project = Project(
        user_id=current_user.id,
        name=name,
        pdf_filename=file.filename,
        pdf_raw_text=raw_text,
        status="PROCESSING",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Parse products
    products_data = parse_products_from_text(raw_text)

    for prod_name, qty in products_data:
        product = Product(
            project_id=project.id,
            name=prod_name,
            quantity=qty,
        )
        db.add(product)

    project.status = "READY"
    db.commit()
    db.refresh(project)

    # Automatic search in background to not block the response
    from app.services.marketplace_service import search_and_save_offers
    if background_tasks:
        # Passing None tells search_and_save_offers to create its own stable DB session
        background_tasks.add_task(search_and_save_offers, str(project.id), None)

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
    projects = db.query(Project).filter(
        Project.user_id == current_user.id
    ).order_by(Project.created_at.desc()).all()

    items = []
    for p in projects:
        count = db.query(Product).filter(Product.project_id == p.id).count()
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
