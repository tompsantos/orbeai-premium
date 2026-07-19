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


def test_model_profiles_endpoint_exposes_registered_models_and_telemetry(monkeypatch) -> None:
    monkeypatch.setattr(
        model_providers_router,
        "is_feature_enabled",
        lambda **kwargs: kwargs["key"] in {"router_model_profiles", "real_providers"},
    )

    response = client.get("/v1/model-providers/profiles?window_days=7")

    assert response.status_code == 200
    profiles = response.json()
    profiles_by_slug = {profile["provider_slug"]: profile for profile in profiles}

    assert list(profiles_by_slug) == ["openai", "gemini", "nvidia", "mock"]
    assert "anthropic" not in profiles_by_slug
    assert "qwen" not in profiles_by_slug
    assert all(profile["profile_version"] == "model-profile-v1" for profile in profiles)

    assert profiles_by_slug["openai"]["context_window_tokens"] == 1_000_000
    assert profiles_by_slug["gemini"]["context_window_tokens"] == 1_048_576
    assert profiles_by_slug["nvidia"]["context_window_tokens"] == 1_000_000
    assert profiles_by_slug["mock"]["context_window_tokens"] is None

    assert profiles_by_slug["openai"]["data_policy"] != "not_validated"
    assert profiles_by_slug["gemini"]["data_policy"] != "not_validated"
    assert profiles_by_slug["nvidia"]["data_policy"] == "not_validated"
    assert profiles_by_slug["mock"]["data_policy"] == "not_validated"

    assert all("key_hint" not in profile for profile in profiles)
    assert all("credential_source" not in profile for profile in profiles)
    assert all("reference_url" not in profile for profile in profiles)
    assert all(profile["telemetry"]["telemetry_version"] == "model-telemetry-v1" for profile in profiles)
    assert all(profile["telemetry"]["window_days"] == 7 for profile in profiles)
    assert all(profile["telemetry"]["attempt_sample_count"] >= 0 for profile in profiles)


def test_model_profiles_rejects_telemetry_window_outside_limit(monkeypatch) -> None:
    monkeypatch.setattr(
        model_providers_router,
        "is_feature_enabled",
        lambda **kwargs: kwargs["key"] in {"router_model_profiles", "real_providers"},
    )

    response = client.get("/v1/model-providers/profiles?window_days=91")

    assert response.status_code == 422
