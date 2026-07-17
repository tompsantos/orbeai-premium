# orbeAI

**orbeAI** é o sistema operacional cognitivo central da **orbeOne** — uma plataforma premium de IA de propósito geral com projetos, memória controlável, chat multimodal, artifacts, modo pesquisa, agentes, roteamento de modelos e integração profunda com o ecossistema orbeOne.

> Estado atual: **protótipo navegável em mock mode**. Persistência local via `localStorage`, camada de serviços e contratos de backend prontos para conectar a um backend real.

## Stack

- TanStack Start v1 (SSR) + React 19
- Vite 8
- Tailwind CSS v4 + shadcn/ui
- TypeScript estrito
- TanStack Router (file-based em `src/routes/`)

## Rotas principais

- `/` — landing
- `/app` — cockpit
- `/app/chat` — chat multimodal
- `/app/projects` — projetos
- `/app/artifacts` — artifact studio
- `/app/research` — research lab
- `/app/agents` — agentes
- `/app/memory` — memory center
- `/app/integrations` — integrações
- `/app/models` — model router
- `/app/orbeone` — ecossistema orbeOne
- `/app/admin` — cockpit administrativo
- `/app/settings` — configurações

## Como rodar

```bash
bun install
bun dev
```

## Scripts

- `bun dev` — dev server
- `bun run build` — build de produção
- `bun run typecheck` — typecheck (`tsc --noEmit`)
- `bun run lint` — lint
- `bun run format` — prettier

## Variáveis de ambiente

Veja `.env.example`. As variáveis `VITE_*` são públicas. Chaves de provedores LLM (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.) devem ser usadas **somente server-side** e nunca expostas em builds de client.

## Modo mock

O app roda hoje em `VITE_MOCK_MODE=true`. Dados iniciais vêm de `src/lib/mock/data.ts`, são plantados em `localStorage` (prefixo `orbeai:`) e gerenciados pela camada de serviços em `src/lib/api/services/`. Para limpar a base local: `resetDemoData()` em `src/lib/storage/localStore.ts`.

## Arquitetura

- `src/lib/storage/localStore.ts` — persistência client-side, SSR-safe.
- `src/lib/api/client.ts` + `endpoints.ts` — cliente de API agnóstico (mock/real).
- `src/lib/api/services/*` — um serviço por domínio (projects, chats, artifacts, memory, agents, integrations, models, research, admin, orbeOne, me).
- `src/lib/backend/{contracts,mockBackend,backendClient}.ts` — contratos client/server e mock backend isomórfico.
- `src/server/api/*` — stubs server-side para futura integração com LLM real, memória vetorial, auditoria.
- `src/lib/ai/router` — `orbeRouter` v2 com decisão explicável.

Veja `docs/architecture.md` e `docs/backend-roadmap.md`.

## Deploy SSR

O template alvo é Edge (Cloudflare Workers). Para Node SSR atrás de Nginx:

1. `bun run build` gera o bundle SSR.
2. Sirva com um runtime Node compatível e faça proxy reverso via Nginx.
3. Configure variáveis de ambiente server-side (chaves de LLM, DB).

## Ações funcionais locais (mock mode)

Tudo persiste em `localStorage` com prefixo `orbeai:`. Os componentes consomem **services** em `src/lib/api/services/*`, nunca importam `mockData` direto.

- **Chat**: criar/abrir conversas, enviar mensagens, regenerar, salvar resposta como memória pendente, transformar em artifact, comparar modelos em paralelo, fixar mensagens, anexar (mock) — painel direito com decisão do orbeRouter (provider, qualityTier, latência, custo, hints, fallback).
- **Artifacts**: novo, editar, salvar versão, histórico real, exportar `.md/.txt`, melhorar com IA (mock), transformar formato, remover.
- **Memória**: criar/editar/aprovar/arquivar/remover/exportar; filtros por escopo/status + busca.
- **Projetos**: criar, editar, abrir chat associado, listar artifacts/memórias reais, remover.
- **Integrações**: conectar/desconectar/configurar persiste e gera audit log.
- **Modelos**: provider padrão, routing mode e fallback chain persistem; preview de decisão do orbeRouter.
- **Admin**: feature flags reais, audit/usage filtráveis, reset demo data com confirmação.

## Reset demo data

Em `/app/admin` → botão **Reset demo data**. Limpa todas as chaves `orbeai:*` do localStorage e reseed do mock.

## Onde plugar backend real

- `src/lib/api/client.ts` — `ApiClient.request` (TODO Fase 1).
- `src/lib/backend/backendClient.ts` — trocar `mockBackend` por implementação que chama TanStack server functions.
- `src/server/api/*` — stubs server-side (LLM, router, memory, artifacts, projects, audit). Não chamam APIs externas até variáveis de ambiente estarem configuradas.
- `src/lib/ai/providers/index.ts` — provedores reais (OpenAI/Anthropic/Gemini/etc) estão como `placeholder()` e só rodam quando `isConfigured()` retornar true.

## Limitações atuais

- Mock mode permanente (`VITE_MOCK_MODE=true`). Nenhum provider real é chamado.
- Anexos no chat são apenas chips visuais — upload real entra na Fase 1.
- Memória vetorial / embeddings não existem ainda.
- Auditoria persiste só em `localStorage` (até 500 eventos).
