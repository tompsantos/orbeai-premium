from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import timedelta
from os import getenv

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.models import ModelRun, ProviderAttemptRecord
from app.models.core import utc_now
from app.services.model_profiles import ModelProfile

MODEL_TELEMETRY_VERSION = "model-telemetry-v1"


@dataclass(frozen=True)
class ModelTelemetry:
    telemetry_version: str
    window_days: int
    window_started_at: str
    attempt_sample_count: int
    executed_attempt_count: int
    success_count: int
    failure_count: int
    skipped_count: int
    timeout_count: int
    success_rate: float | None
    timeout_rate: float | None
    latency_p50_ms: int | None
    latency_p95_ms: int | None
    run_sample_count: int
    token_sample_count: int
    input_tokens_total: int
    output_tokens_total: int
    cost_status: str
    cost_sample_count: int
    estimated_cost_usd_total: float | None
    last_attempt_at: str | None

    def persisted_payload(self) -> dict[str, object]:
        return {
            "telemetry_version": self.telemetry_version,
            "window_days": self.window_days,
            "window_started_at": self.window_started_at,
            "attempt_sample_count": self.attempt_sample_count,
            "executed_attempt_count": self.executed_attempt_count,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "skipped_count": self.skipped_count,
            "timeout_count": self.timeout_count,
            "success_rate": self.success_rate,
            "timeout_rate": self.timeout_rate,
            "latency_p50_ms": self.latency_p50_ms,
            "latency_p95_ms": self.latency_p95_ms,
            "run_sample_count": self.run_sample_count,
            "token_sample_count": self.token_sample_count,
            "input_tokens_total": self.input_tokens_total,
            "output_tokens_total": self.output_tokens_total,
            "cost_status": self.cost_status,
            "cost_sample_count": self.cost_sample_count,
            "estimated_cost_usd_total": self.estimated_cost_usd_total,
            "last_attempt_at": self.last_attempt_at,
        }


def percentile(values: Iterable[int], probability: float) -> int | None:
    ordered = sorted(max(0, int(value)) for value in values)
    if not ordered:
        return None
    if len(ordered) == 1:
        return ordered[0]

    position = (len(ordered) - 1) * probability
    lower_index = int(position)
    upper_index = min(lower_index + 1, len(ordered) - 1)
    fraction = position - lower_index
    interpolated = ordered[lower_index] + (
        ordered[upper_index] - ordered[lower_index]
    ) * fraction
    return int(round(interpolated))


def _env_float(name: str) -> float:
    raw = getenv(name)
    if not raw:
        return 0.0
    try:
        return float(raw)
    except ValueError:
        return 0.0


def _price_configured(provider_slug: str, settings: Settings) -> bool:
    if provider_slug == "mock":
        return True
    if provider_slug == "openai":
        return any(
            value > 0
            for value in (
                settings.openai_input_price_per_m_tokens,
                settings.openai_output_price_per_m_tokens,
            )
        )
    if provider_slug == "gemini":
        return any(
            value > 0
            for value in (
                settings.gemini_input_price_per_m_tokens,
                settings.gemini_output_price_per_m_tokens,
            )
        )
    if provider_slug == "nvidia":
        return any(
            value > 0
            for value in (
                _env_float("NVIDIA_INPUT_PRICE_PER_M_TOKENS"),
                _env_float("NVIDIA_OUTPUT_PRICE_PER_M_TOKENS"),
            )
        )
    return False


def _run_provider_slug(provider_name: str) -> str:
    return "mock" if provider_name == "orbe-mock" else provider_name


def _cost_metrics(
    provider_slug: str,
    runs: list[ModelRun],
    settings: Settings,
) -> tuple[str, int, float | None]:
    if provider_slug == "mock":
        return "not_applicable", len(runs), 0.0 if runs else None
    if not _price_configured(provider_slug, settings):
        return "not_configured", 0, None

    samples = [
        float(run.estimated_cost_usd)
        for run in runs
        if run.estimated_cost_usd is not None and float(run.estimated_cost_usd) > 0
    ]
    if not samples:
        return "configured_no_samples", 0, None
    return "configured", len(samples), round(sum(samples), 8)


def build_model_telemetry_map(
    db: Session,
    *,
    workspace_id: str,
    profiles: Iterable[ModelProfile],
    window_days: int = 30,
    settings: Settings | None = None,
) -> dict[tuple[str, str], ModelTelemetry]:
    settings = settings or get_settings()
    window_started_at = utc_now() - timedelta(days=window_days)

    attempt_rows = list(
        db.scalars(
            select(ProviderAttemptRecord)
            .where(ProviderAttemptRecord.workspace_id == workspace_id)
            .where(ProviderAttemptRecord.created_at >= window_started_at)
            .order_by(ProviderAttemptRecord.created_at.asc())
        )
    )
    run_rows = list(
        db.scalars(
            select(ModelRun)
            .where(ModelRun.workspace_id == workspace_id)
            .where(ModelRun.created_at >= window_started_at)
            .order_by(ModelRun.created_at.asc())
        )
    )

    attempts_by_key: dict[tuple[str, str], list[ProviderAttemptRecord]] = defaultdict(list)
    for attempt in attempt_rows:
        attempts_by_key[(attempt.provider_slug, attempt.model_name)].append(attempt)

    runs_by_key: dict[tuple[str, str], list[ModelRun]] = defaultdict(list)
    for run in run_rows:
        runs_by_key[(_run_provider_slug(run.provider_name), run.model_name)].append(run)

    telemetry: dict[tuple[str, str], ModelTelemetry] = {}
    for profile in profiles:
        key = (profile.provider_slug, profile.model_name)
        attempts = attempts_by_key.get(key, [])
        runs = runs_by_key.get(key, [])
        executed = [attempt for attempt in attempts if attempt.status in {"success", "failed"}]
        successes = [attempt for attempt in executed if attempt.status == "success"]
        failures = [attempt for attempt in executed if attempt.status == "failed"]
        skipped = [attempt for attempt in attempts if attempt.status == "skipped"]
        timeouts = [attempt for attempt in failures if attempt.failure_kind == "timeout"]
        latencies = [attempt.latency_ms for attempt in executed]
        token_runs = [
            run
            for run in runs
            if run.input_tokens is not None or run.output_tokens is not None
        ]
        cost_status, cost_sample_count, total_cost = _cost_metrics(
            profile.provider_slug,
            runs,
            settings,
        )

        executed_count = len(executed)
        telemetry[key] = ModelTelemetry(
            telemetry_version=MODEL_TELEMETRY_VERSION,
            window_days=window_days,
            window_started_at=window_started_at.isoformat(),
            attempt_sample_count=len(attempts),
            executed_attempt_count=executed_count,
            success_count=len(successes),
            failure_count=len(failures),
            skipped_count=len(skipped),
            timeout_count=len(timeouts),
            success_rate=(round(len(successes) / executed_count, 4) if executed_count else None),
            timeout_rate=(round(len(timeouts) / executed_count, 4) if executed_count else None),
            latency_p50_ms=percentile(latencies, 0.50),
            latency_p95_ms=percentile(latencies, 0.95),
            run_sample_count=len(runs),
            token_sample_count=len(token_runs),
            input_tokens_total=sum(int(run.input_tokens or 0) for run in token_runs),
            output_tokens_total=sum(int(run.output_tokens or 0) for run in token_runs),
            cost_status=cost_status,
            cost_sample_count=cost_sample_count,
            estimated_cost_usd_total=total_cost,
            last_attempt_at=(attempts[-1].created_at.isoformat() if attempts else None),
        )

    return telemetry
