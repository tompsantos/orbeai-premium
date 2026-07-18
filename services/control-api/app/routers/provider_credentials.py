from time import perf_counter

from app.db.session import get_db
from app.dependencies.workspace import (
    CurrentWorkspaceContext,
    get_current_workspace_context,
)
from app.schemas.provider_credentials import (
    ProviderCredentialRead,
    ProviderCredentialSlug,
    ProviderCredentialTestRead,
    ProviderCredentialUpsert,
)
from app.services.audit import write_audit_log
from app.services.provider_credentials import (
    list_provider_credential_summaries,
    provider_credential_summary,
    record_provider_test,
    remove_provider_credential,
    resolve_provider_credential,
    upsert_provider_credential,
)
from app.services.providers.real import execute_provider
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session


router = APIRouter(prefix="/provider-credentials", tags=["provider-credentials"])


def _require_admin(context: CurrentWorkspaceContext) -> None:
    if context.role not in {"owner", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners and admins can manage provider credentials",
        )


@router.get("", response_model=list[ProviderCredentialRead])
def list_provider_credentials(
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> list[ProviderCredentialRead]:
    _require_admin(context)
    return [
        ProviderCredentialRead.model_validate(item)
        for item in list_provider_credential_summaries(db, context.workspace_id)
    ]


@router.put("/{provider_slug}", response_model=ProviderCredentialRead)
def save_provider_credential(
    provider_slug: ProviderCredentialSlug,
    payload: ProviderCredentialUpsert,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> ProviderCredentialRead:
    _require_admin(context)
    summary = upsert_provider_credential(
        db,
        workspace_id=context.workspace_id,
        provider_slug=provider_slug,
        api_key=payload.api_key.get_secret_value(),
        model_name=payload.model_name,
    )
    write_audit_log(
        db=db,
        workspace_id=context.workspace_id,
        action="provider.credential.save",
        resource_type="provider",
        resource_id=provider_slug,
        meta={
            "provider": provider_slug,
            "source": summary["source"],
            "key_hint": summary["key_hint"],
            "model_name": summary["model_name"],
            "actor_user_id": context.user_id,
        },
        commit=True,
    )
    return ProviderCredentialRead.model_validate(summary)


@router.delete("/{provider_slug}", status_code=status.HTTP_204_NO_CONTENT)
def delete_provider_credential(
    provider_slug: ProviderCredentialSlug,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> None:
    _require_admin(context)
    remove_provider_credential(
        db,
        workspace_id=context.workspace_id,
        provider_slug=provider_slug,
    )
    write_audit_log(
        db=db,
        workspace_id=context.workspace_id,
        action="provider.credential.delete",
        resource_type="provider",
        resource_id=provider_slug,
        meta={"provider": provider_slug, "actor_user_id": context.user_id},
        commit=True,
    )


@router.post("/{provider_slug}/test", response_model=ProviderCredentialTestRead)
def test_provider_credential(
    provider_slug: ProviderCredentialSlug,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> ProviderCredentialTestRead:
    _require_admin(context)
    credential = resolve_provider_credential(
        context.workspace_id,
        provider_slug,
        db=db,
    )
    if credential is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Provider credential is not configured",
        )

    started_at = perf_counter()
    success = False
    latency_ms: int | None = None
    model_name: str | None = credential.model_name
    error_code: str | None = None
    message = "conexão validada"

    try:
        result = execute_provider(
            provider_slug=provider_slug,
            content="Responda somente com: conexão ok",
            mode="padrão",
            model_preference=provider_slug,
            workspace_id=context.workspace_id,
            api_key_override=credential.api_key,
            model_name_override=credential.model_name,
            base_url_override=credential.base_url,
        )
        success = True
        latency_ms = result.latency_ms
        model_name = result.model_name
    except Exception as exc:
        latency_ms = int((perf_counter() - started_at) * 1000)
        error_code = type(exc).__name__
        message = "a credencial foi encontrada, mas o provider recusou o teste"

    if credential.source == "workspace_vault":
        summary = record_provider_test(
            db,
            workspace_id=context.workspace_id,
            provider_slug=provider_slug,
            success=success,
            latency_ms=latency_ms,
            error_code=error_code,
        )
    else:
        summary = provider_credential_summary(db, context.workspace_id, provider_slug)

    write_audit_log(
        db=db,
        workspace_id=context.workspace_id,
        action="provider.credential.test",
        resource_type="provider",
        resource_id=provider_slug,
        meta={
            "provider": provider_slug,
            "credential_source": credential.source,
            "success": success,
            "latency_ms": latency_ms,
            "model_name": model_name,
            "error_code": error_code,
            "actor_user_id": context.user_id,
        },
        commit=True,
    )
    return ProviderCredentialTestRead(
        provider=ProviderCredentialRead.model_validate(summary),
        success=success,
        message=message,
        latency_ms=latency_ms,
        model_name=model_name,
    )
