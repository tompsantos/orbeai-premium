from pydantic import BaseModel


class ModelProviderRead(BaseModel):
    slug: str
    name: str
    status: str
    models: list[str]
    api_key_status: str
    latency_ms: int | None = None
    cost_per_k_tokens: float | None = None


class ModelProfileRead(BaseModel):
    profile_version: str
    profile_id: str
    provider_slug: str
    provider_name: str
    model_name: str
    lifecycle: str
    executable: bool
    provider_state: str
    is_real: bool
    capabilities: list[str]
    input_formats: list[str]
    output_formats: list[str]
    streaming: str
    tool_support: str
    context_window_tokens: int | None = None
    data_policy: str
    validation_status: str
    validated_at: str | None = None
    evidence_sources: dict[str, str]
