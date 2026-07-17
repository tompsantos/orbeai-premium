from __future__ import annotations

import json
from collections.abc import Iterator
from time import perf_counter
from typing import Any, Literal

import httpx

from app.core.config import get_settings
from app.services.providers.mock import estimate_tokens
from app.services.providers.real import ProviderExecutionResult


class CognitionExecutionError(RuntimeError):
    pass


def _headers() -> dict[str, str]:
    settings = get_settings()
    return {"X-Orbe-Internal-Key": settings.cognition_api_key}


def _turn_payload(
    *,
    workspace_id: str,
    user_id: str,
    chat_id: str,
    content: str,
    mode: str,
    memory_context: str | None,
    conversation_history: list[dict[str, Any]],
    request_id: str | None = None,
) -> dict[str, Any]:
    return {
        "workspace_id": workspace_id,
        "user_id": user_id,
        "chat_id": chat_id,
        "message": content,
        "request_id": request_id,
        "mode": mode,
        "memory_context": memory_context,
        "conversation_history": conversation_history,
    }


def execute_cognition_turn(
    *,
    workspace_id: str,
    user_id: str,
    chat_id: str,
    content: str,
    mode: str,
    memory_context: str | None,
    conversation_history: list[dict[str, Any]],
) -> ProviderExecutionResult:
    settings = get_settings()
    started_at = perf_counter()
    payload = _turn_payload(
        workspace_id=workspace_id,
        user_id=user_id,
        chat_id=chat_id,
        content=content,
        mode=mode,
        memory_context=memory_context,
        conversation_history=conversation_history,
    )

    try:
        with httpx.Client(
            base_url=settings.cognition_base_url.rstrip("/"),
            timeout=settings.cognition_timeout_seconds,
        ) as client:
            response = client.post("/v1/turns", json=payload, headers=_headers())
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise CognitionExecutionError(
            f"orbe cognition indisponível: {type(exc).__name__}: {exc}"
        ) from exc

    output = str(data.get("final_response") or "").strip()
    if not output:
        raise CognitionExecutionError("orbe cognition retornou resposta vazia")

    model = str(data.get("model") or "orbe-cognition-default")
    input_tokens = estimate_tokens(content + (memory_context or ""))
    output_tokens = estimate_tokens(output)

    return ProviderExecutionResult(
        content=output,
        provider_name="orbe-cognition",
        model_name=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        latency_ms=int((perf_counter() - started_at) * 1000),
        estimated_cost_usd=0.0,
    )


def _decode_sse_events(lines: Iterator[str]) -> Iterator[dict[str, Any]]:
    event_name = "message"
    data_lines: list[str] = []

    for line in lines:
        if line == "":
            if data_lines:
                raw = "\n".join(data_lines)
                try:
                    payload = json.loads(raw)
                except ValueError as exc:
                    raise CognitionExecutionError("evento SSE inválido do cognition") from exc
                if isinstance(payload, dict):
                    payload.setdefault("type", event_name)
                    yield payload
            event_name = "message"
            data_lines = []
            continue

        if line.startswith(":"):
            continue
        if line.startswith("event:"):
            event_name = line[6:].strip() or "message"
            continue
        if line.startswith("data:"):
            data_lines.append(line[5:].lstrip())

    if data_lines:
        try:
            payload = json.loads("\n".join(data_lines))
        except ValueError as exc:
            raise CognitionExecutionError("evento SSE final inválido do cognition") from exc
        if isinstance(payload, dict):
            payload.setdefault("type", event_name)
            yield payload


def stream_cognition_turn(
    *,
    request_id: str,
    workspace_id: str,
    user_id: str,
    chat_id: str,
    content: str,
    mode: str,
    memory_context: str | None,
    conversation_history: list[dict[str, Any]],
) -> Iterator[dict[str, Any]]:
    settings = get_settings()
    payload = _turn_payload(
        request_id=request_id,
        workspace_id=workspace_id,
        user_id=user_id,
        chat_id=chat_id,
        content=content,
        mode=mode,
        memory_context=memory_context,
        conversation_history=conversation_history,
    )

    try:
        with httpx.Client(
            base_url=settings.cognition_base_url.rstrip("/"),
            timeout=httpx.Timeout(settings.cognition_timeout_seconds, read=None),
        ) as client:
            with client.stream(
                "POST",
                "/v1/turns/stream",
                json=payload,
                headers={**_headers(), "Accept": "text/event-stream"},
            ) as response:
                response.raise_for_status()
                yield from _decode_sse_events(response.iter_lines())
    except (httpx.HTTPError, ValueError) as exc:
        raise CognitionExecutionError(
            f"stream do orbe cognition indisponível: {type(exc).__name__}: {exc}"
        ) from exc


def stop_cognition_turn(request_id: str) -> bool:
    settings = get_settings()
    try:
        with httpx.Client(
            base_url=settings.cognition_base_url.rstrip("/"),
            timeout=10.0,
        ) as client:
            response = client.post(
                f"/v1/turns/{request_id}/stop",
                headers=_headers(),
            )
            if response.status_code == 404:
                return False
            response.raise_for_status()
            return bool(response.json().get("accepted"))
    except (httpx.HTTPError, ValueError) as exc:
        raise CognitionExecutionError(
            f"não foi possível interromper o cognition: {type(exc).__name__}: {exc}"
        ) from exc


def approve_cognition_turn(
    request_id: str,
    choice: Literal["once", "session", "deny"],
) -> int:
    settings = get_settings()
    try:
        with httpx.Client(
            base_url=settings.cognition_base_url.rstrip("/"),
            timeout=10.0,
        ) as client:
            response = client.post(
                f"/v1/turns/{request_id}/approval",
                json={"choice": choice},
                headers=_headers(),
            )
            response.raise_for_status()
            return int(response.json().get("resolved") or 0)
    except (httpx.HTTPError, ValueError) as exc:
        raise CognitionExecutionError(
            f"não foi possível responder à aprovação: {type(exc).__name__}: {exc}"
        ) from exc
