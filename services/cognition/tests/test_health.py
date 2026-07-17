from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["service"] == "orbe-cognition"


def test_capabilities_in_development_without_key() -> None:
    response = client.get("/v1/capabilities")

    assert response.status_code == 200
    payload = response.json()
    assert payload["hermes_core"] is True
    assert payload["streaming"] is True
    assert payload["stop"] is True
    assert payload["approvals"] is True
