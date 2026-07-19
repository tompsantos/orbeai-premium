# roadmap operacional do orbeRouter

## uso

Este é o quadro oficial da construção do orbeRouter. Atualizar no mesmo PR que concluir ou replanejar uma etapa.

Legenda: `[x]` comprovado, `[ ]` pendente. Código, CI e ambiente devem ser tratados separadamente quando o rollout for adiado.

## marco atual

- data: 2026-07-19;
- kernel: `orbe-router-v1`;
- fase 2: desenvolvimento concluído, rollout da center pendente;
- fase 3: concluída;
- fase 4: concluída no PR #33;
- fase 5: em andamento com três baselines sintéticos e quarentena de casos reais;
- próximo marco: definir critérios quantitativos de saída e promover casos reais revisados.

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

- [x] `RouterRequest`, `SemanticClassification`, `RouterDecision` e `ExecutionPlan`;
- [x] reason codes e capability registry;
- [x] decisão separada da execução;
- [x] feature flag `orbe_router_v1`;
- [x] registry de OpenAI, Gemini, NVIDIA NIM e mock;
- [x] timeout, retry, fallback e tentativas;
- [x] chat vivo com decisão persistida e SSE `router.decision`;
- [x] execução direta ou cognition;
- [x] memória e conhecimento autorizados;
- [x] cofre criptografado por workspace;
- [x] OpenAI, Gemini e NVIDIA validadas pela interface;
- [x] resposta real no chat;
- [ ] consolidar evidência sanitizada do ambiente com ids de decisão, mensagem e model run.

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

### perfis e governança

- [x] `model-profile-v1`;
- [x] provider e modelo separados;
- [x] capacidades, formatos, streaming e ferramentas;
- [x] ciclo de vida e disponibilidade por workspace;
- [x] contexto e política de dados por id exato quando há fonte oficial;
- [x] ausência de evidência preservada como `not_validated`;
- [x] qualidade sem nota até benchmark próprio;
- [x] `workspace-model-controls-v1`;
- [x] owner/admin, auditoria, referência stale e proteção do último executor.

### tentativas e telemetria

- [x] `provider_attempt_records` por workspace;
- [x] correlation id por execução;
- [x] sucesso, falha, skip e falha terminal persistidos;
- [x] erro sanitizado e categorizado;
- [x] `model-telemetry-v1`;
- [x] p50, p95, sucesso, timeout, tokens e custo comprovável;
- [x] tentativas ligadas a chat, mensagem e model run;
- [x] model run para falha terminal e stop antes do primeiro delta;
- [x] retenção física pelo workspace;
- [x] purge isolado e auditado;
- [x] agregação sob demanda até 90 dias;
- [x] rollups e circuit breaker encaminhados para a fase 10.

### interface

- [x] endpoint seguro atrás de feature flag;
- [x] laboratório com janelas de 7, 30 e 90 dias;
- [x] controles efetivos por workspace;
- [x] estados disabled, mock e erro explícitos;
- [x] controles locais e decisão simulada removidos;
- [x] nenhum segredo ou payload bruto exposto.

critério de saída: cumprido.

fechamento: `docs/phase-4-closure.md`.

## fase 5. dataset e baseline

status: em andamento.

### 5a. contrato e baseline funcional

- [x] schema `router-case-v1`;
- [x] dataset JSONL versionado;
- [x] ids únicos e campos extras rejeitados;
- [x] rotas aceitáveis e proibidas;
- [x] providers, reason codes, capabilities, fallback e classificação;
- [x] ambiente sintético sem credencial ou chamada externa;
- [x] replay `router-replay-v1` usando o kernel real;
- [x] comando reproduzível e código de saída para CI;
- [x] 28 casos em 17 categorias;
- [x] `router-baseline-v1`;
- [x] 28 de 28 casos aprovados na CI.

### 5b. casos reais sanitizados

- [x] contrato `router-real-case-candidate-v1`;
- [x] isolamento por workspace;
- [x] ids substituídos por HMAC;
- [x] nenhum conteúdo bruto no candidato;
- [x] template de revisão nasce rejeitado;
- [x] scanner de PII, infraestrutura e segredo;
- [x] promoção gera somente `router-case-v1` revisado;
- [x] candidatos e revisões fora do repositório por padrão;
- [x] pipeline e quarentena validados no PR #35;
- [ ] executar exportação em ambiente autorizado;
- [ ] revisar paráfrases sanitizadas;
- [ ] promover os primeiros casos reais para o dataset versionado.

### 5c. fronteiras e ambiguidades

- [x] contrato `router-boundary-case-v1`;
- [x] conteúdo materializado por comprimento exato;
- [x] limites 900/901 e 2.500/2.501;
- [x] dois versus três sinais semânticos;
- [x] precedência de escolha manual, modo e intenção;
- [x] pesquisa combinada com documento, código e risco;
- [x] memória, conhecimento e contexto combinado;
- [x] cognition ativo, desativado e com provider indisponível;
- [x] ambiguidades explícitas, negadas e explicativas de ferramenta;
- [x] 20 casos em 8 categorias;
- [x] `router-boundary-baseline-v1`;
- [x] 20 de 20 casos aprovados na CI;
- [x] cli `python scripts/router_replay.py --kind boundaries`;
- [x] comportamento ambíguo documentado sem ser declarado correto.

### 5d. direto versus cognition

- [x] contrato `router-execution-pair-v1`;
- [x] variantes explicativa e operacional por par;
- [x] materialização no contrato funcional existente;
- [x] 10 pares e 20 casos em 5 categorias;
- [x] criação de arquivo, pesquisa web, código e documento;
- [x] comprimento, múltiplos passos e contexto;
- [x] termos GitHub, terminal e deploy;
- [x] `router-execution-pair-baseline-v1`;
- [x] cli `python scripts/router_replay.py --kind execution`;
- [x] 10 de 10 pares e 20 de 20 casos aprovados na CI;
- [x] 7 pares separados entre direto e cognition;
- [x] 3 pares `both_cognition` registrados como sobreacionamento;
- [x] sobreacionamentos documentados sem alteração prematura do kernel.

### saída da fase 5

- [x] ampliar casos direto versus cognition;
- [ ] incluir casos reais revisados suficientes para as classes críticas;
- [ ] definir limiar mínimo por categoria e regressões proibidas;
- [ ] definir como candidatos futuros serão comparados offline;
- [ ] aprovar critério quantitativo de saída antes da fase 6.

Documentação: `docs/router-evaluation.md` e `docs/router-real-case-quarantine.md`.

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
- [x] dataset direto versus cognition;
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
- PR #33: correlação obrigatória, falhas terminais e retenção auditada;
- PR #34: dataset sintético, replay offline e baseline funcional v1;
- PR #35: quarentena segura para casos reais;
- PR #36: dataset e baseline de fronteiras e ambiguidades;
- PR #37: pares direto versus cognition e sobreacionamentos medidos.
