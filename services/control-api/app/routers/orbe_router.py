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
    )

    return RouterResolveResponse(
        provider_slug=decision.provider_slug,
        provider_name=decision.provider_name,
        model_name=decision.model_name,
        primary_provider_slug=decision.primary_provider_slug,
        primary_model_name=decision.primary_model_name,
        reason=decision.reason,
        fallback_chain=decision.fallback_chain,
        routing_mode=decision.routing_mode,
        estimated_latency_ms=decision.estimated_latency_ms,
        estimated_cost_usd=decision.estimated_cost_usd,
        quality_tier=decision.quality_tier,
        task_hints=decision.task_hints,
        primary_configured=decision.primary_configured,
        selected_configured=decision.selected_configured,
        is_fallback=decision.is_fallback,
    )
