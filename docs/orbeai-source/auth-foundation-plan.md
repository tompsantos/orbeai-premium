# orbeAI - fase 4: auth foundation

Branch: feature/auth-foundation  
Base: main após merge da backend foundation  
Objetivo: transformar a orbeAI de app com workspace padrão em produto com usuários, sessão, memberships e permissões reais.

## 1. objetivo da fase

Implementar a fundação de autenticação da orbeAI.

Esta fase deve criar:

- usuários reais;
- login;
- senha segura com hash;
- sessão/token;
- endpoint /me;
- logout;
- membership entre usuário e workspace;
- roles básicas;
- proteção das rotas principais;
- integração do frontend com sessão real.

## 2. princípio da fase

A fase 4 não deve quebrar a fundação criada na fase 3.

Regras:

- Postgres real continua obrigatório.
- Nada de SQLite.
- Workspace padrão orbeone ainda pode existir como fallback técnico temporário.
- O runtime deve migrar gradualmente para workspace do usuário autenticado.
- Nenhum segredo deve entrar no Git.
- Rotas públicas e privadas precisam ficar claras.
- Testes devem cobrir autenticação e autorização.
- Evitar overengineering de permissões antes da hora.

## 3. modelos planejados

Criar:

- User
- WorkspaceMember
- AuthSession

Campos iniciais de User:

- id
- email
- name
- password_hash
- status
- is_superuser
- last_login_at
- created_at
- updated_at

Campos iniciais de WorkspaceMember:

- id
- workspace_id
- user_id
- role
- status
- created_at
- updated_at

Roles iniciais:

- owner
- admin
- member
- viewer

Campos iniciais de AuthSession:

- id
- user_id
- token_hash
- expires_at
- revoked_at
- created_at
- updated_at

## 4. endpoints planejados

Públicos:

- POST /v1/auth/register
- POST /v1/auth/login

Autenticados:

- GET /v1/auth/me
- POST /v1/auth/logout
- GET /v1/auth/session

Admin/futuro:

- GET /v1/users
- GET /v1/workspace/members
- POST /v1/workspace/members
- PATCH /v1/workspace/members/{member_id}

## 5. estratégia de token

Estratégia inicial:

- backend gera token opaco;
- backend salva apenas hash do token no banco;
- cliente guarda token;
- requests enviam Authorization: Bearer <token>;
- backend valida hash e expiração;
- logout revoga sessão.

JWT pode ser avaliado depois, mas token opaco é mais simples, revogável e seguro para esta fase.

## 6. rotas públicas

Continuam públicas:

- GET /health
- GET /v1/status

## 7. rotas a proteger

Proteger gradualmente:

- projects
- chats
- messages
- chat/send
- artifacts
- memories
- audit logs
- feature flags
- workspace settings
- model runs

## 8. compatibilidade com fase 3

Durante a transição:

- endpoints podem continuar usando workspace padrão enquanto auth não estiver conectado;
- depois, cada request autenticado deve resolver current_user e current_workspace;
- testes existentes devem ser atualizados sem perder cobertura.

## 9. roadmap da fase 4

- 4.0 preparar branch e plano
- 4.1 criar modelos User, WorkspaceMember e AuthSession
- 4.2 criar migration real
- 4.3 criar schemas e services de auth
- 4.4 criar endpoints register/login/me/logout
- 4.5 proteger rotas principais
- 4.6 migrar runtime para current_user/current_workspace
- 4.7 integrar frontend com sessão real
- 4.8 criar telas de login/cadastro
- 4.9 testar e revisar
- 4.10 preparar release interna

## 10. definição de pronto da fase 4

A fase 4 estará pronta quando:

- migration de users/memberships/sessions aplicada;
- usuário consegue registrar;
- usuário consegue logar;
- token autentica GET /v1/auth/me;
- logout revoga sessão;
- rotas protegidas rejeitam request sem token;
- rotas protegidas funcionam com token válido;
- frontend tem login/logout;
- frontend persiste sessão;
- pytest passa;
- bun run typecheck passa;
- documentação atualizada.
