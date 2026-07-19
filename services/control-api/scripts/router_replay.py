from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.services.router_evaluation import load_router_dataset, run_router_replay

SERVICE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = SERVICE_ROOT / "evaluations/router-v1/dataset-v1.jsonl"
DEFAULT_DATASET_ID = "router-v1/dataset-v1.jsonl"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Executa o replay offline do dataset versionado do orbeRouter.",
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        default=DEFAULT_DATASET,
        help="Caminho para o dataset JSONL.",
    )
    parser.add_argument(
        "--dataset-id",
        default=DEFAULT_DATASET_ID,
        help="Identificador estável publicado no relatório.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Arquivo JSON de saída. Sem esta opção, escreve no stdout.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    dataset = load_router_dataset(args.dataset, dataset_id=args.dataset_id)
    report = run_router_replay(dataset)
    payload = json.dumps(report, ensure_ascii=False, indent=2) + "\n"

    if args.output is None:
        print(payload, end="")
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8")

    return 0 if report["summary"]["failed_cases"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
