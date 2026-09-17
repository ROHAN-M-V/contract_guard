import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.database.seed_data import seed_demo_data

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_contract_guard.db"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_demo_data(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        login_response = test_client.post(
            "/api/v1/auth/login",
            json={
                "email": "auditor@contractguard.gov",
                "password": "AuditGuard2026!",
            },
        )
        test_client.headers.update(
            {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        )
        yield test_client
    app.dependency_overrides.clear()
