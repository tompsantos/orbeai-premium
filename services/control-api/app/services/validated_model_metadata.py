from __future__ import annotations

from dataclasses import dataclass

VALIDATED_METADATA_DATE = "2026-07-19"


@dataclass(frozen=True)
class ValidatedModelMetadata:
    provider_slug: str
    model_name: str
    context_window_tokens: int | None
    data_policy: str
    validated_at: str
    context_reference_url: str | None
    data_policy_reference_url: str | None

    @property
    def context_validated(self) -> bool:
        return self.context_window_tokens is not None and self.context_reference_url is not None

    @property
    def data_policy_validated(self) -> bool:
        return self.data_policy != "not_validated" and self.data_policy_reference_url is not None


_METADATA_BY_MODEL: dict[tuple[str, str], ValidatedModelMetadata] = {
    (
        "openai",
        "gpt-5.5",
    ): ValidatedModelMetadata(
        provider_slug="openai",
        model_name="gpt-5.5",
        context_window_tokens=1_000_000,
        data_policy="api_not_used_for_training_by_default_abuse_logs_up_to_30_days",
        validated_at=VALIDATED_METADATA_DATE,
        context_reference_url="https://openai.com/index/introducing-gpt-5-5/",
        data_policy_reference_url=(
            "https://developers.openai.com/api/docs/guides/your-data"
            "#default-usage-policies-by-endpoint"
        ),
    ),
    (
        "gemini",
        "gemini-3.5-flash",
    ): ValidatedModelMetadata(
        provider_slug="gemini",
        model_name="gemini-3.5-flash",
        context_window_tokens=1_048_576,
        data_policy=(
            "billing_dependent_paid_not_used_for_improvement_"
            "unpaid_may_be_used_for_improvement"
        ),
        validated_at=VALIDATED_METADATA_DATE,
        context_reference_url=(
            "https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash"
        ),
        data_policy_reference_url="https://ai.google.dev/gemini-api/terms",
    ),
    (
        "nvidia",
        "nvidia/nemotron-3-super-120b-a12b",
    ): ValidatedModelMetadata(
        provider_slug="nvidia",
        model_name="nvidia/nemotron-3-super-120b-a12b",
        context_window_tokens=1_000_000,
        data_policy="not_validated",
        validated_at=VALIDATED_METADATA_DATE,
        context_reference_url=(
            "https://docs.api.nvidia.com/nim/reference/"
            "nvidia-nemotron-3-super-120b-a12b"
        ),
        data_policy_reference_url=None,
    ),
}


def resolve_validated_model_metadata(
    provider_slug: str,
    model_name: str,
) -> ValidatedModelMetadata | None:
    """Return only exact, source-backed metadata for the registered model id."""

    return _METADATA_BY_MODEL.get((provider_slug, model_name))
