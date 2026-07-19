# fechamento da fase 4 do orbeRouter

## estado

A fase 4 encerra o inventário, os perfis operacionais e a observabilidade básica dos modelos. A implementação final está no PR #33.

A fase não ativa scoring novo, classificador semântico ou roteamento orientado por saúde. O executor ativo continua sendo `orbe-router-v1`.

## entregas consolidadas

### perfis e catálogo

- contrato `model-profile-v1`;
- provider e modelo separados;
- capacidades obrigatórias e opcionais;
- estados experimental, approved, deprecated e mock;
- contexto e política de dados aplicados somente por id exato e fonte oficial;
- campos desconhecidos preservados como `null` ou `not_validated`;
- placeholders sem adapter fora do catálogo operacional.

### governança por workspace

- contrato `workspace-model-controls-v1`;
- habilitação e desabilitação por provider e modelo exato;
- metadata reservada;
- owner/admin para alteração e modo somente leitura para outros membros;
- modelo desativado removido antes da provider chain;
- proteção do último executor;
- auditoria `model.control.update`.

### tentativas e telemetria

- tabela `provider_attempt_records`;
- correlation id por execução do gateway;
- sucesso, falha, skip e falha terminal persistidos;
- falhas classificadas sem erro bruto;
- telemetria `model-telemetry-v1`;
- p50, p95, sucesso, timeout, tokens e custo comprovável;
- janelas de consulta de 1 a 90 dias;
- skips fora do denominador de confiabilidade.

### correlação obrigatória

Nos fluxos de chat:

- a tentativa nasce ligada ao workspace, chat e mensagem do usuário;
- sucesso associa as tentativas ao model run e à mensagem de resposta;
- falha terminal cria `ModelRun(status=failed)` ligado à mensagem do usuário;
- interrupção do live antes do primeiro delta cria `ModelRun(status=stopped)`;
- correlation id é propagado para metadata, auditoria e SSE seguro;
- exclusão do chat remove as tentativas antes de model runs e mensagens.

Chamadas isoladas do gateway fora de um turno de chat continuam podendo usar somente correlation id. A obrigatoriedade se aplica aos fluxos oficiais de chat.

## retenção e agregação

Decisão da fase 4:

- registros crus seguem `workspace_settings.data_retention_days`;
- owner/admin pode executar o purge auditado em `POST /v1/model-providers/attempts/retention/run`;
- purge é isolado por workspace;
- consultas de telemetria continuam calculadas sob demanda, com janela máxima de 90 dias;
- não existe tabela de rollup nesta fase;
- rollups históricos só serão criados se volume, custo de consulta ou saúde de providers provarem necessidade;
- eventual agregação materializada e circuit breaker pertencem à fase 10.

## segurança

Não são persistidos ou expostos:

- segredo ou chave de API;
- ciphertext;
- erro bruto do provider;
- payload bruto do provider;
- conteúdo da mensagem dentro da tentativa;
- URL interna de evidência no perfil público.

Falha terminal devolve mensagem segura ao cliente e mantém classificação técnica sanitizada.

## schema e rollback

O PR #33 não exige migration. Os campos `chat_id`, `message_id` e `model_run_id` já existiam em `provider_attempt_records`.

Rollback:

1. reverter o PR #33;
2. manter os registros existentes, que continuam compatíveis com o schema anterior;
3. desativar `router_model_profiles` para remover a superfície de perfis e retenção;
4. validar chat send, chat live e exclusão de chat.

Nenhuma transformação destrutiva de dados é necessária.

## limites encaminhados

Não pertencem ao fechamento da fase 4:

- qualidade por classe de tarefa;
- dataset e baseline reproduzível;
- orçamento e hard gates completos;
- scoring v2;
- avaliação de ferramentas externas;
- classificador semântico em shadow mode;
- health score, rollups e circuit breaker;
- contrato cognitivo v2.

## próxima fase

A próxima etapa é a fase 5: dataset versionado de decisão, replay offline e baseline reproduzível do `orbe-router-v1`.
