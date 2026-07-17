from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class TurnRequest(BaseModel):
    workspace_id: str = Field(min_length=1, max_length=80)
    user_id: str = Field(min_length=1, max_length=80)
    chat_id: str = Field(min_length=1, max_length=80)
    message: str = Field(min_length=1, max_length=100_000)
    request_id: str | None = Field(default=None, max_length=120)
    mode: str = Field(default="padrão", min_length=1, max_length=60)
    model: str | None = Field(default=None, max_length=180)
    memory_context: str | None = Field(default=None, max_length=30_000)
    conversation_history: list[dict[str, Any]] = Field(default_factory=list)
    enabled_toolsets: list[str] | None = None
    disabled_toolsets: list[str] | None = None

    @field_validator("workspace_id", "user_id", "chat_id")
    @classmethod
    def reject_control_characters(cls, value: str) -> str:
        if any(ord(char) < 32 for char in value):
            raise ValueError("identificador contém caractere de controle")
        return value.strip()


class TurnResponse(BaseModel):
    request_id: str
    chat_id: str
    model: str
    final_response: str
    messages: list[dict[str, Any]]
    runtime: str = "orbe-cognition"
    runtime_version: str = "0.1.0"


class CapabilitiesResponse(BaseModel):
    runtime: str
    hermes_core: bool
    synchronous_turns: bool
    streaming: bool
    scoped_builtin_memory: bool
    external_memory_context: bool
    tool_policy: bool
