import math
from typing import List
from app.schemas.offer import MarketStats


def calculate_market_stats(prices: List[float]) -> MarketStats:
    """Calculate market intelligence statistics from a list of prices."""
    if not prices:
        return MarketStats(
            min_price=0, max_price=0, avg_price=0,
            std_deviation=0, price_variation_pct=0, total_offers=0
        )

    n = len(prices)
    min_price = min(prices)
    max_price = max(prices)
    avg_price = sum(prices) / n

    # Standard deviation
    if n > 1:
        variance = sum((p - avg_price) ** 2 for p in prices) / (n - 1)
        std_deviation = math.sqrt(variance)
    else:
        std_deviation = 0.0

    # Price variation percentage
    if min_price > 0:
        price_variation_pct = ((max_price - min_price) / min_price) * 100
    else:
        price_variation_pct = 0.0

    return MarketStats(
        min_price=round(min_price, 2),
        max_price=round(max_price, 2),
        avg_price=round(avg_price, 2),
        std_deviation=round(std_deviation, 2),
        price_variation_pct=round(price_variation_pct, 2),
        total_offers=n,
    )
