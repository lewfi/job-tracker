import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base
from app.api.deps import get_db

# SQLite in-memory database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

# Create test engine
test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
# Create test session factory
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Define fixture
@pytest.fixture(scope="function")
def client():
    # Create all database tables
    Base.metadata.create_all(bind=test_engine)

    # Define override for get_db
    def override_get_db():
        db = TestSessionLocal()
        try:
            yield db
        finally:
            db.close()

    # Apply the override
    app.dependency_overrides[get_db] = override_get_db

    # Create and yield test client
    with TestClient(app) as c:
        yield c

    # Teardown
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()