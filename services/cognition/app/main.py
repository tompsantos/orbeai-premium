from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Iterator

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.runtime import resolve_run_approval, run_turn, stop_run, stream_turn
from app.schemas import (
    ApprovalRequest,
    CapabilitiesResponse,
    RunActionResponse,
    TurnRequest,
    TurnResponse,
)
from app.security import require_internal_key

logger = logging.getLogger("orbe-cognition")
settings = get_settings()

app = FastAPI(
    title="orbe cognition core",
    version="0.2.0",
    description="Runtime cognitivo interno da orbeAI premium.",
)


def _sse(event: dict[str, object]) -> str:
    event_type = str(event.get("type") or "message")
    payload = json.dumps(event, ensure_ascii=False, separators=(",", ":"))
    return f"event: {event_type}\ndata: {payload}\n\n"


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "ok": True,
        "service": "orbe-cognition",
        "environment": settings.env,
    }


@app.get(
    "/v1/capabilities",
    response_model=CapabilitiesResponse,
    dependencies=[Depends(require_internal_key)],
)
def capabilities() -> CapabilitiesResponse:
    return CapabilitiesResponse(
        runtime="orbe-cognition",
        hermes_core=True,
        synchronous_turns=True,
        streaming=True,
        stop=True,
        approvals=True,
        scoped_builtin_memory=False,
        external_memory_context=True,
        external_knowledge_context=True,
        tool_policy=True,
    )


@app.post(
    "/v1/turns",
    response_model=TurnResponse,
    dependencies=[Depends(require_internal_key)],
)
async def create_turn(payload: TurnRequest) -> TurnResponse:
    try:
        return await asyncio.to_thread(run_turn, payload, settings)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception(
            "cognition turn failed workspace=%s user=%s chat=%s",
            payload.workspace_id,
            payload.user_id,
            payload.chat_id,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"runtime cognitivo indisponível: {type(exc).__name__}",
        ) from exc


@app.post(
    "/v1/turns/stream",
    dependencies=[Depends(require_internal_key)],
)
def create_streaming_turn(payload: TurnRequest) -> StreamingResponse:
    def generate() -> Iterator[str]:
        try:
            for event in stream_turn(payload, settings):
                yield _sse(event)
        except ValueError as exc:
            yield _sse(
                {
                    "type": "response.failed",
                    "request_id": payload.request_id,
                    "chat_id": payload.chat_id,
                    "error": str(exc),
                }
            )
        except Exception as exc:  # pragma: no cover - defensive stream boundary
            logger.exception("cognition stream transport failed")
            yield _sse(
                {
                    "type": "response.failed",
                    "request_id": payload.request_id,
                    "chat_id": payload.chat_id,
                    "error": f"{type(exc).__name__}: {exc}",
                }
            )

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.post(
    "/v1/turns/{request_id}/stop",
    response_model=RunActionResponse,
    dependencies=[Depends(require_internal_key)],
)
def stop_turn(request_id: str) -> RunActionResponse:
    accepted = stop_run(request_id)
    if not accepted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="execução ativa não encontrada",
        )
    return RunActionResponse(request_id=request_id, accepted=True)


@app.post(
    "/v1/turns/{request_id}/approval",
    response_model=RunActionResponse,
    dependencies=[Depends(require_internal_key)],
)
def approve_turn(request_id: str, payload: ApprovalRequest) -> RunActionResponse:
    try:
        resolved = resolve_run_approval(request_id, payload.choice)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if resolved <= 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="não existe aprovação pendente para esta execução",
        )

    return RunActionResponse(
        request_id=request_id,
        accepted=True,
        resolved=resolved,
    )
