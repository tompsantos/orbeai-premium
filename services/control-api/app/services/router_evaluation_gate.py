from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.services.router_boundary_evaluation import load_router_boundary_dataset
from app.services.router_evaluation import load_router_dataset, run_router_replay
from app.services.router_execution_evaluation import (
    load_router_execution_pair_dataset,
    run_router_execution_pair_replay,
)

ROUTER_EVALUATION_EXIT_GATE_VERSION = "router-evaluation-exit-gate-v1"


class ReplayMinimums(BaseModel):
    model_config = ConfigDict(extra="forbid")

    minimum_cases: int = Field(ge=1)
    minimum_categories: int = Field(ge=1)
    maximum_failed_cases: int = Field(ge=0)


class ExecutionMinimums(BaseModel):
    model_config = ConfigDict(extra="forbid")

    minimum_cases: int = Field(ge=1)
    minimum_pairs: int = Field(ge=1)
    minimum_pair_categories: int = Field(ge=1)
    minimum_separated_pairs: int = Field(ge=0)
    maximum_failed_cases: int = Field(ge=0)
    maximum_failed_pairs: int = Field(ge=0)


class RealCaseMinimums(BaseModel):
    model_config = ConfigDict(extra="forbid")

    minimum_cases: int = Field(ge=1)
    maximum_failed_cases: int = Field(ge=0)
    required_categories: dict[str, int]


class RouterEvaluationExitPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gate_version: Literal["router-evaluation-exit-gate-v1"]
    standard: ReplayMinimums
    boundaries: ReplayMinimums
    execution: ExecutionMinimums
    real_cases: RealCaseMinimums
    accepted_known_findings: dict[str, str]


class LayerGateResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ready: bool
    case_count: int
    category_count: int
    failed_cases: int
    blockers: list[str]


class ExecutionGateResult(LayerGateResult):
    pair_count: int
    pair_category_count: int
    separated_pairs: int
    failed_pairs: int
    known_findings: dict[str, str]


class RealCaseGateResult(LayerGateResult):
    dataset_present: bool
    category_counts: dict[str, int]
    invalid_case_ids: list[str]


class RouterEvaluationExitReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gate_version: Literal["router-evaluation-exit-gate-v1"]
    status: Literal["ready", "blocked"]
    ready_for_phase6: bool
    synthetic_ready: bool
    real_cases_ready: bool
    synthetic_case_count: int
    blockers: list[str]
    standard: LayerGateResult
    boundaries: LayerGateResult
    execution: ExecutionGateResult
    real_cases: RealCaseGateResult


def load_router_evaluation_exit_policy(path: Path) -> RouterEvaluationExitPolicy:
    return RouterEvaluationExitPolicy.model_validate_json(path.read_text(encoding="utf-8"))


def _replay_layer_result(
    *,
    layer: str,
    report: dict,
    minimums: ReplayMinimums,
) -> LayerGateResult:
    case_count = int(report["summary"]["total_cases"])
    category_count = len(report["categories"])
    failed_cases = int(report["summary"]["failed_cases"])
    blockers: list[str] = []
    if case_count < minimums.minimum_cases:
        blockers.append(f"{layer}_case_minimum")
    if category_count < minimums.minimum_categories:
        blockers.append(f"{layer}_category_minimum")
    if failed_cases > minimums.maximum_failed_cases:
        blockers.append(f"{layer}_replay_failures")
    return LayerGateResult(
        ready=not blockers,
        case_count=case_count,
        category_count=category_count,
        failed_cases=failed_cases,
        blockers=blockers,
    )


def _execution_layer_result(
    *,
    report: dict,
    pair_categories: set[str],
    minimums: ExecutionMinimums,
    accepted_known_findings: dict[str, str],
) -> ExecutionGateResult:
    replay = report["replay"]
    case_count = int(replay["summary"]["total_cases"])
    category_count = len(replay["categories"])
    failed_cases = int(replay["summary"]["failed_cases"])
    pair_count = int(report["pair_summary"]["total_pairs"])
    failed_pairs = int(report["pair_summary"]["failed_pairs"])
    separated_pairs = int(report["pair_summary"]["outcomes"].get("separated", 0))
    outcomes = {str(item["pair_id"]): str(item["outcome"]) for item in report["pairs"]}
    blockers: list[str] = []

    if case_count < minimums.minimum_cases:
        blockers.append("execution_case_minimum")
    if pair_count < minimums.minimum_pairs:
        blockers.append("execution_pair_minimum")
    if len(pair_categories) < minimums.minimum_pair_categories:
        blockers.append("execution_pair_category_minimum")
    if separated_pairs < minimums.minimum_separated_pairs:
        blockers.append("execution_separated_pair_minimum")
    if failed_cases > minimums.maximum_failed_cases:
        blockers.append("execution_replay_failures")
    if failed_pairs > minimums.maximum_failed_pairs:
        blockers.append("execution_pair_failures")

    known_findings: dict[str, str] = {}
    for pair_id, expected_outcome in accepted_known_findings.items():
        actual_outcome = outcomes.get(pair_id, "missing")
        known_findings[pair_id] = actual_outcome
        if actual_outcome != expected_outcome:
            blockers.append(f"known_finding_changed:{pair_id}")

    return ExecutionGateResult(
        ready=not blockers,
        case_count=case_count,
        category_count=category_count,
        failed_cases=failed_cases,
        blockers=blockers,
        pair_count=pair_count,
        pair_category_count=len(pair_categories),
        separated_pairs=separated_pairs,
        failed_pairs=failed_pairs,
        known_findings=known_findings,
    )


def _missing_real_case_result() -> RealCaseGateResult:
    return RealCaseGateResult(
        ready=False,
        dataset_present=False,
        case_count=0,
        category_count=0,
        failed_cases=0,
        category_counts={},
        invalid_case_ids=[],
        blockers=["real_dataset_missing"],
    )


def _real_case_result(
    *,
    report: dict,
    case_ids: list[str],
    categories: list[str],
    minimums: RealCaseMinimums,
) -> RealCaseGateResult:
    case_count = int(report["summary"]["total_cases"])
    failed_cases = int(report["summary"]["failed_cases"])
    category_counts = dict(sorted(Counter(categories).items()))
    invalid_case_ids = sorted(case_id for case_id in case_ids if not case_id.startswith("real-"))
    blockers: list[str] = []

    if invalid_case_ids:
        blockers.append("real_case_id_invalid")
    if case_count < minimums.minimum_cases:
        blockers.append("real_case_minimum")
    if failed_cases > minimums.maximum_failed_cases:
        blockers.append("real_replay_failures")
    for category, minimum in minimums.required_categories.items():
        if category_counts.get(category, 0) < minimum:
            blockers.append(f"real_category_minimum:{category}")

    return RealCaseGateResult(
        ready=not blockers,
        dataset_present=True,
        case_count=case_count,
        category_count=len(category_counts),
        failed_cases=failed_cases,
        category_counts=category_counts,
        invalid_case_ids=invalid_case_ids,
        blockers=blockers,
    )


def build_router_evaluation_exit_report(
    *,
    policy_path: Path,
    standard_dataset_path: Path,
    boundary_dataset_path: Path,
    execution_dataset_path: Path,
    real_dataset_path: Path | None = None,
) -> RouterEvaluationExitReport:
    policy = load_router_evaluation_exit_policy(policy_path)

    standard_dataset = load_router_dataset(
        standard_dataset_path,
        dataset_id="router-v1/dataset-v1.jsonl",
    )
    standard_report = run_router_replay(standard_dataset)
    standard = _replay_layer_result(
        layer="standard",
        report=standard_report,
        minimums=policy.standard,
    )

    boundary_dataset = load_router_boundary_dataset(
        boundary_dataset_path,
        dataset_id="router-v1/dataset-boundaries-v1.jsonl",
    )
    boundary_report = run_router_replay(boundary_dataset)
    boundaries = _replay_layer_result(
        layer="boundaries",
        report=boundary_report,
        minimums=policy.boundaries,
    )

    execution_dataset = load_router_execution_pair_dataset(
        execution_dataset_path,
        dataset_id="router-v1/dataset-execution-pairs-v1.jsonl",
    )
    execution_report = run_router_execution_pair_replay(execution_dataset)
    execution = _execution_layer_result(
        report=execution_report,
        pair_categories={pair.category for pair in execution_dataset.pairs},
        minimums=policy.execution,
        accepted_known_findings=policy.accepted_known_findings,
    )

    if real_dataset_path is None or not real_dataset_path.exists():
        real_cases = _missing_real_case_result()
    else:
        real_dataset = load_router_dataset(
            real_dataset_path,
            dataset_id="router-v1/dataset-real-v1.jsonl",
        )
        real_report = run_router_replay(real_dataset)
        real_cases = _real_case_result(
            report=real_report,
            case_ids=[case.case_id for case in real_dataset.cases],
            categories=[case.category for case in real_dataset.cases],
            minimums=policy.real_cases,
        )

    synthetic_ready = standard.ready and boundaries.ready and execution.ready
    blockers = [
        *standard.blockers,
        *boundaries.blockers,
        *execution.blockers,
        *real_cases.blockers,
    ]
    ready_for_phase6 = synthetic_ready and real_cases.ready and not blockers
    return RouterEvaluationExitReport(
        gate_version=ROUTER_EVALUATION_EXIT_GATE_VERSION,
        status="ready" if ready_for_phase6 else "blocked",
        ready_for_phase6=ready_for_phase6,
        synthetic_ready=synthetic_ready,
        real_cases_ready=real_cases.ready,
        synthetic_case_count=(
            standard.case_count + boundaries.case_count + execution.case_count
        ),
        blockers=blockers,
        standard=standard,
        boundaries=boundaries,
        execution=execution,
        real_cases=real_cases,
    )


def router_evaluation_gate_exit_code(
    report: RouterEvaluationExitReport,
    *,
    require_ready: bool,
) -> int:
    if not report.synthetic_ready:
        return 1
    if require_ready and not report.ready_for_phase6:
        return 2
    return 0
