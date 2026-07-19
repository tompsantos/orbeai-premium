# gate quantitativo de saída da fase 5

## finalidade

O `router-evaluation-exit-gate-v1` decide de forma reproduzível se a avaliação do `orbe-router-v1` está pronta para avançar.

A política versionada vive em:

```text
services/control-api/evaluations/router-v1/exit-gate-v1.json
```

## critérios sintéticos

- baseline funcional: 28 casos, 17 categorias e zero falhas;
- fronteiras: 20 casos, 8 categorias e zero falhas;
- direto versus cognition: 20 casos, 10 pares, 5 categorias, pelo menos 7 pares separados e zero falhas;
- total atual: 68 casos sintéticos.

Os pares `github-language`, `terminal-language` e `deploy-language` permanecem registrados como `both_cognition`. Uma mudança nesses achados exige atualização consciente da política e dos baselines.

## cobertura real

A fase 6 exige pelo menos 12 casos reais revisados, dois em cada classe:

- `conversation`;
- `software`;
- `document`;
- `research`;
- `risk-sensitivity`;
- `execution-boundary`.

O dataset esperado é `evaluations/router-v1/dataset-real-v1.jsonl`. Ele só deve ser criado pelo fluxo de quarentena e revisão.

## estado atual

```text
synthetic_ready: true
real_cases_ready: false
ready_for_phase6: false
blockers:
  - real_dataset_missing
```

## execução

Auditoria normal:

```bash
python scripts/router_evaluation_gate.py
```

Bloqueio obrigatório de transição:

```bash
python scripts/router_evaluation_gate.py --require-ready
```

Códigos de saída:

- `0`: bancada sintética saudável; com `--require-ready`, fase pronta;
- `1`: regressão sintética ou falha estrutural;
- `2`: bancada saudável, mas requisito operacional pendente.

O gate não mede qualidade textual e não substitui revisão humana, shadow mode, políticas ou rollout.
