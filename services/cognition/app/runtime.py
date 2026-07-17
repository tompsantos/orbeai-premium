from __future__ import annotations

import logging
import queue
import threading
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from time import perf_counter
from typing import Any
from uuid import uuid4

from app.config import Settings
from app.identity import build_identity
from app.schemas import TurnRequest, TurnResponse

logger = logging.getLogger("orbe-cognition.runtime")


@dataclass(frozen=True)
class ToolPolicy:
    enabled: list[str] | None
    disabled: list[str]


@dataclass
class ActiveRun:
    request_id: str
    agent: Any
    started_at: float


_ACTIVE_RUNS: dict[str, ActiveRun] = {}
_STOP_REQUESTED: set[str] = set()
_ACTIVE_RUNS_LOCK = threading.RLock()
_STREAM_END = object()


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


def _make_agent(
    request: TurnRequest,
    settings: Settings,
    request_id: str,
    **callbacks: Callable[..., None],
) -> Any:
    from run_agent import AIAgent

    model = request.model or settings.default_model
    tool_policy = _resolve_tool_policy(request, settings)

    return AIAgent(
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
        session_id=request_id,
        gateway_session_key=f"orbeai:{request.workspace_id}:{request.user_id}",
        skip_context_files=True,
        # A memória nativa só será ativada após o provider orbe-memory aplicar
        # escopo seguro por tenant.
        skip_memory=settings.skip_builtin_memory,
        **callbacks,
    )


def _register_run(request_id: str, agent: Any) -> None:
    with _ACTIVE_RUNS_LOCK:
        _ACTIVE_RUNS[request_id] = ActiveRun(
            request_id=request_id,
            agent=agent,
            started_at=perf_counter(),
        )


def _unregister_run(request_id: str) -> None:
    with _ACTIVE_RUNS_LOCK:
        _ACTIVE_RUNS.pop(request_id, None)
        _STOP_REQUESTED.discard(request_id)


def _run_stop_requested(request_id: str) -> bool:
    with _ACTIVE_RUNS_LOCK:
        return request_id in _STOP_REQUESTED


def stop_run(request_id: str) -> bool:
    with _ACTIVE_RUNS_LOCK:
        active = _ACTIVE_RUNS.get(request_id)

    if active is None:
        return False

    with _ACTIVE_RUNS_LOCK:
        _STOP_REQUESTED.add(request_id)

    try:
        active.agent.interrupt("execução interrompida pelo usuário")
    except TypeError:
        active.agent.interrupt()
    return True


def resolve_run_approval(request_id: str, choice: str) -> int:
    if choice not in {"once", "session", "deny"}:
        raise ValueError("decisão de aprovação inválida")

    from tools.approval import resolve_gateway_approval

    return int(resolve_gateway_approval(request_id, choice, resolve_all=False))


def run_turn(request: TurnRequest, settings: Settings) -> TurnResponse:
    request_id = request.request_id or f"turn_{uuid4().hex}"
    model = request.model or settings.default_model
    agent = _make_agent(request, settings, request_id)

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


def _safe_text(value: Any, *, limit: int = 8_000) -> str:
    if value is None:
        return ""
    text = str(value)
    return text[:limit]


def _tool_start_payload(args: tuple[Any, ...], kwargs: dict[str, Any]) -> dict[str, Any]:
    tool_name = kwargs.get("tool_name") or kwargs.get("name")
    if not tool_name and args:
        tool_name = args[0]

    tool_args = kwargs.get("args")
    if tool_args is None and len(args) >= 2 and isinstance(args[1], dict):
        tool_args = args[1]

    preview = kwargs.get("preview") or kwargs.get("args_preview")
    if preview is None and len(args) >= 2 and not isinstance(args[1], dict):
        preview = args[1]

    return {
        "tool_name": _safe_text(tool_name, limit=160) or "ferramenta",
        "preview": _safe_text(preview, limit=1_000) or None,
        "args": tool_args if isinstance(tool_args, dict) else None,
    }


def _tool_complete_payload(args: tuple[Any, ...], kwargs: dict[str, Any]) -> dict[str, Any]:
    tool_name = kwargs.get("tool_name") or kwargs.get("name")
    if not tool_name and args:
        tool_name = args[0]

    ok = kwargs.get("ok")
    if ok is None:
        ok = kwargs.get("success")
    if ok is None:
        ok = True

    duration = kwargs.get("duration") or kwargs.get("duration_seconds") or 0.0

    return {
        "tool_name": _safe_text(tool_name, limit=160) or "ferramenta",
        "ok": bool(ok),
        "duration_seconds": float(duration or 0.0),
    }


def _approval_payload(event_name: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    normalized = event_name.lower().replace("_", ".")
    if "approval" not in normalized:
        return None

    command = payload.get("command") or payload.get("description") or payload.get("message")
    return {
        "event": normalized,
        "title": _safe_text(payload.get("title") or "aprovação necessária", limit=180),
        "description": _safe_text(command, limit=2_000),
        "tool_name": _safe_text(payload.get("tool_name") or payload.get("tool"), limit=160)
        or None,
        "choices": ["once", "session", "deny"],
    }


def stream_turn(request: TurnRequest, settings: Settings) -> Iterator[dict[str, Any]]:
    request_id = request.request_id or f"turn_{uuid4().hex}"
    model = request.model or settings.default_model
    events: queue.Queue[dict[str, Any] | object] = queue.Queue()

    def emit(event_type: str, **data: Any) -> None:
        events.put(
            {
                "type": event_type,
                "request_id": request_id,
                "chat_id": request.chat_id,
                **data,
            }
        )

    def on_delta(text: Any, *_args: Any, **_kwargs: Any) -> None:
        delta = _safe_text(text, limit=65_536)
        if delta:
            emit("response.delta", delta=delta)

    def on_tool_start(*args: Any, **kwargs: Any) -> None:
        emit("tool.started", **_tool_start_payload(args, kwargs))

    def on_tool_complete(*args: Any, **kwargs: Any) -> None:
        emit("tool.completed", **_tool_complete_payload(args, kwargs))

    def on_commentary(text: Any, *_args: Any, **_kwargs: Any) -> None:
        content = _safe_text(text, limit=8_000)
        if content:
            emit("response.commentary", content=content)

    def on_status(*args: Any, **kwargs: Any) -> None:
        message = kwargs.get("message") or kwargs.get("status")
        if message is None and args:
            message = args[-1]
        content = _safe_text(message, limit=1_000)
        if content:
            emit("run.status", message=content)

    def on_event(event_name: Any, payload: Any = None, *_args: Any, **kwargs: Any) -> None:
        name = _safe_text(event_name, limit=180)
        merged: dict[str, Any] = {}
        if isinstance(payload, dict):
            merged.update(payload)
        merged.update(kwargs)
        approval = _approval_payload(name, merged)
        if approval is not None:
            emit("approval.required", **approval)

    agent = _make_agent(
        request,
        settings,
        request_id,
        stream_delta_callback=on_delta,
        tool_start_callback=on_tool_start,
        tool_complete_callback=on_tool_complete,
        interim_assistant_callback=on_commentary,
        status_callback=on_status,
        event_callback=on_event,
    )

    def worker() -> None:
        approval_token = None
        interactive_token = None
        _register_run(request_id, agent)
        emit("run.started", model=model, runtime="orbe-cognition")

        try:
            from tools.approval import (
                reset_current_session_key,
                reset_hermes_interactive_context,
                set_current_session_key,
                set_hermes_interactive_context,
            )

            approval_token = set_current_session_key(request_id)
            interactive_token = set_hermes_interactive_context(True)

            result = agent.run_conversation(
                user_message=request.message,
                conversation_history=request.conversation_history,
                task_id=request_id,
            )
            final_response = str(result.get("final_response") or "")
            if _run_stop_requested(request_id):
                emit(
                    "response.stopped",
                    message="execução interrompida",
                    partial_response=final_response,
                )
            else:
                emit(
                    "response.completed",
                    model=model,
                    final_response=final_response,
                    messages=list(result.get("messages") or []),
                )
        except Exception as exc:  # pragma: no cover - provider/runtime dependent
            interrupted = bool(getattr(agent, "interrupted", False))
            if interrupted or "interrupt" in str(exc).lower():
                emit("response.stopped", message="execução interrompida")
            else:
                logger.exception(
                    "streaming cognition turn failed workspace=%s user=%s chat=%s",
                    request.workspace_id,
                    request.user_id,
                    request.chat_id,
                )
                emit(
                    "response.failed",
                    error=f"{type(exc).__name__}: {exc}",
                )
        finally:
            if interactive_token is not None:
                try:
                    reset_hermes_interactive_context(interactive_token)
                except Exception:
                    pass
            if approval_token is not None:
                try:
                    reset_current_session_key(approval_token)
                except Exception:
                    pass
            _unregister_run(request_id)
            events.put(_STREAM_END)

    thread = threading.Thread(
        target=worker,
        name=f"orbe-cognition-{request_id[-12:]}",
        daemon=True,
    )
    thread.start()

    while True:
        item = events.get()
        if item is _STREAM_END:
            break
        assert isinstance(item, dict)
        yield item
