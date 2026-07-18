from __future__ import annotations

from base64 import urlsafe_b64encode
from dataclasses import dataclass
from hashlib import sha256
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import SessionLocal
from app.models import Workspace
from app.models.core import utc_now
from app.services.workspace_settings import get_or_create_workspace_settings


class UnsupportedProviderError(ValueError):
    pass


class CredentialDecryptionError(RuntimeError):
    pass


@dataclass(frozen=True)
class ProviderDefinition:
    slug: str
    display_name: str
    default_model: str
    base_url: str | None = None


@dataclass(frozen=True)
class ResolvedProviderCredential:
    provider_slug: str
    api_key: str
    model_name: str
    base_url: str | None
    source: str
    key_hint: str


PROVIDER_DEFINITIONS: dict[str, ProviderDefinition] = {
    "openai": ProviderDefinition(
        slug="openai",
        display_name="OpenAI",
        default_model="gpt-5.5",
    ),
    "gemini": ProviderDefinition(
        slug="gemini",
        display_name="Google Gemini",
        default_model="gemini-3.5-flash",
    ),
    "nvidia": ProviderDefinition(
        slug="nvidia",
        display_name="NVIDIA NIM",
        default_model="nvidia/nemotron-3-super-120b-a12b",
        base_url="https://integrate.api.nvidia.com/v1",
    ),
}


def provider_definition(provider_slug: str, settings: Settings | None = None) -> ProviderDefinition:
    settings = settings or get_settings()
    try:
        definition = PROVIDER_DEFINITIONS[provider_slug]
    except KeyError as exc:
        raise UnsupportedProviderError(f"provider não suportado: {provider_slug}") from exc

    if provider_slug == "openai":
        return ProviderDefinition(
            slug=definition.slug,
            display_name=definition.display_name,
            default_model=settings.openai_model,
        )
    if provider_slug == "gemini":
        return ProviderDefinition(
            slug=definition.slug,
            display_name=definition.display_name,
            default_model=settings.gemini_model,
        )
    return ProviderDefinition(
        slug=definition.slug,
        display_name=definition.display_name,
        default_model=settings.nvidia_model,
        base_url=settings.nvidia_base_url,
    )


def _cipher(settings: Settings | None = None) -> Fernet:
    settings = settings or get_settings()
    master_secret = settings.provider_credentials_master_key or settings.jwt_secret
    if not master_secret:
        raise RuntimeError("segredo mestre do cofre de providers não configurado")
    key = urlsafe_b64encode(sha256(master_secret.encode("utf-8")).digest())
    return Fernet(key)


def encrypt_api_key(api_key: str, settings: Settings | None = None) -> str:
    return _cipher(settings).encrypt(api_key.encode("utf-8")).decode("ascii")


def decrypt_api_key(ciphertext: str, settings: Settings | None = None) -> str:
    try:
        return _cipher(settings).decrypt(ciphertext.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise CredentialDecryptionError("credencial armazenada não pôde ser descriptografada") from exc


def key_hint(api_key: str) -> str:
    clean = api_key.strip()
    return f"••••{clean[-4:]}" if len(clean) >= 4 else "••••"


def _workspace_settings(db: Session, workspace_id: str):
    workspace = db.get(Workspace, workspace_id)
    if workspace is None:
        raise RuntimeError("workspace não encontrado para o cofre de providers")
    return get_or_create_workspace_settings(db, workspace)


def _credential_entries(db: Session, workspace_id: str) -> dict[str, dict[str, Any]]:
    workspace_settings = _workspace_settings(db, workspace_id)
    meta = dict(workspace_settings.meta or {})
    raw_entries = meta.get("provider_credentials")
    if not isinstance(raw_entries, dict):
        return {}
    return {
        str(slug): dict(value)
        for slug, value in raw_entries.items()
        if isinstance(value, dict)
    }


def _environment_credential(
    provider_slug: str,
    settings: Settings,
) -> ResolvedProviderCredential | None:
    definition = provider_definition(provider_slug, settings)
    api_key: str | None
    if provider_slug == "openai":
        api_key = settings.openai_api_key
    elif provider_slug == "gemini":
        api_key = settings.gemini_api_key
    elif provider_slug == "nvidia":
        api_key = settings.nvidia_api_key
    else:
        api_key = None

    if not api_key:
        return None
    return ResolvedProviderCredential(
        provider_slug=provider_slug,
        api_key=api_key,
        model_name=definition.default_model,
        base_url=definition.base_url,
        source="environment",
        key_hint=key_hint(api_key),
    )


def _resolved_from_db(
    db: Session,
    workspace_id: str,
    provider_slug: str,
    settings: Settings,
) -> ResolvedProviderCredential | None:
    entry = _credential_entries(db, workspace_id).get(provider_slug)
    if not entry:
        return None
    ciphertext = entry.get("ciphertext")
    if not isinstance(ciphertext, str) or not ciphertext:
        return None

    definition = provider_definition(provider_slug, settings)
    api_key = decrypt_api_key(ciphertext, settings)
    model_name = entry.get("model_name")
    return ResolvedProviderCredential(
        provider_slug=provider_slug,
        api_key=api_key,
        model_name=(
            str(model_name).strip()
            if isinstance(model_name, str) and model_name.strip()
            else definition.default_model
        ),
        base_url=definition.base_url,
        source="workspace_vault",
        key_hint=str(entry.get("key_hint") or key_hint(api_key)),
    )


def resolve_provider_credential(
    workspace_id: str | None,
    provider_slug: str,
    *,
    db: Session | None = None,
    settings: Settings | None = None,
) -> ResolvedProviderCredential | None:
    settings = settings or get_settings()
    provider_definition(provider_slug, settings)

    if workspace_id:
        if db is not None:
            stored = _resolved_from_db(db, workspace_id, provider_slug, settings)
        else:
            with SessionLocal() as local_db:
                stored = _resolved_from_db(local_db, workspace_id, provider_slug, settings)
        if stored is not None:
            return stored

    return _environment_credential(provider_slug, settings)


def upsert_provider_credential(
    db: Session,
    *,
    workspace_id: str,
    provider_slug: str,
    api_key: str,
    model_name: str | None,
) -> dict[str, Any]:
    settings = get_settings()
    definition = provider_definition(provider_slug, settings)
    workspace_settings = _workspace_settings(db, workspace_id)
    meta = dict(workspace_settings.meta or {})
    entries = _credential_entries(db, workspace_id)
    existing = dict(entries.get(provider_slug) or {})
    now = utc_now().isoformat()

    entries[provider_slug] = {
        **existing,
        "ciphertext": encrypt_api_key(api_key, settings),
        "key_hint": key_hint(api_key),
        "model_name": (model_name or definition.default_model).strip(),
        "base_url": definition.base_url,
        "updated_at": now,
        "last_test_status": None,
        "last_tested_at": None,
        "last_test_latency_ms": None,
        "last_error_code": None,
    }
    meta["provider_credentials"] = entries
    workspace_settings.meta = meta
    workspace_settings.updated_at = utc_now()
    db.add(workspace_settings)
    db.commit()
    db.refresh(workspace_settings)
    return provider_credential_summary(db, workspace_id, provider_slug)


def remove_provider_credential(db: Session, *, workspace_id: str, provider_slug: str) -> None:
    provider_definition(provider_slug)
    workspace_settings = _workspace_settings(db, workspace_id)
    meta = dict(workspace_settings.meta or {})
    entries = _credential_entries(db, workspace_id)
    entries.pop(provider_slug, None)
    meta["provider_credentials"] = entries
    workspace_settings.meta = meta
    workspace_settings.updated_at = utc_now()
    db.add(workspace_settings)
    db.commit()


def record_provider_test(
    db: Session,
    *,
    workspace_id: str,
    provider_slug: str,
    success: bool,
    latency_ms: int | None,
    error_code: str | None,
) -> dict[str, Any]:
    workspace_settings = _workspace_settings(db, workspace_id)
    meta = dict(workspace_settings.meta or {})
    entries = _credential_entries(db, workspace_id)
    entry = dict(entries.get(provider_slug) or {})
    if not entry:
        raise RuntimeError("credencial não encontrada para registrar teste")
    entry.update(
        {
            "last_test_status": "success" if success else "failed",
            "last_tested_at": utc_now().isoformat(),
            "last_test_latency_ms": latency_ms,
            "last_error_code": error_code,
        }
    )
    entries[provider_slug] = entry
    meta["provider_credentials"] = entries
    workspace_settings.meta = meta
    workspace_settings.updated_at = utc_now()
    db.add(workspace_settings)
    db.commit()
    return provider_credential_summary(db, workspace_id, provider_slug)


def provider_credential_summary(
    db: Session,
    workspace_id: str,
    provider_slug: str,
) -> dict[str, Any]:
    settings = get_settings()
    definition = provider_definition(provider_slug, settings)
    entry = _credential_entries(db, workspace_id).get(provider_slug)

    if entry:
        readable = True
        try:
            decrypt_api_key(str(entry.get("ciphertext") or ""), settings)
        except CredentialDecryptionError:
            readable = False
        return {
            "provider_slug": provider_slug,
            "display_name": definition.display_name,
            "configured": readable,
            "source": "workspace_vault",
            "key_hint": entry.get("key_hint"),
            "model_name": entry.get("model_name") or definition.default_model,
            "base_url": definition.base_url,
            "last_test_status": entry.get("last_test_status"),
            "last_tested_at": entry.get("last_tested_at"),
            "last_test_latency_ms": entry.get("last_test_latency_ms"),
            "last_error_code": entry.get("last_error_code") if not readable else entry.get("last_error_code"),
        }

    environment = _environment_credential(provider_slug, settings)
    return {
        "provider_slug": provider_slug,
        "display_name": definition.display_name,
        "configured": environment is not None,
        "source": "environment" if environment is not None else "none",
        "key_hint": environment.key_hint if environment is not None else None,
        "model_name": environment.model_name if environment is not None else definition.default_model,
        "base_url": definition.base_url,
        "last_test_status": None,
        "last_tested_at": None,
        "last_test_latency_ms": None,
        "last_error_code": None,
    }


def list_provider_credential_summaries(db: Session, workspace_id: str) -> list[dict[str, Any]]:
    return [
        provider_credential_summary(db, workspace_id, provider_slug)
        for provider_slug in PROVIDER_DEFINITIONS
    ]
