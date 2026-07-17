from app.core.config import Settings


def test_cognition_defaults_are_private_service_defaults() -> None:
    settings = Settings()

    assert settings.cognition_enabled is True
    assert settings.cognition_base_url == "http://orbeai-cognition:8081"
    assert settings.cognition_fallback_to_legacy is True
