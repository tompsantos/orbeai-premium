# roadmap operacional do orbeRouter

## uso

Este é o quadro oficial da construção do orbeRouter. Atualizar no mesmo PR que concluir ou replanejar uma etapa.

Legenda: `[x]` comprovado, `[ ]` pendente. Código, CI e ambiente devem ser separados quando o rollout for adiado.

## marco atual

- data: 2026-07-19;
- kernel: `orbe-router-v1`;
- fase 2: desenvolvimento concluído, rollout da center pendente;
- fase 3: concluída;
- fase 4: concluída no PR #33 com perfis, telemetria, governança, correlação e retenção;
- próxima fase: dataset, replay offline e baseline reproduzível.

## fase 0. fundação arquitetural

status: concluída.

- [x] orbeAI como produto e fronteira oficial;
- [x] Hermes subordinado em `services/cognition`;
- [x] router em `services/control-api`;
- [x] web, control-api e cognition separados;
- [x] PostgreSQL e comunicação interna protegida;
- [x] CI dedicada na `orbeone-lab-01`;
- [x] ADR 0002.

## fase 1. router v1 e primeira vitória real

status: concluída.

### kernel e execução

- [x] `RouterRequest`, `SemanticClassification`, `RouterDecision` e `ExecutionPlan`;
- [x] reason codes e capability registry;
- [x] decisão separada da execução;
- [x] feature flag `orbe_router_v1`;
- [x] registry de OpenAI, Gemini, NVIDIA NIM e mock;
- [x] timeout, retry, fallback e tentativas;
- [x] chat vivo com decisão persistida e SSE `router.decision`;
- [x] execução direta ou cognition;
- [x] memória e conhecimento autorizados.

### credenciais reais

- [x] cofre criptografado por workspace;
- [x] interface para salvar e testar;
- [x] OpenAI, Gemini e NVIDIA validadas;
- [x] resposta real no chat;
- [ ] evidência sanitizada com ids de decisão, mensagem e model run.

## fase 2. fechamento operacional e segurança

status: desenvolvimento concluído; rollout operacional pendente.

- [x] cadastro público fechado por padrão;
- [x] endpoint e tela pública bloqueados;
- [x] credenciais de desenvolvimento removidas;
- [x] testes, CI, merge e documentação;
- [ ] publicar release na center;
- [ ] validar login sem cadastro e `POST /v1/auth/register` com 403;
- [ ] restaurar ACL restritiva e validar 22, 80, 443 e rede privada;
- [ ] registrar implantação e rollback.

## fase 3. documentação e governança

status: concluída.

- [x] manual e roadmap oficiais;
- [x] README e roadmap por eras atualizados;
- [x] ADR sobre evolução por evidência e shadow mode;
- [x] CI verde e merge do PR #26.

## fase 4. perfis operacionais e observabilidade

status: concluída.

### contrato e metadados

- [x] `model-profile-v1`;
- [x] provider e modelo separados;
- [x] capacidades obrigatórias e opcionais;
- [x] formatos, streaming e ferramentas;
- [x] ciclo de vida e disponibilidade no workspace;
- [x] contexto validado por id exato quando há fonte oficial;
- [x] política de dados validada por id exato quando há fonte oficial;
- [x] ausência de evidência preservada como `not_validated`;
- [x] fontes e data de validação registradas;
- [x] qualidade mantida sem nota até benchmark próprio.

### governança operacional

- [x] `workspace-model-controls-v1`;
- [x] controle persistente por provider e modelo exato;
- [x] metadata reservada;
- [x] owner/admin e modo somente leitura;
- [x] audit log `model.control.update`;
- [x] referência stale rejeitada;
- [x] modelo desativado removido antes da provider chain;
- [x] proteção do último executor.

### tentativas e telemetria

- [x] `provider_attempt_records` por workspace;
- [x] correlation id por gateway;
- [x] sucesso, falha, skip e falha terminal persistidos;
- [x] erro sanitizado e categorizado;
- [x] `model-telemetry-v1`;
- [x] p50, p95, sucesso, timeout, tokens e custo comprovável;
- [x] janela de 1 a 90 dias;
- [x] skips fora do denominador;
- [x] tentativas de chat ligadas a chat, mensagem e model run;
- [x] falha terminal e stop antes do primeiro delta recebem model run;
- [x] retenção física segue `data_retention_days` do workspace;
- [x] purge isolado e auditado por workspace;
- [x] agregação mantida sob demanda até 90 dias;
- [x] rollups e circuit breaker encaminhados para a fase 10.

### interface

- [x] endpoint seguro atrás de feature flag;
- [x] laboratório com janelas de 7, 30 e 90 dias;
- [x] controles efetivos por workspace;
- [x] estados disabled, mock e erro explícitos;
- [x] controles locais e decisão simulada removidos;
- [x] placeholders sem adapter fora do catálogo;
- [x] nenhum segredo ou payload bruto exposto.

critério de saída: cumprido. catálogo operacional real, observabilidade correlacionada e retenção definida, sem números cenográficos.

fechamento: `docs/phase-4-closure.md`.

## fase 5. dataset e baseline

status: próxima fase.

- [ ] schema versionado do caso de roteamento;
- [ ] dataset sintético e casos reais sanitizados;
- [ ] conversa, escrita, código, documento, pesquisa e estratégia;
- [ ] risco, sensibilidade, memória, conhecimento e cognition;
- [ ] seleção manual, indisponibilidade e rotas proibidas;
- [ ] replay offline;
- [ ] baseline reproduzível do router v1.

## fase 6. políticas e hard gates

status: não iniciada.

- [ ] providers e modelos permitidos por workspace;
- [ ] classes de dados e privacidade;
- [ ] teto por solicitação e orçamento diário/mensal;
- [ ] ferramentas, fallback e mock permitidos;
- [ ] aprovações necessárias;
- [ ] políticas aplicadas persistidas na decisão;
- [ ] política sempre vence score.

## fase 7. scoring determinístico v2

status: não iniciada.

- [ ] gerador de candidatos;
- [ ] sinais normalizados de qualidade, custo, latência e saúde;
- [ ] pesos versionados por modo;
- [ ] candidatos eliminados explicados;
- [ ] score e componentes persistidos;
- [ ] flag `router_scoring_v2`;
- [ ] avaliação offline sem regressão de hard gate.

## fase 8. ferramentas externas

status: não iniciada.

Candidatas iniciais: Semantic Router, RouteLLM, LiteLLM, LangGraph, Temporal e alternativas encontradas na pesquisa.

Para cada candidata:

- [ ] problema concreto e responsabilidade;
- [ ] compatibilidade, licença, custo e operação;
- [ ] multi-tenant, segurança, observabilidade e lock-in;
- [ ] plano de remoção;
- [ ] protótipo isolado e resultado no dataset;
- [ ] decisão: rejeitar, referenciar, adaptar ou adotar.

## fase 9. classificador semântico em shadow mode

status: não iniciada.

- [ ] contrato do adapter e flag `router_semantic_shadow`;
- [ ] router v1 permanece executor ativo;
- [ ] decisão sombra persistida sem chamada paga duplicada;
- [ ] divergência, confiança e calibração medidas;
- [ ] gate para ativação parcial.

## fase 10. saúde e circuit breaker

status: não iniciada.

- [ ] avaliar necessidade de rollups históricos com volume real;
- [ ] estados de saúde e janelas;
- [ ] sucesso, timeout, p95, autenticação e rate limit;
- [ ] abertura, half-open probe e transições auditadas;
- [ ] erros do usuário excluídos da saúde;
- [ ] flag `router_health_routing`;
- [ ] fallback orientado por saúde.

## fase 11. contrato cognitivo v2

status: não iniciada.

- [ ] modelo cognitivo selecionado por contrato;
- [ ] ferramentas, iterações, orçamento e aprovações declarados;
- [ ] texto longo separado de tarefa multi-etapas;
- [ ] dataset direto versus cognition;
- [ ] custo e sucesso medidos;
- [ ] fallback somente antes do primeiro delta.

## fase 12. rollout controlado

status: não iniciada.

- [ ] replay e shadow aprovados;
- [ ] ativação no workspace interno;
- [ ] logs, auditoria e rollback validados;
- [ ] porcentagem pequena e expansão gradual;
- [ ] custo, latência, erro e qualidade comparados;
- [ ] caminho antigo removido apenas após estabilidade.

## checklist de PR do router

- [ ] problema e objetivo claros;
- [ ] contratos, segurança e isolamento;
- [ ] migration quando necessária;
- [ ] testes e dataset quando aplicável;
- [ ] feature flag, métricas e rollback;
- [ ] documentação e CI verde;
- [ ] nenhum segredo ou capacidade fingida.

## decisões registradas

- ADR 0002: router no control-api e Hermes subordinado;
- ADR 0003: evolução por evidência, GitHub, CI e shadow mode;
- PR #25: cadastro fechado;
- PR #28: perfis versionados sem scoring;
- PR #29: tentativas e telemetria reais;
- PR #30: interface segura de perfis;
- PR #31: governança operacional por workspace;
- PR #32: metadados oficiais por id exato;
- PR #33: correlação obrigatória, falhas terminais e retenção auditada.
