#!/usr/bin/env python3
from __future__ import annotations

import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ.get("ORBEAI_SOURCE_DIR", ROOT / ".transplant/orbeai-source")).resolve()


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"trecho esperado não encontrado em {path}: {old[:80]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def append_once(path: Path, marker: str, content: str) -> None:
    text = path.read_text(encoding="utf-8")
    if marker not in text:
        path.write_text(text.rstrip() + "\n\n" + content.strip() + "\n", encoding="utf-8")


def copy_product() -> None:
    if not (SOURCE / "src").exists() or not (SOURCE / "backend").exists():
        raise RuntimeError(f"fonte da orbeAI inválida: {SOURCE}")

    web = ROOT / "apps/web"
    control = ROOT / "services/control-api"
    source_docs = ROOT / "docs/orbeai-source"

    shutil.rmtree(web, ignore_errors=True)
    web.mkdir(parents=True, exist_ok=True)

    excluded = {
        ".git",
        ".github",
        ".env",
        ".env.example",
        "backend",
        "docs",
        "docker-compose.dev.yml",
    }
    for item in SOURCE.iterdir():
        if item.name in excluded:
            continue
        destination = web / item.name
        if item.is_dir():
            shutil.copytree(item, destination, symlinks=True)
        else:
            shutil.copy2(item, destination)

    shutil.rmtree(control, ignore_errors=True)
    shutil.copytree(SOURCE / "backend", control, symlinks=True)

    shutil.rmtree(source_docs, ignore_errors=True)
    if (SOURCE / "docs").exists():
        shutil.copytree(SOURCE / "docs", source_docs, symlinks=True)

    source_sha = os.environ.get("ORBEAI_SOURCE_SHA", "main")
    (web / ".orbeai-source").write_text(
        f"repository=tompsantos/orbeai\ncommit={source_sha}\n",
        encoding="utf-8",
    )


def patch_control_api() -> None:
    pyproject = ROOT / "services/control-api/pyproject.toml"
    replace_once(
        pyproject,
        '  "structlog>=24.1.0",\n',
        '  "structlog>=24.1.0",\n  "httpx>=0.27.0",\n',
    )

    config = ROOT / "services/control-api/app/core/config.py"
    replace_once(
        config,
        '    enable_real_providers: bool = Field(default=False, validation_alias="ENABLE_REAL_PROVIDERS")\n',
        '''    enable_real_providers: bool = Field(default=False, validation_alias="ENABLE_REAL_PROVIDERS")

    cognition_enabled: bool = Field(default=True, validation_alias="COGNITION_ENABLED")
    cognition_base_url: str = Field(
        default="http://orbeai-cognition:8081",
        validation_alias="COGNITION_BASE_URL",
    )
    cognition_api_key: str = Field(
        default="dev-internal-change-me",
        validation_alias="COGNITION_API_KEY",
    )
    cognition_timeout_seconds: float = Field(
        default=180.0,
        validation_alias="COGNITION_TIMEOUT_SECONDS",
    )
    cognition_fallback_to_legacy: bool = Field(
        default=True,
        validation_alias="COGNITION_FALLBACK_TO_LEGACY",
    )
''',
    )

    services = ROOT / "services/control-api/app/services"
    (services / "cognition_client.py").write_text(
        '''from __future__ import annotations

from time import perf_counter
from typing import Any

import httpx

from app.core.config import get_settings
from app.services.providers.mock import estimate_tokens
from app.services.providers.real import ProviderExecutionResult


class CognitionExecutionError(RuntimeError):
    pass


def execute_cognition_turn(
    *,
    workspace_id: str,
    user_id: str,
    chat_id: str,
    content: str,
    mode: str,
    memory_context: str | None,
    conversation_history: list[dict[str, Any]],
) -> ProviderExecutionResult:
    settings = get_settings()
    started_at = perf_counter()

    headers = {"X-Orbe-Internal-Key": settings.cognition_api_key}
    payload = {
        "workspace_id": workspace_id,
        "user_id": user_id,
        "chat_id": chat_id,
        "message": content,
        "mode": mode,
        "memory_context": memory_context,
        "conversation_history": conversation_history,
    }

    try:
        with httpx.Client(
            base_url=settings.cognition_base_url.rstrip("/"),
            timeout=settings.cognition_timeout_seconds,
        ) as client:
            response = client.post("/v1/turns", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise CognitionExecutionError(
            f"orbe cognition indisponível: {type(exc).__name__}: {exc}"
        ) from exc

    output = str(data.get("final_response") or "").strip()
    if not output:
        raise CognitionExecutionError("orbe cognition retornou resposta vazia")

    model = str(data.get("model") or "orbe-cognition-default")
    input_tokens = estimate_tokens(content + (memory_context or ""))
    output_tokens = estimate_tokens(output)

    return ProviderExecutionResult(
        content=output,
        provider_name="orbe-cognition",
        model_name=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        latency_ms=int((perf_counter() - started_at) * 1000),
        estimated_cost_usd=0.0,
    )
''',
        encoding="utf-8",
    )

    (services / "chat_runtime.py").write_text(
        '''from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.core.config import get_settings
from app.services.cognition_client import execute_cognition_turn
from app.services.orbe_router import RouterDecision
from app.services.providers.real import (
    ProviderExecutionResult,
    execute_provider,
    run_mock_provider,
)


@dataclass(frozen=True)
class ChatRuntimeExecution:
    result: ProviderExecutionResult
    selected_provider_slug: str
    router_reason: str
    provider_error: str | None
    cognition_error: str | None
    runtime_name: str
    used_legacy_fallback: bool


def execute_chat_runtime(
    *,
    decision: RouterDecision,
    real_providers_enabled: bool,
    workspace_id: str,
    user_id: str,
    chat_id: str,
    content: str,
    mode: str,
    model_preference: str,
    memory_context: str | None,
    conversation_history: list[dict[str, Any]],
) -> ChatRuntimeExecution:
    settings = get_settings()
    cognition_error: str | None = None

    if settings.cognition_enabled:
        try:
            result = execute_cognition_turn(
                workspace_id=workspace_id,
                user_id=user_id,
                chat_id=chat_id,
                content=content,
                mode=mode,
                memory_context=memory_context,
                conversation_history=conversation_history,
            )
            return ChatRuntimeExecution(
                result=result,
                selected_provider_slug="orbe-cognition",
                router_reason=(
                    f"{decision.reason} Execução entregue ao orbe cognition core, "
                    "runtime principal da orbeAI premium."
                ),
                provider_error=None,
                cognition_error=None,
                runtime_name="orbe-cognition",
                used_legacy_fallback=False,
            )
        except Exception as exc:
            cognition_error = f"{type(exc).__name__}: {exc}"
            if not settings.cognition_fallback_to_legacy:
                raise

    provider_error: str | None = None
    selected_provider_slug = decision.provider_slug if real_providers_enabled else "mock"

    try:
        result = execute_provider(
            provider_slug=selected_provider_slug,
            content=content,
            mode=mode,
            model_preference=model_preference,
            memory_context=memory_context,
        )
        router_reason = decision.reason

        if not real_providers_enabled and decision.provider_slug != "mock":
            router_reason = (
                f"{decision.reason} Feature flag real_providers está desligada; "
                "a execução foi desviada para orbe-mock."
            )
    except Exception as exc:
        provider_error = f"{type(exc).__name__}: {exc}"
        result = run_mock_provider(
            content=content,
            mode=mode,
            model_preference=model_preference,
            memory_context=memory_context,
        )
        router_reason = (
            f"{decision.reason} A execução legada falhou e o orbe-mock foi acionado. "
            f"Erro: {provider_error}"
        )

    if cognition_error:
        router_reason = (
            f"orbe cognition falhou e o fallback legado foi acionado. "
            f"Falha cognitiva: {cognition_error}. {router_reason}"
        )

    return ChatRuntimeExecution(
        result=result,
        selected_provider_slug=selected_provider_slug,
        router_reason=router_reason,
        provider_error=provider_error,
        cognition_error=cognition_error,
        runtime_name="legacy-provider",
        used_legacy_fallback=bool(cognition_error),
    )
''',
        encoding="utf-8",
    )

    chat_send = ROOT / "services/control-api/app/routers/chat_send.py"
    replace_once(
        chat_send,
        "from app.services.audit import write_audit_log\n",
        "from app.services.audit import write_audit_log\nfrom app.services.chat_runtime import execute_chat_runtime\n",
    )
    replace_once(
        chat_send,
        "from app.services.providers.real import execute_provider, run_mock_provider\n",
        "",
    )
    replace_once(
        chat_send,
        '''    provider_error: str | None = None
    selected_provider_slug = decision.provider_slug if real_providers_enabled else "mock"

    try:
        result = execute_provider(
            provider_slug=selected_provider_slug,
            content=payload.content,
            mode=chat.mode,
            model_preference=chat.model_preference,
            memory_context=memory_context,
        )
        router_reason = decision.reason

        if not real_providers_enabled and decision.provider_slug != "mock":
            router_reason = (
                f"{decision.reason} Feature flag real_providers está desligada; "
                "a execução foi desviada para orbe-mock."
            )
    except Exception as exc:
        provider_error = f"{type(exc).__name__}: {exc}"
        result = run_mock_provider(
            content=payload.content,
            mode=chat.mode,
            model_preference=chat.model_preference,
            memory_context=memory_context,
        )
        router_reason = (
            f"{decision.reason} A execução real falhou e o orbe-mock foi acionado como fallback. "
            f"Erro: {provider_error}"
        )
''',
        '''    history_rows = list(
        db.scalars(
            select(Message)
            .where(Message.chat_id == chat.id)
            .where(Message.id != user_message.id)
            .order_by(Message.created_at.asc())
        )
    )
    conversation_history = [
        {"role": message.role, "content": message.content}
        for message in history_rows
        if message.role in {"user", "assistant", "system"}
    ]

    runtime_execution = execute_chat_runtime(
        decision=decision,
        real_providers_enabled=real_providers_enabled,
        workspace_id=chat.workspace_id,
        user_id=context.user_id,
        chat_id=chat.id,
        content=payload.content,
        mode=chat.mode,
        model_preference=chat.model_preference,
        memory_context=memory_context,
        conversation_history=conversation_history,
    )
    result = runtime_execution.result
    selected_provider_slug = runtime_execution.selected_provider_slug
    provider_error = runtime_execution.provider_error
    cognition_error = runtime_execution.cognition_error
    router_reason = runtime_execution.router_reason
''',
    )
    replace_once(
        chat_send,
        '''            "router_is_fallback": decision.is_fallback
            or selected_provider_slug != decision.provider_slug,
            "provider_error": provider_error,
''',
        '''            "router_is_fallback": decision.is_fallback
            or runtime_execution.used_legacy_fallback,
            "runtime": runtime_execution.runtime_name,
            "provider_error": provider_error,
            "cognition_error": cognition_error,
''',
    )
    replace_once(
        chat_send,
        '''            "provider_error": provider_error,
            "feature_auto_memory_enabled": auto_memory_enabled,
''',
        '''            "provider_error": provider_error,
            "cognition_error": cognition_error,
            "runtime": runtime_execution.runtime_name,
            "feature_auto_memory_enabled": auto_memory_enabled,
''',
    )

    tests = ROOT / "services/control-api/tests"
    (tests / "test_cognition_config.py").write_text(
        '''from app.core.config import Settings


def test_cognition_defaults_are_private_service_defaults() -> None:
    settings = Settings()

    assert settings.cognition_enabled is True
    assert settings.cognition_base_url == "http://orbeai-cognition:8081"
    assert settings.cognition_fallback_to_legacy is True
''',
        encoding="utf-8",
    )


def write_web_container() -> None:
    web = ROOT / "apps/web"
    (web / "Dockerfile").write_text(
        '''FROM node:22-alpine AS build

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_MOCK_MODE=false
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=20s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1/healthz || exit 1
''',
        encoding="utf-8",
    )
    (web / "nginx.conf").write_text(
        '''server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location = /healthz {
        access_log off;
        add_header Content-Type text/plain;
        return 200 "ok\\n";
    }

    location /api/ {
        proxy_pass http://orbeai-control-api:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 240s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
''',
        encoding="utf-8",
    )


def write_deployment_files() -> None:
    (ROOT / "compose.yaml").write_text(
        '''services:
  orbeai-web:
    build:
      context: ./apps/web
      args:
        VITE_API_BASE_URL: /api
    container_name: orbeai-web
    restart: unless-stopped
    ports:
      - "127.0.0.1:${ORBEAI_WEB_PORT:-8080}:80"
    depends_on:
      orbeai-control-api:
        condition: service_healthy
    networks:
      - orbeai-private

  orbeai-control-api:
    build:
      context: ./services/control-api
    container_name: orbeai-control-api
    restart: unless-stopped
    env_file:
      - .env
    environment:
      COGNITION_BASE_URL: http://orbeai-cognition:8081
      COGNITION_API_KEY: ${ORBE_INTERNAL_API_KEY}
    expose:
      - "8000"
    depends_on:
      orbeai-cognition:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5)"]
      interval: 20s
      timeout: 6s
      retries: 5
      start_period: 20s
    networks:
      - orbeai-private

  orbeai-cognition:
    build:
      context: ./services/cognition
    container_name: orbeai-cognition
    restart: unless-stopped
    env_file:
      - .env
    environment:
      HERMES_HOME: /var/lib/orbe-cognition/hermes
    expose:
      - "8081"
    volumes:
      - orbeai_cognition_runtime:/var/lib/orbe-cognition
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8081/health', timeout=5)"]
      interval: 20s
      timeout: 6s
      retries: 5
      start_period: 30s
    networks:
      - orbeai-private

networks:
  orbeai-private:
    name: orbeai-private
    driver: bridge

volumes:
  orbeai_cognition_runtime:
''',
        encoding="utf-8",
    )

    env = ROOT / ".env.example"
    env.write_text(
        '''APP_ENV=production
ORBEAI_WEB_PORT=8080

# PostgreSQL remoto em orbeone-db-01. Substituir host e segredos no deploy.
DATABASE_URL=postgresql+psycopg://orbeai_user:CHANGE_ME@10.10.20.10:5432/orbeai
BACKEND_CORS_ORIGINS=https://ai.orbeone.com.br
JWT_SECRET=CHANGE_ME_WITH_A_LONG_RANDOM_VALUE

# Comunicação interna control-api -> cognition
ORBE_INTERNAL_API_KEY=CHANGE_ME_WITH_A_LONG_RANDOM_VALUE
COGNITION_ENABLED=true
COGNITION_TIMEOUT_SECONDS=180
COGNITION_FALLBACK_TO_LEGACY=true

# Modelo principal do runtime Hermes
ORBE_MODEL=anthropic/claude-sonnet-4.6
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OPENROUTER_API_KEY=
GEMINI_API_KEY=

# Providers antigos permanecem como fallback temporário
ENABLE_REAL_PROVIDERS=false
OPENAI_MODEL=gpt-5.5
GEMINI_MODEL=gemini-3.5-flash
''',
        encoding="utf-8",
    )


def write_ci() -> None:
    workflow = ROOT / ".github/workflows/ci.yml"
    workflow.write_text(
        '''name: ci

on:
  push:
    branches: ["main", "agent/**"]
  pull_request:

permissions:
  contents: read

jobs:
  cognition:
    runs-on: ubuntu-24.04
    defaults:
      run:
        working-directory: services/cognition
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: install
        run: pip install -e ".[dev]"
      - name: lint
        run: ruff check app tests
      - name: tests
        run: pytest -q

  control-api:
    runs-on: ubuntu-24.04
    defaults:
      run:
        working-directory: services/control-api
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: install
        run: pip install -e ".[dev]"
      - name: lint
        run: ruff check app tests
      - name: tests
        run: pytest -q

  web:
    runs-on: ubuntu-24.04
    defaults:
      run:
        working-directory: apps/web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
          cache-dependency-path: apps/web/package.json
      - name: install
        run: npm install
      - name: typecheck
        run: npm run typecheck
      - name: build
        run: npm run build
''',
        encoding="utf-8",
    )


def write_docs() -> None:
    (ROOT / "docs/transplant-front-back.md").write_text(
        '''# transplante do produto orbeAI

## origem

- interface e control API: `tompsantos/orbeai`
- runtime cognitivo: `NousResearch/hermes-agent`
- produto resultante: `tompsantos/orbeai-premium`

## fluxo ativo

```text
apps/web
  -> /api/v1/chat/send
services/control-api
  -> POST /v1/turns
services/cognition
  -> AIAgent
```

O control API continua sendo a fonte oficial para autenticação, workspaces,
projetos, chats, mensagens, artifacts, memória governada e auditoria.

O cognition core assume a execução inteligente. Durante a migração, uma falha
do cognition pode acionar o provider legado, com o evento registrado nos
metadados e no audit log.

## implantação-alvo

- containers em `orbeone-center-01`
- PostgreSQL em `orbeone-db-01`
- somente o web é publicado no host
- control API e cognition comunicam-se pela rede Docker privada
- o acesso ao cognition exige `X-Orbe-Internal-Key`
''',
        encoding="utf-8",
    )


def update_readme() -> None:
    readme = ROOT / "README.md"
    append_once(
        readme,
        "## produto transplantado",
        '''## produto transplantado

A interface e o backend funcional da orbeAI original agora vivem em:

- `apps/web`
- `services/control-api`

O endpoint de chat do control API opera em modo cognition-first e chama
`services/cognition`, mantendo fallback legado temporário para uma migração
segura e observável.
''',
    )


def main() -> None:
    copy_product()
    patch_control_api()
    write_web_container()
    write_deployment_files()
    write_ci()
    write_docs()
    update_readme()


if __name__ == "__main__":
    main()
