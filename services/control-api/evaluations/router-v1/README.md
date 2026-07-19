# bancada de avaliação do router v1

## arquivos versionados

- `dataset-v1.jsonl`: casos sintéticos aprovados;
- `baseline-v1.json`: retrato reproduzível do `orbe-router-v1`.

## casos reais

Candidatos reais não ficam nesta pasta. O fluxo seguro está documentado em:

- `docs/router-real-cases.md`;
- `scripts/router_real_cases.py`.

Somente a saída revisada de `promote` pode ser proposta para um dataset versionado. Arquivos de exportação e revisão devem permanecer fora do repositório.

## replay

A partir de `services/control-api`:

```bash
python scripts/router_replay.py
```

A bancada não chama providers, não resolve credenciais e não gera custo de API.
