# orbeAI — plano de construção definitiva

> versão inicial: 2026-06-27  
> branch de trabalho: `refinar-ui-orbeai`  
> objetivo: transformar a orbeAI de frontend premium com dados mockados em produto funcional, integrado e pronto para servir como núcleo cognitivo da orbeOne.

## 1. visão do produto

A orbeAI será o sistema operacional cognitivo da orbeOne. Ela concentra conversa, memória, artifacts, pesquisa, agentes, roteamento de modelos, integrações e inteligência compartilhada entre os produtos do ecossistema.

A orbeAI não deve ser apenas um chat. Ela deve funcionar como uma camada central de inteligência para produtos como orbeRadar, orbeRisk, orbeVault, orbeAuto, orbeGov, orbeCorp, orbeZen, orbeX e orbeScience.

## 2. princípios de arquitetura

1. **GitHub é a fonte da verdade.** O desenvolvimento deve acontecer por branch, commit e revisão. A Audaks executa versões estáveis ou ambientes de staging, não deve ser usada como bancada principal de edição manual.
2. **Mock continua como fallback, não como produto final.** O modo mock deve permanecer útil para desenvolvimento, demo offline e testes sem gasto de API.
3. **Backend protege tudo que é sensível.** Chaves de OpenAI, Anthropic, Gemini, Qwen, Groq e demais provedores nunca devem ir para o frontend.
4. **Uma fatia real por vez.** O primeiro objetivo não é construir todos os recursos ao mesmo tempo, mas sim fazer um fluxo vivo de ponta a ponta.
5. **Produtos integrados, mas independentes.** Os demais produtos podem chamar a orbeAI, mas precisam manter funcionamento básico caso a orbeAI esteja indisponível.
6. **Auditoria desde cedo.** Chamadas de modelo, ações de usuário, uso de API, geração de artifact e alterações de memória devem gerar logs rastreáveis.

## 3. fluxo vivo inicial

A primeira fatia funcional da orbeAI deve provar este fluxo:

```text
usuário entra
→ cria ou abre conversa
→ envia mensagem
→ backend salva mensagem no Postgres
→ orbeRouter escolhe provedor/modelo
→ backend chama modelo real
→ resposta volta para o frontend
→ resposta é salva no banco
→ decisão do router é registrada
→ usuário pode transformar resposta em memória ou artifact
→ outro produto pode chamar a orbeAI por API interna
```

Quando esse fluxo existir, a orbeAI deixa de ser protótipo e passa a ser produto vivo.

## 4. stack recomendada

### frontend

- TanStack Start
- React
- Vite
- Tailwind CSS
- shadcn/ui
- TypeScript

### backend

- FastAPI
- Python 3.12+
- PostgreSQL
- SQLAlchemy ou SQLModel
- Alembic
- Pydantic
- JWT
- Docker

### serviços opcionais futuros

- Redis para filas/cache/streaming avançado
- pgvector para memória semântica
- S3 compatível para arquivos/artifacts maiores
- observabilidade com Prometheus/Grafana ou serviço similar

## 5. estrutura alvo do repositório

```text
orbeai/
  src/                         frontend atual
  backend/                     API real da orbeAI
    app/
      main.py
      core/
      db/
      models/
      schemas/
      services/
      routers/
      providers/
      integrations/
    alembic/
    tests/
    Dockerfile
    pyproject.toml
  docs/
    orbeai-build-plan.md
    orbeai-status-checklist.md
    api-integration-contract.md
  docker-compose.dev.yml
  docker-compose.prod.yml
  .env.example
```

## 6. fases de construção

### fase 0 — estabilizar UI refinada

Objetivo: transformar a branch atual em base oficial de produto.

Entregáveis:

- validar páginas principais no Chrome/Codespaces;
- garantir `bun run typecheck` sem erro;
- garantir `bun run build` sem erro;
- revisar pequenos bugs visuais;
- mergear `refinar-ui-orbeai` na `main` quando aprovado;
- criar tag `ui-mvp-v1`.

### fase 1 — fundação do backend

Objetivo: criar API real, banco e base de execução.

Entregáveis:

- criar pasta `backend/`;
- criar app FastAPI;
- criar endpoint `GET /health`;
- configurar `.env`;
- conectar PostgreSQL;
- configurar migrations com Alembic;
- criar Dockerfile do backend;
- criar `docker-compose.dev.yml`;
- configurar CORS para o frontend;
- criar logging estruturado.

### fase 2 — modelo de dados mínimo

Objetivo: trocar o chão de localStorage/mock por persistência real.

Tabelas iniciais:

- `workspaces`
- `users`
- `projects`
- `chats`
- `messages`
- `artifacts`
- `artifact_versions`
- `memories`
- `model_providers`
- `model_runs`
- `audit_logs`
- `api_keys`
- `integration_clients`

### fase 3 — autenticação e segurança

Objetivo: permitir acesso seguro ao produto e às integrações.

Entregáveis:

- login básico;
- JWT access token;
- refresh token ou sessão persistente;
- roles: `owner`, `admin`, `member`, `service`;
- API keys para produtos internos;
- hash das API keys no banco;
- escopos por produto;
- audit log de login, logout, chamada de modelo, criação de artifact e mudança de memória.

### fase 4 — chat real com um provedor

Objetivo: dar vida ao chat com um modelo real.

Entregáveis:

- endpoint `POST /v1/chat/send`;
- salvar mensagem do usuário;
- chamar primeiro provedor real;
- salvar resposta;
- retornar resposta ao frontend;
- registrar latência, custo estimado, provider e modelo;
- manter fallback mock.

Provedor inicial recomendado:

- OpenAI ou Anthropic, escolhendo o mais simples de configurar no momento da implementação.

### fase 5 — orbeRouter real

Objetivo: transformar o router em camada inteligente de decisão.

Entregáveis:

- interface comum de provider;
- `MockProvider`;
- `OpenAIProvider`;
- `AnthropicProvider`;
- `GeminiProvider` futuro;
- `QwenProvider` futuro;
- `GroqProvider` futuro;
- política de roteamento por tarefa;
- política de fallback;
- logs de decisão;
- painel administrativo mostrando uso por provider/modelo.

### fase 6 — frontend em modo API

Objetivo: substituir localStorage/mock por backend real de forma gradual.

Estratégia:

```text
VITE_ORBEAI_DATA_MODE=mock
VITE_ORBEAI_DATA_MODE=api
```

Ordem de migração:

1. chats;
2. messages;
3. projects;
4. artifacts;
5. memories;
6. model config;
7. integrations;
8. admin/audit.

### fase 7 — memória real

Objetivo: criar memória controlável, revisável e segura.

Entregáveis:

- criar memória manual;
- sugerir memória a partir do chat;
- aprovar/rejeitar memória sugerida;
- editar memória;
- arquivar memória;
- escopos: global, workspace, projeto, produto;
- origem: chat, artifact, integração, produto;
- busca textual;
- pgvector/embeddings em fase posterior.

### fase 8 — artifacts reais

Objetivo: transformar respostas em documentos úteis e versionados.

Entregáveis:

- criar artifact pelo chat;
- criar artifact manual;
- versionamento;
- histórico de alterações;
- vínculo com projeto/produto;
- exportação markdown;
- exportação PDF futura;
- templates: plano, relatório, prompt, checklist, briefing, proposta.

### fase 9 — API de integração

Objetivo: permitir que os produtos da orbeOne usem a orbeAI como camada cognitiva.

Entregáveis:

- API keys por produto;
- endpoint de eventos;
- endpoint de contexto;
- endpoint de memória;
- endpoint de análise;
- endpoint de artifact;
- documentação de contrato;
- exemplos para orbeRadar, orbeRisk, orbeVault e orbeAuto.

### fase 10 — deploy Audaks

Objetivo: colocar a orbeAI no ar com segurança e manutenção.

Sugestão de domínios:

```text
ai.orbeone.com.br
api.ai.orbeone.com.br
```

Entregáveis:

- Docker web;
- Docker backend;
- Postgres configurado;
- Nginx reverse proxy;
- SSL via Certbot;
- variáveis de ambiente no servidor;
- healthcheck;
- backup;
- logs;
- deploy manual documentado;
- deploy automatizado futuro.

## 7. ordem de integração dos produtos

Depois que a API da orbeAI estiver viva, a ordem recomendada é:

1. **orbeRadar** — primeiro porque ajuda a vender a própria orbeOne e vira case comercial.
2. **orbeRisk** — segundo porque usa análise, evidência, reputação e documentação.
3. **orbeVault** — terceiro porque exige segurança mais madura.
4. **orbeAuto** — quarto porque pode usar a orbeAI como copiloto operacional, mas não deve depender dela para funcionar.
5. **orbeGov/orbeCorp/orbeZen/orbeX/orbeScience** — depois, conforme prioridade comercial e técnica.

## 8. branch strategy

Branches sugeridas:

```text
feature/backend-foundation
feature/auth-api-keys
feature/live-chat-provider
feature/model-router
feature/api-data-mode
feature/memory-api
feature/artifacts-api
feature/integration-api
feature/deploy-audaks
```

Cada branch deve ter:

- objetivo claro;
- checklist de entrega;
- comandos de teste;
- commit pequeno por etapa;
- merge só depois de `typecheck`, build e teste manual mínimo.

## 9. definição de pronto do MVP funcional

A orbeAI pode ser considerada MVP funcional quando:

- tem backend real;
- tem banco real;
- tem login;
- chat chama ao menos um modelo real;
- mensagens são persistidas;
- artifacts são persistidos;
- memórias são persistidas;
- existe audit log básico;
- existe API key para integração interna;
- ao menos um endpoint de integração funciona;
- deploy em staging ou produção na Audaks está documentado.
