from os import getenv

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.dependencies.workspace import CurrentWorkspaceContext, get_current_workspace_context
from app.models import ModelRun
from app.schemas.model_providers import (
    ModelProfileRead,
    ModelProviderRead,
    ProviderAttemptRetentionRead,
    WorkspaceModelControlRead,
    WorkspaceModelControlUpdate,
)
from app.services.audit import write_audit_log
from app.services.feature_flags import is_feature_enabled
from app.services.model_controls import (
    MODEL_CONTROLS_VERSION,
    WorkspaceModelControl,
    list_workspace_model_controls,
    model_control_key,
    resolve_workspace_model_controls,
    upsert_workspace_model_control,
)
from app.services.model_profiles import build_model_profiles
from app.services.model_telemetry import build_model_telemetry_map
from app.services.provider_attempt_records import purge_expired_provider_attempt_records
from app.services.provider_registry import ProviderModel, ProviderState, build_provider_registry
from app.services.workspace_settings import get_or_create_workspace_settings

router = APIRouter(prefix="/model-providers", tags=["model-providers"])


def average_price_per_k(input_price_per_m: float, output_price_per_m: float) -> float:
    return round(((input_price_per_m + output_price_per_m) / 2) / 1000, 6)


def env_float(name: str) -> float:
    raw = getenv(name)
    if not raw:
        return 0.0
    try:
        return float(raw)
    except ValueError:
        return 0.0


def latency_by_provider(db: Session) -> dict[str, int]:
    rows = db.execute(
        select(
            ModelRun.provider_name,
            func.avg(ModelRun.latency_ms),
        )
        .where(ModelRun.latency_ms.is_not(None))
        .group_by(ModelRun.provider_name)
    ).all()

    result: dict[str, int] = {}
    for provider_name, avg_latency in rows:
        if avg_latency is None:
            continue
        key = "mock" if provider_name == "orbe-mock" else str(provider_name)
        result[key] = int(round(float(avg_latency)))
    return result


def provider_status(provider: ProviderModel) -> str:
    if provider.state in {ProviderState.CONFIGURED, ProviderState.MOCK}:
        return "online"
    if provider.state is ProviderState.DISABLED:
        return "offline"
    return "placeholder"


def api_key_status(provider: ProviderModel) -> str:
    if provider.credential_source == "workspace_vault":
        return "configurado"
    if provider.credential_source == "environment":
        return "ambiente"
    if provider.state is ProviderState.MOCK:
        return "configurado"
    return "não configurado"


def _require_admin(context: CurrentWorkspaceContext) -> None:
    if context.role not in {"owner", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners and admins can manage model controls",
        )


def _require_profiles_enabled(
    db: Session,
    context: CurrentWorkspaceContext,
) -> None:
    if not is_feature_enabled(
        db=db,
        workspace_id=context.workspace_id,
        key="router_model_profiles",
        default=False,
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model profiles are disabled",
        )


def _control_read(
    provider: ProviderModel,
    *,
    stored: WorkspaceModelControl | None,
) -> WorkspaceModelControlRead:
    return WorkspaceModelControlRead(
        control_version=MODEL_CONTROLS_VERSION,
        control_key=model_control_key(provider.provider_slug, provider.model_name),
        provider_slug=provider.provider_slug,
        provider_name=provider.provider_name,
        model_name=provider.model_name,
        enabled=provider.workspace_enabled,
        effective_state=provider.state.value,
        state_reason=provider.state_reason,
        executable=provider.executable,
        updated_at=stored.updated_at if stored else None,
        updated_by=stored.updated_by if stored else None,
    )


@router.get("/profiles", response_model=list[ModelProfileRead])
def list_model_profiles(
    window_days: int = Query(default=30, ge=1, le=90),
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> list[ModelProfileRead]:
    _require_profiles_enabled(db, context)

    settings = get_settings()
    real_providers_enabled = is_feature_enabled(
        db=db,
        workspace_id=context.workspace_id,
        key="real_providers",
        default=True,
    )
    registry = build_provider_registry(
        settings,
        real_providers_enabled=real_providers_enabled,
        workspace_id=context.workspace_id,
    )
    profiles = build_model_profiles(registry)
    telemetry = build_model_telemetry_map(
        db,
        workspace_id=context.workspace_id,
        profiles=profiles,
        window_days=window_days,
        settings=settings,
    )

    return [
        ModelProfileRead(
            **profile.persisted_payload(),
            telemetry=telemetry[(profile.provider_slug, profile.model_name)].persisted_payload(),
        )
        for profile in profiles
    ]


@router.get("/controls", response_model=list[WorkspaceModelControlRead])
def list_model_controls(
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> list[WorkspaceModelControlRead]:
    _require_admin(context)
    _require_profiles_enabled(db, context)
    real_providers_enabled = is_feature_enabled(
        db=db,
        workspace_id=context.workspace_id,
        key="real_providers",
        default=True,
    )
    registry = build_provider_registry(
        get_settings(),
        real_providers_enabled=real_providers_enabled,
        workspace_id=context.workspace_id,
    )
    stored = list_workspace_model_controls(db, context.workspace_id)
    return [
        _control_read(
            provider,
            stored=stored.get(model_control_key(slug, provider.model_name)),
        )
        for slug, provider in registry.providers.items()
    ]


@router.put("/controls", response_model=WorkspaceModelControlRead)
def update_model_control(
    payload: WorkspaceModelControlUpdate,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> WorkspaceModelControlRead:
    _require_admin(context)
    _require_profiles_enabled(db, context)
    settings = get_settings()
    real_providers_enabled = is_feature_enabled(
        db=db,
        workspace_id=context.workspace_id,
        key="real_providers",
        default=True,
    )
    registry = build_provider_registry(
        settings,
        real_providers_enabled=real_providers_enabled,
        workspace_id=context.workspace_id,
    )
    provider_slug = payload.provider_slug.strip().lower()
    try:
        current = registry.get(provider_slug)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model provider is not registered",
        ) from exc
    if current.model_name != payload.model_name.strip():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Model control does not match the currently registered model",
        )

    simulated_controls = resolve_workspace_model_controls(
        context.workspace_id,
        db=db,
    )
    simulated_controls[model_control_key(provider_slug, current.model_name)] = payload.enabled
    simulated_registry = build_provider_registry(
        settings,
        real_providers_enabled=real_providers_enabled,
        workspace_id=context.workspace_id,
        workspace_model_controls=simulated_controls,
    )
    if not any(provider.executable for provider in simulated_registry.providers.values()):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="At least one model must remain executable in the workspace",
        )

    control = upsert_workspace_model_control(
        db,
        workspace_id=context.workspace_id,
        provider_slug=provider_slug,
        model_name=current.model_name,
        enabled=payload.enabled,
        actor_user_id=context.user_id,
    )
    effective_registry = build_provider_registry(
        settings,
        real_providers_enabled=real_providers_enabled,
        workspace_id=context.workspace_id,
    )
    effective = effective_registry.get(provider_slug)
    write_audit_log(
        db=db,
        workspace_id=context.workspace_id,
        action="model.control.update",
        resource_type="model_profile",
        resource_id=control.control_key,
        meta={
            "provider_slug": provider_slug,
            "model_name": current.model_name,
            "enabled": control.enabled,
            "effective_state": effective.state.value,
            "actor_user_id": context.user_id,
        },
        commit=True,
    )
    return _control_read(effective, stored=control)


@router.post("/attempts/retention/run", response_model=ProviderAttemptRetentionRead)
def run_provider_attempt_retention(
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> ProviderAttemptRetentionRead:
    _require_admin(context)
    _require_profiles_enabled(db, context)
    workspace_settings = get_or_create_workspace_settings(db, context.workspace)
    retention_days = max(1, int(workspace_settings.data_retention_days))
    deleted_records = purge_expired_provider_attempt_records(
        db,
        workspace_id=context.workspace_id,
        retention_days=retention_days,
    )
    write_audit_log(
        db=db,
        workspace_id=context.workspace_id,
        action="provider.attempt.retention",
        resource_type="provider_attempt_record",
        resource_id=context.workspace_id,
        meta={
            "retention_days": retention_days,
            "deleted_records": deleted_records,
            "aggregation_mode": "on_demand_window",
            "max_query_window_days": 90,
            "actor_user_id": context.user_id,
        },
        commit=True,
    )
    return ProviderAttemptRetentionRead(
        retention_days=retention_days,
        deleted_records=deleted_records,
        aggregation_mode="on_demand_window",
        max_query_window_days=90,
    )


@router.get("", response_model=list[ModelProviderRead])
def list_model_providers(
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> list[ModelProviderRead]:
    settings = get_settings()
    latencies = latency_by_provider(db)
    real_providers_enabled = is_feature_enabled(
        db=db,
        workspace_id=context.workspace_id,
        key="real_providers",
        default=True,
    )
    registry = build_provider_registry(
        settings,
        real_providers_enabled=real_providers_enabled,
        workspace_id=context.workspace_id,
    )

    prices = {
        "mock": 0.0,
        "openai": average_price_per_k(
            settings.openai_input_price_per_m_tokens,
            settings.openai_output_price_per_m_tokens,
        ),
        "gemini": average_price_per_k(
            settings.gemini_input_price_per_m_tokens,
            settings.gemini_output_price_per_m_tokens,
        ),
        "nvidia": average_price_per_k(
            env_float("NVIDIA_INPUT_PRICE_PER_M_TOKENS"),
            env_float("NVIDIA_OUTPUT_PRICE_PER_M_TOKENS"),
        ),
    }

    visible = ["mock", "openai", "gemini", "nvidia"]
    result = [
        ModelProviderRead(
            slug=slug,
            name=registry.get(slug).provider_name,
            status=provider_status(registry.get(slug)),
            models=[registry.get(slug).model_name],
            api_key_status=api_key_status(registry.get(slug)),
            latency_ms=latencies.get(slug, 250 if slug == "mock" else None),
            cost_per_k_tokens=prices[slug],
        )
        for slug in visible
    ]

    result.extend(
        [
            ModelProviderRead(
                slug="anthropic",
                name="Anthropic",
                status="placeholder",
                models=["claude-sonnet-4.5", "claude-haiku-3.5"],
                api_key_status="não configurado",
                latency_ms=latencies.get("anthropic"),
                cost_per_k_tokens=None,
            ),
            ModelProviderRead(
                slug="qwen",
                name="Qwen",
                status="placeholder",
                models=["qwen-plus", "qwen-max", "qwen3"],
                api_key_status="não configurado",
                latency_ms=latencies.get("qwen"),
                cost_per_k_tokens=None,
            ),
            ModelProviderRead(
                slug="groq",
                name="Groq",
                status="placeholder",
                models=["llama-3.3-70b", "mixtral"],
                api_key_status="não configurado",
                latency_ms=latencies.get("groq"),
                cost_per_k_tokens=None,
            ),
            ModelProviderRead(
                slug="local",
                name="Local",
                status="placeholder",
                models=["qwen-local", "llama-cpp"],
                api_key_status="não configurado",
                latency_ms=latencies.get("local"),
                cost_per_k_tokens=0.0,
            ),
        ]
    )
    return result
