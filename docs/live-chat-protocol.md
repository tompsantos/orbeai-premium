# protocolo do chat premium vivo

O chat ao vivo usa `POST` com resposta `text/event-stream` na fronteira pública:

```text
browser -> control-api -> orbeRouter
                         ├── provider gateway
                         └── orbe-cognition -> Hermes AIAgent
```

## endpoints

### control API

- `POST /v1/chat/live`
- `POST /v1/chat/live/{request_id}/stop`
- `POST /v1/chat/live/{request_id}/approval`

### cognition

- `POST /v1/turns/stream`
- `POST /v1/turns/{request_id}/stop`
- `POST /v1/turns/{request_id}/approval`

## eventos principais

- `run.started`: execução registrada e iniciada.
- `router.decision`: decisão persistida, estratégia, reason codes, capacidades e plano sanitizado.
- `execution.started`: gateway direto iniciou a cadeia de providers.
- `run.status`: estado visual seguro, sem raciocínio interno.
- `knowledge.context`: informa que pesquisas ou materiais persistidos foram selecionados, expondo apenas metadados rastreáveis e nunca o conteúdo interno completo.
- `response.commentary`: comentário intermediário completo.
- `tool.started` e `tool.completed`: atividade de ferramenta sanitizada.
- `approval.required`: o turno aguarda decisão do usuário.
- `response.delta`: texto incremental emitido pelo cognition ou pelo provider direto.
- `fallback.started`: contingência ativada antes do primeiro delta.
- `response.completed`, `response.stopped` ou `response.failed`: estado terminal persistido.

## invariantes

1. O frontend nunca acessa o cognition diretamente.
2. Toda parada ou aprovação é validada por workspace e usuário no control API.
3. O router decide entre provider direto e cognition; o cognition não é caminho automático.
4. O fallback cognitivo só ocorre antes do primeiro texto, evitando respostas misturadas.
5. Raciocínio interno não é transmitido. Apenas estados seguros de apresentação.
6. Mensagem do usuário é persistida antes do stream.
7. A decisão do router é persistida antes da execução na mensagem do usuário e na auditoria `router.decision`.
8. Pesquisas e materiais são selecionados por workspace, projeto e relevância textual.
9. Toda seleção de conhecimento gera uma única auditoria com ids, tipo, score e indicação de referência sem conteúdo armazenado.
10. O mesmo contexto selecionado é entregue ao cognition e ao provider de contingência, sem nova seleção durante o stream.
11. Metadados públicos das fontes usadas são persistidos na mensagem do assistente e na auditoria `chat.live`.
12. Resposta, model run, tentativas do gateway, latência e auditoria são persistidos no estado terminal do turno.
13. Mock é sempre identificado e não pode ser apresentado como execução real.
14. `always` não é uma opção pública. Mudanças permanentes de política exigem governança própria.
