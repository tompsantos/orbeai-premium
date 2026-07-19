from __future__ import annotations

import json
from pathlib import Path

from app.services.router_boundary_evaluation import (
    ROUTER_BOUNDARY_CASE_SCHEMA_VERSION,
    load_router_boundary_dataset,
)
from app.services.router_evaluation import ROUTER_REPLAY_VERSION, run_router_replay

SERVICE_ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = SERVICE_ROOT / "evaluations/router-v1/dataset-boundaries-v1.jsonl"
BASELINE_PATH = SERVICE_ROOT / "evaluations/router-v1/baseline-boundaries-v1.json"
DATASET_ID = "router-v1/dataset-boundaries-v1.jsonl"

REQUIRED_CATEGORIES = {
    "cognition-availability",
    "cognition-disabled",
    "context-precedence",
    "hint-threshold",
    "length-threshold",
    "manual-cognition",
    "provider-precedence",
    "tool-ambiguity",
}


def _case_signature(result: dict) -> str:
    actual = result["actual"]
    return "|".join(
        [
            actual["route_kind"],
            actual["execution_strategy"],
            actual["provider_slug"],
            actual["primary_provider_slug"],
            ",".join(actual["reason_codes"]),
            ",".join(actual["capability_ids"]),
            ",".join(actual["provider_chain"]),
            "1" if actual["is_fallback"] else "0",
        ]
    )


def _baseline_snapshot(report: dict) -> dict:
    return {
        "baseline_version": "router-boundary-baseline-v1",
        "replay_version": report["replay_version"],
        "dataset": report["dataset"],
        "summary": report["summary"],
        "categories": report["categories"],
        "distribution": report["distribution"],
        "case_signatures": {
            result["case_id"]: _case_signature(result) for result in report["cases"]
        },
    }


def test_boundary_dataset_is_valid_unique_and_covers_required_categories() -> None:
    dataset = load_router_boundary_dataset(DATASET_PATH, dataset_id=DATASET_ID)

    assert dataset.schema_version == ROUTER_BOUNDARY_CASE_SCHEMA_VERSION
    assert len(dataset.cases) == 20
    assert len({case.case_id for case in dataset.cases}) == len(dataset.cases)
    assert {case.category for case in dataset.cases} == REQUIRED_CATEGORIES


def test_boundary_dataset_materializes_exact_length_thresholds() -> None:
    dataset = load_router_boundary_dataset(DATASET_PATH, dataset_id=DATASET_ID)
    lengths = {case.case_id: len(case.request.content) for case in dataset.cases}

    assert lengths["length-900-low"] == 900
    assert lengths["length-901-medium"] == 901
    assert lengths["length-2500-medium"] == 2500
    assert lengths["length-2501-high"] == 2501
    assert lengths["high-complexity-with-cognition-disabled"] == 2501
    assert lengths["high-complexity-primary-unavailable"] == 2501


def test_router_boundaries_match_committed_baseline() -> None:
    dataset = load_router_boundary_dataset(DATASET_PATH, dataset_id=DATASET_ID)
    report = run_router_replay(dataset)
    committed_baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))

    assert report["replay_version"] == ROUTER_REPLAY_VERSION
    assert report["summary"] == {
        "total_cases": 20,
        "passed_cases": 20,
        "failed_cases": 0,
        "pass_rate": 1.0,
    }
    assert _baseline_snapshot(report) == committed_baseline


def test_current_tool_ambiguities_remain_visible_in_the_baseline() -> None:
    dataset = load_router_boundary_dataset(DATASET_PATH, dataset_id=DATASET_ID)
    report = run_router_replay(dataset)
    results = {result["case_id"]: result for result in report["cases"]}

    for case_id in ("negated-tool-github", "explanatory-github"):
        result = results[case_id]
        assert result["passed"] is True
        assert result["actual"]["route_kind"] == "cognition"
        assert result["actual"]["classification"]["requires_tools"] is True
        assert "tool_required" in result["actual"]["reason_codes"]
