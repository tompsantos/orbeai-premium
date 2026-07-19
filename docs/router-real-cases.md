# casos reais sanitizados do orbeRouter

## objetivo

A fase 5 precisa incorporar decisões observadas no uso real sem copiar conversas, ids internos ou segredos para o repositório.

O fluxo usa uma quarentena em três etapas:

```text
export → review-template → promote
```

Nenhum candidato exportado é tratado como caso aprovado. Somente a saída de `promote`, depois de revisão humana e validações automáticas, pode ser considerada para um dataset versionado.

## contratos

### candidato

Versão: `router-real-case-candidate-v1`.

O candidato contém:

- id opaco derivado por HMAC;
- dia da observação, sem horário exato;
- ação de auditoria de origem;
- fingerprint HMAC do conteúdo;
- quantidade de caracteres, palavras e linhas;
- modo, preferência de modelo e modo de roteamento;
- presença de memória e conhecimento;
- classificação e decisão observadas;
- ambiente mínimo inferido para reproduzir fallback;
- snapshot inicial das expectativas;
- `raw_content_included=false`.

O candidato não contém:

- texto da mensagem;
- workspace id;
- chat id;
- message id;
- audit log id;
- segredo, chave ou payload de provider.

### revisão

Versão: `router-real-case-review-v1`.

Cada template nasce com `disposition=reject`. Para aceitar, o revisor precisa informar:

- alias do revisor;
- justificativa;
- paráfrase sanitizada;
- categoria;
- opcionalmente, expectativas diferentes da decisão observada.

A decisão observada não é considerada correta automaticamente. O revisor pode substituir o contrato esperado quando identificar um erro ou uma rota aceitável mais ampla.

### promoção

A promoção produz `router-case-v1`, compatível com o replay offline da fase 5a.

O caso promovido recebe um id `real-<fingerprint-opaco>`. O vínculo com a quarentena permanece pelo id opaco, nunca por ids do banco.

## fontes de decisão

O extrator reconhece:

- `router.decision`;
- `chat.send`;
- `chat.send.failed`;
- `chat.live`;
- `chat.live.failed`.

Eventos múltiplos da mesma mensagem são deduplicados. A consulta é sempre limitada a um workspace explícito.

## segredo de exportação

O HMAC exige uma variável externa com pelo menos 32 caracteres:

```bash
export ROUTER_EVAL_EXPORT_SECRET='segredo-aleatorio-com-mais-de-32-caracteres'
```

Esse segredo:

- não entra no repositório;
- precisa ser o mesmo entre exportação e promoção;
- separa fingerprints de ambientes diferentes;
- permite detectar quando o revisor apenas colou o conteúdo bruto sem alteração.

## comandos

A partir de `services/control-api`.

### exportar candidatos

```bash
python scripts/router_real_cases.py export \
  --workspace-id '<workspace-id>' \
  --output /tmp/orbe-router-candidates.jsonl
```

O arquivo de candidatos deve permanecer fora do repositório. A ferramenta bloqueia caminhos internos por padrão.

### criar template de revisão

```bash
python scripts/router_real_cases.py review-template \
  --candidates /tmp/orbe-router-candidates.jsonl \
  --output /tmp/orbe-router-reviews.jsonl
```

Todas as linhas começam rejeitadas.

### promover revisões aceitas

```bash
python scripts/router_real_cases.py promote \
  --candidates /tmp/orbe-router-candidates.jsonl \
  --reviews /tmp/orbe-router-reviews.jsonl \
  --output /tmp/router-real-reviewed-v1.jsonl
```

A saída promovida ainda deve ser inspecionada em diff antes de ser incorporada a um dataset oficial.

## scanner de sanitização

A promoção bloqueia automaticamente:

- email;
- CPF e CNPJ formatados ou compactos;
- telefone;
- endereço IP;
- URL;
- tokens comuns;
- api keys;
- private keys.

O scanner é uma defesa adicional, não substitui revisão humana. Nomes próprios, fatos raros e combinações identificáveis podem exigir paráfrase mesmo sem ativar uma regex.

## regras de revisão

Um caso aceito deve:

1. preservar a intenção técnica relevante;
2. remover nomes de pessoas, empresas, projetos e ambientes quando não forem necessários;
3. generalizar valores, datas e locais identificáveis;
4. remover credenciais, urls, ips e ids;
5. evitar frases copiadas literalmente;
6. revisar se a decisão observada deveria ser aceita;
7. manter somente expectativas necessárias para detectar regressão.

Não atualizar o baseline apenas para reproduzir uma decisão real ruim.

## segurança e operação

- não existe endpoint público para exportação;
- o processo roda por CLI com acesso administrativo ao banco;
- o workspace é obrigatório;
- arquivos de quarentena ficam fora do git;
- o conteúdo bruto só é lido em memória para métricas e HMAC;
- nenhuma chamada de modelo é realizada;
- nenhum token de API é gasto.

## estado atual

A quarentena, a revisão e a promoção estão implementadas e cobertas por testes.

Ainda não existem casos reais promovidos no repositório. A próxima subetapa operacional é executar o fluxo em um ambiente autorizado, revisar manualmente os candidatos e incorporar somente casos aprovados.
