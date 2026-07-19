# avaliação offline do orbeRouter

## finalidade

A fase 5 começa medindo o comportamento do `orbe-router-v1` antes de criar políticas, scoring, adapters semânticos ou dependências externas.

A avaliação mede **decisão de roteamento**. Ela não mede qualidade textual da resposta, verdade factual, satisfação do usuário ou desempenho de um modelo.

## contratos

### caso de roteamento

A versão inicial é `router-case-v1`.

Cada linha do dataset JSONL contém:

- `case_id` único e estável;
- categoria;
- request do router;
- ambiente sintético de disponibilidade;
- rotas aceitáveis e proibidas;
- estratégias, providers e fallback aceitáveis;
- reason codes e capabilities obrigatórios ou proibidos;
- membros obrigatórios ou proibidos da provider chain;
- campos de classificação que precisam coincidir.

As expectativas aceitam conjuntos de resultados válidos. Isso evita transformar preferências frágeis em uma única resposta artificialmente correta.

Campos extras são rejeitados. Datasets vazios, versões misturadas e ids duplicados também são rejeitados.

### replay

A versão inicial é `router-replay-v1`.

O replay usa o mesmo `_build_decision` e a mesma classificação do caminho ativo. O registry sintético representa somente os estados `configured`, `unavailable`, `disabled` e `mock`.

O replay não:

- chama provider;
- resolve credencial;
- acessa cofre;
- consulta banco;
- usa telemetria;
- gera resposta textual;
- consome tokens ou dinheiro.

### baseline

A versão inicial é `router-baseline-v1`.

O baseline registra:

- versão e hash SHA-256 do dataset;
- quantidade e taxa de aprovação;
- placar por categoria;
- distribuição de rota, estratégia e provider selecionado;
- retrato de cada caso com rota, estratégia, providers, reason codes, capabilities, chain e fallback.

A suíte reconstrói esse retrato e compara com o arquivo versionado. Uma mudança intencional no router exige atualizar o dataset e o baseline no mesmo PR, com justificativa.

## arquivos

```text
services/control-api/evaluations/router-v1/dataset-v1.jsonl
services/control-api/evaluations/router-v1/baseline-v1.json
services/control-api/app/services/router_evaluation.py
services/control-api/scripts/router_replay.py
services/control-api/tests/test_router_evaluation.py
```

## execução

A partir de `services/control-api`:

```bash
python scripts/router_replay.py
```

Para gravar um relatório completo:

```bash
python scripts/router_replay.py \
  --output evaluations/router-v1/replay-local.json
```

O comando termina com código zero quando todos os casos estão dentro do contrato e código um quando há violação.

## baseline sintético v1

O primeiro baseline contém 28 casos em 17 categorias:

- conversa e escrita;
- estratégia, pesquisa e código;
- documento e governo;
- risco e sensibilidade;
- memória, conhecimento e contexto combinado;
- escolha manual e modelo não suportado;
- modos de menor custo e maior rapidez;
- cognition ativo e desativado;
- indisponibilidade, fallback e mock.

Resultado validado na CI:

- 28 casos;
- 28 aprovados;
- 0 violações;
- taxa de aprovação de 100%.

Distribuição inicial:

- 22 rotas `direct_model`;
- 3 rotas `knowledge`;
- 1 rota `memory`;
- 2 rotas `cognition`;
- 26 estratégias `direct_provider`;
- 2 estratégias `cognition`.

Esse resultado não significa que o router é ótimo. Significa apenas que o comportamento atual foi transformado em um contrato reproduzível e explícito.

## mudança intencional

Ao alterar o router:

1. executar o replay;
2. revisar cada violação;
3. corrigir regressões não intencionais;
4. quando a mudança for desejada, alterar a expectativa mínima necessária;
5. regenerar o baseline;
6. explicar no PR quais casos mudaram e por quê;
7. manter rotas proibidas e hard gates visíveis.

Não atualizar o baseline apenas para deixar a CI verde.

## próximos incrementos da fase 5

- adicionar casos reais sanitizados a partir de decisões observadas;
- incluir entradas longas e fronteiras de classificação;
- ampliar casos direto versus cognition;
- registrar rotas aceitáveis e proibidas de políticas futuras;
- produzir comparação entre router ativo e candidatos offline;
- definir critério de saída da fase 5 antes do scoring v2.

Ferramentas externas continuam fora do kernel. Elas só poderão ser comparadas depois que o dataset tiver cobertura suficiente e um baseline confiável.
