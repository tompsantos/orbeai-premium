from os import getenv

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.dependencies.workspace import CurrentWorkspaceContext, get_current_workspace_context
from app.models import ModelRun
from app.schemas.model_providers import ModelProfileRead, ModelProviderRead
from app.services.feature_flags import is_feature_enabled
from app.services.model_profiles import build_model_profiles
from app.services.provider_registry import ProviderModel, ProviderState, build_provider_registry

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


@router.get("/profiles", response_model=list[ModelProfileRead])
def list_model_profiles(
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> list[ModelProfileRead]:
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
    return [
        ModelProfileRead(**profile.persisted_payload())
        for profile in build_model_profiles(registry)
    ]


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
