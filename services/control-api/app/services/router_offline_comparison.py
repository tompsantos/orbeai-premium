from __future__ import annotations

from collections import Counter
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

ROUTER_OFFLINE_COMPARISON_VERSION = "router-offline-comparison-v1"


class CaseComparison(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    category: str
    status: Literal["unchanged", "changed", "regression", "recovery"]
    changed_fields: list[str]
    baseline_passed: bool
    candidate_passed: bool


class PairComparison(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pair_id: str
    status: Literal["unchanged", "changed", "regression", "recovery"]
    baseline_outcome: str
    candidate_outcome: str
    baseline_passed: bool
    candidate_passed: bool


class RouterOfflineComparisonReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    comparison_version: Literal["router-offline-comparison-v1"]
    status: Literal["approved", "review_required", "blocked"]
    compatible: bool
    approved: bool
    review_required: bool
    blockers: list[str]
    summary: dict[str, int]
    distribution_changes: dict[str, dict[str, int]]
    cases: list[CaseComparison]
    pairs: list[PairComparison]


def _replay_payload(report: dict[str, Any]) -> dict[str, Any]:
    nested = report.get("replay")
    return dict(nested) if isinstance(nested, dict) else report


def _case_map(replay: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        str(case["case_id"]): dict(case)
        for case in replay.get("cases", [])
        if isinstance(case, dict) and case.get("case_id")
    }


def _pair_map(report: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        str(pair["pair_id"]): dict(pair)
        for pair in report.get("pairs", [])
        if isinstance(pair, dict) and pair.get("pair_id")
    }


def _changed_actual_fields(
    baseline_actual: dict[str, Any] | None,
    candidate_actual: dict[str, Any] | None,
) -> list[str]:
    if baseline_actual is None or candidate_actual is None:
        return ["actual"] if baseline_actual != candidate_actual else []
    keys = sorted(set(baseline_actual) | set(candidate_actual))
    return [key for key in keys if baseline_actual.get(key) != candidate_actual.get(key)]


def _comparison_status(
    *,
    baseline_passed: bool,
    candidate_passed: bool,
    changed: bool,
) -> Literal["unchanged", "changed", "regression", "recovery"]:
    if baseline_passed and not candidate_passed:
        return "regression"
    if not baseline_passed and candidate_passed:
        return "recovery"
    return "changed" if changed else "unchanged"


def _distribution_delta(
    baseline: dict[str, Any],
    candidate: dict[str, Any],
) -> dict[str, dict[str, int]]:
    result: dict[str, dict[str, int]] = {}
    dimensions = sorted(set(baseline) | set(candidate))
    for dimension in dimensions:
        baseline_counts = baseline.get(dimension) or {}
        candidate_counts = candidate.get(dimension) or {}
        keys = sorted(set(baseline_counts) | set(candidate_counts))
        deltas = {
            key: int(candidate_counts.get(key, 0)) - int(baseline_counts.get(key, 0))
            for key in keys
        }
        result[dimension] = {key: value for key, value in deltas.items() if value != 0}
    return result


def compare_router_reports(
    baseline_report: dict[str, Any],
    candidate_report: dict[str, Any],
) -> RouterOfflineComparisonReport:
    baseline_replay = _replay_payload(baseline_report)
    candidate_replay = _replay_payload(candidate_report)
    blockers: list[str] = []

    if baseline_replay.get("replay_version") != candidate_replay.get("replay_version"):
        blockers.append("replay_version_mismatch")

    baseline_dataset = dict(baseline_replay.get("dataset") or {})
    candidate_dataset = dict(candidate_replay.get("dataset") or {})
    for field in ("schema_version", "dataset_id", "sha256", "case_count"):
        if baseline_dataset.get(field) != candidate_dataset.get(field):
            blockers.append(f"dataset_mismatch:{field}")

    baseline_cases = _case_map(baseline_replay)
    candidate_cases = _case_map(candidate_replay)
    if set(baseline_cases) != set(candidate_cases):
        blockers.append("case_set_mismatch")

    case_results: list[CaseComparison] = []
    for case_id in sorted(set(baseline_cases) & set(candidate_cases)):
        baseline_case = baseline_cases[case_id]
        candidate_case = candidate_cases[case_id]
        baseline_passed = bool(baseline_case.get("passed"))
        candidate_passed = bool(candidate_case.get("passed"))
        changed_fields = _changed_actual_fields(
            baseline_case.get("actual"),
            candidate_case.get("actual"),
        )
        if baseline_case.get("category") != candidate_case.get("category"):
            changed_fields.append("category")
        if baseline_case.get("violations") != candidate_case.get("violations"):
            changed_fields.append("violations")
        case_results.append(
            CaseComparison(
                case_id=case_id,
                category=str(candidate_case.get("category") or baseline_case.get("category") or "unknown"),
                status=_comparison_status(
                    baseline_passed=baseline_passed,
                    candidate_passed=candidate_passed,
                    changed=bool(changed_fields),
                ),
                changed_fields=sorted(set(changed_fields)),
                baseline_passed=baseline_passed,
                candidate_passed=candidate_passed,
            )
        )

    baseline_pairs = _pair_map(baseline_report)
    candidate_pairs = _pair_map(candidate_report)
    if bool(baseline_pairs) != bool(candidate_pairs):
        blockers.append("pair_report_shape_mismatch")
    elif baseline_pairs and set(baseline_pairs) != set(candidate_pairs):
        blockers.append("pair_set_mismatch")

    pair_results: list[PairComparison] = []
    for pair_id in sorted(set(baseline_pairs) & set(candidate_pairs)):
        baseline_pair = baseline_pairs[pair_id]
        candidate_pair = candidate_pairs[pair_id]
        baseline_passed = bool(baseline_pair.get("passed"))
        candidate_passed = bool(candidate_pair.get("passed"))
        baseline_outcome = str(baseline_pair.get("outcome") or "unknown")
        candidate_outcome = str(candidate_pair.get("outcome") or "unknown")
        changed = (
            baseline_outcome != candidate_outcome
            or baseline_pair.get("explanatory_strategy")
            != candidate_pair.get("explanatory_strategy")
            or baseline_pair.get("operational_strategy")
            != candidate_pair.get("operational_strategy")
        )
        pair_results.append(
            PairComparison(
                pair_id=pair_id,
                status=_comparison_status(
                    baseline_passed=baseline_passed,
                    candidate_passed=candidate_passed,
                    changed=changed,
                ),
                baseline_outcome=baseline_outcome,
                candidate_outcome=candidate_outcome,
                baseline_passed=baseline_passed,
                candidate_passed=candidate_passed,
            )
        )

    case_statuses = Counter(item.status for item in case_results)
    pair_statuses = Counter(item.status for item in pair_results)
    regression_count = case_statuses["regression"] + pair_statuses["regression"]
    changed_count = (
        case_statuses["changed"]
        + case_statuses["recovery"]
        + pair_statuses["changed"]
        + pair_statuses["recovery"]
    )
    if regression_count:
        blockers.append("candidate_regressions")

    compatible = not any(
        blocker.startswith(("replay_version_", "dataset_", "case_set_", "pair_report_", "pair_set_"))
        for blocker in blockers
    )
    if blockers:
        status: Literal["approved", "review_required", "blocked"] = "blocked"
    elif changed_count:
        status = "review_required"
    else:
        status = "approved"

    return RouterOfflineComparisonReport(
        comparison_version=ROUTER_OFFLINE_COMPARISON_VERSION,
        status=status,
        compatible=compatible,
        approved=status == "approved",
        review_required=status == "review_required",
        blockers=blockers,
        summary={
            "case_count": len(case_results),
            "pair_count": len(pair_results),
            "unchanged_cases": case_statuses["unchanged"],
            "changed_cases": case_statuses["changed"],
            "recovered_cases": case_statuses["recovery"],
            "regressed_cases": case_statuses["regression"],
            "unchanged_pairs": pair_statuses["unchanged"],
            "changed_pairs": pair_statuses["changed"],
            "recovered_pairs": pair_statuses["recovery"],
            "regressed_pairs": pair_statuses["regression"],
        },
        distribution_changes=_distribution_delta(
            dict(baseline_replay.get("distribution") or {}),
            dict(candidate_replay.get("distribution") or {}),
        ),
        cases=case_results,
        pairs=pair_results,
    )


def router_offline_comparison_exit_code(report: RouterOfflineComparisonReport) -> int:
    if report.status == "blocked":
        return 1
    if report.status == "review_required":
        return 2
    return 0
