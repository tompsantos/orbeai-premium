from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from app.core.config import Settings, get_settings
from app.services.providers.mock import MOCK_MODEL_NAME, MOCK_PROVIDER_NAME


class ProviderState(StrEnum):
    CONFIGURED = "configured"
    UNAVAILABLE = "unavailable"
    DISABLED = "disabled"
    MOCK = "mock"


@dataclass(frozen=True)
class ProviderModel:
    provider_slug: str
    provider_name: str
    model_name: str
    state: ProviderState
    state_reason: str
    capabilities: tuple[str, ...]
    is_real: bool

    @property
    def executable(self) -> bool:
        return self.state in {ProviderState.CONFIGURED, ProviderState.MOCK}

    def persisted_payload(self) -> dict[str, object]:
        return {
            "provider_slug": self.provider_slug,
            "provider_name": self.provider_name,
            "model_name": self.model_name,
            "state": self.state.value,
            "state_reason": self.state_reason,
            "capabilities": list(self.capabilities),
            "is_real": self.is_real,
            "executable": self.executable,
        }


@dataclass(frozen=True)
class ProviderRegistry:
    providers: dict[str, ProviderModel]

    def get(self, provider_slug: str) -> ProviderModel:
        try:
            return self.providers[provider_slug]
        except KeyError as exc:
            raise KeyError(f"provider não registrado: {provider_slug}") from exc

    def execution_chain(
        self,
        primary_provider_slug: str,
        *,
        include_mock: bool = True,
    ) -> list[str]:
        ordered = [primary_provider_slug, "openai", "gemini"]
        if include_mock:
            ordered.append("mock")

        chain: list[str] = []
        for provider_slug in ordered:
            if provider_slug in self.providers and provider_slug not in chain:
                chain.append(provider_slug)
        return chain

    def persisted_payload(self) -> list[dict[str, object]]:
        return [provider.persisted_payload() for provider in self.providers.values()]


def _real_provider_state(
    *,
    globally_enabled: bool,
    workspace_enabled: bool,
    has_credential: bool,
) -> tuple[ProviderState, str]:
    if not globally_enabled:
        return ProviderState.DISABLED, "real_providers_globally_disabled"
    if not workspace_enabled:
        return ProviderState.DISABLED, "real_providers_workspace_disabled"
    if not has_credential:
        return ProviderState.UNAVAILABLE, "credential_missing"
    return ProviderState.CONFIGURED, "configured"


def build_provider_registry(
    settings: Settings | None = None,
    *,
    real_providers_enabled: bool = True,
) -> ProviderRegistry:
    settings = settings or get_settings()

    openai_state, openai_reason = _real_provider_state(
        globally_enabled=settings.enable_real_providers,
        workspace_enabled=real_providers_enabled,
        has_credential=bool(settings.openai_api_key),
    )
    gemini_state, gemini_reason = _real_provider_state(
        globally_enabled=settings.enable_real_providers,
        workspace_enabled=real_providers_enabled,
        has_credential=bool(settings.gemini_api_key),
    )

    return ProviderRegistry(
        providers={
            "openai": ProviderModel(
                provider_slug="openai",
                provider_name="OpenAI",
                model_name=settings.openai_model,
                state=openai_state,
                state_reason=openai_reason,
                capabilities=("text_chat", "direct_execution", "stream_emulation"),
                is_real=True,
            ),
            "gemini": ProviderModel(
                provider_slug="gemini",
                provider_name="Google Gemini",
                model_name=settings.gemini_model,
                state=gemini_state,
                state_reason=gemini_reason,
                capabilities=("text_chat", "direct_execution", "stream_emulation"),
                is_real=True,
            ),
            "mock": ProviderModel(
                provider_slug="mock",
                provider_name=MOCK_PROVIDER_NAME,
                model_name=MOCK_MODEL_NAME,
                state=ProviderState.MOCK,
                state_reason="development_and_safe_fallback_only",
                capabilities=("text_chat", "deterministic_preview"),
                is_real=False,
            ),
        }
    )
