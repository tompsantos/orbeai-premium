from __future__ import annotations

import json
from pathlib import Path

from app.services.router_evaluation import ROUTER_REPLAY_VERSION
from app.services.router_execution_evaluation import (
    ROUTER_EXECUTION_PAIR_SCHEMA_VERSION,
    load_router_execution_pair_dataset,
    run_router_execution_pair_replay,
)

SERVICE_ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = SERVICE_ROOT / "evaluations/router-v1/dataset-execution-pairs-v1.jsonl"
BASELINE_PATH = SERVICE_ROOT / "evaluations/router-v1/baseline-execution-pairs-v1.json"
DATASET_ID = "router-v1/dataset-execution-pairs-v1.jsonl"

REQUIRED_CATEGORIES = {
    "context-tool",
    "explicit-action",
    "length-threshold",
    "multi-step-tool",
    "tool-token-overreach",
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
    replay = report["replay"]
    return {
        "baseline_version": "router-execution-pair-baseline-v1",
        "replay_version": replay["replay_version"],
        "dataset": replay["dataset"],
        "summary": replay["summary"],
        "categories": replay["categories"],
        "distribution": replay["distribution"],
        "pair_summary": report["pair_summary"],
        "case_signatures": {
            result["case_id"]: _case_signature(result) for result in replay["cases"]
        },
        "pair_signatures": {
            pair["pair_id"]: "|".join(
                [
                    pair["outcome"],
                    pair["explanatory_strategy"],
                    pair["operational_strategy"],
                ]
            )
            for pair in report["pairs"]
        },
    }


def test_execution_pair_dataset_is_valid_unique_and_complete() -> None:
    dataset = load_router_execution_pair_dataset(DATASET_PATH, dataset_id=DATASET_ID)

    assert dataset.schema_version == ROUTER_EXECUTION_PAIR_SCHEMA_VERSION
    assert len(dataset.pairs) == 10
    assert len(dataset.cases) == 20
    assert len({pair.pair_id for pair in dataset.pairs}) == len(dataset.pairs)
    assert len({case.case_id for case in dataset.cases}) == len(dataset.cases)
    assert {pair.category for pair in dataset.pairs} == REQUIRED_CATEGORIES


def test_execution_pair_dataset_materializes_long_form_boundary() -> None:
    dataset = load_router_execution_pair_dataset(DATASET_PATH, dataset_id=DATASET_ID)
    lengths = {case.case_id: len(case.request.content) for case in dataset.cases}

    assert lengths["length-action-explanatory"] == 2500
    assert lengths["length-action-operational"] == 2501


def test_execution_pairs_match_committed_baseline() -> None:
    dataset = load_router_execution_pair_dataset(DATASET_PATH, dataset_id=DATASET_ID)
    report = run_router_execution_pair_replay(dataset)
    committed_baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))

    assert report["replay"]["replay_version"] == ROUTER_REPLAY_VERSION
    assert report["replay"]["summary"] == {
        "total_cases": 20,
        "passed_cases": 20,
        "failed_cases": 0,
        "pass_rate": 1.0,
    }
    assert report["pair_summary"] == {
        "total_pairs": 10,
        "passed_pairs": 10,
        "failed_pairs": 0,
        "outcomes": {"both_cognition": 3, "separated": 7},
    }
    assert _baseline_snapshot(report) == committed_baseline


def test_tool_token_overreach_is_visible_as_both_cognition() -> None:
    dataset = load_router_execution_pair_dataset(DATASET_PATH, dataset_id=DATASET_ID)
    report = run_router_execution_pair_replay(dataset)
    pairs = {pair["pair_id"]: pair for pair in report["pairs"]}

    for pair_id in ("github-language", "terminal-language", "deploy-language"):
        pair = pairs[pair_id]
        assert pair["passed"] is True
        assert pair["outcome"] == "both_cognition"
        assert pair["explanatory_strategy"] == "cognition"
        assert pair["operational_strategy"] == "cognition"
