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

TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "testpassword123"


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Define fixture
@pytest.fixture(scope="function")
def client():
    # Create all database tables
    Base.metadata.create_all(bind=test_engine)

    # Apply the override
    app.dependency_overrides[get_db] = override_get_db

    # Create and yield test client, pre-authenticated as a fixed test user so
    # existing tests (written before auth existed) keep working unmodified
    with TestClient(app) as c:
        register_response = c.post(
            "/auth/register",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        )
        token = register_response.json()["access_token"]
        c.headers["Authorization"] = f"Bearer {token}"
        yield c

    # Teardown
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def unauthenticated_client():
    # For auth-flow tests that need a client with no pre-set Authorization header
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()
