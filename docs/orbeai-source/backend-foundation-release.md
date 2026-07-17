# orbeAI - backend foundation release interna

Branch: feature/backend-foundation  
Tipo: release interna de fundação  
Status: pronta para revisão final e merge controlado

## objetivo

Consolidar a fase 3 da orbeAI: backend real, persistência, runtime de chat, providers, memória, artifacts, audit logs, feature flags, workspace settings, políticas e integração frontend.

## escopo entregue

### backend

- FastAPI estruturado.
- Postgres real via SQLAlchemy.
- Alembic com migrations versionadas.
- Healthcheck e status.
- CRUD real de projects.
- CRUD real de chats.
- CRUD real de messages.
- Runtime `POST /v1/chat/send`.
- Model runs para observabilidade.
- Model providers reais e mock.
- orbeRouter backend.
- Artifacts com versionamento.
- Export de artifacts respeitando política de workspace.
- Memories manuais e automáticas.
- Memory context.
- Audit logs reais.
- Feature flags persistidas.
- Workspace settings persistidas.
- Workspace policies aplicadas ao runtime.
- Testes com isolamento de estado.

### frontend

- Chat conectado ao backend real.
- Projects conectados ao backend real.
- Artifacts conectados ao backend real.
- Memories conectadas ao backend real.
- Admin cockpit conectado a audit logs, usage, feature flags e workspace settings.
- Model providers conectados ao backend real.
- Ajustes de layout no chat e truncamento de títulos de conversas.

## migrations incluídas

- 20260627_0001_initial_schema
- 20260627_0002_feature_flags
- 20260627_0003_workspace_settings

## endpoints principais validados

- GET /health
- GET /v1/status
- POST /v1/chat/send
- GET /v1/model-providers
- GET /v1/model-runs
- POST /v1/router/resolve
- CRUD de projects
- CRUD de chats
- mensagens por chat
- CRUD de artifacts
- export de artifact
- CRUD de memories
- audit logs
- feature flags
- workspace
- workspace settings

## decisões importantes

- Postgres real desde o início.
- Sem SQLite na fundação principal.
- Provider mock mantido como fallback oficial.
- Workspace padrão `orbeone` mantido temporariamente até a fase de auth.
- Budget/cotas não faz parte desta fundação.
- Compartilhamento público não foi criado de forma fake.
- `allow_public_sharing` existe como política preparada para fase futura.

## validações obrigatórias antes do merge

- `python -m compileall app tests`
- `pytest`
- `bun run typecheck`
- `git status` limpo
- comparação com `main`
- revisão manual dos arquivos alterados

## próximos passos

Após o merge/release interna da backend foundation, iniciar a fase 4:

- autenticação real;
- usuários;
- sessões;
- memberships;
- permissões;
- troca gradual do workspace padrão por workspace autenticado.
