from typing import Any

from pydantic import BaseModel, Field


class RouterResolveRequest(BaseModel):
    content: str = Field(min_length=1)
    mode: str | None = Field(default="strategist", max_length=60)
    model_preference: str | None = Field(default="auto", max_length=80)
    routing_mode: str | None = Field(default="automático", max_length=80)
    memory_context_count: int = Field(default=0, ge=0)
    knowledge_context_count: int = Field(default=0, ge=0)
    cognition_enabled: bool | None = None
    real_providers_enabled: bool = True


class RouterResolveResponse(BaseModel):
    router_version: str
    route_kind: str
    execution_strategy: str
    provider_slug: str
    provider_name: str
    model_name: str
    primary_provider_slug: str
    primary_model_name: str
    reason: str
    reason_codes: list[str]
    fallback_chain: list[str]
    routing_mode: str
    estimated_latency_ms: int | None
    estimated_cost_usd: float | None
    quality_tier: str
    task_hints: list[str]
    capability_ids: list[str]
    primary_configured: bool
    selected_configured: bool
    is_fallback: bool
    implemented: bool
    classification: dict[str, Any]
    execution_plan: dict[str, Any]
