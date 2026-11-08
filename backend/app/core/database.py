from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL
# Ensure SQLAlchemy uses psycopg2 driver
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgresql+psycopg://"):
    db_url = db_url.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit = False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db():
    if not db_url:
        print("⚠️ DATABASE_URL is empty. Skipping DB initialization.", flush=True)
        return

    # Attempt to enable vector extension (cloud DBs like Supabase often already have it)
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()
            print("✅ Vector extension verified.", flush=True)
    except Exception as e:
        print(f"ℹ️ Note on vector extension check: {e}", flush=True)

    # Attempt to create tables
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created/verified successfully!", flush=True)
    except Exception as e:
        print(f"⚠️ Warning: Database table creation encountered an issue: {e}", flush=True)
        print("⚠️ Server will continue running. Verify your DATABASE_URL in Render if DB requests fail.", flush=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()