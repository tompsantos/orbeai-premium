from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class MessageCreate(BaseModel):
    role: str = Field(min_length=2, max_length=40)
    content: str = Field(min_length=1)
    provider: str | None = Field(default=None, max_length=80)
    model: str | None = Field(default=None, max_length=120)
    input_tokens: int | None = None
    output_tokens: int | None = None
    meta: dict[str, Any] | None = None


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    chat_id: str
    role: str
    content: str
    provider: str | None
    model: str | None
    input_tokens: int | None
    output_tokens: int | None
    meta: dict[str, Any] | None
    created_at: datetime
