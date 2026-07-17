from __future__ import annotations

import asyncio
import logging

from fastapi import Depends, FastAPI, HTTPException, status

from app.config import get_settings
from app.runtime import run_turn
from app.schemas import CapabilitiesResponse, TurnRequest, TurnResponse
from app.security import require_internal_key

logger = logging.getLogger("orbe-cognition")
settings = get_settings()

app = FastAPI(
    title="orbe cognition core",
    version="0.1.0",
    description="Runtime cognitivo interno da orbeAI premium.",
)


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
        streaming=False,
        scoped_builtin_memory=False,
        external_memory_context=True,
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
