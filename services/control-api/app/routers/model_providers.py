from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models import ModelRun
from app.schemas.model_providers import ModelProviderRead
from app.services.bootstrap import get_or_create_default_workspace
from app.services.feature_flags import is_feature_enabled

router = APIRouter(prefix="/model-providers", tags=["model-providers"])


def real_status(enabled: bool, has_key: bool) -> str:
    if enabled and has_key:
        return "online"

    return "placeholder"


def key_status(has_key: bool) -> str:
    if has_key:
        return "ambiente"

    return "não configurado"


def average_price_per_k(input_price_per_m: float, output_price_per_m: float) -> float:
    return round(((input_price_per_m + output_price_per_m) / 2) / 1000, 6)


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


@router.get("", response_model=list[ModelProviderRead])
def list_model_providers(db: Session = Depends(get_db)) -> list[ModelProviderRead]:
    settings = get_settings()
    latencies = latency_by_provider(db)
    workspace = get_or_create_default_workspace(db)
    real_providers_enabled = settings.enable_real_providers and is_feature_enabled(
        db=db,
        workspace_id=workspace.id,
        key="real_providers",
        default=True,
    )

    openai_has_key = bool(settings.openai_api_key)
    gemini_has_key = bool(settings.gemini_api_key)

    return [
        ModelProviderRead(
            slug="mock",
            name="orbe-mock",
            status="online",
            models=["orbe-mock-v0"],
            api_key_status="configurado",
            latency_ms=latencies.get("mock", 250),
            cost_per_k_tokens=0.0,
        ),
        ModelProviderRead(
            slug="openai",
            name="OpenAI",
            status=real_status(real_providers_enabled, openai_has_key),
            models=[settings.openai_model],
            api_key_status=key_status(openai_has_key),
            latency_ms=latencies.get("openai"),
            cost_per_k_tokens=average_price_per_k(
                settings.openai_input_price_per_m_tokens,
                settings.openai_output_price_per_m_tokens,
            ),
        ),
        ModelProviderRead(
            slug="gemini",
            name="Google Gemini",
            status=real_status(real_providers_enabled, gemini_has_key),
            models=[settings.gemini_model],
            api_key_status=key_status(gemini_has_key),
            latency_ms=latencies.get("gemini"),
            cost_per_k_tokens=average_price_per_k(
                settings.gemini_input_price_per_m_tokens,
                settings.gemini_output_price_per_m_tokens,
            ),
        ),
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
