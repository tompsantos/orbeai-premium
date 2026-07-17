# orbeAI - backend foundation

Branch principal de desenvolvimento: feature/backend-foundation
Stack base: FastAPI, PostgreSQL, SQLAlchemy, Alembic, Docker Compose, React, Vite, Bun
Status: fundação backend funcional, persistente e integrada ao frontend

## 1. visão geral

A backend foundation da orbeAI transforma a interface criada anteriormente em um produto com persistência real, runtime de IA observável, providers conectáveis, memória governável, artifacts versionados, audit logs, feature flags e configurações de workspace.

Esta fundação ainda não inclui autenticação real, usuários, permissões ou multi-workspace completo. Enquanto isso, o sistema usa um workspace padrão criado automaticamente:

    name: orbeOne
    slug: orbeone
    plan: internal

Esse comportamento é intencional e temporário até a fase de autenticação.

## 2. princípios técnicos

- Postgres real desde o início.
- Sem SQLite para testes principais de CRUD.
- Backend separado do frontend.
- Runtime observável por model_runs.
- Decisões do router registradas.
- Feature flags persistidas no banco.
- Workspace settings persistidas no banco.
- Memória criada, aprovada, listada e governável.
- Artifacts com versionamento.
- Audit logs para ações relevantes.
- Testes usando banco local real via Docker/Codespaces.

## 3. stack

Backend:

    FastAPI
    SQLAlchemy
    Alembic
    Pydantic
    PostgreSQL
    pytest
    Docker Compose

Frontend:

    React
    Vite
    Bun
    TypeScript
    TanStack Router

Providers de IA:

    mock
    OpenAI
    Gemini

O provider mock continua sendo parte oficial da fundação, usado para testes, fallback e desenvolvimento local.

## 4. variáveis de ambiente principais

Arquivo local esperado na raiz:

    .env

Exemplo:

    DATABASE_URL=postgresql+psycopg://orbeai:orbeai@localhost:5433/orbeai
    OPENAI_API_KEY=
    GEMINI_API_KEY=
    OPENAI_MODEL=gpt-5.5
    GEMINI_MODEL=gemini-3.5-flash
    ENABLE_REAL_PROVIDERS=false

O arquivo .env deve permanecer fora do Git.

## 5. serviços Docker de desenvolvimento

Arquivo:

    docker-compose.dev.yml

Serviços principais esperados:

    orbeai-api
    orbeai-db

Comandos úteis:

    docker compose --env-file .env -f docker-compose.dev.yml up -d
    docker compose --env-file .env -f docker-compose.dev.yml up -d --force-recreate orbeai-api
    docker compose --env-file .env -f docker-compose.dev.yml logs -f orbeai-api

## 6. banco de dados

A fundação usa Postgres com migrations Alembic.

Tabelas principais:

    workspaces
    workspace_settings
    projects
    chats
    messages
    artifacts
    artifact_versions
    memories
    model_providers
    model_runs
    audit_logs
    integration_clients
    feature_flags
    alembic_version

## 7. migrations

Migrations já aplicadas na fundação:

    20260627_0001_initial_schema
    20260627_0002_feature_flags
    20260627_0003_workspace_settings

Comando para aplicar migrations:

    cd /workspaces/orbeai/backend
    source .venv/bin/activate
    DATABASE_URL=postgresql+psycopg://orbeai:orbeai@localhost:5433/orbeai alembic upgrade head

## 8. endpoints principais

Health/status:

    GET /health
    GET /v1/status

Projects:

    POST   /v1/projects
    GET    /v1/projects
    GET    /v1/projects/{project_id}
    PATCH  /v1/projects/{project_id}

Chats:

    POST   /v1/chats
    GET    /v1/chats
    GET    /v1/chats/{chat_id}
    PATCH  /v1/chats/{chat_id}
    DELETE /v1/chats/{chat_id}
    GET    /v1/chats/{chat_id}/messages
    POST   /v1/chats/{chat_id}/messages

Messages:

    GET /v1/messages/{message_id}

Chat runtime:

    POST /v1/chat/send

Esse endpoint cria ou reutiliza chat, salva mensagem do usuário, resolve modo e modelo, aplica workspace defaults, aplica feature flags, aplica políticas de memória, seleciona memórias relevantes, executa provider real ou mock, salva resposta da assistant, registra model_run, registra audit log e retorna mensagens e eventos de memória.

Model providers:

    GET /v1/model-providers

Model runs:

    GET /v1/model-runs
    GET /v1/model-runs/{model_run_id}

orbeRouter:

    POST /v1/router/resolve

Artifacts:

    POST   /v1/artifacts
    GET    /v1/artifacts
    GET    /v1/artifacts/{artifact_id}
    PATCH  /v1/artifacts/{artifact_id}
    DELETE /v1/artifacts/{artifact_id}
    POST   /v1/artifacts/{artifact_id}/versions
    GET    /v1/artifacts/{artifact_id}/export

Memories:

    POST   /v1/memories
    GET    /v1/memories
    GET    /v1/memories/{memory_id}
    PATCH  /v1/memories/{memory_id}
    DELETE /v1/memories/{memory_id}

Audit logs:

    GET  /v1/audit-logs
    POST /v1/audit-logs

Feature flags:

    GET   /v1/feature-flags
    PATCH /v1/feature-flags/{key}
    POST  /v1/feature-flags/{key}/toggle

Workspace:

    GET   /v1/workspace
    PATCH /v1/workspace
    PATCH /v1/workspace/settings

## 9. fluxo do chat runtime

Fluxo resumido de POST /v1/chat/send:

    request
      -> resolve/cria chat
      -> aplica workspace defaults
      -> salva user_message
      -> carrega feature flags
      -> carrega workspace policy
      -> auto memory opcional
      -> memory context opcional
      -> orbeRouter resolve provider/modelo
      -> provider real ou mock executa
      -> salva assistant_message
      -> registra model_run
      -> registra audit log
      -> retorna resposta

## 10. workspace settings

Configurações persistidas por workspace:

    locale
    timezone
    default_chat_mode
    default_model_preference
    memory_policy
    data_retention_days
    allow_exports
    allow_public_sharing
    metadata

Defaults atuais:

    locale=pt-BR
    timezone=America/Sao_Paulo
    default_chat_mode=strategist
    default_model_preference=auto
    memory_policy=balanced
    data_retention_days=365
    allow_exports=true
    allow_public_sharing=false

## 11. workspace policies

Service central:

    app.services.workspace_policies

Políticas aplicadas no runtime:

memory_policy:

    strict
    balanced
    adaptive

Comportamento:

    strict:
      - bloqueia memórias inferidas
      - permite memórias explícitas
      - reduz limite de contexto

    balanced:
      - comportamento padrão
      - permite inferência com threshold normal

    adaptive:
      - permite inferência com threshold menor
      - aumenta limite de contexto

allow_exports:

    Controla GET /v1/artifacts/{artifact_id}/export.
    Quando allow_exports=false, export retorna HTTP 403.

allow_public_sharing:

    Já existe no service de políticas, mas ainda não há endpoint público real.
    Não existe compartilhamento público fake nesta fundação.

data_retention_days:

    Persistido e registrado em metadata.
    Aplicação real de limpeza/retention job fica para fase posterior.

## 12. feature flags

Flags padrão:

    real_providers
    auto_memory
    memory_context
    audit_logs
    artifact_versions

Comportamento:

    real_providers:
      Quando desligada, força execução via mock mesmo se o router escolher provider real.

    auto_memory:
      Quando desligada, impede criação automática de memória no chat.

    memory_context:
      Quando desligada, impede injeção de memórias no prompt/contexto.

    artifact_versions:
      Quando desligada, bloqueia criação de novas versões de artifact.

    audit_logs:
      Persistida para controle administrativo. O uso operacional mais fino pode ser expandido depois.

## 13. memória

A fundação possui dois caminhos de memória.

Memória manual:

    POST /v1/memories
    PATCH /v1/memories/{memory_id}
    DELETE /v1/memories/{memory_id}

Memória automática:

    POST /v1/chat/send

A memória automática pode ser:

    ativa
    pendente

Memórias explícitas pedidas pelo usuário tendem a entrar como ativa.

Memórias inferidas entram como pendente, dependendo de score e memory_policy.

Conteúdo sensível conhecido, como senha, token, api key, CPF e outros padrões, é ignorado pela memória automática.

## 14. memory context

Memórias relevantes e aprovadas podem ser injetadas no prompt/contexto quando:

    feature flag memory_context = true
    memory status in ativa/active
    score de relevância suficiente

O limite de memórias varia conforme memory_policy.

## 15. artifacts

Artifacts têm:

    artifact
    artifact_versions

Criação de artifact cria a versão 1.

Novas versões dependem de:

    feature flag artifact_versions = true

Exportação depende de:

    workspace policy allow_exports = true

Exportações geram audit log:

    artifact.export

## 16. model runs

Cada execução de chat cria um model_run.

Campos relevantes:

    workspace_id
    chat_id
    message_id
    provider_name
    model_name
    task_type
    status
    latency_ms
    input_tokens
    output_tokens
    estimated_cost_usd
    router_reason
    fallback_chain
    error_message
    created_at

Esse registro é a base para observabilidade, custos, uso por provider e debugging.

## 17. audit logs

Ações relevantes geram audit logs.

Exemplos:

    chat.send
    memory.auto_create
    memory.create
    memory.update
    memory.delete
    artifact.create
    artifact.update
    artifact.version
    artifact.export
    artifact.delete
    workspace.update
    workspace.settings.update

## 18. frontend integrado

O frontend já consome backend real para:

    projects
    chats
    messages
    chat/send
    model providers
    model runs/usage
    artifacts
    memories
    audit logs
    feature flags
    workspace settings
    admin cockpit

Modo real do frontend:

    VITE_API_BASE_URL=/api
    VITE_MOCK_MODE=false
    VITE_ORBEAI_DATA_MODE=api

## 19. testes

A suíte usa pytest.

Comando principal:

    cd /workspaces/orbeai/backend
    source .venv/bin/activate
    ENABLE_REAL_PROVIDERS=false DATABASE_URL=postgresql+psycopg://orbeai:orbeai@localhost:5433/orbeai pytest

O frontend usa:

    cd /workspaces/orbeai
    bun run typecheck

## 20. isolamento de estado nos testes

Arquivo:

    backend/tests/conftest.py

Esse arquivo reseta controles de runtime antes e depois de cada teste.

Defaults garantidos:

    default_chat_mode=strategist
    default_model_preference=auto
    memory_policy=balanced
    allow_exports=true
    allow_public_sharing=false
    real_providers=true
    auto_memory=true
    memory_context=true
    audit_logs=true
    artifact_versions=true

Isso reduz falhas causadas por estado persistente no banco local.

## 21. comandos úteis de diagnóstico

Listar rotas via OpenAPI:

    cd /workspaces/orbeai/backend
    source .venv/bin/activate
    python - <<'PY'
    from app.main import app
    schema = app.openapi()
    for path, methods in sorted(schema.get("paths", {}).items()):
        print(path, sorted(methods.keys()))
    PY

Smoke test do chat:

    curl -s -X POST http://localhost:8000/v1/chat/send -H "Content-Type: application/json" -d '{"content":"smoke test"}' | python -m json.tool

Verificar workspace:

    curl -s http://localhost:8000/v1/workspace | python -m json.tool

Verificar feature flags:

    curl -s http://localhost:8000/v1/feature-flags | python -m json.tool

## 22. limitações conhecidas

Ainda não fazem parte da backend foundation:

    auth real
    login
    usuários
    roles/permissões
    multi-workspace completo
    streaming de chat
    upload de arquivos
    RAG documental real
    busca vetorial
    fila/background jobs
    jobs de retenção de dados
    compartilhamento público real
    deploy final em produção
    billing/cotas

Esses itens ficam para fases posteriores.

## 23. próximos passos após a fase 3

Fechamento da fase 3:

    3.19 revisão técnica fina
    3.20 preparar merge/release interna

Depois disso, começa a fase 4:

    auth real
    usuários
    permissões
    workspace multiusuário
    streaming
    uploads
    documentos
    RAG
    runtime mais inteligente
    deploy controlado

## 24. definição de pronto da backend foundation

A foundation pode ser considerada pronta quando:

    pytest passa
    bun run typecheck passa
    migrations aplicam em Postgres
    chat/send responde 201
    model_runs são registrados
    audit_logs são registrados
    workspace settings persistem
    feature flags controlam runtime
    políticas de workspace são respeitadas
    frontend admin cockpit usa dados reais
    documentação consolidada existe
