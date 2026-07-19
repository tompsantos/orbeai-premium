from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.services.router_offline_comparison import (
    compare_router_reports,
    router_offline_comparison_exit_code,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compara offline um relatório candidato com o baseline ativo do orbeRouter.",
    )
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def _load_report(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"router report must be a JSON object: {path}")
    return payload


def main() -> int:
    args = parse_args()
    report = compare_router_reports(
        _load_report(args.baseline),
        _load_report(args.candidate),
    )
    payload = json.dumps(report.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n"

    if args.output is None:
        print(payload, end="")
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8")

    return router_offline_comparison_exit_code(report)


if __name__ == "__main__":
    raise SystemExit(main())
