from __future__ import annotations

from copy import deepcopy
from pathlib import Path

from app.services.router_evaluation import load_router_dataset, run_router_replay
from app.services.router_execution_evaluation import (
    load_router_execution_pair_dataset,
    run_router_execution_pair_replay,
)
from app.services.router_offline_comparison import (
    ROUTER_OFFLINE_COMPARISON_VERSION,
    compare_router_reports,
    router_offline_comparison_exit_code,
)

SERVICE_ROOT = Path(__file__).resolve().parents[1]
EVALUATION_ROOT = SERVICE_ROOT / "evaluations/router-v1"
STANDARD_DATASET_PATH = EVALUATION_ROOT / "dataset-v1.jsonl"
EXECUTION_DATASET_PATH = EVALUATION_ROOT / "dataset-execution-pairs-v1.jsonl"


def _standard_report() -> dict:
    dataset = load_router_dataset(
        STANDARD_DATASET_PATH,
        dataset_id="router-v1/dataset-v1.jsonl",
    )
    return run_router_replay(dataset)


def _execution_report() -> dict:
    dataset = load_router_execution_pair_dataset(
        EXECUTION_DATASET_PATH,
        dataset_id="router-v1/dataset-execution-pairs-v1.jsonl",
    )
    return run_router_execution_pair_replay(dataset)


def test_identical_reports_are_approved() -> None:
    baseline = _standard_report()
    report = compare_router_reports(baseline, deepcopy(baseline))

    assert report.comparison_version == ROUTER_OFFLINE_COMPARISON_VERSION
    assert report.status == "approved"
    assert report.compatible is True
    assert report.approved is True
    assert report.review_required is False
    assert report.blockers == []
    assert report.summary["case_count"] == 28
    assert report.summary["unchanged_cases"] == 28
    assert report.summary["changed_cases"] == 0
    assert router_offline_comparison_exit_code(report) == 0


def test_change_inside_contract_requires_review() -> None:
    baseline = _standard_report()
    candidate = deepcopy(baseline)
    candidate["cases"][0]["actual"]["provider_name"] = "candidate provider label"

    report = compare_router_reports(baseline, candidate)

    assert report.status == "review_required"
    assert report.compatible is True
    assert report.approved is False
    assert report.review_required is True
    assert report.blockers == []
    assert report.summary["changed_cases"] == 1
    changed = next(case for case in report.cases if case.status == "changed")
    assert changed.changed_fields == ["provider_name"]
    assert router_offline_comparison_exit_code(report) == 2


def test_candidate_failure_is_blocked_as_regression() -> None:
    baseline = _standard_report()
    candidate = deepcopy(baseline)
    candidate["cases"][0]["passed"] = False
    candidate["cases"][0]["violations"] = ["candidate regression"]
    candidate["summary"]["passed_cases"] -= 1
    candidate["summary"]["failed_cases"] += 1

    report = compare_router_reports(baseline, candidate)

    assert report.status == "blocked"
    assert report.compatible is True
    assert report.approved is False
    assert report.blockers == ["candidate_regressions"]
    assert report.summary["regressed_cases"] == 1
    assert router_offline_comparison_exit_code(report) == 1


def test_dataset_mismatch_is_incompatible() -> None:
    baseline = _standard_report()
    candidate = deepcopy(baseline)
    candidate["dataset"]["sha256"] = "different-dataset"

    report = compare_router_reports(baseline, candidate)

    assert report.status == "blocked"
    assert report.compatible is False
    assert report.blockers == ["dataset_mismatch:sha256"]
    assert router_offline_comparison_exit_code(report) == 1


def test_execution_pair_outcome_change_requires_review() -> None:
    baseline = _execution_report()
    candidate = deepcopy(baseline)
    target = next(pair for pair in candidate["pairs"] if pair["pair_id"] == "github-language")
    target["outcome"] = "separated"
    target["explanatory_strategy"] = "direct_provider"

    report = compare_router_reports(baseline, candidate)

    assert report.status == "review_required"
    assert report.compatible is True
    assert report.summary["pair_count"] == 10
    assert report.summary["changed_pairs"] == 1
    pair = next(item for item in report.pairs if item.pair_id == "github-language")
    assert pair.status == "changed"
    assert pair.baseline_outcome == "both_cognition"
    assert pair.candidate_outcome == "separated"
    assert router_offline_comparison_exit_code(report) == 2
