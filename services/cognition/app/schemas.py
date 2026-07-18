from __future__ import annotations

from typing import Any, Literal

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
    knowledge_context: str | None = Field(default=None, max_length=30_000)
    conversation_history: list[dict[str, Any]] = Field(default_factory=list)
    enabled_toolsets: list[str] | None = None
    disabled_toolsets: list[str] | None = None

    @field_validator("workspace_id", "user_id", "chat_id", "request_id")
    @classmethod
    def reject_control_characters(cls, value: str | None) -> str | None:
        if value is None:
            return None
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
    runtime_version: str = "0.2.0"


class ApprovalRequest(BaseModel):
    choice: Literal["once", "session", "deny"]


class RunActionResponse(BaseModel):
    request_id: str
    accepted: bool
    resolved: int = 0


class CapabilitiesResponse(BaseModel):
    runtime: str
    hermes_core: bool
    synchronous_turns: bool
    streaming: bool
    stop: bool
    approvals: bool
    scoped_builtin_memory: bool
    external_memory_context: bool
    external_knowledge_context: bool
    tool_policy: bool
