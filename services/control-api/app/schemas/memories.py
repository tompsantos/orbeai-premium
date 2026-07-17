from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MemoryCreate(BaseModel):
    label: str = Field(min_length=2, max_length=180)
    content: str = Field(min_length=1)
    scope: str = Field(default="projeto", max_length=40)
    status: str = Field(default="pendente", max_length=40)
    sensitivity: str = Field(default="normal", max_length=40)
    confidence: float | None = Field(default=0.8, ge=0, le=1)
    project_id: str | None = None
    product: str | None = Field(default=None, max_length=80)
    source_type: str | None = Field(default="manual", max_length=80)
    source_product: str | None = Field(default="orbeAI", max_length=80)
    source_entity_id: str | None = Field(default=None, max_length=120)


class MemoryUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=2, max_length=180)
    content: str | None = Field(default=None, min_length=1)
    scope: str | None = Field(default=None, max_length=40)
    status: str | None = Field(default=None, max_length=40)
    sensitivity: str | None = Field(default=None, max_length=40)
    confidence: float | None = Field(default=None, ge=0, le=1)
    project_id: str | None = None
    product: str | None = Field(default=None, max_length=80)
    source_type: str | None = Field(default=None, max_length=80)
    source_product: str | None = Field(default=None, max_length=80)
    source_entity_id: str | None = Field(default=None, max_length=120)


class MemoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    project_id: str | None
    product: str | None
    label: str
    content: str
    scope: str
    status: str
    sensitivity: str
    confidence: float | None
    source_type: str | None
    source_product: str | None
    source_entity_id: str | None
    created_at: datetime
    updated_at: datetime
