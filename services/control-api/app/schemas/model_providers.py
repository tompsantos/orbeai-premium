from pydantic import BaseModel


class ModelProviderRead(BaseModel):
    slug: str
    name: str
    status: str
    models: list[str]
    api_key_status: str
    latency_ms: int | None = None
    cost_per_k_tokens: float | None = None


class ModelTelemetryRead(BaseModel):
    telemetry_version: str
    window_days: int
    window_started_at: str
    attempt_sample_count: int
    executed_attempt_count: int
    success_count: int
    failure_count: int
    skipped_count: int
    timeout_count: int
    success_rate: float | None = None
    timeout_rate: float | None = None
    latency_p50_ms: int | None = None
    latency_p95_ms: int | None = None
    run_sample_count: int
    token_sample_count: int
    input_tokens_total: int
    output_tokens_total: int
    cost_status: str
    cost_sample_count: int
    estimated_cost_usd_total: float | None = None
    last_attempt_at: str | None = None


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
    telemetry: ModelTelemetryRead | None = None
