from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from app.services.router_boundary_evaluation import load_router_boundary_dataset
from app.services.router_evaluation import load_router_dataset, run_router_replay
from app.services.router_execution_evaluation import (
    load_router_execution_pair_dataset,
    run_router_execution_pair_replay,
)

SERVICE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = SERVICE_ROOT / "evaluations/router-v1/dataset-v1.jsonl"
DEFAULT_BOUNDARY_DATASET = SERVICE_ROOT / "evaluations/router-v1/dataset-boundaries-v1.jsonl"
DEFAULT_EXECUTION_DATASET = (
    SERVICE_ROOT / "evaluations/router-v1/dataset-execution-pairs-v1.jsonl"
)
DEFAULT_DATASET_ID = "router-v1/dataset-v1.jsonl"
DEFAULT_BOUNDARY_DATASET_ID = "router-v1/dataset-boundaries-v1.jsonl"
DEFAULT_EXECUTION_DATASET_ID = "router-v1/dataset-execution-pairs-v1.jsonl"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Executa o replay offline dos datasets versionados do orbeRouter.",
    )
    parser.add_argument(
        "--kind",
        choices=("standard", "boundaries", "execution"),
        default="standard",
        help="Camada: funcional, fronteiras ou pares direto versus cognition.",
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        help="Caminho opcional para substituir o dataset padrão da camada.",
    )
    parser.add_argument(
        "--dataset-id",
        help="Identificador estável opcional publicado no relatório.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Arquivo JSON de saída. Sem esta opção, escreve no stdout.",
    )
    return parser.parse_args()


def _dataset_configuration(args: argparse.Namespace) -> tuple[Path, str]:
    if args.kind == "boundaries":
        return (
            args.dataset or DEFAULT_BOUNDARY_DATASET,
            args.dataset_id or DEFAULT_BOUNDARY_DATASET_ID,
        )
    if args.kind == "execution":
        return (
            args.dataset or DEFAULT_EXECUTION_DATASET,
            args.dataset_id or DEFAULT_EXECUTION_DATASET_ID,
        )
    return args.dataset or DEFAULT_DATASET, args.dataset_id or DEFAULT_DATASET_ID


def _run_report(args: argparse.Namespace, dataset_path: Path, dataset_id: str) -> tuple[dict[str, Any], int]:
    if args.kind == "execution":
        dataset = load_router_execution_pair_dataset(dataset_path, dataset_id=dataset_id)
        report = run_router_execution_pair_replay(dataset)
        failures = (
            report["replay"]["summary"]["failed_cases"]
            + report["pair_summary"]["failed_pairs"]
        )
        return report, failures

    loader = load_router_boundary_dataset if args.kind == "boundaries" else load_router_dataset
    dataset = loader(dataset_path, dataset_id=dataset_id)
    report = run_router_replay(dataset)
    return report, report["summary"]["failed_cases"]


def main() -> int:
    args = parse_args()
    dataset_path, dataset_id = _dataset_configuration(args)
    report, failures = _run_report(args, dataset_path, dataset_id)
    payload = json.dumps(report, ensure_ascii=False, indent=2) + "\n"

    if args.output is None:
        print(payload, end="")
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8")

    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
