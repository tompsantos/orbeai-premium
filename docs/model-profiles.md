# perfis operacionais de modelos

## finalidade

A fase 4 separa provider de modelo e mantém um catálogo versionado com telemetria, governança e evidência real. O contrato não participa do scoring e permanece protegido pela flag `router_model_profiles`, desligada por padrão.

## contrato

A versão atual é `model-profile-v1`. Cada perfil registra:

- provider e modelo separados;
- ciclo de vida e executabilidade;
- disponibilidade efetiva no workspace;
- capacidades obrigatórias e opcionais;
- formatos, streaming e ferramentas;
- contexto e política de dados quando validados;
- data e fonte de evidência;
- telemetria da janela consultada.

`stream_emulation` é opcional. As demais capacidades declaradas pelo registry são obrigatórias no perfil atual.

## catálogo operacional

O catálogo nasce somente do `ProviderRegistry`: OpenAI, Gemini, NVIDIA NIM e mock declarado. Anthropic, Qwen, Groq e modelos locais permanecem placeholders até existir adapter executável.

Fontes reconhecidas:

- `code_registry`;
- `runtime_configuration`;
- `workspace_configuration`;
- `provider_default`;
- `runtime_telemetry`;
- `official_documentation`;
- `not_validated`.

Sem evidência, contexto permanece `null`, política permanece `not_validated` e qualidade não recebe nota.

## metadados oficiais

O registry curado usa correspondência exata de `provider_slug` e `model_name`. Nomes parecidos, aliases presumidos e modelos customizados não herdam dados.

Metadados validados em `2026-07-19`:

- `openai:gpt-5.5`: contexto de 1.000.000 tokens e política da API documentada;
- `gemini:gemini-3.5-flash`: contexto de 1.048.576 tokens e política dependente do tipo de cobrança documentada;
- `nvidia:nvidia/nemotron-3-super-120b-a12b`: contexto de 1.000.000 tokens; política do endpoint hospedado permanece `not_validated`.

As fontes, URLs e limites estão em `docs/model-profile-official-metadata.md`. URLs de evidência não entram no payload público.

Estados de validação:

- `metadata_validated_profile_not_benchmarked`;
- `context_validated_policy_not_validated`;
- `profile_not_benchmarked`;
- `deterministic_mock`.

Metadado validado não aprova o modelo e não mede qualidade.

## governança por workspace

A versão do controle é `workspace-model-controls-v1`. Os controles ficam em metadata reservada de `WorkspaceSettings`, sob `model_controls`, e usam a chave lógica:

```text
provider_slug:model_name
```

Somente owner e admin alteram controles. Demais membros consultam perfis em modo somente leitura.

Um modelo desativado:

- recebe `workspace_enabled=false`;
- entra no estado `disabled`;
- recebe `workspace_model_disabled`;
- sai da `provider_chain` antes da decisão;
- não vira tentativa no gateway.

A API rejeita referência stale e impede que uma alteração deixe o workspace sem executor.

## endpoints

```text
GET /v1/model-providers/profiles?window_days=30
GET /v1/model-providers/controls
PUT /v1/model-providers/controls
```

A janela de telemetria aceita de 1 a 90 dias. A atualização de controle valida provider, modelo exato, autorização e cadeia resultante, persiste o estado e registra `model.control.update`.

## tentativas e telemetria

Cada execução recebe `correlation_id`. Sucessos, falhas e skips são persistidos em `provider_attempt_records` antes do retorno ou da falha terminal.

A telemetria `model-telemetry-v1` registra:

- tentativas, sucessos, falhas, skips e timeouts;
- taxa de sucesso e timeout;
- p50 e p95;
- model runs e tokens;
- estado e amostras de custo;
- última tentativa.

Skips não entram no denominador de confiabilidade. Latência e confiabilidade vêm das tentativas; tokens e custo vêm de `ModelRun`. Custo desconhecido permanece `null`.

## laboratório

Rotas:

```text
/app/models
/app/model-profiles
```

`/app/models` mostra providers e model runs reais. Provider padrão, fallback local, modo local e decisão simulada foram removidos.

`/app/model-profiles` mostra perfis, telemetria, contexto, política, fontes e controles efetivos.

## segurança

O payload e a interface não incluem segredo, hint de chave, ciphertext, URL de evidência, erro bruto, payload de provider, conteúdo de mensagem ou metadata reservada completa.

## limites atuais

Ainda faltam:

- política específica do endpoint NVIDIA hospedado;
- metadados para modelos customizados e aliases não documentados;
- qualidade por classe de tarefa;
- retenção física e agregação histórica;
- associação obrigatória entre tentativa, mensagem e model run;
- revalidação transacional ao remover credenciais;
- health score e circuit breaker;
- uso da telemetria em scoring.

## próxima fatia

A próxima fatia fecha a observabilidade da fase 4: associação obrigatória entre tentativa, mensagem e model run e decisão explícita sobre retenção/agregação. Itens próprios de saúde serão movidos para a fase 10 sem duplicação.

Nenhuma métrica entra no scoring antes do dataset e do baseline da fase 5.
