# transplante do produto orbeAI

## origem

- interface e control API: `tompsantos/orbeai`
- runtime cognitivo: `NousResearch/hermes-agent`
- produto resultante: `tompsantos/orbeai-premium`

## fluxo ativo

```text
apps/web
  -> /api/v1/chat/send
services/control-api
  -> POST /v1/turns
services/cognition
  -> AIAgent
```

O control API continua sendo a fonte oficial para autenticação, workspaces,
projetos, chats, mensagens, artifacts, memória governada e auditoria.

O cognition core assume a execução inteligente. Durante a migração, uma falha
do cognition pode acionar o provider legado, com o evento registrado nos
metadados e no audit log.

## implantação-alvo

- containers em `orbeone-center-01`
- PostgreSQL em `orbeone-db-01`
- somente o web é publicado no host
- control API e cognition comunicam-se pela rede Docker privada
- o acesso ao cognition exige `X-Orbe-Internal-Key`
