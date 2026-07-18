from typing import Literal

from pydantic import BaseModel, Field, SecretStr


ProviderCredentialSlug = Literal["openai", "gemini", "nvidia"]


class ProviderCredentialUpsert(BaseModel):
    api_key: SecretStr = Field(min_length=8, max_length=1000)
    model_name: str | None = Field(default=None, min_length=2, max_length=220)


class ProviderCredentialRead(BaseModel):
    provider_slug: ProviderCredentialSlug
    display_name: str
    configured: bool
    source: Literal["workspace_vault", "environment", "none"]
    key_hint: str | None = None
    model_name: str
    base_url: str | None = None
    last_test_status: Literal["success", "failed"] | None = None
    last_tested_at: str | None = None
    last_test_latency_ms: int | None = None
    last_error_code: str | None = None


class ProviderCredentialTestRead(BaseModel):
    provider: ProviderCredentialRead
    success: bool
    message: str
    latency_ms: int | None = None
    model_name: str | None = None
