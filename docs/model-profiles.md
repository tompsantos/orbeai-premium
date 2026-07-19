# perfis operacionais de modelos

## finalidade

Esta documentação registra a fase 4 do orbeRouter. O objetivo é separar provider de modelo e manter um catálogo versionado com telemetria e governança reais, sem inventar qualidade, contexto, custo, política de dados ou saúde.

O contrato não participa do scoring. A exposição e os controles são protegidos pela feature flag `router_model_profiles`, desabilitada por padrão.

## contrato de perfil

A versão inicial é `model-profile-v1`.

Cada `ModelProfile` registra:

- provider e modelo em campos separados;
- identificador e versão estáveis;
- ciclo de vida;
- estado, executabilidade e disponibilidade no workspace;
- capacidades obrigatórias e opcionais;
- formatos de entrada e saída;
- streaming e ferramentas;
- contexto validado;
- política de dados;
- estado e data de validação;
- fonte de evidência por grupo de campos;
- telemetria da janela consultada.

`stream_emulation` é capacidade opcional. As demais capacidades declaradas pelo registry são obrigatórias para o perfil atual.

## modelos incluídos

O catálogo nasce somente do `ProviderRegistry` da orbeAI:

- OpenAI;
- Google Gemini;
- NVIDIA NIM;
- mock declarado.

Anthropic, Qwen, Groq e modelos locais permanecem placeholders enquanto não houver adapter e execução real. Placeholder não recebe perfil operacional e não pode ser habilitado por controle de workspace.

## evidência e campos desconhecidos

Fontes reconhecidas:

- `code_registry`: declaração comprovada pelo código;
- `runtime_configuration`: modelo resolvido pelo ambiente ou cofre;
- `workspace_configuration`: disponibilidade definida pelo workspace;
- `provider_default`: padrão do adapter sem credencial resolvida;
- `runtime_telemetry`: dado calculado a partir de execuções persistidas;
- `official_documentation`: documentação oficial validada;
- `not_validated`: informação ainda não comprovada.

Enquanto não houver evidência:

- `context_window_tokens` permanece `null`;
- `data_policy` permanece `not_validated`;
- qualidade não recebe nota operacional;
- providers reais permanecem `experimental`;
- ferramentas permanecem `not_implemented`;
- mock permanece identificado como mock.

## governança por workspace

A versão inicial do controle é `workspace-model-controls-v1`.

Os controles ficam em metadata reservada de `WorkspaceSettings`, sob a chave `model_controls`. Essa chave:

- não é retornada pelo endpoint genérico de configurações;
- não pode ser alterada pelo patch genérico do workspace;
- só é manipulada pelo serviço dedicado;
- registra provider, modelo, estado, data e usuário responsável.

A chave lógica do controle é:

```text
provider_slug:model_name
```

O nome exato do modelo faz parte da chave. Quando uma credencial troca o modelo configurado, controles antigos não são aplicados ao novo modelo por acidente.

### autorização

Somente membros com função `owner` ou `admin` podem consultar e alterar controles. Outros membros continuam podendo consultar perfis quando a feature flag estiver ligada, mas recebem a tela em modo somente leitura.

### enforcement

Um modelo desativado pelo workspace:

- recebe `workspace_enabled=false`;
- entra no estado `disabled`;
- recebe o reason code operacional `workspace_model_disabled`;
- deixa de ser executável;
- é removido da `provider_chain` antes da decisão;
- não vira tentativa nem pode reaparecer no gateway.

A API simula o registry antes de persistir uma alteração. Ela retorna HTTP 409 quando a mudança deixaria o workspace sem nenhum modelo executável.

Essa governança representa disponibilidade operacional. Orçamento, classes de dados, permissões e políticas completas continuam reservados para a fase 6.

## endpoints

### perfis e telemetria

```text
GET /v1/model-providers/profiles?window_days=30
```

A janela aceita de 1 a 90 dias. Com a flag desligada, o endpoint retorna HTTP 404.

### controles efetivos

```text
GET /v1/model-providers/controls
```

Retorna o controle e o estado efetivo dos modelos registrados para owner e admin.

### atualizar controle

```text
PUT /v1/model-providers/controls
```

Payload:

```json
{
  "provider_slug": "openai",
  "model_name": "modelo-exato-do-registry",
  "enabled": false
}
```

A operação:

- valida provider e nome atual do modelo;
- rejeita referência stale;
- protege o último executor;
- persiste o controle;
- reconstrói o registry;
- registra audit log `model.control.update`;
- devolve o estado efetivo.

## persistência de tentativas

Cada execução do gateway recebe um `correlation_id`. Sucessos, falhas e skips são persistidos em `provider_attempt_records` antes do retorno ou da falha terminal.

O registro contém workspace, provider, modelo, tentativa, status, latência e classificação sanitizada da falha. Erro bruto, segredo e conteúdo da mensagem não são gravados.

## telemetria

A versão inicial é `model-telemetry-v1`.

Métricas por provider e modelo:

- tentativas totais e executadas;
- sucessos, falhas e skips;
- timeouts;
- taxa de sucesso e timeout;
- p50 e p95;
- model runs e cobertura de tokens;
- tokens de entrada e saída;
- estado e amostras de custo;
- custo estimado total quando comprovável;
- última tentativa observada.

Skips não entram no denominador de confiabilidade. Latência e confiabilidade vêm das tentativas; tokens e custo vêm de `ModelRun`.

## custo

Zero não é tratado como preço conhecido.

Estados:

- `configured`;
- `configured_no_samples`;
- `not_configured`;
- `not_applicable` para mock.

Quando custo não é comprovável, o total permanece `null`.

## laboratório

Rotas:

```text
/app/models
/app/model-profiles
```

`/app/models` agora apresenta providers e model runs reais. Foram removidos:

- provider padrão salvo em `localStorage`;
- fallback local;
- modo de roteamento local;
- decisão simulada;
- latência, custo e qualidade fabricados no frontend.

`/app/model-profiles` apresenta perfis, telemetria, fontes de evidência e controles reais. Owner e admin podem habilitar ou desabilitar modelos; outros membros recebem modo somente leitura.

Estados seguros da tela:

- `ready`;
- `disabled`;
- `mock`;
- `error`.

## segurança

O payload e a interface não incluem:

- chave ou hint de API;
- ciphertext;
- fonte detalhada da credencial;
- erro bruto;
- payload de provider;
- conteúdo de mensagens;
- metadata reservada completa;
- segredo do workspace.

## limites atuais

Ainda não foram concluídos:

- contexto validado por modelo;
- política de dados validada;
- data formal de validação;
- qualidade por classe de tarefa;
- retenção física e agregação histórica;
- associação obrigatória de tentativa a mensagem e model run;
- health score e circuit breaker;
- uso de telemetria em scoring.

## próxima fatia

A próxima fatia da fase 4 deverá validar contexto e política de dados a partir de fontes oficiais para modelos conhecidos, mantendo modelos desconhecidos como `not_validated`. Depois será decidido se retenção e associação obrigatória fecham nesta fase ou migram para a fase de saúde e observabilidade.

Nenhuma métrica entra no scoring antes do dataset e do baseline reproduzível da fase 5.
