from __future__ import annotations

import hmac

from fastapi import Header, HTTPException, status

from app.config import get_settings


def require_internal_key(
    x_orbe_internal_key: str | None = Header(default=None),
) -> None:
    settings = get_settings()

    if not settings.internal_api_key:
        if settings.is_production:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="ORBE_INTERNAL_API_KEY não configurada",
            )
        return

    if not x_orbe_internal_key or not hmac.compare_digest(
        x_orbe_internal_key,
        settings.internal_api_key,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="chave interna inválida",
        )
