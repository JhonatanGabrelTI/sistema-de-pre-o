import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, projects, products, offers, quotations

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
def dashboard_stats():
    """Basic dashboard statistics endpoint."""
    from app.database import SessionLocal
    from app.models.project import Project
    from app.models.product import Product
    from app.models.offer import Offer

    db = SessionLocal()
    try:
        total_projects = db.query(Project).count()
        total_products = db.query(Product).count()
        total_offers = db.query(Offer).count()
        approved = db.query(Product).filter(Product.status == "APPROVED").count()

        return {
            "total_projects": total_projects,
            "total_products": total_products,
            "total_offers": total_offers,
            "approved_products": approved,
        }
    finally:
        db.close()
