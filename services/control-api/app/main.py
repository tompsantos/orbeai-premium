from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.routers.health import router as health_router
from app.routers.v1 import router as v1_router

configure_logging()
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API backend da orbeAI, o núcleo cognitivo da orbeOne.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(v1_router)


@app.get("/", tags=["root"])
def root() -> dict[str, str | bool]:
    return {
        "ok": True,
        "service": settings.app_name,
        "message": "orbeAI API online",
    }
