from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


def _csv(name: str, default: str = "") -> tuple[str, ...]:
    value = os.getenv(name, default)
    return tuple(item.strip() for item in value.split(",") if item.strip())


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    env: str
    internal_api_key: str
    default_model: str
    max_iterations: int
    allowed_toolsets: tuple[str, ...]
    default_disabled_toolsets: tuple[str, ...]
    skip_builtin_memory: bool

    @property
    def is_production(self) -> bool:
        return self.env.lower() == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        env=os.getenv("ORBE_ENV", "development"),
        internal_api_key=os.getenv("ORBE_INTERNAL_API_KEY", ""),
        default_model=os.getenv(
            "ORBE_COGNITION_MODEL",
            "anthropic/claude-sonnet-4.6",
        ),
        max_iterations=max(
            1,
            min(int(os.getenv("ORBE_COGNITION_MAX_ITERATIONS", "12")), 90),
        ),
        allowed_toolsets=_csv(
            "ORBE_COGNITION_ALLOWED_TOOLSETS",
            "web,vision,files",
        ),
        default_disabled_toolsets=_csv(
            "ORBE_COGNITION_DEFAULT_DISABLED_TOOLSETS",
            "terminal,browser",
        ),
        skip_builtin_memory=_bool(
            "ORBE_COGNITION_SKIP_BUILTIN_MEMORY",
            True,
        ),
    )
