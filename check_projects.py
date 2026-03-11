
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.product import Product
from app.models.offer import Offer
from app.models.quotation import Quotation

db = SessionLocal()
try:
    print("Listing last 5 projects:")
    projects = db.query(Project).order_by(Project.created_at.desc()).limit(5).all()
    for p in projects:
        prod_count = db.query(Product).filter(Product.project_id == p.id).count()
        print(f"ID: {p.id} | Name: {p.name} | Status: {p.status} | Products: {prod_count} | Error: {p.pdf_filename}")
    
    # Check for specific errors in logs if possible
    # (Assuming we can't read stderr easily, we look at the DB state)
    
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
