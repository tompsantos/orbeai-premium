from app.core.config import Settings


def test_cognition_defaults_are_private_service_defaults(monkeypatch) -> None:
    monkeypatch.delenv("COGNITION_ENABLED", raising=False)
    monkeypatch.delenv("COGNITION_BASE_URL", raising=False)
    monkeypatch.delenv("COGNITION_FALLBACK_TO_LEGACY", raising=False)

    settings = Settings(_env_file=None)

    assert settings.cognition_enabled is True
    assert settings.cognition_base_url == "http://orbeai-cognition:8081"
    assert settings.cognition_fallback_to_legacy is True
