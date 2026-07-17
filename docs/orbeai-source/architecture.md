# orbeAI — Arquitetura

orbeAI é o sistema operacional cognitivo central da **orbeOne**. Esta versão é um protótipo premium, totalmente navegável, com persistência local e contratos de backend prontos para serem trocados por um backend real.

## Camadas

```
┌─────────────────────────────────────────────────────────────┐
│ UI  · TanStack Start + React 19 + Tailwind 4 + shadcn/ui    │
│      src/routes/*, src/components/*                         │
├─────────────────────────────────────────────────────────────┤
│ Service layer · src/lib/api/services/*                      │
│   meService · projectService · chatService · artifactService│
│   memoryService · agentService · integrationService         │
│   modelService · researchService · adminService             │
│   orbeOneService · auditService                             │
├─────────────────────────────────────────────────────────────┤
│ Backend contracts · src/lib/backend/                        │
│   contracts.ts · mockBackend.ts · backendClient.ts          │
├─────────────────────────────────────────────────────────────┤
│ AI  · src/lib/ai/{providers,router}                          │
│   orbeRouter v2 (decisão explicável + fallback)             │
├─────────────────────────────────────────────────────────────┤
│ Storage · src/lib/storage/localStore.ts (orbeai:* keys)     │
├─────────────────────────────────────────────────────────────┤
│ Mock data · src/lib/mock/data.ts (seed)                     │
└─────────────────────────────────────────────────────────────┘
         ▲                                  ▲
         │ mock mode (atual)                │ Fase 1+
         │                                  │
         └──── localStore + mockBackend ────┘
                                            │
                                            ▼
                                  ┌────────────────────┐
                                  │ src/server/api/*   │
                                  │  llm · router      │
                                  │  memory · audit    │
                                  │  artifacts·projects│
                                  └────────────────────┘
                                  TanStack server functions
                                  (chaves em process.env)
```

## Princípios

- **Mock-first, backend-ready**: cada service tem assinatura compatível com a futura API real.
- **Chaves nunca no client**: provedores reais só são chamados server-side (`src/server/api/llm.ts`).
- **Memória controlável**: usuário decide o que é lembrado, editado ou apagado.
- **Roteamento explicável**: cada decisão do `orbeRouter` carrega `reason`, `taskHints`, `qualityTier`, `estimatedLatencyMs`, `estimatedCostUsd`.
- **Workspace isolation**: dados são escopados por workspace e por projeto (RLS na Fase 1).
- **Audit trail**: toda ação relevante gera evento via `auditService.log()`.

## Persistência

Em mock mode todos os dados ficam em `localStorage` com prefixo `orbeai:` (ver `src/lib/storage/localStore.ts`). Para resetar a base de demo:

```ts
import { localStore } from "@/lib/storage/localStore";
localStore.resetDemoData();
```

## Pontos de extensão para backend real

| Camada            | Hoje (mock)                              | Futuro                                   |
|-------------------|------------------------------------------|------------------------------------------|
| Auth              | `mockUser` fixo                          | Supabase Auth / OAuth                    |
| Banco             | `localStore`                              | Postgres + RLS por workspace             |
| LLM               | `MockProvider`                           | `createServerFn` chama OpenAI/Anthropic… |
| Arquivos          | em memória                               | Storage (S3/Supabase Storage)            |
| Memória vetorial  | indisponível                             | pgvector / Qdrant + embeddings           |
| Integrações       | toggle local                             | OAuth + webhooks em `/api/public/*`      |
| Auditoria         | `localStore` (append, max 500)           | tabela append-only com retenção          |
