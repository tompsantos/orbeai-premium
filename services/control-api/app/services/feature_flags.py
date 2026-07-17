from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import FeatureFlag


DEFAULT_FLAGS = [
    {
        "key": "real_providers",
        "label": "Providers reais",
        "enabled": True,
        "audience": "interno",
        "description": "Permite operação com providers reais quando as chaves estão configuradas no backend.",
    },
    {
        "key": "auto_memory",
        "label": "Memória automática",
        "enabled": True,
        "audience": "interno",
        "description": "Permite criar memórias automaticamente por pedido explícito ou relevância.",
    },
    {
        "key": "memory_context",
        "label": "Contexto com memória",
        "enabled": True,
        "audience": "interno",
        "description": "Permite usar memórias ativas como contexto persistente no chat.",
    },
    {
        "key": "audit_logs",
        "label": "Audit logs reais",
        "enabled": True,
        "audience": "interno",
        "description": "Registra eventos operacionais no backend.",
    },
    {
        "key": "artifact_versions",
        "label": "Versionamento de artifacts",
        "enabled": True,
        "audience": "interno",
        "description": "Permite salvar versões de documentos e artifacts.",
    },
]


def ensure_default_flags(db: Session, workspace_id: str) -> None:
    existing = set(
        db.scalars(
            select(FeatureFlag.key).where(FeatureFlag.workspace_id == workspace_id)
        )
    )

    created = False

    for item in DEFAULT_FLAGS:
        if item["key"] in existing:
            continue

        db.add(
            FeatureFlag(
                workspace_id=workspace_id,
                key=item["key"],
                label=item["label"],
                enabled=item["enabled"],
                audience=item["audience"],
                description=item["description"],
                meta={"seeded": True},
            )
        )
        created = True

    if created:
        db.commit()


def get_feature_flag(db: Session, workspace_id: str, key: str) -> FeatureFlag | None:
    ensure_default_flags(db, workspace_id)

    return db.scalar(
        select(FeatureFlag)
        .where(FeatureFlag.workspace_id == workspace_id)
        .where(FeatureFlag.key == key)
    )


def is_feature_enabled(db: Session, workspace_id: str, key: str, default: bool = True) -> bool:
    flag = get_feature_flag(db, workspace_id, key)

    if flag is None:
        return default

    return bool(flag.enabled)
