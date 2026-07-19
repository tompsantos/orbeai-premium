from __future__ import annotations

from pathlib import Path

from app.services.router_evaluation import load_router_dataset
from app.services.router_evaluation_gate import (
    ROUTER_EVALUATION_EXIT_GATE_VERSION,
    build_router_evaluation_exit_report,
    router_evaluation_gate_exit_code,
)
from app.services.router_real_cases import write_jsonl

SERVICE_ROOT = Path(__file__).resolve().parents[1]
EVALUATION_ROOT = SERVICE_ROOT / "evaluations/router-v1"
POLICY_PATH = EVALUATION_ROOT / "exit-gate-v1.json"
STANDARD_DATASET_PATH = EVALUATION_ROOT / "dataset-v1.jsonl"
BOUNDARY_DATASET_PATH = EVALUATION_ROOT / "dataset-boundaries-v1.jsonl"
EXECUTION_DATASET_PATH = EVALUATION_ROOT / "dataset-execution-pairs-v1.jsonl"

REAL_CATEGORIES = (
    "conversation",
    "software",
    "document",
    "research",
    "risk-sensitivity",
    "execution-boundary",
)


def _build_report(real_dataset_path: Path | None = None):
    return build_router_evaluation_exit_report(
        policy_path=POLICY_PATH,
        standard_dataset_path=STANDARD_DATASET_PATH,
        boundary_dataset_path=BOUNDARY_DATASET_PATH,
        execution_dataset_path=EXECUTION_DATASET_PATH,
        real_dataset_path=real_dataset_path,
    )


def _write_reviewed_real_dataset(path: Path, *, cases_per_category: int) -> None:
    source = load_router_dataset(STANDARD_DATASET_PATH).cases[0]
    rows = []
    for category in REAL_CATEGORIES:
        for index in range(cases_per_category):
            rows.append(
                source.model_copy(
                    update={
                        "case_id": f"real-{category}-{index + 1}",
                        "category": category,
                    }
                )
            )
    write_jsonl(path, rows)


def test_current_gate_is_blocked_only_by_missing_real_dataset() -> None:
    report = _build_report()

    assert report.gate_version == ROUTER_EVALUATION_EXIT_GATE_VERSION
    assert report.status == "blocked"
    assert report.ready_for_phase6 is False
    assert report.synthetic_ready is True
    assert report.synthetic_case_count == 68
    assert report.blockers == ["real_dataset_missing"]
    assert report.standard.ready is True
    assert report.standard.case_count == 28
    assert report.boundaries.ready is True
    assert report.boundaries.case_count == 20
    assert report.execution.ready is True
    assert report.execution.case_count == 20
    assert report.execution.pair_count == 10
    assert report.execution.separated_pairs == 7
    assert report.execution.known_findings == {
        "deploy-language": "both_cognition",
        "github-language": "both_cognition",
        "terminal-language": "both_cognition",
    }
    assert report.real_cases.dataset_present is False
    assert report.real_cases.blockers == ["real_dataset_missing"]


def test_gate_becomes_ready_with_reviewed_real_coverage(tmp_path: Path) -> None:
    real_dataset_path = tmp_path / "dataset-real-v1.jsonl"
    _write_reviewed_real_dataset(real_dataset_path, cases_per_category=2)

    report = _build_report(real_dataset_path)

    assert report.status == "ready"
    assert report.ready_for_phase6 is True
    assert report.synthetic_ready is True
    assert report.real_cases_ready is True
    assert report.blockers == []
    assert report.real_cases.case_count == 12
    assert report.real_cases.failed_cases == 0
    assert report.real_cases.invalid_case_ids == []
    assert report.real_cases.category_counts == {
        category: 2 for category in sorted(REAL_CATEGORIES)
    }


def test_gate_lists_each_missing_real_category_minimum(tmp_path: Path) -> None:
    real_dataset_path = tmp_path / "dataset-real-incomplete.jsonl"
    _write_reviewed_real_dataset(real_dataset_path, cases_per_category=1)

    report = _build_report(real_dataset_path)

    assert report.ready_for_phase6 is False
    assert report.synthetic_ready is True
    assert report.real_cases.case_count == 6
    assert "real_case_minimum" in report.blockers
    for category in REAL_CATEGORIES:
        assert f"real_category_minimum:{category}" in report.blockers


def test_gate_exit_code_distinguishes_audit_and_phase_transition(tmp_path: Path) -> None:
    blocked = _build_report()
    assert router_evaluation_gate_exit_code(blocked, require_ready=False) == 0
    assert router_evaluation_gate_exit_code(blocked, require_ready=True) == 2

    real_dataset_path = tmp_path / "dataset-real-v1.jsonl"
    _write_reviewed_real_dataset(real_dataset_path, cases_per_category=2)
    ready = _build_report(real_dataset_path)
    assert router_evaluation_gate_exit_code(ready, require_ready=False) == 0
    assert router_evaluation_gate_exit_code(ready, require_ready=True) == 0
