# orbeAI - backend foundation review

Status: revisão técnica fina da fase 3.

## objetivo

Validar que a backend foundation está pronta para preparação de merge/release interna.

## contrato técnico validado

A foundation precisa expor as rotas essenciais de:

- health/status
- projects
- chats
- messages
- chat runtime
- model providers
- model runs
- orbeRouter
- artifacts
- artifact export
- memories
- audit logs
- feature flags
- workspace
- workspace settings

Também precisa garantir que rotas rejeitadas no roadmap não voltaram acidentalmente.

## ponto explicitamente bloqueado

O endpoint de budget/cotas não faz parte desta fase.

Critério:

    nenhuma rota contendo budget deve estar registrada no OpenAPI.

## validações obrigatórias

Antes de preparar merge/release interna:

    python -m compileall app tests
    pytest
    bun run typecheck

## critérios de pronto da revisão

- OpenAPI contém as rotas obrigatórias.
- Métodos HTTP principais estão registrados.
- Endpoint budget não existe.
- Testes de contrato passam.
- Testes completos passam.
- Typecheck do frontend passa.
- Worktree fica limpo após commit.
