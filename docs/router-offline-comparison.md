# comparação offline de candidatos do orbeRouter

## finalidade

O contrato `router-offline-comparison-v1` compara um relatório do router ativo com um relatório candidato sem alterar o runtime, chamar modelos ou ativar código novo.

A comparação não atribui qualidade subjetiva. Ela classifica diferenças observáveis e impede que regressões sejam tratadas como melhorias.

## compatibilidade obrigatória

Os relatórios precisam usar:

- a mesma versão de replay;
- o mesmo schema de dataset;
- o mesmo id e hash de dataset;
- a mesma quantidade e o mesmo conjunto de casos;
- a mesma estrutura pareada quando houver pares direto versus cognition.

Qualquer divergência estrutural produz `blocked`.

## estados

### `approved`

Os relatórios são compatíveis e não existe mudança em caso ou par.

### `review_required`

Os relatórios são compatíveis e a decisão mudou sem violar o contrato do caso. Recuperações também entram nesse estado para exigir revisão explícita.

### `blocked`

O candidato introduziu regressão ou não pode ser comparado com segurança. Exemplos:

- caso antes aprovado passa a falhar;
- par antes aprovado passa a falhar;
- versão de replay diferente;
- hash ou conjunto de casos diferente;
- relatório pareado comparado com relatório não pareado.

## conteúdo do relatório

A saída registra:

- status e blockers;
- contagem de casos e pares;
- casos inalterados, alterados, recuperados e regredidos;
- pares inalterados, alterados, recuperados e regredidos;
- campos efetivamente alterados em cada decisão;
- delta das distribuições de rota, estratégia e provider.

Relatórios da camada `execution` são reconhecidos pela chave `replay` e têm seus resultados pareados comparados junto dos casos.

## execução

Primeiro gere os relatórios do baseline e do candidato usando a mesma camada e o mesmo dataset. Depois execute:

```bash
python scripts/router_compare.py \
  --baseline /caminho/baseline-report.json \
  --candidate /caminho/candidate-report.json
```

Para salvar o resultado:

```bash
python scripts/router_compare.py \
  --baseline /caminho/baseline-report.json \
  --candidate /caminho/candidate-report.json \
  --output /caminho/comparison.json
```

Códigos de saída:

- `0`: `approved`;
- `1`: `blocked`;
- `2`: `review_required`.

## uso futuro

Um adapter semântico, biblioteca externa ou scoring novo só poderá disputar espaço depois de produzir relatórios compatíveis nas camadas aplicáveis. A comparação não ativa o candidato e não substitui gate, shadow mode ou rollout controlado.
