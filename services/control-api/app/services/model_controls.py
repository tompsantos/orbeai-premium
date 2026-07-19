from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import Workspace
from app.models.core import utc_now
from app.services.workspace_settings import get_or_create_workspace_settings

MODEL_CONTROLS_META_KEY = "model_controls"
MODEL_CONTROLS_VERSION = "workspace-model-controls-v1"


@dataclass(frozen=True)
class WorkspaceModelControl:
    provider_slug: str
    model_name: str
    enabled: bool
    updated_at: str | None = None
    updated_by: str | None = None

    @property
    def control_key(self) -> str:
        return model_control_key(self.provider_slug, self.model_name)

    def persisted_payload(self) -> dict[str, object]:
        return {
            "control_version": MODEL_CONTROLS_VERSION,
            "control_key": self.control_key,
            "provider_slug": self.provider_slug,
            "model_name": self.model_name,
            "enabled": self.enabled,
            "updated_at": self.updated_at,
            "updated_by": self.updated_by,
        }


def model_control_key(provider_slug: str, model_name: str) -> str:
    return f"{provider_slug.strip().lower()}:{model_name.strip()}"


def _workspace_settings(db: Session, workspace_id: str):
    workspace = db.get(Workspace, workspace_id)
    if workspace is None:
        raise RuntimeError("workspace não encontrado para controles de modelos")
    return get_or_create_workspace_settings(db, workspace)


def _raw_control_entries(db: Session, workspace_id: str) -> dict[str, dict[str, Any]]:
    settings = _workspace_settings(db, workspace_id)
    meta = dict(settings.meta or {})
    raw_container = meta.get(MODEL_CONTROLS_META_KEY)
    if not isinstance(raw_container, dict):
        return {}
    raw_models = raw_container.get("models")
    if not isinstance(raw_models, dict):
        return {}
    return {
        str(key): dict(value)
        for key, value in raw_models.items()
        if isinstance(value, dict)
    }


def list_workspace_model_controls(
    db: Session,
    workspace_id: str,
) -> dict[str, WorkspaceModelControl]:
    controls: dict[str, WorkspaceModelControl] = {}
    for key, entry in _raw_control_entries(db, workspace_id).items():
        provider_slug = str(entry.get("provider_slug") or "").strip().lower()
        model_name = str(entry.get("model_name") or "").strip()
        if not provider_slug or not model_name:
            continue
        normalized_key = model_control_key(provider_slug, model_name)
        if key != normalized_key:
            continue
        controls[normalized_key] = WorkspaceModelControl(
            provider_slug=provider_slug,
            model_name=model_name,
            enabled=entry.get("enabled") is not False,
            updated_at=(str(entry["updated_at"]) if entry.get("updated_at") else None),
            updated_by=(str(entry["updated_by"]) if entry.get("updated_by") else None),
        )
    return controls


def resolve_workspace_model_controls(
    workspace_id: str | None,
    *,
    db: Session | None = None,
) -> dict[str, bool]:
    if not workspace_id:
        return {}
    if db is not None:
        controls = list_workspace_model_controls(db, workspace_id)
    else:
        with SessionLocal() as local_db:
            controls = list_workspace_model_controls(local_db, workspace_id)
    return {key: control.enabled for key, control in controls.items()}


def model_is_enabled(
    controls: Mapping[str, bool],
    provider_slug: str,
    model_name: str,
) -> bool:
    return controls.get(model_control_key(provider_slug, model_name), True)


def upsert_workspace_model_control(
    db: Session,
    *,
    workspace_id: str,
    provider_slug: str,
    model_name: str,
    enabled: bool,
    actor_user_id: str,
) -> WorkspaceModelControl:
    settings = _workspace_settings(db, workspace_id)
    meta = dict(settings.meta or {})
    raw_container = meta.get(MODEL_CONTROLS_META_KEY)
    container = dict(raw_container) if isinstance(raw_container, dict) else {}
    raw_models = container.get("models")
    models = dict(raw_models) if isinstance(raw_models, dict) else {}

    control = WorkspaceModelControl(
        provider_slug=provider_slug.strip().lower(),
        model_name=model_name.strip(),
        enabled=bool(enabled),
        updated_at=utc_now().isoformat(),
        updated_by=actor_user_id,
    )
    models[control.control_key] = {
        "provider_slug": control.provider_slug,
        "model_name": control.model_name,
        "enabled": control.enabled,
        "updated_at": control.updated_at,
        "updated_by": control.updated_by,
    }
    container["version"] = MODEL_CONTROLS_VERSION
    container["models"] = models
    meta[MODEL_CONTROLS_META_KEY] = container
    settings.meta = meta
    settings.updated_at = utc_now()
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return control
