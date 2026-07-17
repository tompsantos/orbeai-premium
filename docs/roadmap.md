# roadmap enxuto

## fase 0 — fundação

- [x] criar o repositório premium;
- [x] definir monorepo e infraestrutura;
- [x] criar o primeiro serviço cognitivo;
- [x] fixar a versão inicial do Hermes;
- [x] proteger a API interna;
- [x] adicionar CI e testes básicos.

## fase 1 — transplante funcional

- [ ] importar o frontend atual para `apps/web`;
- [ ] importar o backend atual para `services/control-api`;
- [ ] substituir `execute_provider()` pelo cliente do `orbe-cognition`;
- [ ] mapear workspace, usuário, chat e histórico;
- [ ] manter fallback temporário para o caminho antigo.

## fase 2 — streaming

- [ ] SSE de tokens;
- [ ] eventos de ferramentas;
- [ ] cancelamento;
- [ ] pedidos de aprovação;
- [ ] status de execução no chat.

## fase 3 — memória orbe

- [ ] plugin `orbe-memory`;
- [ ] busca semântica;
- [ ] escopos e sensibilidade;
- [ ] aprovação de memória;
- [ ] migração gradual da heurística por regex.

## fase 4 — aprendizado procedural

- [ ] revisão pós-turno;
- [ ] skills pessoais e organizacionais;
- [ ] aprovação para skills globais;
- [ ] histórico e reversão de aprendizado.

## fase 5 — premium

- [ ] EmotionEngine;
- [ ] subagentes;
- [ ] research;
- [ ] artifacts;
- [ ] voz;
- [ ] ferramentas por plano;
- [ ] painel administrativo cognitivo.
