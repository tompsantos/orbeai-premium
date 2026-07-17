from pydantic import BaseModel, Field


class RouterResolveRequest(BaseModel):
    content: str = Field(min_length=1)
    mode: str | None = Field(default="strategist", max_length=60)
    model_preference: str | None = Field(default="auto", max_length=80)
    routing_mode: str | None = Field(default="automático", max_length=80)


class RouterResolveResponse(BaseModel):
    provider_slug: str
    provider_name: str
    model_name: str
    primary_provider_slug: str
    primary_model_name: str
    reason: str
    fallback_chain: list[str]
    routing_mode: str
    estimated_latency_ms: int
    estimated_cost_usd: float
    quality_tier: str
    task_hints: list[str]
    primary_configured: bool
    selected_configured: bool
    is_fallback: bool
