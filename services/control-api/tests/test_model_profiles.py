from app.services.model_profiles import (
    MODEL_PROFILE_VERSION,
    ModelLifecycle,
    build_model_profile,
    build_model_profiles,
)
from app.services.provider_registry import ProviderModel, ProviderRegistry, ProviderState


def provider_model(
    slug: str,
    *,
    model_name: str,
    state: ProviderState = ProviderState.CONFIGURED,
    is_real: bool = True,
    workspace_enabled: bool = True,
) -> ProviderModel:
    return ProviderModel(
        provider_slug=slug,
        provider_name=slug.title(),
        model_name=model_name,
        state=state,
        state_reason="test_state",
        capabilities=("text_chat", "direct_execution", "stream_emulation"),
        is_real=is_real,
        credential_source="environment" if is_real else None,
        key_hint="••••test" if is_real else None,
        workspace_enabled=workspace_enabled,
    )


def test_model_profile_is_versioned_and_does_not_invent_evidence() -> None:
    profile = build_model_profile(provider_model("openai", model_name="gpt-test"))
    payload = profile.persisted_payload()

    assert profile.profile_version == MODEL_PROFILE_VERSION
    assert profile.profile_id == f"openai:gpt-test:{MODEL_PROFILE_VERSION}"
    assert profile.provider_slug == "openai"
    assert profile.model_name == "gpt-test"
    assert profile.lifecycle is ModelLifecycle.EXPERIMENTAL
    assert profile.workspace_enabled is True
    assert profile.streaming == "emulated"
    assert profile.tool_support == "not_implemented"
    assert profile.required_capabilities == ("text_chat", "direct_execution")
    assert profile.optional_capabilities == ("stream_emulation",)
    assert profile.context_window_tokens is None
    assert profile.data_policy == "not_validated"
    assert profile.validation_status == "profile_not_benchmarked"
    assert profile.evidence_sources["workspace_control"] == "workspace_configuration"
    assert profile.evidence_sources["context_window"] == "not_validated"
    assert profile.evidence_sources["quality"] == "not_validated"
    assert "key_hint" not in payload
    assert "credential_source" not in payload


def test_model_profile_exposes_workspace_disabled_state() -> None:
    profile = build_model_profile(
        provider_model(
            "openai",
            model_name="gpt-disabled",
            state=ProviderState.DISABLED,
            workspace_enabled=False,
        )
    )

    assert profile.workspace_enabled is False
    assert profile.executable is False
    assert profile.provider_state == "disabled"


def test_model_profiles_are_built_only_from_registered_models() -> None:
    registry = ProviderRegistry(
        providers={
            "openai": provider_model("openai", model_name="gpt-test"),
            "mock": provider_model(
                "mock",
                model_name="orbe-mock-v0",
                state=ProviderState.MOCK,
                is_real=False,
            ),
        }
    )

    profiles = build_model_profiles(registry)

    assert [profile.provider_slug for profile in profiles] == ["openai", "mock"]
    assert profiles[1].lifecycle is ModelLifecycle.MOCK
    assert profiles[1].validation_status == "deterministic_mock"
