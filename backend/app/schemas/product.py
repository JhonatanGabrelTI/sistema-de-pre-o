from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ProductResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    quantity: int
    status: str
    margin: float
    min_price: Optional[float] = None
    best_marketplace: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProductStatusUpdate(BaseModel):
    status: str  # APPROVED, DISCARDED, PENDING


class ProductMarginUpdate(BaseModel):
    margin: float


class BulkMarginUpdate(BaseModel):
    margin: float
    product_ids: Optional[List[str]] = None  # None = apply to all
