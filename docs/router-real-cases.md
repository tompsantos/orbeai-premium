# casos reais sanitizados do orbeRouter

## objetivo

A fase 5 precisa incorporar decisões observadas no uso real sem copiar conversas, ids internos ou segredos para o repositório.

O fluxo usa uma quarentena em quatro etapas:

```text
export → review-template ou review-session → promote → replay e gate
```

Nenhum candidato exportado é tratado como caso aprovado. Somente a saída de `promote`, depois de revisão humana e validações automáticas, pode ser considerada para um dataset versionado.

## ambiente autorizado

O código confirma que a exportação abre `SessionLocal` e usa `DATABASE_URL` para consultar `audit_logs`, `chats` e `messages`.

Pelo repositório:

- a persistência oficial está no PostgreSQL da orbeOne;
- o control-api ativo recebe a conexão oficial;
- a CI usa PostgreSQL descartável e não contém uso real;
- não existe uma fonte alternativa de casos reais comprovada no GitHub.

Portanto, a operação precisa rodar em um checkout isolado do commit oficial, com acesso administrativo ou somente leitura suficiente ao banco oficial. A operação não deve ser executada dentro da release ativa nem exigir alteração da `orbeone-center-01`.

Se nenhum host administrativo isolado com acesso ao banco estiver autorizado, a coleta permanece bloqueada operacionalmente. Não se deve copiar o banco, abrir ACL, criar túnel permanente ou alterar infraestrutura apenas para satisfazer o gate.

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
- uma das classes críticas;
- opcionalmente, expectativas diferentes da decisão observada.

A decisão observada não é considerada correta automaticamente. O revisor pode substituir o contrato esperado quando identificar um erro ou uma rota aceitável mais ampla.

### sessão local de revisão

Versão: `router-real-case-review-session-v1`.

A sessão local resolve a ponte entre o candidato opaco e a mensagem original sem criar arquivo bruto:

- consulta o banco uma única vez;
- mantém o conteúdo original somente em memória;
- serve a interface apenas em `127.0.0.1`;
- usa token aleatório por sessão;
- desativa logs de acesso, cache, documentação e indexação;
- salva candidatos, revisões e resumo com permissão `0600`;
- grava somente a paráfrase e metadados sanitizados;
- nunca adiciona endpoint ao control-api ativo.

A aceitação exige quatro atestes explícitos:

- nomes pessoais e identificadores desnecessários foram removidos;
- infraestrutura interna e caminhos privados foram removidos;
- a paráfrase não copia o texto original;
- a expectativa foi revisada e não aceita o observado automaticamente.

A sessão também bloqueia UUIDs, identificadores hexadecimais longos, hostnames internos, caminhos locais e DSNs de banco, além do scanner base.

### promoção

A promoção produz `router-case-v1`, compatível com o replay offline da fase 5a.

O caso promovido recebe um id `real-<fingerprint-opaco>`. O vínculo com a quarentena permanece pelo id opaco, nunca por ids do banco.

Com `--require-phase5-coverage`, a promoção exige:

- pelo menos 12 revisões aceitas;
- duas amostras em cada classe crítica;
- atestes completos em todo caso aceito;
- nenhum padrão sensível detectado.

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
- precisa ser o mesmo entre exportação, revisão e promoção;
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

### abrir sessão local de revisão

```bash
umask 077

python scripts/router_real_cases.py review-session \
  --workspace-id '<workspace-id>' \
  --candidates /tmp/orbe-router-candidates.jsonl \
  --reviews /tmp/orbe-router-reviews.jsonl \
  --summary /tmp/orbe-router-review-summary.json \
  --limit 300 \
  --port 8765
```

O comando imprime somente o caminho do resumo. O resumo contém a URL loopback com token, contagens e cobertura, mas nenhum conteúdo bruto.

Quando a sessão roda em host remoto autorizado, o acesso deve usar túnel temporário local:

```bash
ssh -L 8765:127.0.0.1:8765 '<host-autorizado>'
```

A sessão continua presa em loopback. Não usar `0.0.0.0`, proxy público, DNS ou regra de firewall.

Para retomar os mesmos arquivos:

```bash
python scripts/router_real_cases.py review-session \
  --workspace-id '<workspace-id>' \
  --candidates /tmp/orbe-router-candidates.jsonl \
  --reviews /tmp/orbe-router-reviews.jsonl \
  --summary /tmp/orbe-router-review-summary.json \
  --limit 300 \
  --port 8765 \
  --resume
```

O mesmo segredo de exportação precisa estar disponível.

### promover revisões aceitas

```bash
python scripts/router_real_cases.py promote \
  --candidates /tmp/orbe-router-candidates.jsonl \
  --reviews /tmp/orbe-router-reviews.jsonl \
  --review-session-summary /tmp/orbe-router-review-summary.json \
  --require-phase5-coverage \
  --output /tmp/router-real-reviewed-v1.jsonl
```

A saída promovida ainda deve ser inspecionada em diff antes de ser incorporada ao dataset oficial.

### executar replay real

```bash
python scripts/router_replay.py \
  --dataset /tmp/router-real-reviewed-v1.jsonl \
  --dataset-id router-v1/dataset-real-v1.jsonl \
  --output /tmp/router-real-replay-v1.json
```

### executar gate final

```bash
python scripts/router_evaluation_gate.py \
  --real-dataset /tmp/router-real-reviewed-v1.jsonl \
  --require-ready \
  --output /tmp/router-evaluation-gate-v1.json
```

A fase 5 só pode avançar quando esse comando retornar código zero.

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

A sessão local e a validação de cobertura também bloqueiam:

- UUID ou GUID;
- identificador hexadecimal longo;
- hostname interno;
- caminho privado de sistema;
- DSN de banco.

O scanner é uma defesa adicional, não substitui revisão humana. Nomes próprios, fatos raros e combinações identificáveis não são reconhecidos com segurança por regex. Por isso, todo aceite exige ateste explícito do revisor.

## regras de revisão

Um caso aceito deve:

1. preservar a intenção técnica relevante;
2. remover nomes de pessoas, empresas, projetos e ambientes quando não forem necessários;
3. generalizar valores, datas e locais identificáveis;
4. remover credenciais, urls, ips e ids;
5. evitar frases copiadas literalmente;
6. revisar se a decisão observada deveria ser aceita;
7. manter somente expectativas necessárias para detectar regressão;
8. pertencer a uma das seis classes críticas da fase 5.

Não atualizar o baseline apenas para reproduzir uma decisão real ruim.

## classes críticas

- `conversation`;
- `software`;
- `document`;
- `research`;
- `risk-sensitivity`;
- `execution-boundary`.

A cobertura mínima é de duas amostras por classe.

## segurança e operação

- não existe endpoint público para exportação ou revisão;
- o processo roda por CLI com acesso administrativo ao banco;
- o workspace é obrigatório;
- arquivos de quarentena ficam fora do git;
- arquivos da sessão usam permissão `0600`;
- o conteúdo bruto só é lido em memória e servido em loopback;
- nenhuma chamada de modelo é realizada;
- nenhum token de API é gasto;
- candidatos brutos, arquivos de revisão e resumo da sessão nunca entram no repositório;
- somente o `router-case-v1` promovido e sanitizado pode ser versionado.

## estado atual

A quarentena, a revisão, a promoção e a sessão local segura estão implementadas e cobertas por testes.

Ainda não existem casos reais promovidos no repositório. A próxima subetapa operacional é executar o fluxo em ambiente autorizado, revisar manualmente 12 candidatos, promover o dataset e comprovar o gate com código zero.
