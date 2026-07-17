# orbeAI auth foundation

Status: release interna
Branch: feature/auth-foundation

## visão geral

A auth foundation adiciona autenticação real à orbeAI.

Antes desta fase, o backend operava com workspace padrão e rotas principais abertas. Agora a plataforma possui usuários, sessões reais, membership de workspace, token opaco e frontend conectado à sessão.

## entregas principais

- Modelos de autenticação:
  - User
  - WorkspaceMember
  - AuthSession

- Migration real:
  - 20260627_0004_auth_foundation.py

- Segurança:
  - Hash de senha com PBKDF2-SHA256.
  - Token opaco criado no backend.
  - Apenas token_hash salvo no banco.
  - Sessão revogável.
  - Logout invalida token.

- Endpoints:
  - POST /v1/auth/register
  - POST /v1/auth/login
  - GET /v1/auth/me
  - GET /v1/auth/session
  - POST /v1/auth/logout

- Proteção de API:
  - Rotas principais exigem Authorization Bearer.
  - Health/status seguem públicos.
  - Auth register/login seguem públicos.

- Runtime autenticado:
  - Workspace resolvido por membership ativa.
  - Projects usam current_workspace.
  - Chat runtime usa current_workspace.
  - Mensagens recebem auth_user_id e auth_workspace_id no metadata.

- Frontend:
  - ApiClient envia Authorization Bearer.
  - Sessão salva no localStorage.
  - Rota /login criada.
  - Login/cadastro reais.
  - /app redireciona para /login sem token.
  - AppShell mostra usuário real.
  - Logout real conectado ao menu.

## rotas públicas

- GET /health
- GET /v1/status
- POST /v1/auth/register
- POST /v1/auth/login

## rotas protegidas

- /v1/projects
- /v1/workspace
- /v1/artifacts
- /v1/memories
- /v1/chats
- /v1/messages
- /v1/chat/send
- /v1/model-runs
- /v1/audit-logs
- /v1/feature-flags
- /v1/model-providers
- /v1/router/resolve

## execução local recomendada

Backend com providers reais:

    cd /workspaces/orbeai/backend
    source .venv/bin/activate

    set -a
    source /workspaces/orbeai/.env
    set +a

    export DATABASE_URL=postgresql+psycopg://orbeai:orbeai@localhost:5433/orbeai
    export ENABLE_REAL_PROVIDERS=true

    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

Frontend:

    cd /workspaces/orbeai
    bun dev

## atenção operacional

Se o frontend retornar Not Found em /v1/auth/login ou /v1/auth/register, verificar se a porta 8000 não está presa por container antigo.

Comando útil:

    sudo lsof -nP -iTCP:8000 -sTCP:LISTEN

Se houver container antigo, parar o container e subir o backend local com o código atual.

## checklist de aceite

- /v1/auth/register retorna 201 ou 409.
- /v1/auth/login retorna 200 com access_token.
- /v1/auth/me exige Bearer token.
- /v1/auth/logout revoga sessão.
- Rotas principais retornam 401 sem token.
- Rotas principais funcionam com token válido.
- /app redireciona para /login sem token.
- Login/cadastro funcionam no navegador.
- Header mostra usuário real.
- Logout visual volta para /login.
- OpenAI e Gemini aparecem ativos quando ENABLE_REAL_PROVIDERS=true.
- pytest passa.
- bun run typecheck passa.
- bun run build passa.

## pendências futuras

- Permissões finas por role.
- Multi-workspace selecionável no frontend.
- Tela de gestão de usuários.
- Convites para workspace.
- Recuperação de senha.
- Refresh token ou rotação avançada de sessão.
- Login social, se fizer sentido no futuro.
