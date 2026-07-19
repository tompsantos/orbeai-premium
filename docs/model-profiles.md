# perfis operacionais de modelos

## finalidade

Esta documentação registra a fase 4 do orbeRouter. O objetivo é separar o conceito de provider do conceito de modelo e criar um catálogo versionado com telemetria real, sem inventar qualidade, contexto, custo, política de dados ou saúde.

O contrato não altera o roteamento ativo e não participa do score. A exposição pela API e pela interface é protegida pela feature flag `router_model_profiles`, desabilitada por padrão.

## contrato de perfil

Cada `ModelProfile` registra:

- versão do contrato;
- identificador estável do perfil;
- provider e modelo em campos separados;
- ciclo de vida;
- estado e executabilidade do provider;
- capacidades declaradas no código;
- formatos de entrada e saída;
- estado de streaming;
- estado de ferramentas;
- janela de contexto validada;
- política de dados;
- estado e data de validação;
- fonte de evidência por grupo de campos.

A versão inicial é `model-profile-v1`.

## modelos incluídos

O catálogo é construído somente a partir do `ProviderRegistry` executável da orbeAI:

- OpenAI;
- Google Gemini;
- NVIDIA NIM;
- mock declarado.

Anthropic, Qwen, Groq e modelos locais continuam visíveis como placeholders na tela antiga, mas não recebem `ModelProfile` enquanto não houver adapter e execução real registrados.

## evidência e campos desconhecidos

O perfil diferencia as fontes:

- `code_registry`: declaração comprovada pelo código atual;
- `runtime_configuration`: modelo resolvido por configuração de ambiente ou cofre do workspace;
- `provider_default`: modelo padrão do adapter sem credencial resolvida;
- `runtime_telemetry`: dado calculado a partir de execuções persistidas;
- `official_documentation`: dado futuro validado por documentação oficial;
- `not_validated`: informação ainda não comprovada.

Nesta fase:

- `context_window_tokens` permanece `null`;
- `data_policy` permanece `not_validated`;
- qualidade permanece sem valor operacional;
- providers reais ficam com ciclo de vida `experimental` até a validação do perfil;
- o mock fica identificado como `mock`;
- streaming é marcado como `emulated` somente quando o adapter atual declara essa capacidade;
- ferramentas permanecem `not_implemented`.

## persistência de tentativas

Cada chamada ao provider gateway recebe um `correlation_id`. Antes de retornar sucesso ou falha terminal, o gateway persiste todas as tentativas em `provider_attempt_records`.

Cada registro contém:

- workspace;
- correlation id;
- provider e modelo;
- número da tentativa;
- status `success`, `failed` ou `skipped`;
- latência observada;
- classificação sanitizada da falha;
- tipo da exceção;
- motivo operacional do estado quando a tentativa foi pulada.

A tabela possui campos opcionais para chat, mensagem e model run. A primeira implementação persiste a correlação do gateway; a ligação direta com essas entidades poderá ser aprofundada sem alterar o contrato de telemetria.

Erros brutos de provider não são gravados nesta tabela.

## telemetria

A versão inicial é `model-telemetry-v1`.

A janela é informada pelo endpoint, com mínimo de 1 e máximo de 90 dias. O padrão é 30 dias.

Métricas por provider e modelo:

- quantidade total de tentativas;
- tentativas realmente executadas;
- sucessos;
- falhas;
- tentativas puladas;
- timeouts;
- taxa de sucesso;
- taxa de timeout;
- latência p50;
- latência p95;
- quantidade de model runs;
- cobertura de tokens;
- tokens de entrada e saída;
- estado da configuração de custo;
- quantidade de amostras de custo;
- custo estimado total quando comprovável;
- data da última tentativa.

Tentativas `skipped` não entram no denominador das taxas de sucesso e timeout. Os percentis usam interpolação linear sobre latências de tentativas `success` e `failed`.

Tokens e custo vêm de `ModelRun`. Latência e confiabilidade vêm de `provider_attempt_records`, porque o tempo total do turno inclui trabalho que não pertence ao provider.

## custo

O sistema não transforma zero em preço conhecido.

Estados possíveis:

- `configured`: tabela configurada e amostras positivas existentes;
- `configured_no_samples`: tabela configurada, mas ainda sem amostra válida;
- `not_configured`: tabela de preço não configurada;
- `not_applicable`: mock declarado.

Quando o custo não é comprovável, `estimated_cost_usd_total` permanece `null`.

## segurança

O payload público do perfil e da telemetria não inclui:

- chave de API;
- hint da chave;
- ciphertext;
- fonte detalhada da credencial;
- erro bruto do provider;
- payload bruto de provider;
- conteúdo de mensagens;
- segredo ou configuração privada do workspace.

## endpoint

```text
GET /v1/model-providers/profiles?window_days=30
```

Com a flag desligada, o endpoint retorna HTTP 404. Com a flag ligada no workspace, retorna somente os perfis gerados a partir do registry real e sua telemetria para a janela solicitada.

## laboratório

A rota interna abaixo apresenta o catálogo seguro:

```text
/app/model-profiles
```

A tela aparece no grupo `Avançado` da navegação como `Perfis de modelos` e permite consultar janelas de 7, 30 e 90 dias.

Ela mostra somente dados do contrato oficial:

- provider e modelo;
- estado e ciclo de vida;
- executabilidade;
- p50 e p95;
- sucesso e timeout;
- amostras executadas e puladas;
- tokens;
- custo com estado explícito;
- capacidades;
- formatos;
- streaming e ferramentas;
- contexto e política de dados quando validados;
- fonte de evidência de cada grupo de campos.

A interface trata os estados abaixo sem criar dados locais:

- `ready`: perfis reais carregados;
- `disabled`: feature flag desligada;
- `mock`: backend real não consultado;
- `error`: falha explícita de carregamento.

A tela não altera provider, modelo, fallback ou roteamento. Controles persistentes só serão adicionados quando existir contrato de enforcement por workspace.

## limites atuais

Ainda não foram implementados:

- persistência própria dos perfis;
- data de validação por modelo;
- contexto validado;
- política de dados validada;
- qualidade por classe de tarefa;
- ativação ou desativação individual de modelo;
- uso das métricas no roteamento;
- health score e circuit breaker;
- retenção física ou agregação histórica além da janela de consulta;
- associação obrigatória de cada tentativa ao model run e à mensagem;
- remoção dos controles locais provisórios da tela antiga do Laboratório.

## próxima fatia

A próxima etapa da fase 4 deverá criar governança persistente por workspace para ativação de modelos e provar que o router respeita essa configuração. O mesmo bloco deverá substituir ou remover os controles locais provisórios da tela antiga e fechar o contrato de capacidades obrigatórias e opcionais.

Depois disso, o projeto avança para o dataset e baseline da fase 5.

Nenhuma métrica desta fase entra no scoring antes do dataset e do baseline reproduzível.
