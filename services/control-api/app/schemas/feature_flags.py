from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FeatureFlagUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=2, max_length=180)
    enabled: bool | None = None
    audience: str | None = Field(default=None, max_length=40)
    description: str | None = None
    meta: dict[str, Any] | None = None


class FeatureFlagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    key: str
    label: str
    enabled: bool
    audience: str
    description: str | None
    meta: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
