from app.services.model_profiles import (
    MODEL_PROFILE_VERSION,
    ModelLifecycle,
    build_model_profile,
    build_model_profiles,
)
from app.services.provider_registry import ProviderModel, ProviderRegistry, ProviderState
from app.services.validated_model_metadata import resolve_validated_model_metadata


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
    assert profile.validated_at is None
    assert profile.evidence_sources["workspace_control"] == "workspace_configuration"
    assert profile.evidence_sources["context_window"] == "not_validated"
    assert profile.evidence_sources["data_policy"] == "not_validated"
    assert profile.evidence_sources["quality"] == "not_validated"
    assert "key_hint" not in payload
    assert "credential_source" not in payload
    assert "reference_url" not in payload


def test_gpt_55_uses_exact_official_metadata() -> None:
    profile = build_model_profile(provider_model("openai", model_name="gpt-5.5"))

    assert profile.context_window_tokens == 1_000_000
    assert (
        profile.data_policy
        == "api_not_used_for_training_by_default_abuse_logs_up_to_30_days"
    )
    assert profile.validation_status == "metadata_validated_profile_not_benchmarked"
    assert profile.validated_at == "2026-07-19"
    assert profile.evidence_sources["context_window"] == "official_documentation"
    assert profile.evidence_sources["data_policy"] == "official_documentation"
    assert profile.evidence_sources["quality"] == "not_validated"


def test_gemini_35_flash_records_tier_dependent_data_policy() -> None:
    profile = build_model_profile(provider_model("gemini", model_name="gemini-3.5-flash"))

    assert profile.context_window_tokens == 1_048_576
    assert profile.data_policy == (
        "billing_dependent_paid_not_used_for_improvement_"
        "unpaid_may_be_used_for_improvement"
    )
    assert profile.validation_status == "metadata_validated_profile_not_benchmarked"
    assert profile.evidence_sources["context_window"] == "official_documentation"
    assert profile.evidence_sources["data_policy"] == "official_documentation"


def test_nemotron_validates_context_without_inventing_data_policy() -> None:
    profile = build_model_profile(
        provider_model("nvidia", model_name="nvidia/nemotron-3-super-120b-a12b")
    )

    assert profile.context_window_tokens == 1_000_000
    assert profile.data_policy == "not_validated"
    assert profile.validation_status == "context_validated_policy_not_validated"
    assert profile.validated_at == "2026-07-19"
    assert profile.evidence_sources["context_window"] == "official_documentation"
    assert profile.evidence_sources["data_policy"] == "not_validated"


def test_metadata_lookup_does_not_guess_similar_model_names() -> None:
    assert resolve_validated_model_metadata("openai", "gpt-5.5-custom") is None
    assert resolve_validated_model_metadata("gemini", "gemini-3.5-flash-latest") is None
    assert resolve_validated_model_metadata("nvidia", "nemotron-3-super-120b-a12b") is None


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
