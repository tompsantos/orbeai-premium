from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_auth_context
from app.routers import (
    artifacts,
    audit,
    auth,
    chat_send,
    chats,
    feature_flags,
    memories,
    messages,
    model_providers,
    model_runs,
    orbe_router,
    projects,
    workspace,
)

router = APIRouter(prefix="/v1")

protected_dependencies = [Depends(get_current_auth_context)]

router.include_router(auth.router)

router.include_router(projects.router, dependencies=protected_dependencies)
router.include_router(workspace.router, dependencies=protected_dependencies)
router.include_router(artifacts.router, dependencies=protected_dependencies)
router.include_router(memories.router, dependencies=protected_dependencies)
router.include_router(chats.router, dependencies=protected_dependencies)
router.include_router(messages.router, dependencies=protected_dependencies)
router.include_router(chat_send.router, dependencies=protected_dependencies)
router.include_router(model_runs.router, dependencies=protected_dependencies)
router.include_router(audit.router, dependencies=protected_dependencies)
router.include_router(feature_flags.router, dependencies=protected_dependencies)
router.include_router(model_providers.router, dependencies=protected_dependencies)
router.include_router(orbe_router.router, dependencies=protected_dependencies)


@router.get("/status")
def v1_status() -> dict[str, bool | str]:
    return {"ok": True, "status": "v1 router ready"}
