from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.product import Product
from app.schemas.product import ProductResponse, ProductStatusUpdate, ProductMarginUpdate, BulkMarginUpdate
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/products", tags=["Products"])


def _verify_product_ownership(product_id: str, current_user: User, db: Session) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    project = db.query(Project).filter(
        Project.id == product.project_id,
        Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=403, detail="Acesso negado")

    return product


@router.get("/project/{project_id}", response_model=List[ProductResponse])
def list_products(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify project ownership
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    products = db.query(Product).filter(
        Product.project_id == project_id
    ).order_by(Product.created_at).all()

    # Calculate min price for each product
    response = []
    for p in products:
        best_offer = None
        if p.offers:
            best_offer = min(p.offers, key=lambda o: o.price)
        
        response.append(
            ProductResponse(
                id=str(p.id),
                project_id=str(p.project_id),
                name=p.name,
                description=p.description,
                quantity=p.quantity,
                status=p.status,
                margin=p.margin,
                min_price=best_offer.price if best_offer else None,
                best_marketplace=best_offer.marketplace if best_offer else None,
                created_at=p.created_at,
            )
        )
    return response


@router.patch("/{product_id}/status", response_model=ProductResponse)
def update_status(
    product_id: str,
    data: ProductStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.status not in ("PENDING", "APPROVED", "DISCARDED"):
        raise HTTPException(status_code=400, detail="Status inválido")

    product = _verify_product_ownership(product_id, current_user, db)
    product.status = data.status
    db.commit()
    db.refresh(product)

    return ProductResponse(
        id=str(product.id),
        project_id=str(product.project_id),
        name=product.name,
        description=product.description,
        quantity=product.quantity,
        status=product.status,
        margin=product.margin,
        created_at=product.created_at,
    )


@router.patch("/{product_id}/margin", response_model=ProductResponse)
def update_margin(
    product_id: str,
    data: ProductMarginUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = _verify_product_ownership(product_id, current_user, db)
    product.margin = data.margin
    db.commit()
    db.refresh(product)

    return ProductResponse(
        id=str(product.id),
        project_id=str(product.project_id),
        name=product.name,
        description=product.description,
        quantity=product.quantity,
        status=product.status,
        margin=product.margin,
        created_at=product.created_at,
    )


@router.post("/project/{project_id}/bulk-margin")
def bulk_update_margin(
    project_id: str,
    data: BulkMarginUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    query = db.query(Product).filter(Product.project_id == project_id)
    if data.product_ids:
        query = query.filter(Product.id.in_(data.product_ids))

    updated = query.update({Product.margin: data.margin}, synchronize_session="fetch")
    db.commit()

    return uid

@router.delete("/{product_id}")
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = _verify_product_ownership(product_id, current_user, db)
    db.delete(product)
    db.commit()
    return {"detail": "Produto removido com sucesso"}

