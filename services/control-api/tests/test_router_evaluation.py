from __future__ import annotations

import json
from pathlib import Path

from app.services.router_evaluation import (
    ROUTER_CASE_SCHEMA_VERSION,
    ROUTER_REPLAY_VERSION,
    evaluate_router_case,
    load_router_dataset,
    run_router_replay,
)

SERVICE_ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = SERVICE_ROOT / "evaluations/router-v1/dataset-v1.jsonl"
BASELINE_PATH = SERVICE_ROOT / "evaluations/router-v1/baseline-v1.json"
DATASET_ID = "router-v1/dataset-v1.jsonl"

REQUIRED_CATEGORIES = {
    "availability",
    "code",
    "cognition",
    "complexity",
    "context",
    "conversation",
    "document",
    "government",
    "knowledge",
    "manual",
    "memory",
    "research",
    "risk",
    "routing-policy",
    "sensitivity",
    "strategy",
    "writing",
}


def _baseline_snapshot(report: dict) -> dict:
    return {
        "baseline_version": "router-baseline-v1",
        "replay_version": report["replay_version"],
        "dataset": report["dataset"],
        "summary": report["summary"],
        "categories": report["categories"],
        "distribution": report["distribution"],
        "cases": [
            {
                "case_id": result["case_id"],
                "category": result["category"],
                "passed": result["passed"],
                "route_kind": result["actual"]["route_kind"],
                "execution_strategy": result["actual"]["execution_strategy"],
                "provider_slug": result["actual"]["provider_slug"],
                "primary_provider_slug": result["actual"]["primary_provider_slug"],
                "reason_codes": result["actual"]["reason_codes"],
                "capability_ids": result["actual"]["capability_ids"],
                "provider_chain": result["actual"]["provider_chain"],
                "is_fallback": result["actual"]["is_fallback"],
            }
            for result in report["cases"]
        ],
    }


def test_router_dataset_v1_is_valid_unique_and_covers_required_categories() -> None:
    dataset = load_router_dataset(DATASET_PATH, dataset_id=DATASET_ID)

    assert dataset.schema_version == ROUTER_CASE_SCHEMA_VERSION
    assert len(dataset.cases) == 28
    assert len({case.case_id for case in dataset.cases}) == len(dataset.cases)
    assert {case.category for case in dataset.cases} == REQUIRED_CATEGORIES


def test_router_v1_matches_committed_baseline() -> None:
    dataset = load_router_dataset(DATASET_PATH, dataset_id=DATASET_ID)
    report = run_router_replay(dataset)
    committed_baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))

    assert report["replay_version"] == ROUTER_REPLAY_VERSION
    assert report["summary"] == {
        "total_cases": 28,
        "passed_cases": 28,
        "failed_cases": 0,
        "pass_rate": 1.0,
    }
    assert _baseline_snapshot(report) == committed_baseline


def test_replay_reports_a_contract_violation_without_calling_a_provider() -> None:
    dataset = load_router_dataset(DATASET_PATH, dataset_id=DATASET_ID)
    case = dataset.cases[0].model_copy(deep=True)
    case.expected.allowed_route_kinds = ["blocked"]

    result = evaluate_router_case(case)

    assert result["passed"] is False
    assert any("route_kind" in violation for violation in result["violations"])
    assert result["actual"]["router_version"] == "orbe-router-v1"
