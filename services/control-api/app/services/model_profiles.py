from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from app.services.provider_registry import ProviderModel, ProviderRegistry
from app.services.validated_model_metadata import resolve_validated_model_metadata

MODEL_PROFILE_VERSION = "model-profile-v1"


class ModelLifecycle(StrEnum):
    EXPERIMENTAL = "experimental"
    APPROVED = "approved"
    DEPRECATED = "deprecated"
    MOCK = "mock"


class ProfileEvidenceSource(StrEnum):
    CODE_REGISTRY = "code_registry"
    RUNTIME_CONFIGURATION = "runtime_configuration"
    WORKSPACE_CONFIGURATION = "workspace_configuration"
    PROVIDER_DEFAULT = "provider_default"
    RUNTIME_TELEMETRY = "runtime_telemetry"
    OFFICIAL_DOCUMENTATION = "official_documentation"
    NOT_VALIDATED = "not_validated"


@dataclass(frozen=True)
class ModelProfile:
    profile_version: str
    profile_id: str
    provider_slug: str
    provider_name: str
    model_name: str
    lifecycle: ModelLifecycle
    executable: bool
    workspace_enabled: bool
    provider_state: str
    is_real: bool
    capabilities: tuple[str, ...]
    required_capabilities: tuple[str, ...]
    optional_capabilities: tuple[str, ...]
    input_formats: tuple[str, ...]
    output_formats: tuple[str, ...]
    streaming: str
    tool_support: str
    context_window_tokens: int | None
    data_policy: str
    validation_status: str
    validated_at: str | None
    evidence_sources: dict[str, str]

    def persisted_payload(self) -> dict[str, object]:
        return {
            "profile_version": self.profile_version,
            "profile_id": self.profile_id,
            "provider_slug": self.provider_slug,
            "provider_name": self.provider_name,
            "model_name": self.model_name,
            "lifecycle": self.lifecycle.value,
            "executable": self.executable,
            "workspace_enabled": self.workspace_enabled,
            "provider_state": self.provider_state,
            "is_real": self.is_real,
            "capabilities": list(self.capabilities),
            "required_capabilities": list(self.required_capabilities),
            "optional_capabilities": list(self.optional_capabilities),
            "input_formats": list(self.input_formats),
            "output_formats": list(self.output_formats),
            "streaming": self.streaming,
            "tool_support": self.tool_support,
            "context_window_tokens": self.context_window_tokens,
            "data_policy": self.data_policy,
            "validation_status": self.validation_status,
            "validated_at": self.validated_at,
            "evidence_sources": dict(self.evidence_sources),
        }


def _model_evidence_source(provider: ProviderModel) -> ProfileEvidenceSource:
    if provider.credential_source in {"workspace_vault", "environment"}:
        return ProfileEvidenceSource.RUNTIME_CONFIGURATION
    if provider.is_real:
        return ProfileEvidenceSource.PROVIDER_DEFAULT
    return ProfileEvidenceSource.CODE_REGISTRY


def _validation_status(provider: ProviderModel) -> str:
    if not provider.is_real:
        return "deterministic_mock"

    metadata = resolve_validated_model_metadata(provider.provider_slug, provider.model_name)
    if metadata is None:
        return "profile_not_benchmarked"
    if metadata.context_validated and metadata.data_policy_validated:
        return "metadata_validated_profile_not_benchmarked"
    if metadata.context_validated:
        return "context_validated_policy_not_validated"
    if metadata.data_policy_validated:
        return "data_policy_validated_context_not_validated"
    return "profile_not_benchmarked"


def build_model_profile(provider: ProviderModel) -> ModelProfile:
    lifecycle = ModelLifecycle.EXPERIMENTAL if provider.is_real else ModelLifecycle.MOCK
    optional_capabilities = tuple(
        capability for capability in provider.capabilities if capability == "stream_emulation"
    )
    required_capabilities = tuple(
        capability for capability in provider.capabilities if capability not in optional_capabilities
    )
    streaming = (
        "emulated" if "stream_emulation" in provider.capabilities else "not_implemented"
    )
    metadata = resolve_validated_model_metadata(provider.provider_slug, provider.model_name)
    context_validated = metadata is not None and metadata.context_validated
    data_policy_validated = metadata is not None and metadata.data_policy_validated

    return ModelProfile(
        profile_version=MODEL_PROFILE_VERSION,
        profile_id=f"{provider.provider_slug}:{provider.model_name}:{MODEL_PROFILE_VERSION}",
        provider_slug=provider.provider_slug,
        provider_name=provider.provider_name,
        model_name=provider.model_name,
        lifecycle=lifecycle,
        executable=provider.executable,
        workspace_enabled=provider.workspace_enabled,
        provider_state=provider.state.value,
        is_real=provider.is_real,
        capabilities=provider.capabilities,
        required_capabilities=required_capabilities,
        optional_capabilities=optional_capabilities,
        input_formats=("text",),
        output_formats=("text",),
        streaming=streaming,
        tool_support="not_implemented",
        context_window_tokens=(metadata.context_window_tokens if context_validated else None),
        data_policy=(metadata.data_policy if data_policy_validated else "not_validated"),
        validation_status=_validation_status(provider),
        validated_at=(metadata.validated_at if metadata is not None else None),
        evidence_sources={
            "provider": ProfileEvidenceSource.CODE_REGISTRY.value,
            "model": _model_evidence_source(provider).value,
            "workspace_control": ProfileEvidenceSource.WORKSPACE_CONFIGURATION.value,
            "capabilities": ProfileEvidenceSource.CODE_REGISTRY.value,
            "formats": ProfileEvidenceSource.CODE_REGISTRY.value,
            "streaming": ProfileEvidenceSource.CODE_REGISTRY.value,
            "tools": ProfileEvidenceSource.CODE_REGISTRY.value,
            "context_window": (
                ProfileEvidenceSource.OFFICIAL_DOCUMENTATION.value
                if context_validated
                else ProfileEvidenceSource.NOT_VALIDATED.value
            ),
            "data_policy": (
                ProfileEvidenceSource.OFFICIAL_DOCUMENTATION.value
                if data_policy_validated
                else ProfileEvidenceSource.NOT_VALIDATED.value
            ),
            "quality": ProfileEvidenceSource.NOT_VALIDATED.value,
            "latency": ProfileEvidenceSource.RUNTIME_TELEMETRY.value,
        },
    )


def build_model_profiles(registry: ProviderRegistry) -> tuple[ModelProfile, ...]:
    preferred_order = ("openai", "gemini", "nvidia", "mock")
    ordered_slugs = [slug for slug in preferred_order if slug in registry.providers]
    ordered_slugs.extend(slug for slug in registry.providers if slug not in ordered_slugs)
    return tuple(build_model_profile(registry.get(slug)) for slug in ordered_slugs)
