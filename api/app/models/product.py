import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    numero_lote = Column(String, nullable=True)
    unidade_medida = Column(String, nullable=True)
    valor_unitario_estimado = Column(Float, nullable=True)
    valor_total_estimado = Column(Float, nullable=True)
    quantity = Column(Integer, default=1)
    status = Column(String, default="PENDING")  # PENDING, APPROVED, DISCARDED
    margin = Column(Float, default=30.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="products")
    offers = relationship("Offer", back_populates="product", cascade="all, delete-orphan")
    quotation = relationship("Quotation", back_populates="product", uselist=False, cascade="all, delete-orphan")
