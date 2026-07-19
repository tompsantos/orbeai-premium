from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.services.router_evaluation import (
    ROUTER_CASE_SCHEMA_VERSION,
    RouterCaseEnvironment,
    RouterCaseExpected,
    RouterCaseRequest,
    RouterEvaluationCase,
    RouterReplayDataset,
)

ROUTER_BOUNDARY_CASE_SCHEMA_VERSION = "router-boundary-case-v1"


class RouterBoundaryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content_prefix: str = Field(min_length=1)
    target_length: int | None = Field(default=None, ge=1)
    mode: str = Field(min_length=1)
    model_preference: str = Field(min_length=1)
    routing_mode: str = Field(min_length=1)
    memory_context_count: int = Field(default=0, ge=0)
    knowledge_context_count: int = Field(default=0, ge=0)
    cognition_enabled: bool = True

    @model_validator(mode="after")
    def validate_target_length(self) -> RouterBoundaryRequest:
        if self.target_length is not None and self.target_length < len(self.content_prefix):
            raise ValueError("target_length cannot be shorter than content_prefix")
        return self

    def materialize_content(self) -> str:
        if self.target_length is None:
            return self.content_prefix
        return self.content_prefix + ("x" * (self.target_length - len(self.content_prefix)))


class RouterBoundaryCase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["router-boundary-case-v1"]
    case_id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]+$")
    category: str = Field(min_length=1)
    request: RouterBoundaryRequest
    environment: RouterCaseEnvironment
    expected: RouterCaseExpected

    def materialize(self) -> RouterEvaluationCase:
        return RouterEvaluationCase(
            schema_version=ROUTER_CASE_SCHEMA_VERSION,
            case_id=self.case_id,
            category=self.category,
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


def load_router_boundary_dataset(
    path: Path,
    *,
    dataset_id: str | None = None,
) -> RouterReplayDataset:
    raw = path.read_bytes()
    materialized_cases: list[RouterEvaluationCase] = []
    seen_ids: set[str] = set()

    for line_number, raw_line in enumerate(raw.decode("utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"invalid JSON at boundary dataset line {line_number}: {exc.msg}"
            ) from exc
        boundary_case = RouterBoundaryCase.model_validate(payload)
        if boundary_case.case_id in seen_ids:
            raise ValueError(f"duplicate router boundary case id: {boundary_case.case_id}")
        seen_ids.add(boundary_case.case_id)
        materialized_cases.append(boundary_case.materialize())

    if not materialized_cases:
        raise ValueError("router boundary dataset is empty")

    return RouterReplayDataset(
        schema_version=ROUTER_BOUNDARY_CASE_SCHEMA_VERSION,
        dataset_id=dataset_id or path.name,
        sha256=hashlib.sha256(raw).hexdigest(),
        cases=materialized_cases,
    )
