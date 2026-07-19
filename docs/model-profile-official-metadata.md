# metadados oficiais dos perfis de modelos

## regra de aplicação

Os metadados são aplicados somente quando `provider_slug` e `model_name` coincidem exatamente com uma entrada curada. Prefixos, aliases presumidos e nomes parecidos permanecem `not_validated`.

Data da validação atual: `2026-07-19`.

## registros validados

| provider | modelo exato | contexto | política de dados | estado |
| --- | --- | ---: | --- | --- |
| OpenAI | `gpt-5.5` | 1.000.000 tokens | `api_not_used_for_training_by_default_abuse_logs_up_to_30_days` | contexto e política validados |
| Gemini | `gemini-3.5-flash` | 1.048.576 tokens | `billing_dependent_paid_not_used_for_improvement_unpaid_may_be_used_for_improvement` | contexto e política validados, com diferença entre serviço pago e não pago explícita |
| NVIDIA | `nvidia/nemotron-3-super-120b-a12b` | 1.000.000 tokens | `not_validated` | contexto validado; política do endpoint hospedado não comprovada |

## fontes oficiais

- GPT-5.5: `https://openai.com/index/introducing-gpt-5-5/`;
- controles de dados da API OpenAI: `https://developers.openai.com/api/docs/guides/your-data#default-usage-policies-by-endpoint`;
- Gemini 3.5 Flash: `https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash`;
- termos adicionais da API Gemini: `https://ai.google.dev/gemini-api/terms`;
- Nemotron 3 Super: `https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-super-120b-a12b`.

As URLs permanecem no registry interno e neste documento. O payload público expõe apenas o valor validado, a data e o tipo de evidência.

## estados de validação

- `metadata_validated_profile_not_benchmarked`: contexto e política documentados, sem benchmark próprio de qualidade;
- `context_validated_policy_not_validated`: contexto documentado e política ainda desconhecida;
- `profile_not_benchmarked`: nenhum metadado oficial exato aplicado;
- `deterministic_mock`: mock declarado.

## limites

- a política de dados específica do endpoint NVIDIA hospedado permanece `not_validated`;
- modelos customizados e aliases não documentados permanecem desconhecidos;
- metadados validados não aprovam o modelo nem atribuem qualidade;
- qualquer alteração futura exige nova fonte oficial, teste e data de validação.
