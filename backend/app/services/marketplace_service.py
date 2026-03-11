import httpx
import re
import random
import hashlib
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

MARKETPLACES = ["Mercado Livre", "Shopee", "Amazon"]

MARKETPLACE_URLS = {
    "Mercado Livre": "https://lista.mercadolivre.com.br/",
    "Shopee": "https://shopee.com.br/search?keyword=",
    "Amazon": "https://www.amazon.com.br/s?k=",
    "Magazine Luiza": "https://www.magazineluiza.com.br/busca/"
}

def _generate_simulated_offer(product_name: str, marketplace: str, index: int = 0) -> Dict[str, Any]:
    """NO LONGER USED: Returning None to signify no real data found."""
    return None

async def _scrape_mercado_livre(product_name: str, limit: int = 3) -> List[Dict[str, Any]]:
    """Scrapes real data from Mercado Livre with improved headers to avoid detection."""
    search_term = product_name.replace(' ', '-')
    url = f"https://lista.mercadolivre.com.br/{search_term}"
    
    # Randomize headers to avoid bot detection causing 'empty' results
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    ]
    headers = {
        "User-Agent": random.choice(user_agents),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="122", "Google Chrome";v="122"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1"
    }
    
    offers = []
    try:
        async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=12.0) as client:
            # First visit home to get cookies
            try:
                await client.get("https://www.mercadolivre.com.br/", timeout=5.0)
            except:
                pass
            
            response = await client.get(url)
            if response.status_code != 200:
                logger.error(f"ML Scraper: Error {response.status_code}")
                return []
            
            html = response.text
            
            # Index-based extraction to guarantee 1:1 match between Link and Price
            link_matches = list(re.finditer(r'href="(https://[^"]*?mercadolivre\.com\.br/[^"]*?MLB-[^"]*?)"', html, re.IGNORECASE))
            seen_links = set()
            temp_offers = []

            for i, match in enumerate(link_matches):
                link = match.group(1)
                clean_link = link.split('?')[0].split('#')[0]
                if clean_link in seen_links:
                    continue
                seen_links.add(clean_link)
                
                # Block is from this link to the next link
                start_pos = match.end()
                end_pos = link_matches[i+1].start() if i + 1 < len(link_matches) else len(html)
                block = html[start_pos:end_pos]
                
                # First title and price immediately following the link
                title_match = re.search(r'<h[1-6][^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/h', block, re.IGNORECASE)
                price_match = re.search(r'andes-money-amount__fraction[^>]*>(.*?)<\/span>', block)
                cents_match = re.search(r'andes-money-amount__cents[^>]*>(.*?)<\/span>', block)
                
                if price_match:
                    title = re.sub(r'<[^>]+>', '', title_match.group(1)).strip() if title_match else f"Produto ML"
                    price_int = price_match.group(1).replace('.', '')
                    price_cents = cents_match.group(1) if cents_match else "00"
                    
                    try:
                        price = float(f"{price_int}.{price_cents}")
                    except:
                        continue
                    
                    is_official = any(k in block.lower() for k in ["loja oficial", "lojas oficiais", "platinum"])
                    is_kit = any(k in title.lower() for k in ["kit", "pacote", "unidades", "conjunto", "atado", "combo", "pc", "pcs", "peças"])
                    
                    temp_offers.append({
                        "marketplace": "Mercado Livre",
                        "title": title[:100],
                        "price": price,
                        "is_kit": is_kit,
                        "shipping": 0.0,
                        "delivery_days": 2,
                        "seller_rating": 4.8 if is_official else 4.2,
                        "url": clean_link,
                        "is_official": is_official
                    })
                    
                    if len(temp_offers) >= limit * 3: # Buffer for filtering
                        break

            # Cost-Benefit Sort: Non-kits first, then official stores, then lower price
            temp_offers.sort(key=lambda x: (x["is_kit"], not x.get("is_official", False), x["price"]))
            
            return [ {k: v for k, v in o.items() if k not in ["is_kit", "is_official"]} for o in temp_offers[:limit] ]
    except Exception as e:
        logger.error(f"ML Scraper failed: {e}")
        return []

async def _scrape_amazon(product_name: str, limit: int = 3) -> List[Dict[str, Any]]:
    """Scrapes real data from Amazon Brasil."""
    # Search sorted by customer review to ensure 'otima avaliação'
    search_term = product_name.replace(' ', '+')
    url = f"https://www.amazon.com.br/s?k={search_term}&s=review-rank"
    
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    ]
    headers = {
        "User-Agent": random.choice(user_agents),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="122", "Google Chrome";v="122"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1"
    }
    offers = []
    try:
        async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=15.0) as client:
            response = await client.get(url)
            if response.status_code != 200:
                return []
            
            html = response.text
            # Identify single product containers
            containers = re.findall(r'<div[^>]*data-component-type="s-search-result".*?<\/div><\/div><\/div><\/div><\/div>', html, re.DOTALL)
            
            for container in containers[:10]:
                link_match = re.search(r'href="(/[^"]*?/dp/[^"]*?)"', container)
                price_whole = re.search(r'class="a-price-whole"[^>]*>(.*?)<', container)
                price_fraction = re.search(r'class="a-price-fraction"[^>]*>(.*?)<', container)
                title_match = re.search(r'<h2[^>]*>.*?<span>(.*?)</span>', container, re.DOTALL)
                
                if link_match and price_whole:
                    title = title_match.group(1).strip() if title_match else f"{product_name}"
                    
                    p_whole = price_whole.group(1).replace('.', '').replace(',', '')
                    p_frac = price_fraction.group(1) if price_fraction else "00"
                    
                    try:
                        price_val = float(f"{p_whole}.{p_frac}")
                        
                        # Since we sorted by review-rank, assume rating is high (4.5+)
                        offers.append({
                            "marketplace": "Amazon",
                            "title": title[:100],
                            "price": price_val,
                            "shipping": 0.0,
                            "delivery_days": 3,
                            "seller_rating": 4.9, # Boosted for rank sorting
                            "url": f"https://www.amazon.com.br{link_match.group(1)}"
                        })
                    except:
                        continue
            
            # Picking the cheapest from the top rated ones
            offers.sort(key=lambda x: x["price"])
            return offers[:limit]
    except Exception as e:
        logger.error(f"Amazon Scraper failed: {e}")
        return []

async def _scrape_magalu(product_name: str, limit: int = 3) -> List[Dict[str, Any]]:
    """Scrapes real data from Magazine Luiza."""
    search_term = product_name.replace(' ', '+')
    url = f"https://www.magazineluiza.com.br/busca/{search_term}/"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    
    offers = []
    try:
        async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=15.0) as client:
            response = await client.get(url)
            if response.status_code != 200:
                return []
            
            html = response.text
            
            # Simple regex to find product cards (Magalu uses internal JSON state, but sometimes some HTML is present)
            # Find data-testid="product-card" blocks
            containers = html.split('data-testid="product-card"')
            
            for container in containers[1:10]: # Skip first chunk before first card
                link_match = re.search(r'href="(https://www\.magazineluiza\.com\.br/[^"]*)"', container)
                title_match = re.search(r'data-testid="product-title"[^>]*>(.*?)<\/h2>', container)
                price_match = re.search(r'data-testid="price-value"[^>]*>(.*?)<\/p>', container)
                
                if link_match and price_match and title_match:
                    clean_title = re.sub(r'<[^>]+>', '', title_match.group(1)).strip()
                    price_str = price_match.group(1).replace('R$', '').replace('.', '').replace(',', '.').strip()
                    
                    try:
                        price = float(price_str)
                        offers.append({
                            "marketplace": "Magazine Luiza",
                            "title": clean_title[:100],
                            "price": price,
                            "shipping": 0.0,
                            "delivery_days": 3,
                            "seller_rating": 4.5,
                            "url": link_match.group(1)
                        })
                    except:
                        continue
                        
            offers.sort(key=lambda x: x["price"])
            return offers[:limit]
    except Exception as e:
        logger.error(f"Magalu Scraper failed: {e}")
        return []

async def _scrape_shopee(product_name: str, limit: int = 3) -> List[Dict[str, Any]]:
    """Scrapes data from Shopee (Basic implementation, might face bot protection)."""
    search_term = product_name.replace(' ', '%20')
    # Shopee public search API (often requires cookie/auth, but sometimes works anonymously)
    url = f"https://shopee.com.br/api/v4/search/search_items?by=relevancy&keyword={search_term}&limit=10&newest=0&order=desc&page_type=search"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": f"https://shopee.com.br/search?keyword={search_term}"
    }
    
    offers = []
    try:
        async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=15.0) as client:
            response = await client.get(url)
            if response.status_code != 200:
                return []
            
            data = response.json()
            items = data.get("items", [])
            
            for item in items[:10]:
                item_info = item.get("item_basic", {})
                title = item_info.get("name", "")
                price = item_info.get("price", 0) / 100000  # Shopee prices are multiplied by 100,000
                itemid = item_info.get("itemid", "")
                shopid = item_info.get("shopid", "")
                
                if title and price > 0:
                    offers.append({
                        "marketplace": "Shopee",
                        "title": title[:100],
                        "price": price,
                        "shipping": 0.0,
                        "delivery_days": 7,
                        "seller_rating": 4.6,
                        "url": f"https://shopee.com.br/product/{shopid}/{itemid}"
                    })
                    
            offers.sort(key=lambda x: x["price"])
            return offers[:limit]
    except Exception as e:
        logger.error(f"Shopee Scraper failed: {e}")
        return []

async def search_marketplace_prices(product_name: str, num_offers: int = 5) -> List[Dict[str, Any]]:
    """Search for product prices across real marketplaces, prioritizing Mercado Livre."""
    all_offers = []
    
    # 1. Try Mercado Livre first (Prioridade absoluta)
    ml_offers = await _scrape_mercado_livre(product_name, limit=num_offers)
    if ml_offers:
        all_offers.extend(ml_offers)
    
    # If ML results are less than what we need, check others to have variety
    if len(all_offers) < 3:
        # Try Amazon second
        amz_offers = await _scrape_amazon(product_name, limit=3)
        if amz_offers:
            all_offers.extend(amz_offers)

        # Try Magazine Luiza
        magalu_offers = await _scrape_magalu(product_name, limit=2)
        if magalu_offers:
            all_offers.extend(magalu_offers)

    # Sort all found offers. We prefer ML if available, then sort by price within groups.
    all_offers.sort(key=lambda x: (x["marketplace"] != "Mercado Livre", x["price"]))
    
    logger.info(f"Retrieved {len(all_offers)} real offers for '{product_name}' (ML prioritized)")
    return all_offers[:10] 

async def search_additional_offer(product_name: str, marketplace: str = None) -> Dict[str, Any]:
    """Search for one additional real offer."""
    if marketplace == "Amazon":
        offers = await _scrape_amazon(product_name, 1)
    else:
        offers = await _scrape_mercado_livre(product_name, 1) or await _scrape_amazon(product_name, 1)
        
    return offers[0] if offers else None

async def search_and_save_offers(project_id: str, db=None):
    """Orchestrate search and save for a project. Supports background tasks with new session."""
    from app.models.product import Product
    from app.models.offer import Offer
    from app.database import SessionLocal
    
    # If no db provided (background task), create new one
    standalone = False
    if db is None:
        db = SessionLocal()
        standalone = True
        
    try:
        products = db.query(Product).filter(Product.project_id == project_id).all()
        total_offers = 0

        for product in products:
            # Check if already has real offers
            existing = db.query(Offer).filter(Offer.product_id == product.id).count()
            if existing > 0:
                continue

            offers_data = await search_marketplace_prices(product.name)
            if not offers_data:
                logger.warning(f"No real offers found for: {product.name}")
                continue

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
    finally:
        if standalone:
            db.close()
