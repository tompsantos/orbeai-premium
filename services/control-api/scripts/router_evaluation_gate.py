from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.services.router_evaluation_gate import (
    build_router_evaluation_exit_report,
    router_evaluation_gate_exit_code,
)

SERVICE_ROOT = Path(__file__).resolve().parents[1]
EVALUATION_ROOT = SERVICE_ROOT / "evaluations/router-v1"
DEFAULT_POLICY = EVALUATION_ROOT / "exit-gate-v1.json"
DEFAULT_STANDARD_DATASET = EVALUATION_ROOT / "dataset-v1.jsonl"
DEFAULT_BOUNDARY_DATASET = EVALUATION_ROOT / "dataset-boundaries-v1.jsonl"
DEFAULT_EXECUTION_DATASET = EVALUATION_ROOT / "dataset-execution-pairs-v1.jsonl"
DEFAULT_REAL_DATASET = EVALUATION_ROOT / "dataset-real-v1.jsonl"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Avalia os critérios quantitativos de saída da fase 5 do orbeRouter.",
    )
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--standard-dataset", type=Path, default=DEFAULT_STANDARD_DATASET)
    parser.add_argument("--boundary-dataset", type=Path, default=DEFAULT_BOUNDARY_DATASET)
    parser.add_argument("--execution-dataset", type=Path, default=DEFAULT_EXECUTION_DATASET)
    parser.add_argument("--real-dataset", type=Path, default=DEFAULT_REAL_DATASET)
    parser.add_argument("--output", type=Path)
    parser.add_argument(
        "--require-ready",
        action="store_true",
        help="Retorna código 2 enquanto a fase 5 não estiver pronta para avançar.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = build_router_evaluation_exit_report(
        policy_path=args.policy,
        standard_dataset_path=args.standard_dataset,
        boundary_dataset_path=args.boundary_dataset,
        execution_dataset_path=args.execution_dataset,
        real_dataset_path=args.real_dataset,
    )
    payload = json.dumps(report.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n"

    if args.output is None:
        print(payload, end="")
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8")

    return router_evaluation_gate_exit_code(report, require_ready=args.require_ready)


if __name__ == "__main__":
    raise SystemExit(main())
