from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ChatCreate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=220)
    project_id: str | None = None
    mode: str = Field(default="strategist", min_length=2, max_length=60)
    model_preference: str = Field(default="auto", min_length=2, max_length=80)


class ChatUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=220)
    project_id: str | None = None
    mode: str | None = Field(default=None, min_length=2, max_length=60)
    model_preference: str | None = Field(default=None, min_length=2, max_length=80)


class ChatRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    project_id: str | None
    title: str
    mode: str
    model_preference: str
    created_at: datetime
    updated_at: datetime
