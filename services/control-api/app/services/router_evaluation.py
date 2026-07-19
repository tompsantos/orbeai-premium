from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.config import Settings
from app.services.orbe_router import (
    RouterDecision,
    RouterRequest,
    _build_decision,
    classify_request,
)
from app.services.provider_registry import ProviderModel, ProviderRegistry, ProviderState

ROUTER_CASE_SCHEMA_VERSION = "router-case-v1"
ROUTER_REPLAY_VERSION = "router-replay-v1"

ProviderSlug = Literal["openai", "gemini", "nvidia", "mock"]
ProviderStateValue = Literal["configured", "unavailable", "disabled", "mock"]


class RouterCaseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(min_length=1)
    mode: str = Field(min_length=1)
    model_preference: str = Field(min_length=1)
    routing_mode: str = Field(min_length=1)
    memory_context_count: int = Field(default=0, ge=0)
    knowledge_context_count: int = Field(default=0, ge=0)
    cognition_enabled: bool = True


class RouterCaseEnvironment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider_states: dict[ProviderSlug, ProviderStateValue] = Field(default_factory=dict)


class RouterCaseExpected(BaseModel):
    model_config = ConfigDict(extra="forbid")

    allowed_route_kinds: list[str]
    prohibited_route_kinds: list[str] = Field(default_factory=list)
    allowed_execution_strategies: list[str]
    allowed_provider_slugs: list[str]
    allowed_primary_provider_slugs: list[str]
    required_reason_codes: list[str] = Field(default_factory=list)
    prohibited_reason_codes: list[str] = Field(default_factory=list)
    required_capabilities: list[str] = Field(default_factory=list)
    required_provider_chain_members: list[str] = Field(default_factory=list)
    prohibited_provider_chain_members: list[str] = Field(default_factory=list)
    expected_is_fallback: bool | None = None
    classification: dict[str, str | bool] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_required_acceptance_sets(self) -> RouterCaseExpected:
        required_sets = {
            "allowed_route_kinds": self.allowed_route_kinds,
            "allowed_execution_strategies": self.allowed_execution_strategies,
            "allowed_provider_slugs": self.allowed_provider_slugs,
            "allowed_primary_provider_slugs": self.allowed_primary_provider_slugs,
        }
        empty = [name for name, values in required_sets.items() if not values]
        if empty:
            raise ValueError(f"acceptance sets cannot be empty: {', '.join(empty)}")
        return self


class RouterEvaluationCase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["router-case-v1"]
    case_id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]+$")
    category: str = Field(min_length=1)
    request: RouterCaseRequest
    environment: RouterCaseEnvironment
    expected: RouterCaseExpected


class RouterReplayDataset(BaseModel):
    schema_version: str
    dataset_id: str
    sha256: str
    cases: list[RouterEvaluationCase]


_PROVIDER_NAMES = {
    "openai": "OpenAI",
    "gemini": "Google Gemini",
    "nvidia": "NVIDIA NIM",
    "mock": "orbe-mock",
}
_PROVIDER_MODELS = {
    "openai": "openai-eval-model",
    "gemini": "gemini-eval-model",
    "nvidia": "nvidia-eval-model",
    "mock": "orbe-mock-v0",
}


def load_router_dataset(path: Path, *, dataset_id: str | None = None) -> RouterReplayDataset:
    raw = path.read_bytes()
    cases: list[RouterEvaluationCase] = []
    seen_ids: set[str] = set()

    for line_number, raw_line in enumerate(raw.decode("utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"invalid JSON at dataset line {line_number}: {exc.msg}") from exc
        case = RouterEvaluationCase.model_validate(payload)
        if case.case_id in seen_ids:
            raise ValueError(f"duplicate router case id: {case.case_id}")
        seen_ids.add(case.case_id)
        cases.append(case)

    if not cases:
        raise ValueError("router dataset is empty")
    versions = {case.schema_version for case in cases}
    if versions != {ROUTER_CASE_SCHEMA_VERSION}:
        raise ValueError(f"mixed or unsupported case schema versions: {sorted(versions)}")

    return RouterReplayDataset(
        schema_version=ROUTER_CASE_SCHEMA_VERSION,
        dataset_id=dataset_id or path.name,
        sha256=hashlib.sha256(raw).hexdigest(),
        cases=cases,
    )


def _evaluation_settings() -> Settings:
    return Settings(
        _env_file=None,
        ENABLE_REAL_PROVIDERS=True,
        COGNITION_ENABLED=True,
        PROVIDER_RETRY_ATTEMPTS=0,
        PROVIDER_TIMEOUT_SECONDS=15.0,
        COGNITION_TIMEOUT_SECONDS=45.0,
    )


def _provider_state(slug: ProviderSlug, case: RouterEvaluationCase) -> ProviderState:
    configured_default = "mock" if slug == "mock" else "configured"
    return ProviderState(case.environment.provider_states.get(slug, configured_default))


def build_evaluation_registry(case: RouterEvaluationCase) -> ProviderRegistry:
    providers: dict[str, ProviderModel] = {}
    for slug in ("openai", "gemini", "nvidia", "mock"):
        typed_slug: ProviderSlug = slug  # type: ignore[assignment]
        state = _provider_state(typed_slug, case)
        is_real = slug != "mock"
        providers[slug] = ProviderModel(
            provider_slug=slug,
            provider_name=_PROVIDER_NAMES[slug],
            model_name=_PROVIDER_MODELS[slug],
            state=state,
            state_reason=f"evaluation_{state.value}",
            capabilities=(
                ("text_chat", "direct_execution", "stream_emulation")
                if is_real
                else ("text_chat", "deterministic_preview")
            ),
            is_real=is_real,
            credential_source="evaluation" if is_real and state is ProviderState.CONFIGURED else None,
            workspace_enabled=state is not ProviderState.DISABLED,
        )
    return ProviderRegistry(providers=providers)


def _case_request(case: RouterEvaluationCase) -> RouterRequest:
    request = case.request
    return RouterRequest(
        content=request.content,
        mode=request.mode,
        model_preference=request.model_preference,
        routing_mode=request.routing_mode,
        memory_context_count=request.memory_context_count,
        knowledge_context_count=request.knowledge_context_count,
        cognition_enabled=request.cognition_enabled,
        real_providers_enabled=True,
        workspace_id=None,
    )


def _decision_summary(decision: RouterDecision) -> dict[str, Any]:
    return {
        "router_version": decision.router_version,
        "route_kind": decision.route_kind.value,
        "execution_strategy": decision.execution_strategy.value,
        "provider_slug": decision.provider_slug,
        "primary_provider_slug": decision.primary_provider_slug,
        "reason_codes": list(decision.reason_codes),
        "capability_ids": list(decision.capability_ids),
        "provider_chain": list(decision.execution_plan.provider_chain),
        "is_fallback": decision.is_fallback,
        "classification": decision.classification.persisted_payload(),
    }


def _append_membership_violation(
    violations: list[str],
    *,
    field: str,
    actual: str,
    allowed: list[str],
) -> None:
    if actual not in allowed:
        violations.append(f"{field}={actual!r} not in allowed={allowed!r}")


def evaluate_router_case(case: RouterEvaluationCase) -> dict[str, Any]:
    violations: list[str] = []
    try:
        request = _case_request(case)
        classification = classify_request(request)
        decision = _build_decision(
            request,
            classification,
            _evaluation_settings(),
            build_evaluation_registry(case),
        )
    except Exception as exc:
        return {
            "case_id": case.case_id,
            "category": case.category,
            "passed": False,
            "violations": [f"evaluation_error:{type(exc).__name__}"],
            "actual": None,
        }

    actual = _decision_summary(decision)
    expected = case.expected
    _append_membership_violation(
        violations,
        field="route_kind",
        actual=decision.route_kind.value,
        allowed=expected.allowed_route_kinds,
    )
    _append_membership_violation(
        violations,
        field="execution_strategy",
        actual=decision.execution_strategy.value,
        allowed=expected.allowed_execution_strategies,
    )
    _append_membership_violation(
        violations,
        field="provider_slug",
        actual=decision.provider_slug,
        allowed=expected.allowed_provider_slugs,
    )
    _append_membership_violation(
        violations,
        field="primary_provider_slug",
        actual=decision.primary_provider_slug,
        allowed=expected.allowed_primary_provider_slugs,
    )

    if decision.route_kind.value in expected.prohibited_route_kinds:
        violations.append(f"prohibited route_kind={decision.route_kind.value!r}")

    reason_codes = set(decision.reason_codes)
    for reason_code in expected.required_reason_codes:
        if reason_code not in reason_codes:
            violations.append(f"missing reason_code={reason_code!r}")
    for reason_code in expected.prohibited_reason_codes:
        if reason_code in reason_codes:
            violations.append(f"prohibited reason_code={reason_code!r}")

    capabilities = set(decision.capability_ids)
    for capability in expected.required_capabilities:
        if capability not in capabilities:
            violations.append(f"missing capability={capability!r}")

    provider_chain = set(decision.execution_plan.provider_chain)
    for provider_slug in expected.required_provider_chain_members:
        if provider_slug not in provider_chain:
            violations.append(f"missing provider_chain member={provider_slug!r}")
    for provider_slug in expected.prohibited_provider_chain_members:
        if provider_slug in provider_chain:
            violations.append(f"prohibited provider_chain member={provider_slug!r}")

    if (
        expected.expected_is_fallback is not None
        and decision.is_fallback is not expected.expected_is_fallback
    ):
        violations.append(
            f"is_fallback={decision.is_fallback!r} expected={expected.expected_is_fallback!r}"
        )

    actual_classification = decision.classification.persisted_payload()
    for field, expected_value in expected.classification.items():
        actual_value = actual_classification.get(field)
        if actual_value != expected_value:
            violations.append(
                f"classification.{field}={actual_value!r} expected={expected_value!r}"
            )

    return {
        "case_id": case.case_id,
        "category": case.category,
        "passed": not violations,
        "violations": violations,
        "actual": actual,
    }


def run_router_replay(dataset: RouterReplayDataset) -> dict[str, Any]:
    case_results = [evaluate_router_case(case) for case in dataset.cases]
    category_totals: dict[str, dict[str, int]] = defaultdict(
        lambda: {"total": 0, "passed": 0, "failed": 0}
    )
    route_counts: Counter[str] = Counter()
    strategy_counts: Counter[str] = Counter()
    provider_counts: Counter[str] = Counter()

    for result in case_results:
        category = category_totals[result["category"]]
        category["total"] += 1
        category["passed" if result["passed"] else "failed"] += 1
        actual = result["actual"]
        if actual is not None:
            route_counts[actual["route_kind"]] += 1
            strategy_counts[actual["execution_strategy"]] += 1
            provider_counts[actual["provider_slug"]] += 1

    total = len(case_results)
    passed = sum(1 for result in case_results if result["passed"])
    categories = {
        name: {
            **counts,
            "pass_rate": round(counts["passed"] / counts["total"], 6),
        }
        for name, counts in sorted(category_totals.items())
    }
    return {
        "replay_version": ROUTER_REPLAY_VERSION,
        "dataset": {
            "schema_version": dataset.schema_version,
            "dataset_id": dataset.dataset_id,
            "sha256": dataset.sha256,
            "case_count": total,
        },
        "summary": {
            "total_cases": total,
            "passed_cases": passed,
            "failed_cases": total - passed,
            "pass_rate": round(passed / total, 6),
        },
        "categories": categories,
        "distribution": {
            "route_kind": dict(sorted(route_counts.items())),
            "execution_strategy": dict(sorted(strategy_counts.items())),
            "provider_slug": dict(sorted(provider_counts.items())),
        },
        "cases": case_results,
    }
