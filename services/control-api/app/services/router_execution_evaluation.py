from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.services.router_boundary_evaluation import RouterBoundaryRequest
from app.services.router_evaluation import (
    ROUTER_CASE_SCHEMA_VERSION,
    RouterCaseEnvironment,
    RouterCaseExpected,
    RouterCaseRequest,
    RouterEvaluationCase,
    RouterReplayDataset,
    run_router_replay,
)

ROUTER_EXECUTION_PAIR_SCHEMA_VERSION = "router-execution-pair-v1"


class RouterExecutionVariant(BaseModel):
    model_config = ConfigDict(extra="forbid")

    request: RouterBoundaryRequest
    environment: RouterCaseEnvironment
    expected: RouterCaseExpected

    def materialize(self, *, case_id: str, category: str) -> RouterEvaluationCase:
        return RouterEvaluationCase(
            schema_version=ROUTER_CASE_SCHEMA_VERSION,
            case_id=case_id,
            category=category,
            request=RouterCaseRequest(
                content=self.request.materialize_content(),
                mode=self.request.mode,
                model_preference=self.request.model_preference,
                routing_mode=self.request.routing_mode,
                memory_context_count=self.request.memory_context_count,
                knowledge_context_count=self.request.knowledge_context_count,
                cognition_enabled=self.request.cognition_enabled,
            ),
            environment=self.environment,
            expected=self.expected,
        )


class RouterExecutionPairCase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["router-execution-pair-v1"]
    pair_id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]+$")
    category: str = Field(min_length=1)
    explanatory: RouterExecutionVariant
    operational: RouterExecutionVariant

    def materialized_cases(self) -> tuple[RouterEvaluationCase, RouterEvaluationCase]:
        return (
            self.explanatory.materialize(
                case_id=f"{self.pair_id}-explanatory",
                category=self.category,
            ),
            self.operational.materialize(
                case_id=f"{self.pair_id}-operational",
                category=self.category,
            ),
        )


class RouterExecutionPairDataset(BaseModel):
    schema_version: str
    dataset_id: str
    sha256: str
    pairs: list[RouterExecutionPairCase]
    cases: list[RouterEvaluationCase]

    def replay_dataset(self) -> RouterReplayDataset:
        return RouterReplayDataset(
            schema_version=self.schema_version,
            dataset_id=self.dataset_id,
            sha256=self.sha256,
            cases=self.cases,
        )


def load_router_execution_pair_dataset(
    path: Path,
    *,
    dataset_id: str | None = None,
) -> RouterExecutionPairDataset:
    raw = path.read_bytes()
    pairs: list[RouterExecutionPairCase] = []
    cases: list[RouterEvaluationCase] = []
    seen_pair_ids: set[str] = set()

    for line_number, raw_line in enumerate(raw.decode("utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"invalid JSON at execution dataset line {line_number}: {exc.msg}"
            ) from exc
        pair = RouterExecutionPairCase.model_validate(payload)
        if pair.pair_id in seen_pair_ids:
            raise ValueError(f"duplicate router execution pair id: {pair.pair_id}")
        seen_pair_ids.add(pair.pair_id)
        pairs.append(pair)
        cases.extend(pair.materialized_cases())

    if not pairs:
        raise ValueError("router execution pair dataset is empty")

    return RouterExecutionPairDataset(
        schema_version=ROUTER_EXECUTION_PAIR_SCHEMA_VERSION,
        dataset_id=dataset_id or path.name,
        sha256=hashlib.sha256(raw).hexdigest(),
        pairs=pairs,
        cases=cases,
    )


def _pair_outcome(explanatory_strategy: str, operational_strategy: str) -> str:
    if explanatory_strategy == "direct_provider" and operational_strategy == "cognition":
        return "separated"
    if explanatory_strategy == "cognition" and operational_strategy == "cognition":
        return "both_cognition"
    if explanatory_strategy == "direct_provider" and operational_strategy == "direct_provider":
        return "both_direct"
    return "mixed"


def run_router_execution_pair_replay(dataset: RouterExecutionPairDataset) -> dict[str, Any]:
    replay = run_router_replay(dataset.replay_dataset())
    cases_by_id = {result["case_id"]: result for result in replay["cases"]}
    outcomes: list[dict[str, Any]] = []
    outcome_counts: Counter[str] = Counter()

    for pair in dataset.pairs:
        explanatory = cases_by_id[f"{pair.pair_id}-explanatory"]
        operational = cases_by_id[f"{pair.pair_id}-operational"]
        explanatory_strategy = explanatory["actual"]["execution_strategy"]
        operational_strategy = operational["actual"]["execution_strategy"]
        outcome = _pair_outcome(explanatory_strategy, operational_strategy)
        passed = explanatory["passed"] and operational["passed"]
        outcome_counts[outcome] += 1
        outcomes.append(
            {
                "pair_id": pair.pair_id,
                "category": pair.category,
                "passed": passed,
                "outcome": outcome,
                "explanatory_strategy": explanatory_strategy,
                "operational_strategy": operational_strategy,
            }
        )

    passed_pairs = sum(1 for outcome in outcomes if outcome["passed"])
    return {
        "replay": replay,
        "pair_summary": {
            "total_pairs": len(outcomes),
            "passed_pairs": passed_pairs,
            "failed_pairs": len(outcomes) - passed_pairs,
            "outcomes": dict(sorted(outcome_counts.items())),
        },
        "pairs": outcomes,
    }
