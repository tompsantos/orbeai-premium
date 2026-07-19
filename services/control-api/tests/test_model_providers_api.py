from fastapi.testclient import TestClient

from app.main import app
from app.routers import model_providers as model_providers_router

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


def test_model_profiles_endpoint_is_disabled_by_default() -> None:
    response = client.get("/v1/model-providers/profiles")

    assert response.status_code == 404
    assert response.json() == {"detail": "Model profiles are disabled"}


def test_model_profiles_endpoint_exposes_only_registered_models(monkeypatch) -> None:
    monkeypatch.setattr(
        model_providers_router,
        "is_feature_enabled",
        lambda **kwargs: kwargs["key"] in {"router_model_profiles", "real_providers"},
    )

    response = client.get("/v1/model-providers/profiles")

    assert response.status_code == 200
    profiles = response.json()
    slugs = [profile["provider_slug"] for profile in profiles]

    assert slugs == ["openai", "gemini", "nvidia", "mock"]
    assert "anthropic" not in slugs
    assert "qwen" not in slugs
    assert all(profile["profile_version"] == "model-profile-v1" for profile in profiles)
    assert all(profile["context_window_tokens"] is None for profile in profiles)
    assert all(profile["data_policy"] == "not_validated" for profile in profiles)
    assert all("key_hint" not in profile for profile in profiles)
    assert all("credential_source" not in profile for profile in profiles)
