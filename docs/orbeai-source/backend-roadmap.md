# orbeAI — Roadmap de Backend

## Fase 0 — Mock + localStorage (atual)
- Service layer 100% local sobre `localStore` (prefixo `orbeai:`).
- `mockBackend` implementa `BackendContract` usando os services.
- Providers de LLM em modo placeholder, exceto `MockProvider`.
- orbeRouter v2 com `taskHints`, `qualityTier`, custo/latência estimados.

## Fase 1 — Persistência
- Supabase/Postgres com schema em `docs/database-schema.sql`.
- Auth (Supabase Auth ou equivalente) e RLS por `workspace_id`.
- Migrar `projectService`, `chatService`, `memoryService`, `artifactService`, `researchService`, `adminService` para `apiClient` real.
- `backendClient` passa a apontar para `realBackend` quando `VITE_MOCK_MODE=false`.

## Fase 2 — LLM real
- TanStack `createServerFn` em `src/server/api/llm.ts` para cada provedor.
- Chaves apenas em `process.env` server-side. Nunca `VITE_*`.
- `orbeRouter` decide; handler server-side executa com fallback real.

## Fase 3 — Arquivos, embeddings e memória vetorial
- Storage de anexos (Supabase Storage / S3).
- Embeddings via OpenAI/Anthropic/Gemini.
- Memória vetorial em pgvector ou Qdrant.
- `src/server/api/memory.ts` ganha `indexMemory` / `searchMemory` reais.

## Fase 4 — Agentes, filas e integrações
- Workers/queues para agentes de longa duração.
- OAuth para integrações (Google, GitHub, Slack, etc.).
- Webhooks em `src/routes/api/public/*` com verificação de assinatura.

## Fase 5 — Enterprise
- SSO (SAML/OIDC), audit logs imutáveis, retenção configurável, exportação de memória.
- Feature flags server-side, multi-region, observabilidade (OTel), DPA.
