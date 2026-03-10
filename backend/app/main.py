import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, get_db
from app.models.base import Base
from app.models.user import User
from app.routers import auth, projects, products, offers, quotations
from fastapi import Depends
from sqlalchemy.orm import Session
from app.routers.auth import get_current_user

# Import all models so they register with Base
from app.models import user, project, product, offer, quotation  # noqa: F401

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Preço Inteligente API",
    description="Plataforma de cotação inteligente de preços",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

# Register routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(products.router)
app.include_router(offers.router)
app.include_router(quotations.router)


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "Preço Inteligente API"}


@app.get("/api/dashboard/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dashboard statistics endpoint scoped to the current user."""
    from app.models.project import Project
    from app.models.product import Product
    from app.models.offer import Offer

    try:
        # User's projects
        user_projects = db.query(Project.id).filter(Project.user_id == current_user.id).subquery()
        total_projects = db.query(Project).filter(Project.user_id == current_user.id).count()

        # User's products
        user_products = db.query(Product.id).filter(Product.project_id.in_(user_projects)).subquery()
        total_products = db.query(Product).filter(Product.project_id.in_(user_projects)).count()

        # User's offers
        total_offers = db.query(Offer).filter(Offer.product_id.in_(user_products)).count()

        # User's approved products
        approved = db.query(Product).filter(
            Product.project_id.in_(user_products),
            Product.status == "APPROVED"
        ).count()

        return {
            "total_projects": total_projects,
            "total_products": total_products,
            "total_offers": total_offers,
            "approved_products": approved,
        }
    except Exception as e:
        return {"total_projects": 0, "total_products": 0, "total_offers": 0, "approved_products": 0}
