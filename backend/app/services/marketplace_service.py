import random
import hashlib
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Simulated marketplace data — ready to be replaced with real API calls
MARKETPLACES = ["Mercado Livre", "Shopee", "Amazon"]

MARKETPLACE_URLS = {
    "Mercado Livre": "https://www.mercadolivre.com.br/busca?q=",
    "Shopee": "https://shopee.com.br/search?keyword=",
    "Amazon": "https://www.amazon.com.br/s?k=",
}


def _generate_simulated_price(product_name: str, marketplace: str) -> float:
    """Generate a deterministic but realistic simulated price based on product name."""
    seed = hashlib.md5(f"{product_name}:{marketplace}".encode()).hexdigest()
    base = int(seed[:8], 16) % 500 + 20  # Range 20-520
    variation = (int(seed[8:12], 16) % 100) / 100  # 0-0.99
    return round(base + variation * 50, 2)


def _generate_simulated_offer(product_name: str, marketplace: str, index: int = 0) -> Dict[str, Any]:
    """Generate a single simulated marketplace offer."""
    seed_str = f"{product_name}:{marketplace}:{index}"
    seed = hashlib.md5(seed_str.encode()).hexdigest()
    
    base_price = _generate_simulated_price(product_name, marketplace)
    price_variation = (int(seed[:4], 16) % 30 - 15) / 100  # -15% to +15%
    price = round(base_price * (1 + price_variation), 2)
    
    shipping = round((int(seed[4:8], 16) % 50), 2) if int(seed[8:10], 16) % 3 != 0 else 0.0
    delivery_days = int(seed[10:12], 16) % 15 + 1
    seller_rating = round(3.5 + (int(seed[12:14], 16) % 15) / 10, 1)
    
    search_query = product_name.replace(" ", "+")
    url = f"{MARKETPLACE_URLS[marketplace]}{search_query}"
    
    titles = [
        f"{product_name} - Oferta {marketplace}",
        f"{product_name} Original - Envio Rápido",
        f"{product_name} - Melhor Preço",
        f"{product_name} Premium - Garantia",
    ]
    title_idx = int(seed[14:16], 16) % len(titles)
    
    return {
        "marketplace": marketplace,
        "title": titles[title_idx],
        "price": price,
        "shipping": shipping,
        "delivery_days": delivery_days,
        "seller_rating": min(seller_rating, 5.0),
        "url": url,
    }


async def search_marketplace_prices(product_name: str, num_offers: int = 3) -> List[Dict[str, Any]]:
    """Search for product prices across all marketplaces.
    
    Currently uses simulated data. Replace with real API calls when available.
    
    To integrate real APIs:
    1. Mercado Livre: Use official MeLi API (https://developers.mercadolivre.com.br)
    2. Shopee: Use Shopee Open Platform API
    3. Amazon: Use Product Advertising API (PAAPI)
    
    Each integration should return the same dict structure:
    {marketplace, title, price, shipping, delivery_days, seller_rating, url}
    """
    offers = []
    
    for marketplace in MARKETPLACES:
        for i in range(num_offers):
            offer = _generate_simulated_offer(product_name, marketplace, i)
            offers.append(offer)
    
    logger.info(f"Generated {len(offers)} simulated offers for '{product_name}'")
    return offers


async def search_additional_offer(product_name: str, marketplace: str = None) -> Dict[str, Any]:
    """Search for one additional offer (triggered by 'Outra oferta' button)."""
    mp = marketplace or random.choice(MARKETPLACES)
    index = random.randint(10, 99)
    return _generate_simulated_offer(product_name, mp, index)

async def search_and_save_offers(project_id: str, db):
    """Refactored logic to search and save offers for an entire project."""
    from app.models.product import Product
    from app.models.offer import Offer
    
    products = db.query(Product).filter(Product.project_id == project_id).all()
    total_offers = 0

    for product in products:
        # Skip if already has offers
        existing = db.query(Offer).filter(Offer.product_id == product.id).count()
        if existing > 0:
            continue

        offers_data = await search_marketplace_prices(product.name)
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
            total_offers += 1

    db.commit()
    return total_offers
