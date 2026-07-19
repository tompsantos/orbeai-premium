from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, replace
from enum import StrEnum

from app.core.config import Settings, get_settings
from app.db.session import SessionLocal
from app.services.bootstrap import get_or_create_default_workspace
from app.services.model_controls import model_is_enabled, resolve_workspace_model_controls
from app.services.provider_credentials import (
    CredentialDecryptionError,
    provider_definition,
    resolve_provider_credential,
)
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
    credential_source: str | None = None
    key_hint: str | None = None
    workspace_enabled: bool = True

    @property
    def executable(self) -> bool:
        return self.workspace_enabled and self.state in {
            ProviderState.CONFIGURED,
            ProviderState.MOCK,
        }

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
            "workspace_enabled": self.workspace_enabled,
            "credential_source": self.credential_source,
            "key_hint": self.key_hint,
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
        ordered = [primary_provider_slug, "openai", "gemini", "nvidia"]
        if include_mock:
            ordered.append("mock")

        chain: list[str] = []
        for provider_slug in ordered:
            if provider_slug in self.providers and provider_slug not in chain:
                chain.append(provider_slug)
        return chain

    def persisted_payload(self) -> list[dict[str, object]]:
        return [provider.persisted_payload() for provider in self.providers.values()]


def resolve_registry_workspace_id(workspace_id: str | None) -> str | None:
    if workspace_id:
        return workspace_id
    try:
        with SessionLocal() as db:
            return get_or_create_default_workspace(db).id
    except Exception:
        return None


def _real_provider_state(
    *,
    globally_enabled: bool,
    workspace_enabled: bool,
    has_credential: bool,
    credential_source: str | None,
) -> tuple[ProviderState, str]:
    if not workspace_enabled:
        return ProviderState.DISABLED, "real_providers_workspace_disabled"
    if not has_credential:
        return ProviderState.UNAVAILABLE, "credential_missing"
    if credential_source == "workspace_vault":
        return ProviderState.CONFIGURED, "workspace_vault_configured"
    if not globally_enabled:
        return ProviderState.DISABLED, "environment_providers_globally_disabled"
    return ProviderState.CONFIGURED, "environment_configured"


def _registered_real_provider(
    provider_slug: str,
    *,
    settings: Settings,
    workspace_id: str | None,
    real_providers_enabled: bool,
) -> ProviderModel:
    definition = provider_definition(provider_slug, settings)
    credential = None
    decryption_failed = False
    try:
        credential = resolve_provider_credential(
            workspace_id,
            provider_slug,
            settings=settings,
        )
    except CredentialDecryptionError:
        decryption_failed = True

    source = credential.source if credential is not None else None
    state, reason = _real_provider_state(
        globally_enabled=settings.enable_real_providers,
        workspace_enabled=real_providers_enabled,
        has_credential=credential is not None,
        credential_source=source,
    )
    if decryption_failed:
        state = ProviderState.UNAVAILABLE
        reason = "credential_unreadable"

    return ProviderModel(
        provider_slug=provider_slug,
        provider_name=definition.display_name,
        model_name=credential.model_name if credential is not None else definition.default_model,
        state=state,
        state_reason=reason,
        capabilities=("text_chat", "direct_execution", "stream_emulation"),
        is_real=True,
        credential_source=source,
        key_hint=credential.key_hint if credential is not None else None,
    )


def _apply_workspace_control(
    provider: ProviderModel,
    controls: Mapping[str, bool],
) -> ProviderModel:
    if model_is_enabled(
        controls,
        provider.provider_slug,
        provider.model_name,
    ):
        return provider
    return replace(
        provider,
        state=ProviderState.DISABLED,
        state_reason="workspace_model_disabled",
        workspace_enabled=False,
    )


def build_provider_registry(
    settings: Settings | None = None,
    *,
    real_providers_enabled: bool = True,
    workspace_id: str | None = None,
    workspace_model_controls: Mapping[str, bool] | None = None,
) -> ProviderRegistry:
    settings = settings or get_settings()
    workspace_id = resolve_registry_workspace_id(workspace_id)
    controls = (
        dict(workspace_model_controls)
        if workspace_model_controls is not None
        else resolve_workspace_model_controls(workspace_id)
    )

    providers = {
        "openai": _registered_real_provider(
            "openai",
            settings=settings,
            workspace_id=workspace_id,
            real_providers_enabled=real_providers_enabled,
        ),
        "gemini": _registered_real_provider(
            "gemini",
            settings=settings,
            workspace_id=workspace_id,
            real_providers_enabled=real_providers_enabled,
        ),
        "nvidia": _registered_real_provider(
            "nvidia",
            settings=settings,
            workspace_id=workspace_id,
            real_providers_enabled=real_providers_enabled,
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
    return ProviderRegistry(
        providers={
            slug: _apply_workspace_control(provider, controls)
            for slug, provider in providers.items()
        }
    )
