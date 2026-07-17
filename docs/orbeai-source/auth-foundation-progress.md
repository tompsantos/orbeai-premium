# orbeAI - progresso da fase 4: auth foundation

Branch: feature/auth-foundation  
Base: main após merge da backend foundation  
Início: 2026-06-27

## status atual

    [~] fase 4 iniciada

## objetivo

Criar a fundação real de autenticação, usuários, sessões e memberships da orbeAI.

## fases planejadas

- [x] 4.0 preparar branch e plano
- [x] 4.1 criar modelos de User, WorkspaceMember e AuthSession
- [x] 4.2 criar migration real
- [x] 4.3 criar schemas e services de auth
- [x] 4.4 criar endpoints register/login/me/logout
- [x] 4.5 proteger rotas principais
- [x] 4.6 migrar runtime para current_user/current_workspace
- [x] 4.7 integrar frontend com sessão real
- [ ] 4.8 criar telas de login/cadastro
- [x] 4.9 testar e revisar
- [x] 4.10 preparar release interna

## decisões iniciais

- Usar Postgres real.
- Não usar SQLite.
- Usar token opaco com hash salvo no banco.
- Manter JWT para avaliação posterior, não como primeira escolha.
- Health/status continuam públicos.
- Workspace padrão segue temporário até current_workspace ficar pronto.


---

## atualização: modelos de auth

A etapa 4.1 criou os modelos SQLAlchemy da fundação de autenticação.

Modelos adicionados:

- User
- WorkspaceMember
- AuthSession

Tabelas planejadas:

- users
- workspace_members
- auth_sessions

Decisões aplicadas:

- User usa email único.
- Senha será armazenada apenas como password_hash.
- WorkspaceMember conecta users a workspaces com role e status.
- AuthSession usa token_hash, não token em texto puro.
- AuthSession possui expiração e revogação.
- A migration real fica para a etapa 4.2.


---

## atualização: migration real de auth

A etapa 4.2 criou e aplicou a migration real da fundação de autenticação.

Migration adicionada:

- 20260627_0004_auth_foundation.py

Tabelas criadas:

- users
- workspace_members
- auth_sessions

Constraints principais:

- users.email único.
- workspace_members com par workspace_id + user_id único.
- auth_sessions.token_hash único.
- workspace_members referencia workspaces e users.
- auth_sessions referencia users.

Status:

- Migration aplicada em Postgres real.
- Alembic head atualizado para 20260627_0004.
- Testes de contrato dos modelos e da migration adicionados.


---

## atualização: schemas e services de auth

A etapa 4.3 criou a camada interna de autenticação.

Arquivos adicionados:

- app/core/security.py
- app/schemas/auth.py
- app/services/auth.py

Recursos implementados:

- Normalização de email.
- Hash de senha com PBKDF2-SHA256.
- Verificação segura de senha.
- Criação de token opaco.
- Hash de token para persistência segura.
- Registro interno de usuário.
- Criação automática de membership no workspace padrão.
- Autenticação por email e senha.
- Criação de sessão.
- Validação de sessão ativa.
- Revogação de sessão.

Decisões mantidas:

- Token real não é salvo no banco.
- Apenas token_hash é persistido.
- Primeiro usuário registrado vira superuser e owner do workspace padrão.
- Endpoints públicos ficam para a etapa 4.4.


---

## atualização: endpoints de auth

A etapa 4.4 criou os primeiros endpoints reais de autenticação.

Endpoints adicionados:

- POST /v1/auth/register
- POST /v1/auth/login
- GET /v1/auth/me
- GET /v1/auth/session
- POST /v1/auth/logout

Arquivos adicionados:

- app/dependencies/auth.py
- app/routers/auth.py

Comportamento validado:

- Registro cria usuário e sessão.
- Login retorna token opaco.
- /me exige token Bearer válido.
- /session exige token Bearer válido.
- Logout revoga sessão.
- Token revogado deixa de autenticar.
- Senha e password_hash não aparecem nas respostas.


---

## atualização: proteção de rotas principais

A etapa 4.5 passou a exigir autenticação nas rotas principais da API.

Rotas públicas mantidas:

- GET /health
- GET /v1/status
- POST /v1/auth/register
- POST /v1/auth/login

Rotas protegidas:

- projects
- workspace
- artifacts
- memories
- chats
- messages
- chat/send
- model runs
- audit logs
- feature flags
- model providers
- orbeRouter

Estratégia de testes:

- Testes antigos usam override temporário de autenticação no conftest.
- Testes de auth real continuam usando Bearer token real.
- Novo teste valida que rotas principais rejeitam request sem token.
- Novo teste valida que rotas principais aceitam token válido.

Observação:

- Nesta etapa, as rotas exigem autenticação, mas ainda usam o workspace padrão internamente.
- A migração real para current_user/current_workspace fica para a etapa 4.6.


---

## atualização: current user e current workspace

A etapa 4.6 iniciou a migração da API para usar o usuário e o workspace autenticados.

Arquivos adicionados:

- app/dependencies/workspace.py

Rotas migradas:

- GET /v1/workspace
- PATCH /v1/workspace
- PATCH /v1/workspace/settings
- CRUD de /v1/projects
- POST /v1/chat/send

Comportamento validado:

- Workspace é resolvido pela membership ativa do usuário autenticado.
- Projects são criados dentro do current_workspace.
- Projects de outro workspace não ficam visíveis pelo endpoint de project.
- Chat runtime cria/reusa chat dentro do current_workspace.
- Mensagem do usuário recebe metadata de auth_user_id e auth_workspace_id.
- Testes antigos seguem com override temporário.
- Testes novos usam auth real com token Bearer.

Observação:

- A migração completa de todos os recursos para escopo por workspace segue nas próximas etapas.
- Nesta etapa, o foco foi workspace, projects e chat runtime.


---

## atualização: frontend com sessão real

A etapa 4.7 integrou o frontend com a sessão real do backend.

Arquivos adicionados/alterados:

- src/lib/auth/session.ts
- src/lib/api/client.ts

Comportamento implementado:

- Frontend salva access_token em localStorage.
- ApiClient injeta Authorization: Bearer nos requests.
- ApiClient limpa sessão local em caso de 401.
- Ambiente local pode usar dev auth bridge para registrar/logar automaticamente.
- O token usado pelo frontend é token real criado pelo backend.

Observação:

- A tela visual de login/cadastro fica para a etapa 4.8.
- O dev auth bridge só deve ser usado em desenvolvimento local.


---

## nota operacional: frontend, auth e providers locais

Durante a validação da tela de login/cadastro, o frontend retornou Not Found ao tentar entrar ou cadastrar.

Diagnóstico encontrado:

- O código local já expunha /v1/auth/login e /v1/auth/register no OpenAPI.
- Porém curl http://localhost:8000/v1/auth/login retornava 404.
- A porta 8000 estava presa por um container antigo com uvicorn desatualizado.
- O backend local novo não estava de fato servindo a porta usada pelo frontend.

Correção aplicada no ambiente local:

- Identificar o processo/container usando a porta 8000.
- Parar o container antigo.
- Subir o backend local com o código atual.
- Carregar o .env real.
- Garantir ENABLE_REAL_PROVIDERS=true.

Comando operacional recomendado para backend local com providers reais:

    cd /workspaces/orbeai/backend
    source .venv/bin/activate

    set -a
    source /workspaces/orbeai/.env
    set +a

    export DATABASE_URL=postgresql+psycopg://orbeai:orbeai@localhost:5433/orbeai
    export ENABLE_REAL_PROVIDERS=true

    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

Resultado validado:

- /v1/auth/login e /v1/auth/register deixaram de retornar 404.
- Login/cadastro funcionaram no frontend.
- Providers reais voltaram a aparecer como ativos no cockpit.
- OpenAI e Gemini subiram corretamente quando o backend foi iniciado com ENABLE_REAL_PROVIDERS=true.


---

## atualização: user menu, logout e proteção visual

A etapa 4.9 conectou a experiência visual do app à sessão real.

Arquivos alterados:

- src/routes/app.tsx
- src/components/layout/AppShell.tsx

Comportamento implementado:

- A rota /app redireciona para /login quando não existe token local.
- O AppShell valida a presença de sessão local ao montar.
- O header passa a exibir nome/email do usuário autenticado.
- O avatar passa a usar iniciais reais do usuário.
- O menu remove o texto fixo orbeOne Admin.
- O botão sair chama POST /v1/auth/logout por meio do authService.
- A sessão local é limpa após logout.
- O usuário é redirecionado para /login depois de sair.

Resultado esperado:

- Usuário sem sessão não acessa o cockpit visualmente.
- Usuário autenticado vê dados reais no menu.
- Logout encerra sessão e impede retorno direto para /app.


---

## atualização: release interna da auth foundation

A etapa 4.10 preparou a release interna da fundação de autenticação.

Arquivo criado:

- docs/auth-foundation-release.md

Conteúdo documentado:

- Escopo entregue.
- Rotas públicas e protegidas.
- Execução local recomendada.
- Nota operacional sobre porta 8000 e container antigo.
- Checklist de aceite.
- Pendências futuras.

Status:

- Auth foundation pronta para revisão final e merge.

