from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.product import Product
from app.models.offer import Offer
from app.schemas.offer import OfferResponse, MarketStats
from app.services.marketplace_service import search_marketplace_prices, search_additional_offer, search_and_save_offers
from app.services.stats_service import calculate_market_stats
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/offers", tags=["Offers"])


@router.post("/search/{product_id}", response_model=List[OfferResponse])
async def search_offers(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    # Verify ownership
    project = db.query(Project).filter(
        Project.id == product.project_id,
        Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=403, detail="Acesso negado")

    # Search marketplaces
    offers_data = await search_marketplace_prices(product.name)

    # Save offers
    created_offers = []
    for o in offers_data:
        offer = Offer(
            product_id=product.id,
            marketplace=o["marketplace"],
            title=o["title"],
            price=o["price"],
            shipping=o["shipping"],
            delivery_days=o["delivery_days"],
            seller_rating=o["seller_rating"],
            url=o["url"],
        )
        db.add(offer)
        created_offers.append(offer)

    db.commit()

    return [
        OfferResponse(
            id=str(o.id),
            product_id=str(o.product_id),
            marketplace=o.marketplace,
            title=o.title,
            price=o.price,
            shipping=o.shipping,
            delivery_days=o.delivery_days,
            seller_rating=o.seller_rating,
            url=o.url,
            created_at=o.created_at,
        )
        for o in created_offers
    ]


@router.get("/{product_id}", response_model=List[OfferResponse])
def get_offers(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    offers = db.query(Offer).filter(
        Offer.product_id == product_id
    ).order_by(Offer.price).all()

    return [
        OfferResponse(
            id=str(o.id),
            product_id=str(o.product_id),
            marketplace=o.marketplace,
            title=o.title,
            price=o.price,
            shipping=o.shipping,
            delivery_days=o.delivery_days,
            seller_rating=o.seller_rating,
            url=o.url,
            created_at=o.created_at,
        )
        for o in offers
    ]


@router.get("/{product_id}/stats", response_model=MarketStats)
def get_market_stats(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offers = db.query(Offer).filter(Offer.product_id == product_id).all()
    prices = [o.price for o in offers]
    return calculate_market_stats(prices)


@router.post("/{product_id}/another", response_model=OfferResponse)
async def get_another_offer(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    offer_data = await search_additional_offer(product.name)

    offer = Offer(
        product_id=product.id,
        marketplace=offer_data["marketplace"],
        title=offer_data["title"],
        price=offer_data["price"],
        shipping=offer_data["shipping"],
        delivery_days=offer_data["delivery_days"],
        seller_rating=offer_data["seller_rating"],
        url=offer_data["url"],
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)

    return OfferResponse(
        id=str(offer.id),
        product_id=str(offer.product_id),
        marketplace=offer.marketplace,
        title=offer.title,
        price=offer.price,
        shipping=offer.shipping,
        delivery_days=offer.delivery_days,
        seller_rating=offer.seller_rating,
        url=offer.url,
        created_at=offer.created_at,
    )


@router.post("/search-all/{project_id}")
async def search_all_products(
    project_id: str,
    force: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    if force:
        # Delete all existing offers for products in this project to allow a fresh start
        from app.models.product import Product
        product_ids = db.query(Product.id).filter(Product.project_id == project_id).all()
        id_list = [str(p_id[0]) for p_id in product_ids]
        db.query(Offer).filter(Offer.product_id.in_(id_list)).delete(synchronize_session=False)
        db.commit()

    total_offers = await search_and_save_offers(project_id, db)
    return {"detail": f"Busca concluída: {total_offers} ofertas encontradas"}
