
import pytest
import os

# Set DB_PATH to memory to avoid creating file during import of main
os.environ["DB_PATH"] = ":memory:"
os.environ["ALLOW_X_USER_ID"] = "1"
os.environ["ENVIRONMENT"] = "test"
os.environ["ADMIN_USER_IDS"] = "admin-owner"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from database import Base
from main import app
from dependencies import get_db

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    """Returns an sqlalchemy session, and after the test tears down everything properly."""
    Base.metadata.create_all(bind=engine)
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    if transaction.is_active:
        transaction.rollback()
    session.close()
    connection.close()
    # Extra safety: clear all rows after each test so data can never leak
    # across test cases even if a path bypasses the shared transaction.
    with engine.begin() as cleanup_conn:
        cleanup_conn.exec_driver_sql("PRAGMA foreign_keys=OFF")
        for table in Base.metadata.tables.values():
            cleanup_conn.execute(table.delete())
        cleanup_conn.exec_driver_sql("PRAGMA foreign_keys=ON")

from database import get_db as database_get_db

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            # Let the db_session fixture handle cleanup to avoid
            # deassociating the transaction before rollback.
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[database_get_db] = override_get_db
    with TestClient(app) as c:
        yield c
        app.dependency_overrides.clear()
