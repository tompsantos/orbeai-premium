from fastapi.testclient import TestClient

from app.main import app


def test_healthcheck() -> None:
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["status"] == "healthy"


def test_v1_status() -> None:
    client = TestClient(app)
    response = client.get("/v1/status")

    assert response.status_code == 200
    assert response.json()["ok"] is True
