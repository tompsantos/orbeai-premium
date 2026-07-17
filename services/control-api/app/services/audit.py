from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog


def write_audit_log(
    db: Session,
    action: str,
    workspace_id: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    product: str | None = "orbeAI",
    request_id: str | None = None,
    ip_address: str | None = None,
    meta: dict[str, Any] | None = None,
    commit: bool = False,
) -> AuditLog:
    log = AuditLog(
        workspace_id=workspace_id,
        product=product,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        request_id=request_id,
        ip_address=ip_address,
        meta=meta,
    )

    db.add(log)

    if commit:
        db.commit()
        db.refresh(log)

    return log
