from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def healthcheck() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        ok=True,
        service=settings.app_name,
        status="healthy",
        version=settings.app_version,
        environment=settings.app_env,
    )
