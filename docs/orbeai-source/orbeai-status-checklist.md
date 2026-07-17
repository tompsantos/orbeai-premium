# orbeAI — checklist de construção definitiva

> documento operacional de acompanhamento  
> atualizar sempre que uma etapa for iniciada, concluída, bloqueada ou revisada.

## legenda

```text
[ ] pendente
[~] em andamento
[x] concluído
[!] bloqueado
```

## visão geral de status

| fase | nome | status | observação |
| --- | --- | --- | --- |
| 0 | UI refinada e base oficial | [~] | Branch `refinar-ui-orbeai` funcionando em Codespaces. Falta mergear na `main`. |
| 1 | Fundação do backend | [~] | API viva, modelos iniciais criados e migration inicial em validação. |
| 2 | Modelo de dados mínimo | [ ] | Depende da fase 1. |
| 3 | Autenticação e segurança | [ ] | Depende do banco e backend. |
| 4 | Chat real com um provedor | [ ] | Primeira fatia viva do produto. |
| 5 | orbeRouter real | [ ] | Expansão do chat real. |
| 6 | Frontend em modo API | [ ] | Migração gradual do mock/localStorage. |
| 7 | Memória real | [ ] | Diferencial central da orbeAI. |
| 8 | Artifacts reais | [ ] | Produção de documentos e versões. |
| 9 | API de integração | [ ] | Base para produtos orbeOne. |
| 10 | Deploy Audaks | [ ] | Staging/produção. |

---

## fase 0 — UI refinada e base oficial

Objetivo: estabilizar a interface refinada e transformá-la em base oficial.

### tarefas

- [x] Frontend gerado inicialmente no Lovable.
- [x] Estrutura de rotas criada.
- [x] Dados mockados/localStorage funcionando.
- [x] v0 refinou UI/UX na branch `refinar-ui-orbeai`.
- [x] Chat principal com layout melhorado.
- [x] Contexto da conversa movido para área inferior.
- [x] Codespaces novo criado e funcionando.
- [x] Preview abriu no Chrome.
- [x] `bun run build` executado com sucesso.
- [ ] Testar telas principais manualmente.
- [ ] Corrigir bugs visuais pequenos, se aparecerem.
- [ ] Revisar `MessageRenderer` antes de produção real.
- [ ] Evitar `dangerouslySetInnerHTML` ou adicionar sanitização segura.
- [ ] Revisar atalhos de tipagem como `as any`.
- [ ] Mergear `refinar-ui-orbeai` na `main`.
- [ ] Criar tag `ui-mvp-v1`.

### telas para testar

- [ ] `/`
- [ ] `/app`
- [ ] `/app/chat`
- [ ] `/app/projects`
- [ ] `/app/projects/p_1`
- [ ] `/app/artifacts`
- [ ] `/app/research`
- [ ] `/app/agents`
- [ ] `/app/memory`
- [ ] `/app/integrations`
- [ ] `/app/models`
- [ ] `/app/orbeone`
- [ ] `/app/admin`
- [ ] `/app/settings`

### comandos de validação

```bash
bun install
bun run typecheck
bun run build
bun dev
```

---

## fase 1 — fundação do backend

Objetivo: criar API real da orbeAI.

### tarefas

- [ ] Criar branch `feature/backend-foundation`.
- [ ] Criar pasta `backend/`.
- [ ] Criar app FastAPI.
- [ ] Criar endpoint `GET /health`.
- [ ] Criar configuração por `.env`.
- [ ] Criar `.env.example` com variáveis do backend.
- [ ] Configurar PostgreSQL.
- [ ] Configurar SQLAlchemy ou SQLModel.
- [ ] Configurar Alembic.
- [ ] Criar primeira migration.
- [ ] Criar Dockerfile do backend.
- [ ] Criar `docker-compose.dev.yml`.
- [ ] Configurar CORS para frontend local.
- [ ] Criar padrão de logs.
- [ ] Criar teste mínimo de healthcheck.

### definição de pronto

- [x] `GET /health` retorna `ok`.
- [ ] Backend sobe localmente via Docker.
- [ ] Backend conecta no Postgres.
- [ ] Migration inicial roda sem erro.
- [ ] Frontend consegue chamar `/health`.

---

## fase 2 — modelo de dados mínimo

Objetivo: persistência real para as entidades principais.

### tabelas

- [ ] `workspaces`
- [ ] `users`
- [ ] `projects`
- [ ] `chats`
- [ ] `messages`
- [ ] `artifacts`
- [ ] `artifact_versions`
- [ ] `memories`
- [ ] `model_providers`
- [ ] `model_runs`
- [ ] `audit_logs`
- [ ] `api_keys`
- [ ] `integration_clients`

### endpoints iniciais

- [ ] `GET /v1/projects`
- [ ] `POST /v1/projects`
- [ ] `GET /v1/chats`
- [ ] `POST /v1/chats`
- [ ] `GET /v1/chats/{chat_id}/messages`
- [ ] `POST /v1/chats/{chat_id}/messages`
- [ ] `GET /v1/artifacts`
- [ ] `POST /v1/artifacts`
- [ ] `GET /v1/memories`
- [ ] `POST /v1/memories`

---

## fase 3 — autenticação e segurança

Objetivo: acesso seguro para usuários e produtos internos.

### tarefas

- [ ] Criar autenticação básica.
- [ ] Criar login.
- [ ] Criar JWT.
- [ ] Criar roles.
- [ ] Criar usuários seed iniciais.
- [ ] Criar API keys para integrações.
- [ ] Salvar apenas hash de API key.
- [ ] Criar escopos.
- [ ] Validar escopos por endpoint.
- [ ] Criar audit log de login.
- [ ] Criar audit log de uso de API key.

### roles

- [ ] `owner`
- [ ] `admin`
- [ ] `member`
- [ ] `service`

### escopos iniciais

- [ ] `chat:send`
- [ ] `memory:read`
- [ ] `memory:write`
- [ ] `artifacts:create`
- [ ] `projects:read`
- [ ] `integrations:event`
- [ ] `orberadar:write`
- [ ] `orberisk:analyze`
- [ ] `orbevault:secure`
- [ ] `orbeauto:assist`

---

## fase 4 — chat real com um provedor

Objetivo: primeira chamada real de modelo.

### tarefas

- [ ] Escolher primeiro provedor.
- [ ] Criar variável de ambiente da chave.
- [ ] Criar provider real no backend.
- [ ] Criar endpoint `POST /v1/chat/send`.
- [ ] Salvar mensagem do usuário.
- [ ] Chamar modelo real.
- [ ] Salvar resposta.
- [ ] Retornar resposta ao frontend.
- [ ] Registrar latência.
- [ ] Registrar modelo usado.
- [ ] Registrar custo estimado.
- [ ] Criar fallback para mock.
- [ ] Exibir decisão no painel de contexto.

### definição de pronto

- [ ] Usuário envia mensagem no frontend.
- [ ] Backend chama modelo real.
- [ ] Resposta aparece no chat.
- [ ] Mensagens persistem após reload.
- [ ] `model_runs` registra a execução.

---

## fase 5 — orbeRouter real

Objetivo: roteamento inteligente de modelos.

### tarefas

- [ ] Criar interface comum de provider.
- [ ] Criar `MockProvider`.
- [ ] Criar `OpenAIProvider`.
- [ ] Criar `AnthropicProvider`.
- [ ] Criar `GeminiProvider`.
- [ ] Criar `QwenProvider`.
- [ ] Criar `GroqProvider`.
- [ ] Criar policy por modo de chat.
- [ ] Criar policy por custo.
- [ ] Criar policy por qualidade.
- [ ] Criar fallback chain.
- [ ] Registrar decisão do router.
- [ ] Mostrar decisão no admin.

---

## fase 6 — frontend em modo API

Objetivo: fazer o frontend escolher entre mock e backend real.

### tarefas

- [ ] Criar `VITE_ORBEAI_DATA_MODE`.
- [ ] Criar client API real.
- [ ] Manter client mock/localStore.
- [ ] Criar camada de seleção de serviço.
- [ ] Migrar chats.
- [ ] Migrar messages.
- [ ] Migrar projects.
- [ ] Migrar artifacts.
- [ ] Migrar memories.
- [ ] Migrar model config.
- [ ] Migrar integrations.
- [ ] Migrar admin/audit.

---

## fase 7 — memória real

Objetivo: memória controlável e revisável.

### tarefas

- [ ] Criar memória manual.
- [ ] Sugerir memória via chat.
- [ ] Aprovar memória.
- [ ] Rejeitar memória.
- [ ] Editar memória.
- [ ] Arquivar memória.
- [ ] Vincular memória a projeto.
- [ ] Vincular memória a produto.
- [ ] Criar busca textual.
- [ ] Planejar embeddings.
- [ ] Planejar pgvector.

---

## fase 8 — artifacts reais

Objetivo: documentos úteis, persistentes e versionados.

### tarefas

- [ ] Criar artifact manual.
- [ ] Criar artifact a partir de resposta do chat.
- [ ] Editar artifact.
- [ ] Criar versão ao editar.
- [ ] Ver histórico.
- [ ] Restaurar versão.
- [ ] Vincular artifact a projeto.
- [ ] Exportar markdown.
- [ ] Planejar exportação PDF.
- [ ] Criar templates.

---

## fase 9 — API de integração

Objetivo: produtos orbeOne chamando a orbeAI.

### tarefas

- [ ] Criar API key por produto.
- [ ] Criar `POST /v1/integrations/events`.
- [ ] Criar `POST /v1/context/build`.
- [ ] Criar `POST /v1/memory/search`.
- [ ] Criar `POST /v1/artifacts`.
- [ ] Criar `POST /v1/analyze`.
- [ ] Criar exemplo orbeRadar.
- [ ] Criar exemplo orbeRisk.
- [ ] Criar exemplo orbeVault.
- [ ] Criar exemplo orbeAuto.
- [ ] Criar rate limit básico.
- [ ] Criar audit log por integração.

---

## fase 10 — deploy Audaks

Objetivo: colocar staging/produção no ar.

### tarefas

- [ ] Definir domínio final.
- [ ] Criar Dockerfile web, se necessário.
- [ ] Criar Dockerfile backend.
- [ ] Criar compose prod.
- [ ] Configurar Postgres.
- [ ] Configurar Nginx.
- [ ] Configurar SSL.
- [ ] Configurar `.env` no servidor.
- [ ] Criar healthcheck.
- [ ] Criar rotina de backup.
- [ ] Criar logs.
- [ ] Documentar deploy manual.
- [ ] Planejar deploy automatizado.

## próximos passos imediatos

1. Finalizar validação manual da UI.
2. Mergear `refinar-ui-orbeai` na `main`.
3. Criar branch `feature/backend-foundation`.
4. Criar backend FastAPI mínimo.
5. Subir `GET /health`.
