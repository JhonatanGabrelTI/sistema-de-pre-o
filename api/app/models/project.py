import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    pdf_filename = Column(String, nullable=True)
    pdf_raw_text = Column(Text, nullable=True)
    status = Column(String, default="PROCESSING")  # PROCESSING, READY, COMPLETED
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="projects")
    products = relationship("Product", back_populates="project", cascade="all, delete-orphan")
