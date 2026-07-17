from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_model_providers_list() -> None:
    response = client.get("/v1/model-providers")

    assert response.status_code == 200

    providers = response.json()
    slugs = {provider["slug"] for provider in providers}

    assert "mock" in slugs
    assert "openai" in slugs
    assert "gemini" in slugs
    assert "qwen" in slugs
    assert "groq" in slugs
    assert "local" in slugs

    mock = next(provider for provider in providers if provider["slug"] == "mock")

    assert mock["status"] == "online"
    assert mock["api_key_status"] == "configurado"
    assert "orbe-mock-v0" in mock["models"]
