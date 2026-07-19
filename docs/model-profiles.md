# perfis operacionais de modelos

## finalidade

Esta documentação registra a primeira fatia da fase 4 do orbeRouter. O objetivo é separar o conceito de provider do conceito de modelo e criar um catálogo versionado sem inventar qualidade, contexto, custo, política de dados ou saúde.

O contrato não altera o roteamento ativo e não participa do score. A exposição pela API é protegida pela feature flag `router_model_profiles`, desabilitada por padrão.

## contrato inicial

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
- `runtime_telemetry`: dado que deverá ser calculado a partir de execuções persistidas;
- `official_documentation`: dado futuro validado por documentação oficial;
- `not_validated`: informação ainda não comprovada.

Na primeira fatia:

- `context_window_tokens` permanece `null`;
- `data_policy` permanece `not_validated`;
- qualidade permanece sem valor operacional;
- providers reais ficam com ciclo de vida `experimental` até a validação do perfil;
- o mock fica identificado como `mock`;
- streaming é marcado como `emulated` somente quando o adapter atual declara essa capacidade;
- ferramentas permanecem `not_implemented`.

## segurança

O payload público do perfil não inclui:

- chave de API;
- hint da chave;
- ciphertext;
- fonte detalhada da credencial;
- payload bruto de provider;
- conteúdo de mensagens;
- segredo ou configuração privada do workspace.

## endpoint

```text
GET /v1/model-providers/profiles
```

Com a flag desligada, o endpoint retorna HTTP 404. Com a flag ligada no workspace, retorna somente os perfis gerados a partir do registry real.

## limites desta fatia

Ainda não foram implementados:

- persistência própria dos perfis;
- data de validação por modelo;
- contexto validado;
- política de dados validada;
- latência p50 e p95;
- taxa de sucesso e timeout;
- tokens agregados;
- custo agregado;
- qualidade por classe de tarefa;
- ativação ou desativação individual de modelo;
- interface nova no Laboratório.

## próxima fatia

A próxima etapa deverá calcular telemetria por `provider_name` e `model_name` a partir de `ModelRun`, com janela explícita, amostra, p50, p95, sucesso, timeout, tokens e custo apenas quando a tabela de preço estiver configurada.

Nenhuma dessas métricas deve entrar no scoring antes do dataset e do baseline da fase 5.
