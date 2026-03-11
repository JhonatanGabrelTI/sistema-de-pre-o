from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL, 
    pool_pre_ping=False, # Removido para ganhar velocidade (evita query extra de ping)
    pool_size=15, # Aumentado levemente para manter conexões quentes
    max_overflow=25,
    pool_recycle=3600, # Manter conexões por mais tempo (1 hora)
    pool_timeout=30 
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
