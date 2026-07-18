from fastapi import APIRouter, status

from app.schemas.orbe_router import RouterResolveRequest, RouterResolveResponse
from app.services.orbe_router import resolve_chat_route

router = APIRouter(prefix="/router", tags=["orbe-router"])


@router.post(
    "/resolve",
    response_model=RouterResolveResponse,
    status_code=status.HTTP_200_OK,
)
def resolve_route(payload: RouterResolveRequest) -> RouterResolveResponse:
    decision = resolve_chat_route(
        content=payload.content,
        mode=payload.mode,
        model_preference=payload.model_preference,
        routing_mode=payload.routing_mode,
        memory_context_count=payload.memory_context_count,
        knowledge_context_count=payload.knowledge_context_count,
        cognition_enabled=payload.cognition_enabled,
        real_providers_enabled=payload.real_providers_enabled,
    )
    return RouterResolveResponse.model_validate(decision.persisted_payload())
