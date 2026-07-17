# orbeAI - checklist final da fase 3

## branch

- [ ] Estou na branch `feature/backend-foundation`.
- [ ] Branch atualizada com `origin/feature/backend-foundation`.
- [ ] Worktree limpo antes dos testes finais.

## backend

- [ ] `python -m compileall app tests` passa.
- [ ] `pytest` passa.
- [ ] Migrations estão versionadas.
- [ ] OpenAPI registra rotas essenciais.
- [ ] Endpoint de budget não existe.
- [ ] `.env` não está versionado.
- [ ] `.env.example` contém variáveis necessárias sem segredos.

## frontend

- [ ] `bun run typecheck` passa.
- [ ] Chat renderiza sem cortar botões da sidebar.
- [ ] Títulos de conversas longas usam reticências.
- [ ] Admin cockpit carrega dados reais.
- [ ] Feature flags aparecem no admin.
- [ ] Workspace settings aparecem no admin.

## produto

- [ ] Chat envia mensagem via backend.
- [ ] Model run é criado após envio.
- [ ] Audit log é criado após envio.
- [ ] Memória automática respeita feature flag e policy.
- [ ] Export de artifact respeita `allow_exports`.
- [ ] Provider mock funciona como fallback.

## documentação

- [ ] `docs/backend-foundation.md` existe.
- [ ] `docs/backend-foundation-review.md` existe.
- [ ] `docs/backend-foundation-release.md` existe.
- [ ] `docs/backend-foundation-final-checklist.md` existe.
- [ ] `docs/backend-foundation-progress.md` aponta para documentação consolidada.

## merge/release

- [ ] Comparação com `main` revisada.
- [ ] Commits finais enviados para GitHub.
- [ ] Branch pronta para PR ou merge controlado.
