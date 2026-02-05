from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "data", "scripts.db")
DB_PATH = os.getenv("DB_PATH", DEFAULT_DB_PATH)
if DB_PATH != ":memory:":
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
else:
    SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
