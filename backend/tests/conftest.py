import asyncio
import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ENVIRONMENT"] = "test"
os.environ["AUTH_MODE"] = "development"
os.environ["KNOWLEDGE_PROVIDER"] = "mock"
os.environ["EMBEDDING_PROVIDER"] = "mock"
os.environ["MODEL_PROVIDER"] = "mock"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.db.base import Base  # noqa: E402
from app.db.session import get_db, make_engine  # noqa: E402
from app.main import create_app  # noqa: E402
from app.services.storage.local import LocalStorageService, get_storage  # noqa: E402
from app.workers.processing import run_once  # noqa: E402


@pytest.fixture
def factory():
    engine = make_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)
    yield factory
    engine.dispose()


@pytest.fixture
def client(factory, tmp_path):
    app = create_app()

    def test_db():
        with factory() as db:
            try:
                yield db
                db.commit()
            except Exception:
                db.rollback()
                raise

    storage = LocalStorageService(tmp_path / "storage", "/api/v1")
    app.dependency_overrides[get_db] = test_db
    app.dependency_overrides[get_storage] = lambda: storage
    with TestClient(app) as client:
        yield client


@pytest.fixture
def course(client):
    response = client.post(
        "/api/v1/courses", json={"title": "Study skills", "description": "A demo course"}
    )
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def processed_course(client, course, factory):
    response = client.post(f"/api/v1/courses/{course['id']}/process")
    assert response.status_code == 202
    assert asyncio.run(run_once(factory))
    job = client.get(f"/api/v1/jobs/{response.json()['id']}").json()
    assert job["status"] == "completed"
    return course
