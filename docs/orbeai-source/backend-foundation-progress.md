# orbeAI — progresso da fase 1: fundação do backend

> branch: `feature/backend-foundation`  
> início: 2026-06-27  
> objetivo: criar a base real da API da orbeAI com FastAPI, Postgres, Docker e healthcheck.

## status atual

```text
[~] fase 1 em andamento
```

## já concluído nesta branch

- [x] `main` recebeu o fast-forward da branch `refinar-ui-orbeai`.
- [x] Branch `feature/backend-foundation` criada a partir da `main` atualizada.
- [x] Pasta `backend/` criada.
- [x] Projeto Python configurado em `backend/pyproject.toml`.
- [x] App FastAPI inicial criado em `backend/app/main.py`.
- [x] Configuração central criada em `backend/app/core/config.py`.
- [x] Logging básico estruturável criado em `backend/app/core/logging.py`.
- [x] Endpoint `GET /health` criado.
- [x] Endpoint `GET /v1/status` criado.
- [x] CORS configurado para desenvolvimento local.
- [x] SQLAlchemy preparado.
- [x] Alembic preparado.
- [x] Dockerfile do backend criado.
- [x] `docker-compose.dev.yml` criado com API + Postgres.
- [x] `.env.example` atualizado com variáveis do backend.
- [x] Testes básicos de healthcheck criados.
- [x] README do backend criado.

## pendente para fechar a fase 1

- [ ] Rodar o backend no Codespaces.
- [ ] Validar `GET /health` via terminal.
- [ ] Validar `GET /v1/status` via terminal.
- [ ] Rodar testes Python.
- [ ] Rodar Docker Compose.
- [ ] Criar primeira migration real.
- [ ] Atualizar checklist principal marcando fase 1 como parcialmente concluída.

## comandos de teste local

### modo Python direto

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Em outro terminal:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/v1/status
```

### modo Docker Compose

Na raiz do repositório:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Teste:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/v1/status
```

## próximo passo técnico

Validar esta fundação no Codespaces. Depois disso, avançar para modelos reais do banco:

1. `workspaces`
2. `users`
3. `projects`
4. `chats`
5. `messages`
6. `artifacts`
7. `memories`
8. `audit_logs`
9. `model_runs`
10. `api_keys`


---

## atualização: migration inicial

Status atual da fase 1:

- [x] API /health validada localmente
- [x] API /v1/status validada localmente
- [x] modelos iniciais registrados no SQLAlchemy
- [x] testes Python passando
- [~] migration inicial criada
- [ ] migration validada em SQL offline
- [x] migration aplicada em Postgres real

Tabelas cobertas pela primeira migration:

- workspaces
- projects
- chats
- messages
- artifacts
- artifact_versions
- memories
- model_providers
- model_runs
- audit_logs
- integration_clients

Observação técnica:

- users, login, sessões e chaves reais de API ficam para a fase 3, autenticação e segurança.
- A fase atual prioriza persistência de conversas, projetos, artifacts, memória, logs de modelo, auditoria e clientes de integração.
- A migration foi escrita manualmente para não depender de banco local no Codespaces.
- A validação imediata será feita com alembic upgrade head --sql, que gera o SQL sem conectar no Postgres.
- A aplicação real da migration será testada em Postgres via Docker/Audaks.

Próximo passo depois da validação:

- criar endpoints reais de projects, chats e messages;
- manter provider mock por enquanto;
- só depois plugar modelo externo real.



---

## validação em Postgres real

A migration inicial foi aplicada com sucesso em um banco Postgres rodando via Docker no Codespaces.

Resultado validado:

- API /health respondeu com sucesso.
- API /v1/status respondeu com sucesso.
- Alembic executou upgrade head usando DATABASE_URL apontando para Postgres.
- Revision aplicada: 20260627_0001.
- Ambiente usado para validação: Docker Compose local do projeto.
- Objetivo: manter o mesmo caminho técnico previsto para Audaks, sem adaptação para SQLite.

Próximo passo técnico:

- criar endpoints reais para projects, chats e messages;
- persistir dados no Postgres;
- manter provider de IA em modo mock até o fluxo de dados estar estável;
- depois conectar o orbeRouter aos provedores reais.

---

## atualização: endpoints de projects

A fase 2.1 criou os primeiros endpoints reais de dados da orbeAI.

Status validado:

- POST /v1/projects cria projeto no Postgres.
- GET /v1/projects lista projetos salvos.
- GET /v1/projects/{project_id} busca projeto por id.
- PATCH /v1/projects/{project_id} atualiza projeto existente.
- Testes passaram usando DATABASE_URL apontando para Postgres real via Docker.
- Commit aplicado: 8007e07 add projects api endpoints.

Observação técnica:

- O workspace padrão orbeone é criado automaticamente enquanto a autenticação real ainda não existe.
- Esse bootstrap é temporário até a fase de auth/workspaces.
- O backend segue usando Postgres desde o início, sem SQLite.

---

## atualização: endpoints de chats

A fase 2.2 criou os endpoints reais de conversas da orbeAI.

Status validado:

- POST /v1/chats cria conversa no Postgres.
- GET /v1/chats lista conversas salvas.
- GET /v1/chats/{chat_id} busca conversa por id.
- PATCH /v1/chats/{chat_id} atualiza conversa existente.
- GET /v1/chats aceita filtro opcional por project_id.
- Conversas podem ser vinculadas a um projeto.
- Conversas usam o workspace padrão orbeone enquanto a autenticação real ainda não existe.
- Testes passaram usando DATABASE_URL apontando para Postgres real via Docker.
- Curl validou criação e listagem de conversa real ligada ao projeto orbeAI Core.
- Commit aplicado: 319038b add chats api endpoints.

Observação técnica:

- A lógica de criação do workspace padrão foi movida para app/services/bootstrap.py.
- O router de projects passou a reutilizar esse serviço.
- O backend segue usando Postgres desde o início, sem SQLite.
- A autenticação real e separação de workspaces por usuário ficam para uma fase posterior.

Próximo passo técnico:

- criar endpoints reais de messages;
- permitir criar mensagem ligada a chat;
- listar mensagens por chat;
- preparar base para resposta mock da orbeAI;
- depois ligar o fluxo chat -> message -> model_run.

---

## atualização: endpoints de messages

A fase 2.3 criou os endpoints reais de mensagens da orbeAI.

Status validado:

- POST /v1/chats/{chat_id}/messages cria mensagem no Postgres.
- GET /v1/chats/{chat_id}/messages lista mensagens de uma conversa.
- GET /v1/messages/{message_id} busca mensagem por id.
- Mensagens ficam vinculadas a um chat real.
- Ao criar uma mensagem, o updated_at do chat é atualizado.
- Testes passaram usando DATABASE_URL apontando para Postgres real via Docker.
- Curl validou criação e listagem de mensagem real dentro da conversa Primeira conversa real da orbeAI.
- Commit aplicado: 40b8f90 add messages api endpoints.

Estado atual da fase 2:

- projects persistem em Postgres.
- chats persistem em Postgres.
- messages persistem em Postgres.
- O backend já consegue guardar a estrutura principal de conversa da orbeAI.

Próximo passo técnico:

- criar endpoint de envio inteligente: POST /v1/chat/send;
- salvar mensagem do usuário;
- gerar resposta mock da orbeAI;
- salvar mensagem assistant;
- registrar model_run básico;
- depois substituir o provider mock pelo orbeRouter real.

---

## atualização: chat send mock

A fase 2.4 criou o primeiro fluxo completo de conversa da orbeAI.

Status validado:

- POST /v1/chat/send recebe mensagem do usuário.
- O endpoint cria um chat novo ou reutiliza um chat existente.
- A mensagem do usuário é salva na tabela messages.
- O provider mock gera uma resposta de assistant.
- A resposta da assistant é salva na tabela messages.
- Um registro é criado na tabela model_runs.
- O retorno da API inclui chat_id, provider, model, model_run_id, user_message e assistant_message.
- Curl validou envio real usando a conversa Primeira conversa real da orbeAI.
- Commit aplicado: dd7b22c add chat send mock flow.

Estado atual:

- projects persistem em Postgres.
- chats persistem em Postgres.
- messages persistem em Postgres.
- model_runs já registra execuções do fluxo mock.
- O backend já consegue sustentar uma conversa ponta a ponta sem provider externo.

Observação técnica:

- O provider atual é orbe-mock.
- O modelo atual é orbe-mock-v0.
- O fluxo foi preparado para receber o orbeRouter real depois.
- Nenhuma adaptação para SQLite foi usada.
- A validação continua usando Postgres real via Docker.

Próximo passo técnico recomendado:

- conectar o frontend ao endpoint POST /v1/chat/send;
- manter fallback mock visual enquanto a API não estiver acessível;
- depois criar o orbeRouter real para escolher OpenAI, Gemini, Qwen, Groq ou provider local.

---

## atualização: frontend conectado ao backend

A fase 2.5 conectou a interface visual da orbeAI ao backend real.

Status validado:

- O frontend passou a usar VITE_MOCK_MODE=false.
- O frontend passou a usar VITE_API_BASE_URL=/api.
- O Vite passou a fazer proxy de /api para http://localhost:8000.
- O chat visual em /app/chat lista conversas reais vindas do Postgres.
- O botão Nova cria conversa real no backend.
- O envio de mensagem chama POST /v1/chat/send.
- A resposta mock da assistant volta do backend real.
- Ao recarregar a página, as conversas e mensagens continuam persistidas.
- O service layer mantém fallback para mock mode quando VITE_MOCK_MODE=true.

A fase 2.6 conectou projects ao backend real.

Status validado:

- projectService.list usa GET /v1/projects quando mock mode está desligado.
- projectService.get usa GET /v1/projects/{project_id}.
- projectService.create usa POST /v1/projects.
- projectService.update usa PATCH /v1/projects/{project_id}.
- Cockpit e tela de projetos passam a consumir projetos reais do Postgres.
- .env.local fica fora do commit e serve apenas para ambiente local.

Observação técnica:

- A solução usa proxy /api no Vite, igual ao padrão que depois será reproduzido no Nginx da Audaks.
- Nenhum endpoint foi adaptado para Codespaces.
- O backend continua preparado para Docker, Postgres e deploy em servidor real.

Próximo passo técnico:

- expor model_runs via API;
- permitir visualizar execuções de modelo por chat;
- preparar base para tela de uso, custos e observabilidade;
- depois conectar adminService/modelService ao backend real.

---

## atualização: cockpit com uso real

A etapa atual conectou o cockpit da orbeAI aos dados reais de model_runs.

Status validado:

- adminService.usage passou a consumir GET /v1/model-runs quando VITE_MOCK_MODE=false.
- adminService.audit passou a derivar eventos recentes a partir de model_runs.
- O cockpit deixa de depender exclusivamente de mock para uso e auditoria.
- Os dados de uso agora refletem execuções reais do fluxo POST /v1/chat/send.
- O service layer mantém fallback para mock mode quando VITE_MOCK_MODE=true.

Observação técnica:

- Esta etapa segue o plano de construção: depois de projects, chats, messages e chat_send, entramos em observabilidade.
- O gráfico de uso ainda é simples, agregado por data.
- Custos ainda aparecem zerados enquanto o provider ativo for orbe-mock.
- A tela fica preparada para custos reais quando OpenAI, Gemini, Qwen, Groq ou providers locais forem conectados.

Próximo passo técnico:

- expor providers/modelos via backend;
- conectar modelService ao backend real;
- alimentar tela de modelos/orbeRouter com dados reais;
- depois iniciar implementação do orbeRouter backend.

---

## atualização: providers e tela de modelos

A etapa atual conectou a tela de modelos/orbeRouter ao backend real.

Status validado:

- O backend expõe GET /v1/model-providers.
- O provider orbe-mock aparece como online/configurado.
- OpenAI, Anthropic, Gemini, Qwen, Groq e Local aparecem como placeholders.
- modelService.providers passou a consumir o backend real quando VITE_MOCK_MODE=false.
- A tela /app/models passa a refletir dados vindos da API.
- O cockpit continua consumindo status dos providers pelo service layer.

Observação técnica:

- Esta etapa segue o plano de construção documentado.
- Ainda não há chamada real a providers externos.
- O objetivo desta fase é preparar a camada de observabilidade e decisão antes de plugar APIs reais.
- O próximo passo é mover a decisão do orbeRouter para o backend.

Próximo passo técnico:

- criar serviço backend do orbeRouter;
- criar endpoint POST /v1/router/resolve;
- fazer POST /v1/chat/send usar a decisão do orbeRouter backend;
- manter orbe-mock como executor seguro até providers reais serem implementados.

---

## atualização: orbeRouter backend

A etapa atual moveu a decisão do orbeRouter para o backend.

Status validado:

- O backend expõe POST /v1/router/resolve.
- O orbeRouter backend analisa conteúdo, modo, preferência de modelo e routing_mode.
- O roteador decide provider primário ideal.
- Enquanto providers reais ainda não executam chamadas, o executor seguro segue sendo orbe-mock.
- POST /v1/chat/send passou a registrar decisão do orbeRouter em model_runs.
- model_runs agora registram router_reason, fallback_chain e provider/model usados.
- A etapa foi validada com Postgres real via Docker.
- O frontend continua usando o backend real por proxy /api.

Observação técnica:

- Esta etapa segue o plano de construção documentado.
- A decisão do provider já está no backend.
- O próximo passo é habilitar execução real para OpenAI e Gemini.
- Anthropic, Qwen, Groq e Local permanecem como placeholder/não configurado por enquanto.

Próximo passo técnico:

- adicionar OpenAI SDK e Google Gen AI SDK no backend;
- configurar OPENAI_API_KEY e GEMINI_API_KEY por variável de ambiente;
- executar OpenAI quando provider primário for openai;
- executar Gemini quando provider primário for gemini;
- manter fallback automático para orbe-mock se chave faltar ou chamada falhar.

---

## atualização: OpenAI e Gemini reais

A etapa atual habilitou execução real de providers externos no backend da orbeAI.

Status validado:

- OpenAI foi habilitado via OPENAI_API_KEY.
- Gemini foi habilitado via GEMINI_API_KEY.
- ENABLE_REAL_PROVIDERS controla se providers reais podem executar.
- GET /v1/model-providers mostra OpenAI e Gemini como online quando as chaves estão presentes e a flag está ativa.
- POST /v1/chat/send executa OpenAI quando model_preference=openai.
- POST /v1/chat/send executa Gemini quando model_preference=gemini.
- model_runs registra provider real, modelo real, tokens e error_message null em execuções bem-sucedidas.
- O fallback para orbe-mock segue preservado caso uma chamada real falhe.
- Anthropic, Qwen, Groq e Local permanecem desligados/não configurados.

Observação técnica:

- As chaves não foram commitadas.
- .env local permanece fora do Git.
- docker-compose.dev.yml recebe variáveis por ambiente.
- backend/pyproject.toml fixa openai e google-genai para rebuild limpo da imagem.
- O backend foi validado com Docker, Postgres real e chamadas reais de provider.

Próximo passo técnico:

- ajustar a tela de chat para exibir provider/model reais;
- atualizar a decisão visual do orbeRouter no frontend;
- remover textos antigos indicando provider mock;
- depois criar painel de execuções/custos por provider.

---

## atualização: chat com metadados reais de provider

A etapa atual ajustou o chat visual para refletir melhor as respostas reais do backend.

Status validado:

- Mensagens carregadas do backend agora podem exibir provider real.
- Mensagens carregadas do backend agora podem exibir modelo real.
- A tela de chat passou a sincronizar mensagens após POST /v1/chat/send.
- Respostas vindas de OpenAI e Gemini deixam de aparecer como resposta local/mock.
- O chat mantém fallback visual seguro para mock mode.
- A frase antiga sobre provider mock foi substituída por texto compatível com providers reais.

Observação técnica:

- OpenAI e Gemini já executam server-side.
- O frontend não recebe nem manipula chaves.
- O backend continua responsável por roteamento, execução, fallback e persistência.
- A próxima etapa é transformar model_runs em painel de observabilidade por provider.

Próximo passo técnico:

- adicionar leitura de model_runs no frontend;
- agregar uso por provider;
- exibir execuções recentes;
- preparar painel futuro de custos, latência, erros e auditoria operacional.

---

## atualização: observabilidade por provider

A etapa atual adicionou observabilidade real de providers na tela de modelos.

Status validado:

- /app/models passou a consumir model_runs reais.
- A tela exibe totais de requisições, tokens, custo estimado e erros.
- A tela agrega execuções por provider.
- A tela lista execuções recentes com provider, modelo, tokens, latência, custo e router_reason.
- O chat visual passou a exibir provider/modelo reais nas bolhas de resposta.
- OpenAI, Gemini e orbe-mock aparecem como providers operacionais conforme model_runs gravados.

Próximo passo técnico:

- calcular custo estimado server-side por provider/modelo;
- permitir apagar conversas;
- ajustar layout da coluna de conversas;
- depois preparar histórico/uso por workspace e limites de orçamento.

---

## atualização: artifacts, memória e governança

As últimas etapas consolidaram partes centrais da orbeAI no backend real.

### Artifacts reais

- O backend passou a expor CRUD de artifacts em /v1/artifacts.
- Cada artifact passou a ter versões persistidas em artifact_versions.
- O frontend deixou de depender apenas de localStorage quando VITE_MOCK_MODE=false.
- Respostas do chat podem ser transformadas em artifacts salvos no Postgres.
- Artifacts seguem com suporte a criação, edição, versionamento, exportação e remoção.

### Memória real

- O backend passou a expor CRUD de memórias em /v1/memories.
- Memórias passaram a ser persistidas no Postgres.
- A tela /app/memory passou a consumir o backend real.
- Memórias têm escopo, status, confiança, origem, projeto e metadados técnicos.
- Memórias ativas podem ser usadas como contexto.

### Memória automática e contexto

- O chat passou a detectar pedidos explícitos de memória, como “lembre que...”.
- Memórias explícitas entram como ativas.
- Memórias inferidas por relevância entram como pendentes.
- O chat passou a retornar memory_events quando uma memória é criada.
- O frontend mostra aviso discreto de memória atualizada.
- O backend seleciona memórias relevantes e injeta contexto no prompt do provider.
- A injeção de contexto é limitada, filtrada por relevância e usa apenas memórias ativas.

### Governança de memória

- A tela /app/memory ganhou métricas de total, ativas, pendentes, automáticas e arquivadas.
- Foi adicionado filtro de memórias automáticas.
- Cards agora indicam se a memória entra no contexto, aguarda curadoria ou está fora do contexto.
- Memórias automáticas ficaram visualmente identificadas.
- O usuário mantém controle para aprovar, arquivar, editar, exportar e remover memórias.

Próximo passo técnico:

- substituir auditoria derivada/local por audit_logs real no backend;
- registrar ações relevantes como chat.send, memory.create, memory.update, artifact.create, artifact.version, chat.delete;
- conectar o painel administrativo ao endpoint real de auditoria.

---

## atualização: auditoria real no backend

A etapa atual substituiu a auditoria improvisada/local por audit_logs reais no backend.

Status implementado:

- Novo schema AuditLogRead/AuditLogCreate.
- Novo serviço interno write_audit_log.
- Novo endpoint GET /v1/audit-logs.
- Novo endpoint POST /v1/audit-logs.
- O painel administrativo passa a consumir /v1/audit-logs quando VITE_MOCK_MODE=false.
- chat.send registra auditoria com provider, modelo, tokens, model_run_id e memória usada.
- memory.auto_create registra auditoria quando a orbeAI cria memória automaticamente.
- memory.create, memory.update e memory.delete registram eventos.
- artifact.create, artifact.update, artifact.version e artifact.delete registram eventos.
- chat.delete registra evento de auditoria.
- O uso por provider continua vindo de model_runs, mas o audit passa a vir de audit_logs.

Próximo passo técnico:

- melhorar o painel admin para separar audit logs, uso, providers e eventos críticos;
- depois preparar integrações reais e feature flags server-side.

---

## atualização: admin cockpit real

A etapa atual poliu o painel administrativo para refletir a operação real da orbeAI.

Status implementado:

- /app/admin deixou de apresentar métricas principais como dados mock.
- O cockpit passa a destacar requisições, tokens, audit logs, eventos críticos e custo estimado.
- A aba de auditoria passa a mostrar eventos reais vindos de /v1/audit-logs.
- Os eventos são exibidos com ícones por tipo: chat, memory, artifact e sistema.
- A aba de uso de modelos mostra agregação por provider.
- A aba de eventos agrupa audit logs por tipo de recurso.
- A aba de saúde do sistema foi atualizada para refletir backend, Postgres, providers reais, memória contextual e audit_logs.
- O reset local foi renomeado para deixar claro que não apaga dados reais do backend.

Próximo passo técnico:

- migrar feature flags para backend real;
- depois adicionar workspaces/admin settings reais.

---

## atualização: feature flags server-side

A etapa atual migrou feature flags do localStore para backend real.

Status implementado:

- Novo model FeatureFlag.
- Nova migration 20260627_0002_feature_flags.
- Nova tabela feature_flags no Postgres.
- Novo endpoint GET /v1/feature-flags.
- Novo endpoint PATCH /v1/feature-flags/{key}.
- Novo endpoint POST /v1/feature-flags/{key}/toggle.
- Flags padrão são criadas automaticamente por workspace.
- O admin cockpit passa a consumir flags reais quando VITE_MOCK_MODE=false.
- Alterações de flags persistem no Postgres.
- Toggle de flag registra audit log feature_flag.toggle.

Observação:

- Nesta etapa as flags viraram configuração persistente e governável.
- A próxima etapa pode plugar essas flags em comportamento real do runtime, como habilitar/desabilitar memória automática, contexto persistente, artifacts e providers reais.

Próximo passo técnico:

- conectar feature flags ao runtime da orbeAI;
- depois preparar configurações reais de workspace/admin settings.

---

## atualização: workspace settings reais

A etapa atual transformou o workspace default da orbeAI em uma entidade configurável.

Status implementado:

- Novo model WorkspaceSettings.
- Nova migration 20260627_0003_workspace_settings.
- Nova tabela workspace_settings no Postgres.
- Novo service get_or_create_workspace_settings.
- Novo endpoint GET /v1/workspace.
- Novo endpoint PATCH /v1/workspace.
- Novo endpoint PATCH /v1/workspace/settings.
- Settings iniciais incluem locale, timezone, modo padrão de chat, preferência padrão de modelo, política de memória, retenção de dados, exportação e compartilhamento público.
- Alterações de workspace e settings registram audit logs.
- O workspace default continua sendo orbeOne/orbeone/internal, mas agora possui camada administrativa persistida.

Próximo passo técnico:

- conectar workspace settings ao frontend/admin cockpit;
- depois usar default_chat_mode e default_model_preference na criação de chats.

---

## atualização: workspace settings no frontend

A etapa atual conectou as configurações reais de workspace ao frontend.

Status implementado:

- Novos tipos WorkspaceInfo e WorkspaceSettings no frontend.
- adminService passou a consumir GET /v1/workspace.
- adminService passou a atualizar PATCH /v1/workspace.
- adminService passou a atualizar PATCH /v1/workspace/settings.
- /app/admin ganhou a aba Workspace.
- A aba Workspace permite editar nome, plano, timezone, modo padrão de chat, preferência padrão de modelo, política de memória, retenção de dados, exportações e compartilhamento público.
- As alterações são persistidas no Postgres.
- As alterações geram audit logs no backend.
- O admin cockpit passou a configurar o workspace, não apenas observar telemetria.

Próximo passo técnico:

- usar default_chat_mode e default_model_preference nas criações de chat;
- depois preparar políticas reais de workspace, como allow_exports e memory_policy.

---

## atualização: workspace defaults no runtime

A etapa atual conectou configurações padrão do workspace ao runtime do chat.

Status implementado:

- ChatSendRequest passou a aceitar mode e model_preference como opcionais.
- A criação de novos chats passa a resolver mode usando workspace_settings.default_chat_mode quando o request não informa mode.
- A criação de novos chats passa a resolver model_preference usando workspace_settings.default_model_preference quando o request não informa model_preference.
- Preferências explícitas do request continuam tendo prioridade sobre os defaults do workspace.
- Mensagens de usuário passam a registrar mode, model_preference, requested_mode, requested_model_preference, resolved_mode e resolved_model_preference no metadata.
- Audit logs de chat.send também registram requested_mode, requested_model_preference, resolved_mode e resolved_model_preference.
- Foram adicionados testes cobrindo defaults do workspace e preferência explícita.

Próximo passo técnico:

- aplicar políticas de workspace no runtime, como allow_exports, allow_public_sharing e memory_policy.

---

## atualização: políticas de workspace no runtime

A etapa atual conectou políticas persistidas do workspace ao runtime real da orbeAI.

Status implementado:

- Novo service app.services.workspace_policies.
- memory_policy passou a controlar criação de memórias inferidas.
- memory_policy=strict bloqueia memórias inferidas, mas preserva memórias explícitas pedidas pelo usuário.
- memory_policy=balanced mantém o comportamento padrão.
- memory_policy=adaptive reduz o threshold para memórias inferidas e aumenta o limite de contexto.
- O limite de memórias injetadas no contexto passa a respeitar a política do workspace.
- O metadata do chat passa a registrar memory_policy, allow_exports, allow_public_sharing e data_retention_days.
- Novo endpoint GET /v1/artifacts/{artifact_id}/export.
- allow_exports=false bloqueia exportação de artifacts com HTTP 403.
- allow_exports=true permite exportar a última versão do artifact.
- Exportações geram audit log artifact.export.
- allow_public_sharing ficou preparado no service de políticas, mas sem endpoint público fake. A aplicação real dessa política deve vir junto da futura feature de compartilhamento público.

Próximo passo técnico:

- endurecer testes e isolamento de estado do banco;
- depois consolidar documentação final da backend foundation.

---

## atualização: isolamento de estado nos testes

A etapa atual endureceu a suíte de testes da backend foundation.

Status implementado:

- Novo backend/tests/conftest.py.
- Os testes passam a resetar controles de runtime antes e depois de cada teste.
- Workspace settings voltam automaticamente para defaults seguros.
- Feature flags voltam automaticamente para o estado esperado.
- Isso reduz vazamento de estado entre testes usando banco local persistente.
- Foram adicionados testes específicos para validar defaults de runtime e mutação segura dentro de um teste.

Defaults garantidos nos testes:

- default_chat_mode=strategist.
- default_model_preference=auto.
- memory_policy=balanced.
- allow_exports=true.
- allow_public_sharing=false.
- real_providers=true.
- auto_memory=true.
- memory_context=true.
- audit_logs=true.
- artifact_versions=true.

Próximo passo técnico:

- consolidar documentação final da backend foundation;
- depois fazer revisão técnica fina antes do fechamento da fase 3.


---

## documentação consolidada

A documentação operacional da backend foundation foi consolidada em:

    docs/backend-foundation.md

Este arquivo passa a ser a referência limpa para arquitetura, endpoints, runtime, feature flags, workspace settings, políticas, testes e próximos passos.

Este backend-foundation-progress.md permanece como histórico cronológico da evolução da branch.


---

## atualização: revisão técnica fina

A etapa atual adicionou uma revisão de contrato para a backend foundation.

Status implementado:

- Novo teste backend/tests/test_backend_foundation_contract.py.
- Validação das rotas essenciais registradas no OpenAPI.
- Validação dos métodos HTTP principais.
- Validação explícita de que endpoint budget não está registrado.
- Novo documento docs/backend-foundation-review.md com critérios de revisão.

Próximo passo técnico:

- preparar merge/release interna da backend foundation.


---

## atualização: preparação de merge/release interna

A etapa 3.20 preparou a backend foundation para fechamento controlado.

Status implementado:

- Novo documento docs/backend-foundation-release.md.
- Novo checklist docs/backend-foundation-final-checklist.md.
- Release interna documentada.
- Critérios finais de validação definidos.
- Próximo passo após a fase 3: iniciar auth foundation na fase 4.

Resultado:

    fase 3 pronta para merge/release interna após validação final.

