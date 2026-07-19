from __future__ import annotations

import argparse
import os
from pathlib import Path

from app.db.session import SessionLocal
from app.services.router_real_case_review import (
    run_review_session,
    validate_phase5_review_session,
)
from app.services.router_real_cases import (
    RouterRealCaseCandidate,
    RouterRealCaseReview,
    extract_real_case_candidates,
    load_jsonl,
    promote_reviewed_cases,
    review_template,
    write_jsonl,
)

SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
DEFAULT_SECRET_ENV = "ROUTER_EVAL_EXPORT_SECRET"


def _path_is_inside(path: Path, parent: Path) -> bool:
    try:
        path.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def _require_quarantine_path(path: Path, *, allow_repository_output: bool) -> None:
    if not allow_repository_output and _path_is_inside(path, REPOSITORY_ROOT):
        raise ValueError(
            "candidate and review files must stay outside the repository; "
            "use --allow-repository-output only for disposable test fixtures"
        )


def _secret(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ValueError(f"required environment variable is missing: {name}")
    return value


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Exporta, revisa e promove casos reais sanitizados do orbeRouter.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    export = subparsers.add_parser(
        "export",
        help="Exporta candidatos sem texto ou ids crus para uma quarentena externa.",
    )
    export.add_argument("--workspace-id", required=True)
    export.add_argument("--output", required=True, type=Path)
    export.add_argument("--limit", type=int, default=300)
    export.add_argument("--secret-env", default=DEFAULT_SECRET_ENV)
    export.add_argument("--allow-repository-output", action="store_true")

    template = subparsers.add_parser(
        "review-template",
        help="Cria um arquivo de revisão inicialmente rejeitado para cada candidato.",
    )
    template.add_argument("--candidates", required=True, type=Path)
    template.add_argument("--output", required=True, type=Path)
    template.add_argument("--allow-repository-output", action="store_true")

    review_session = subparsers.add_parser(
        "review-session",
        help=(
            "Abre uma sessão local em 127.0.0.1 para revisar fontes em memória "
            "e salvar somente paráfrases sanitizadas."
        ),
    )
    review_session.add_argument("--workspace-id", required=True)
    review_session.add_argument("--candidates", required=True, type=Path)
    review_session.add_argument("--reviews", required=True, type=Path)
    review_session.add_argument("--summary", required=True, type=Path)
    review_session.add_argument("--limit", type=int, default=300)
    review_session.add_argument("--port", type=int, default=8765)
    review_session.add_argument("--secret-env", default=DEFAULT_SECRET_ENV)
    review_session.add_argument("--resume", action="store_true")
    review_session.add_argument("--allow-repository-output", action="store_true")

    promote = subparsers.add_parser(
        "promote",
        help="Promove somente revisões aceitas e sanitizadas para router-case-v1.",
    )
    promote.add_argument("--candidates", required=True, type=Path)
    promote.add_argument("--reviews", required=True, type=Path)
    promote.add_argument("--output", required=True, type=Path)
    promote.add_argument("--secret-env", default=DEFAULT_SECRET_ENV)
    promote.add_argument("--review-session-summary", type=Path)
    promote.add_argument("--require-phase5-coverage", action="store_true")

    return parser


def _export(args: argparse.Namespace) -> int:
    _require_quarantine_path(
        args.output,
        allow_repository_output=args.allow_repository_output,
    )
    with SessionLocal() as db:
        candidates = extract_real_case_candidates(
            db,
            workspace_id=args.workspace_id,
            export_secret=_secret(args.secret_env),
            limit=max(1, min(args.limit, 1_000)),
        )
    write_jsonl(args.output, candidates)
    print(f"candidatos exportados: {len(candidates)}")
    print(f"arquivo de quarentena: {args.output.resolve()}")
    print("conteúdo bruto incluído: não")
    return 0


def _review_template(args: argparse.Namespace) -> int:
    _require_quarantine_path(
        args.output,
        allow_repository_output=args.allow_repository_output,
    )
    candidates = [
        item
        for item in load_jsonl(args.candidates, RouterRealCaseCandidate)
        if isinstance(item, RouterRealCaseCandidate)
    ]
    write_jsonl(args.output, review_template(candidates))
    print(f"linhas para revisão: {len(candidates)}")
    print("estado inicial: reject")
    return 0


def _review_session(args: argparse.Namespace) -> int:
    for path in (args.candidates, args.reviews, args.summary):
        _require_quarantine_path(
            path,
            allow_repository_output=args.allow_repository_output,
        )
    with SessionLocal() as db:
        return run_review_session(
            db,
            workspace_id=args.workspace_id,
            export_secret=_secret(args.secret_env),
            candidates_path=args.candidates,
            reviews_path=args.reviews,
            summary_path=args.summary,
            limit=max(1, min(args.limit, 1_000)),
            port=args.port,
            resume=args.resume,
        )


def _promote(args: argparse.Namespace) -> int:
    candidates = [
        item
        for item in load_jsonl(args.candidates, RouterRealCaseCandidate)
        if isinstance(item, RouterRealCaseCandidate)
    ]
    reviews = [
        item
        for item in load_jsonl(args.reviews, RouterRealCaseReview)
        if isinstance(item, RouterRealCaseReview)
    ]
    if args.require_phase5_coverage:
        if args.review_session_summary is None:
            raise ValueError(
                "--review-session-summary is required with --require-phase5-coverage"
            )
        validate_phase5_review_session(
            reviews=reviews,
            summary_path=args.review_session_summary,
        )
    cases = promote_reviewed_cases(
        candidates=candidates,
        reviews=reviews,
        export_secret=_secret(args.secret_env),
    )
    write_jsonl(args.output, cases)
    print(f"casos promovidos: {len(cases)}")
    print(f"dataset revisado: {args.output.resolve()}")
    return 0


def main() -> int:
    args = _parser().parse_args()
    if args.command == "export":
        return _export(args)
    if args.command == "review-template":
        return _review_template(args)
    if args.command == "review-session":
        return _review_session(args)
    if args.command == "promote":
        return _promote(args)
    raise RuntimeError(f"unsupported command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
