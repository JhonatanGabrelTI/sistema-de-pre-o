import httpx
import re
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


async def _scrape_mercado_livre(product_name: str, limit: int = 3) -> List[Dict[str, Any]]:
    """Scrapes real data from Mercado Livre public search."""
    url = f"https://lista.mercadolivre.com.br/{product_name.replace(' ', '-')}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    offers = []
    try:
        async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code != 200:
                logger.error(f"ML Scraper: Error {response.status_code}")
                return []
            
            html = response.text
            
            # Heuristic 'link-first' approach: Find product links and prices anywhere
            # Product links typically contain 'MLB-' (Mercado Livre Brasil)
            # Prices are often near the text/title
            
            # 1. Find all product links
            product_links = re.findall(r'href="(https://[^"]*?mercadolivre\.com\.br/[^"]*?MLB-[^"]*?)"', html, re.IGNORECASE)
            # 2. Find all prices
            prices = re.findall(r'andes-money-amount__fraction[^>]*>(.*?)<\/span>', html)
            # 3. Find all titles (loosely)
            titles = re.findall(r'<h[1-6][^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/h', html, re.IGNORECASE)

            # Zip them together as best as possible
            temp_offers = []
            for i in range(min(len(product_links), len(prices), 10)): # Check more to filter
                title = re.sub(r'<[^>]+>', '', titles[i]).strip() if i < len(titles) else f"Produto {i+1}"
                price_str = prices[i].replace('.', '')
                price = float(f"{price_str}.00")
                
                # Kit detection: Often items with "kit", "pacote", "unidades", "conjunto" are MUCH more expensive
                is_kit = any(k in title.lower() for k in ["kit", "pacote", "unidades", "conjunto", "atado", "combo"])
                
                temp_offers.append({
                    "marketplace": "Mercado Livre",
                    "title": title,
                    "price": price,
                    "is_kit": is_kit,
                    "shipping": 0.0,
                    "delivery_days": 2,
                    "seller_rating": 4.5,
                    "url": product_links[i]
                })

            # Preference logic:
            # 1. Non-kits first
            # 2. Lower prices first (usually means unit vs bundle)
            temp_offers.sort(key=lambda x: (x["is_kit"], x["price"]))
            
            offers = []
            for o in temp_offers[:limit]:
                del o["is_kit"] # Remove temp field
                offers.append(o)

            return offers
    except Exception as e:
        logger.error(f"ML Scraper failed: {e}")
        return []

async def search_marketplace_prices(product_name: str, num_offers: int = 3) -> List[Dict[str, Any]]:
    """Search for product prices across all marketplaces.
    
    Attempts to scrape real data from Mercado Livre, falls back to simulation for others or if scraping fails.
    """
    offers = []
    
    # Try real scraping for ML
    ml_offers = await _scrape_mercado_livre(product_name, num_offers)
    if ml_offers:
        offers.extend(ml_offers)
    else:
        # Fallback for ML if scraping failed
        for i in range(num_offers):
            offers.append(_generate_simulated_offer(product_name, "Mercado Livre", i))
    
    # Current simulation for others (to be expanded)
    for marketplace in ["Shopee", "Amazon"]:
        for i in range(num_offers):
            offers.append(_generate_simulated_offer(product_name, marketplace, i))
    
    logger.info(f"Retrieved {len(offers)} offers for '{product_name}'")
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
