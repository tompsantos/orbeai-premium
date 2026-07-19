# avaliação offline do orbeRouter

## finalidade

A fase 5 mede o comportamento do `orbe-router-v1` antes de políticas, scoring, adapters semânticos ou dependências externas.

A bancada mede **decisões de roteamento**. Ela não mede qualidade textual, verdade factual, satisfação do usuário ou desempenho de um modelo.

## camadas

A avaliação é dividida em camadas independentes para que um incremento não reescreva o baseline anterior.

### funcional

- contrato: `router-case-v1`;
- dataset: `dataset-v1.jsonl`;
- baseline: `router-baseline-v1`;
- cobertura: 28 casos em 17 categorias.

### fronteiras e ambiguidades

- contrato de origem: `router-boundary-case-v1`;
- materialização: cada caso vira `router-case-v1` antes do replay;
- dataset: `dataset-boundaries-v1.jsonl`;
- baseline: `router-boundary-baseline-v1`;
- cobertura: 20 casos em 8 categorias.

O contrato de fronteiras aceita `content_prefix` e `target_length`. O loader completa o conteúdo com caracteres neutros e prova comprimentos exatos sem armazenar linhas gigantes no repositório.

## contrato funcional

Cada caso declara:

- `case_id` único e estável;
- categoria;
- request do router;
- ambiente sintético de disponibilidade;
- rotas aceitáveis e proibidas;
- estratégias, providers e fallback aceitáveis;
- reason codes e capabilities obrigatórios ou proibidos;
- membros obrigatórios ou proibidos da provider chain;
- campos de classificação que precisam coincidir.

As expectativas aceitam conjuntos de resultados válidos. Campos extras, datasets vazios, versões misturadas e ids duplicados são rejeitados.

## replay

A versão é `router-replay-v1`.

O replay usa o mesmo `_build_decision` e a mesma classificação do caminho ativo. O registry sintético representa apenas os estados `configured`, `unavailable`, `disabled` e `mock`.

O replay não:

- chama provider;
- resolve credencial;
- acessa cofre;
- consulta banco;
- usa telemetria;
- gera resposta textual;
- consome tokens ou dinheiro.

## execução

A partir de `services/control-api`:

```bash
python scripts/router_replay.py
```

Fronteiras e ambiguidades:

```bash
python scripts/router_replay.py --kind boundaries
```

Relatório em arquivo:

```bash
python scripts/router_replay.py \
  --kind boundaries \
  --output evaluations/router-v1/replay-boundaries-local.json
```

O comando termina com código zero quando todos os casos estão dentro do contrato e código um quando há violação.

## baseline funcional v1

Resultado validado na CI:

- 28 casos;
- 17 categorias;
- 28 aprovados;
- 0 violações;
- 100% dentro do contrato.

Distribuição:

- 22 rotas `direct_model`;
- 3 rotas `knowledge`;
- 1 rota `memory`;
- 2 rotas `cognition`;
- 26 estratégias `direct_provider`;
- 2 estratégias `cognition`.

## baseline de fronteiras v1

Resultado validado na CI:

- 20 casos;
- 8 categorias;
- 20 aprovados;
- 0 violações;
- 100% dentro do contrato.

Cobertura:

- limites de 900, 901, 2.500 e 2.501 caracteres;
- dois versus três sinais semânticos;
- seleção manual, modo e intenção semântica;
- combinações pesquisa/documento, documento/código e pesquisa/risco;
- memória, conhecimento e contexto combinado;
- cognition ativo e desativado;
- provider primário indisponível durante rota cognitiva;
- mock manual em solicitação que exige ferramenta;
- menções explícitas, negadas e explicativas a GitHub.

Distribuição:

- 11 rotas `direct_model`;
- 6 rotas `cognition`;
- 2 rotas `knowledge`;
- 1 rota `memory`;
- 14 estratégias `direct_provider`;
- 6 estratégias `cognition`;
- 9 seleções diretas de OpenAI;
- 5 seleções diretas de Gemini;
- 6 passagens pelo cognition.

## ambiguidades conhecidas

No kernel atual, as frases abaixo ainda são classificadas como necessidade de ferramenta:

- pedido explícito para executar no GitHub;
- pedido negado, como `não execute no github`;
- pedido explicativo, como `explique como funciona o github`.

Os três casos permanecem visíveis no dataset. O baseline registra o comportamento atual, mas não o declara correto. Uma correção futura deve alterar o kernel, revisar os casos e atualizar o baseline com justificativa.

## arquivos

```text
services/control-api/evaluations/router-v1/dataset-v1.jsonl
services/control-api/evaluations/router-v1/baseline-v1.json
services/control-api/evaluations/router-v1/dataset-boundaries-v1.jsonl
services/control-api/evaluations/router-v1/baseline-boundaries-v1.json
services/control-api/app/services/router_evaluation.py
services/control-api/app/services/router_boundary_evaluation.py
services/control-api/scripts/router_replay.py
services/control-api/tests/test_router_evaluation.py
services/control-api/tests/test_router_boundary_evaluation.py
```

A quarentena de casos reais é documentada separadamente em `docs/router-real-case-quarantine.md`.

## mudança intencional

Ao alterar o router:

1. executar os dois replays;
2. revisar cada violação;
3. corrigir regressões não intencionais;
4. alterar somente a expectativa necessária quando a mudança for desejada;
5. atualizar o baseline afetado;
6. explicar no PR quais casos mudaram e por quê;
7. manter ambiguidades, rotas proibidas e hard gates visíveis.

Nunca atualizar um baseline apenas para deixar a CI verde.

## próximos incrementos

- executar a quarentena em ambiente autorizado e revisar casos reais;
- ampliar o dataset direto versus cognition;
- definir critério quantitativo de saída da fase 5;
- produzir comparação offline entre o router ativo e candidatos futuros.

Ferramentas externas continuam fora do kernel. Elas só poderão ser comparadas depois que o dataset tiver cobertura suficiente e baselines confiáveis.
