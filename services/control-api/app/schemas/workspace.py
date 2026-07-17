from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    plan: str | None = Field(default=None, max_length=40)


class WorkspaceSettingsUpdate(BaseModel):
    locale: str | None = Field(default=None, max_length=20)
    timezone: str | None = Field(default=None, max_length=80)
    default_chat_mode: str | None = Field(default=None, max_length=60)
    default_model_preference: str | None = Field(default=None, max_length=80)
    memory_policy: str | None = Field(default=None, max_length=40)
    data_retention_days: int | None = Field(default=None, ge=1, le=3650)
    allow_exports: bool | None = None
    allow_public_sharing: bool | None = None
    meta: dict[str, Any] | None = None


class WorkspaceSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    locale: str
    timezone: str
    default_chat_mode: str
    default_model_preference: str
    memory_policy: str
    data_retention_days: int
    allow_exports: bool
    allow_public_sharing: bool
    meta: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class WorkspaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    plan: str
    created_at: datetime
    updated_at: datetime
    settings: WorkspaceSettingsRead
