from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class QuotationItem(BaseModel):
    id: str
    product_name: str
    quantity: int
    cost: float
    margin: float
    suggested_price: float
    product_url: Optional[str] = None

    class Config:
        from_attributes = True


class QuotationResponse(BaseModel):
    project_id: str
    project_name: str
    items: List[QuotationItem]
    total_cost: float
    total_suggested: float
    created_at: datetime
