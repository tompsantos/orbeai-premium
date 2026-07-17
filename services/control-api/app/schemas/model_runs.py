from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ModelRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str | None
    chat_id: str | None
    message_id: str | None
    provider_name: str
    model_name: str
    task_type: str | None
    status: str
    latency_ms: int | None
    input_tokens: int | None
    output_tokens: int | None
    estimated_cost_usd: float | None
    router_reason: str | None
    fallback_chain: list[Any] | None
    error_message: str | None
    created_at: datetime
