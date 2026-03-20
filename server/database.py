from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "data", "scripts.db")
DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()
DB_PATH = os.getenv("DB_PATH", DEFAULT_DB_PATH)


def _resolve_sqlalchemy_url() -> str:
    if DATABASE_URL:
        return DATABASE_URL

    if DB_PATH != ":memory:":
        db_dir = os.path.dirname(DB_PATH)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
        return f"sqlite:///{DB_PATH}"
    return "sqlite://"


SQLALCHEMY_DATABASE_URL = _resolve_sqlalchemy_url()
IS_SQLITE = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

engine_kwargs = {"pool_pre_ping": True}
if IS_SQLITE:
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, **engine_kwargs
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
