from pydantic import BaseModel


class ModelProviderRead(BaseModel):
    slug: str
    name: str
    status: str
    models: list[str]
    api_key_status: str
    latency_ms: int | None = None
    cost_per_k_tokens: float | None = None
