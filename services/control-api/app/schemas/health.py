from pydantic import BaseModel


class HealthResponse(BaseModel):
    ok: bool
    service: str
    status: str
    version: str
    environment: str
