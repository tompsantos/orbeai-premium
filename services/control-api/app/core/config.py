from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuração central da API orbeAI.

    Tudo que for sensível deve vir de variável de ambiente no servidor.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "orbeAI API"
    app_env: Literal["local", "staging", "production"] = "local"
    app_version: str = "0.1.0"
    api_prefix: str = "/v1"

    database_url: str = Field(
        default="postgresql+psycopg://orbeai:orbeai@localhost:5433/orbeai",
        validation_alias="DATABASE_URL",
    )

    cors_origins: str = Field(
        default="http://localhost:8080,http://localhost:5173,http://localhost:3000",
        validation_alias="BACKEND_CORS_ORIGINS",
    )

    jwt_secret: str = Field(default="dev-only-change-me", validation_alias="JWT_SECRET")
    jwt_algorithm: str = "HS256"

    openai_api_key: str | None = Field(default=None, validation_alias="OPENAI_API_KEY")
    anthropic_api_key: str | None = Field(default=None, validation_alias="ANTHROPIC_API_KEY")
    gemini_api_key: str | None = Field(default=None, validation_alias="GEMINI_API_KEY")
    qwen_api_key: str | None = Field(default=None, validation_alias="QWEN_API_KEY")
    groq_api_key: str | None = Field(default=None, validation_alias="GROQ_API_KEY")

    openai_model: str = Field(default="gpt-5.5", validation_alias="OPENAI_MODEL")
    gemini_model: str = Field(default="gemini-3.5-flash", validation_alias="GEMINI_MODEL")
    enable_real_providers: bool = Field(default=False, validation_alias="ENABLE_REAL_PROVIDERS")

    cognition_enabled: bool = Field(default=True, validation_alias="COGNITION_ENABLED")
    cognition_base_url: str = Field(
        default="http://orbeai-cognition:8081",
        validation_alias="COGNITION_BASE_URL",
    )
    cognition_api_key: str = Field(
        default="dev-internal-change-me",
        validation_alias="COGNITION_API_KEY",
    )
    cognition_timeout_seconds: float = Field(
        default=180.0,
        validation_alias="COGNITION_TIMEOUT_SECONDS",
    )
    cognition_fallback_to_legacy: bool = Field(
        default=True,
        validation_alias="COGNITION_FALLBACK_TO_LEGACY",
    )

    openai_input_price_per_m_tokens: float = Field(default=2.50, validation_alias="OPENAI_INPUT_PRICE_PER_M_TOKENS")
    openai_output_price_per_m_tokens: float = Field(default=15.00, validation_alias="OPENAI_OUTPUT_PRICE_PER_M_TOKENS")
    gemini_input_price_per_m_tokens: float = Field(default=0.0, validation_alias="GEMINI_INPUT_PRICE_PER_M_TOKENS")
    gemini_output_price_per_m_tokens: float = Field(default=0.0, validation_alias="GEMINI_OUTPUT_PRICE_PER_M_TOKENS")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
