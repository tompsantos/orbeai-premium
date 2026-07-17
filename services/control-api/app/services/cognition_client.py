from __future__ import annotations

from time import perf_counter
from typing import Any

import httpx

from app.core.config import get_settings
from app.services.providers.mock import estimate_tokens
from app.services.providers.real import ProviderExecutionResult


class CognitionExecutionError(RuntimeError):
    pass


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

    headers = {"X-Orbe-Internal-Key": settings.cognition_api_key}
    payload = {
        "workspace_id": workspace_id,
        "user_id": user_id,
        "chat_id": chat_id,
        "message": content,
        "mode": mode,
        "memory_context": memory_context,
        "conversation_history": conversation_history,
    }

    try:
        with httpx.Client(
            base_url=settings.cognition_base_url.rstrip("/"),
            timeout=settings.cognition_timeout_seconds,
        ) as client:
            response = client.post("/v1/turns", json=payload, headers=headers)
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
