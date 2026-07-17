from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from app.config import Settings
from app.identity import build_identity
from app.schemas import TurnRequest, TurnResponse


@dataclass(frozen=True)
class ToolPolicy:
    enabled: list[str] | None
    disabled: list[str]


def _resolve_tool_policy(request: TurnRequest, settings: Settings) -> ToolPolicy:
    allowed = set(settings.allowed_toolsets)

    if request.enabled_toolsets is None:
        enabled = None
    else:
        requested = set(request.enabled_toolsets)
        forbidden = requested - allowed
        if forbidden:
            names = ", ".join(sorted(forbidden))
            raise ValueError(f"toolsets não autorizados: {names}")
        enabled = sorted(requested)

    disabled = set(settings.default_disabled_toolsets)
    disabled.update(request.disabled_toolsets or [])

    return ToolPolicy(enabled=enabled, disabled=sorted(disabled))


def run_turn(request: TurnRequest, settings: Settings) -> TurnResponse:
    from run_agent import AIAgent

    request_id = request.request_id or f"turn_{uuid4().hex}"
    model = request.model or settings.default_model
    tool_policy = _resolve_tool_policy(request, settings)

    agent = AIAgent(
        model=model,
        quiet_mode=True,
        max_iterations=settings.max_iterations,
        enabled_toolsets=tool_policy.enabled,
        disabled_toolsets=tool_policy.disabled,
        ephemeral_system_prompt=build_identity(
            mode=request.mode,
            memory_context=request.memory_context,
        ),
        platform="api_server",
        user_id=request.user_id,
        chat_id=request.chat_id,
        gateway_session_key=f"orbeai:{request.workspace_id}:{request.user_id}",
        skip_context_files=True,
        # A memória nativa só será ativada após o provider orbe-memory aplicar
        # escopo seguro por tenant.
        skip_memory=settings.skip_builtin_memory,
    )

    result = agent.run_conversation(
        user_message=request.message,
        conversation_history=request.conversation_history,
        task_id=request_id,
    )

    return TurnResponse(
        request_id=request_id,
        chat_id=request.chat_id,
        model=model,
        final_response=str(result.get("final_response") or ""),
        messages=list(result.get("messages") or []),
    )
