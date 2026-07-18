# protocolo do chat premium vivo

O chat ao vivo usa `POST` com resposta `text/event-stream` em todas as camadas:

```text
browser -> control-api -> orbe-cognition -> Hermes AIAgent
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
- `run.status`: estado visual seguro, sem raciocínio interno.
- `knowledge.context`: informa que pesquisas ou materiais persistidos foram selecionados, expondo apenas metadados rastreáveis e nunca o conteúdo interno completo.
- `response.commentary`: comentário intermediário completo.
- `tool.started` e `tool.completed`: atividade de ferramenta sanitizada.
- `approval.required`: o turno aguarda decisão do usuário.
- `response.delta`: texto incremental emitido pelo Hermes ou pelo provider de contingência.
- `fallback.started`: contingência ativada antes do primeiro delta.
- `response.completed`, `response.stopped` ou `response.failed`: estado terminal persistido.

## invariantes

1. O frontend nunca acessa o cognition diretamente.
2. Toda parada ou aprovação é validada por workspace e usuário no control API.
3. O fallback só ocorre antes do primeiro texto cognitivo, evitando respostas misturadas.
4. Raciocínio interno não é transmitido. Apenas estados seguros de apresentação.
5. Mensagem do usuário e auto-memory são persistidos antes do stream.
6. Pesquisas e materiais são selecionados por workspace, projeto e relevância textual.
7. Toda seleção de conhecimento gera uma única auditoria com ids, tipo, score e indicação de referência sem conteúdo armazenado.
8. O mesmo contexto selecionado é entregue ao cognition e ao provider de contingência, sem nova seleção durante o stream.
9. Metadados públicos das fontes usadas são persistidos na mensagem do assistente e na auditoria `chat.live`.
10. Resposta, model run e auditoria são persistidos no estado terminal do turno.
11. `always` não é uma opção pública. Mudanças permanentes de política exigem governança própria.
