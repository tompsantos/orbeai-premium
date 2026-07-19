# roadmap operacional do orbeRouter

## uso deste arquivo

Este é o quadro editável da construção do orbeRouter. Atualizar no mesmo PR que concluir ou replanejar uma etapa.

Legenda:

- `[x]` concluído e comprovado;
- `[ ]` pendente;
- `bloqueado:` depende de outro item;
- `código:` estado no repositório;
- `ci:` estado na bancada;
- `ambiente:` estado na center;
- `evidência:` PR, relatório ou ids sanitizados.

Uma fase não termina apenas porque existe código. Quando aplicável, deve haver CI, publicação e validação real. Quando uma publicação for deliberadamente adiada, o roadmap deve separar o fechamento de desenvolvimento do rollout operacional sem apresentar o ambiente como atualizado.

## marco atual

- data de referência: 2026-07-19;
- commit oficial de referência: `0abf98db3264e546fe43b6e6fa985739835ceed0`;
- kernel atual: `orbe-router-v1`;
- aplicação ativa: `ai.orbeone.com.br`;
- providers reais validados: OpenAI, Gemini e NVIDIA NIM;
- cadastro público: fechado no código e validado na CI; publicação no ambiente rastreada separadamente;
- fase 2: concluída no escopo de desenvolvimento do GitHub;
- fase 3: concluída com CI verde e merge do PR #26;
- fase 4: em andamento com perfis, telemetria, interface e governança operacional por workspace;
- próxima fatia técnica: validar contexto e política de dados por modelo usando fontes oficiais, sem transformar ausência de evidência em capacidade declarada.

## fase 0. fundação arquitetural

status: concluída.

- [x] manter a orbeAI como produto e fronteira oficial;
- [x] manter Hermes dentro de `services/cognition`;
- [x] manter router dentro de `services/control-api`;
- [x] separar web, control-api e cognition;
- [x] usar PostgreSQL como persistência oficial;
- [x] proteger comunicação interna;
- [x] criar CI dedicada na `orbeone-lab-01`;
- [x] registrar ADR 0002.

critério de saída: arquitetura executável, testável e sem Hermes como controlador geral.

## fase 1. orbeRouter v1 e primeira vitória real

status: concluída.

### contratos e kernel

- [x] `RouterRequest`;
- [x] `SemanticClassification`;
- [x] `RouterDecision`;
- [x] `ExecutionPlan`;
- [x] reason codes estáveis;
- [x] capability registry;
- [x] decisão separada da execução;
- [x] feature flag `orbe_router_v1`.

### providers e gateway

- [x] provider registry;
- [x] estados `configured`, `unavailable`, `disabled` e `mock`;
- [x] OpenAI;
- [x] Gemini;
- [x] NVIDIA NIM;
- [x] gateway direto;
- [x] timeout e retry;
- [x] fallback explícito;
- [x] tentativas persistidas;
- [x] erro explícito para provider desconhecido;
- [x] mock identificado.

### chat vivo

- [x] decisão persistida antes da execução;
- [x] evento SSE `router.decision`;
- [x] escolha entre provider direto e cognition;
- [x] provider, modelo, latência e model run persistidos;
- [x] fallback cognitivo apenas antes do primeiro delta;
- [x] memória autorizada;
- [x] conhecimento autorizado.

### credenciais e validação real

- [x] cofre criptografado por workspace;
- [x] interface para salvar e testar;
- [x] chave completa nunca retornada;
- [x] OpenAI validada pela interface;
- [x] Gemini validado pela interface;
- [x] NVIDIA validada pela interface;
- [x] resposta real no chat;
- [ ] registrar evidência técnica sanitizada com ids de decisão, mensagem e model run.

critério de saída: provider real executado pela interface com rastreabilidade completa.

## fase 2. fechamento operacional e segurança

status: concluída no escopo de desenvolvimento do GitHub; rollout operacional pendente.

### acesso no código e CI

- [x] criar configuração `PUBLIC_REGISTRATION_ENABLED` com padrão `false`;
- [x] bloquear endpoint de registro quando fechado;
- [x] remover cadastro da tela pública;
- [x] remover credenciais de desenvolvimento preenchidas na tela;
- [x] adicionar teste de bloqueio;
- [x] CI verde no PR #25;
- [x] merge do PR #25 no `main`;
- [x] registrar fechamento, evidências e rollback em `docs/phase-2-security-closure.md`.

### rollout operacional pendente

- [ ] publicar release contendo o PR #25;
- [ ] validar que a tela mostra somente login;
- [ ] validar que `POST /v1/auth/register` retorna 403;
- [ ] registrar relatório de implantação e rollback.

### infraestrutura pendente

- [ ] restaurar ACL restritiva da VPC;
- [ ] validar 22, 80 e 443;
- [ ] validar conexão privada center para db;
- [ ] confirmar ausência de portas públicas desnecessárias.

responsável pela ACL: operação manual do proprietário.

critério de saída do desenvolvimento: implementação, testes, CI, merge e documentação concluídos.

critério de saída do ambiente: acesso público fechado na release ativa e rede novamente em política restritiva.

O rollout operacional está explicitamente diferido e não bloqueia o início da fase 4. O ambiente não deve ser apresentado como atualizado antes das validações acima.

## fase 3. documentação mestre e governança

status: concluída.

- [x] criar `docs/orberouter-manual.md`;
- [x] criar `docs/orberouter-roadmap.md`;
- [x] atualizar `docs/roadmap.md` com o marco real;
- [x] adicionar links no README;
- [x] registrar ADR sobre evolução por evidência e shadow mode;
- [x] validar coerência entre manual, roadmap, ADR e código;
- [x] CI verde;
- [x] merge no `main` pelo PR #26.

critério de saída: qualquer novo chat consegue retomar o projeto sem reconstruir contexto histórico.

## fase 4. inventário e perfis operacionais de modelos

status: em andamento.

### contrato

- [x] definir `ModelProfile` versionado;
- [x] separar provider de modelo no contrato de perfil;
- [x] registrar capacidades obrigatórias e opcionais;
- [x] registrar formatos, streaming e estado de ferramentas;
- [ ] registrar contexto validado;
- [ ] registrar política de dados;
- [x] registrar estado experimental, aprovado, descontinuado ou mock;
- [x] criar feature flag `router_model_profiles` desligada por padrão;
- [x] documentar campos desconhecidos como `not_validated`;
- [x] registrar disponibilidade efetiva por workspace no perfil.

### governança operacional por workspace

- [x] criar contrato `workspace-model-controls-v1`;
- [x] persistir controle por provider e nome exato do modelo;
- [x] proteger metadata reservada contra alteração genérica;
- [x] restringir leitura e alteração dos controles a owner e admin;
- [x] auditar alterações com `model.control.update`;
- [x] rejeitar referência a modelo stale;
- [x] remover modelo desativado da cadeia antes da decisão;
- [x] impedir que o workspace fique sem nenhum modelo executável;
- [x] manter governança operacional separada das políticas completas da fase 6.

### persistência de tentativas

- [x] criar tabela `provider_attempt_records` por workspace;
- [x] gerar correlation id por execução do gateway;
- [x] persistir sucesso, falha e skip;
- [x] persistir falha terminal antes de retornar erro;
- [x] classificar timeout, rate limit, autenticação, conexão e erro de provider;
- [x] não persistir mensagem de erro bruta do provider;
- [ ] associar obrigatoriamente tentativa a chat, mensagem e model run.

### telemetria

- [x] coletar latência p50 e p95 por provider e modelo;
- [x] coletar taxa de sucesso e timeout;
- [x] coletar tokens quando disponíveis;
- [x] calcular custo apenas com tabela configurada;
- [x] identificar fonte de cada dado;
- [x] criar janela de consulta de 1 a 90 dias;
- [ ] definir retenção física e agregação histórica de métricas;
- [x] versionar telemetria como `model-telemetry-v1`;
- [x] excluir tentativas puladas do denominador de confiabilidade.

### interface e operação

- [x] expor endpoint interno seguro de perfis atrás de feature flag;
- [x] anexar telemetria segura ao endpoint de perfis;
- [x] mostrar perfil seguro no Laboratório em rota interna própria;
- [x] permitir janelas de 7, 30 e 90 dias na interface;
- [x] diferenciar recurso desativado, modo mock e erro real;
- [x] permitir owner e admin ativar ou desativar modelo por workspace;
- [x] manter demais membros em modo somente leitura;
- [x] remover controles locais provisórios da tela antiga;
- [x] remover decisão simulada e números cenográficos do frontend;
- [x] não expor segredo, hint de chave, ciphertext, erro bruto ou payload bruto;
- [x] excluir placeholders sem adapter do catálogo operacional.

critério de saída: router possui catálogo operacional real, sem números cenográficos.

## fase 5. dataset de decisão e baseline

status: não iniciada.

- [ ] definir schema do caso de roteamento;
- [ ] criar dataset sintético inicial;
- [ ] adicionar casos reais sanitizados;
- [ ] cobrir conversa, escrita, código, documento, pesquisa e estratégia;
- [ ] cobrir risco, sensibilidade, memória e conhecimento;
- [ ] cobrir ferramenta, múltiplas etapas e cognition;
- [ ] cobrir seleção manual e indisponibilidade;
- [ ] definir rotas aceitáveis e proibidas;
- [ ] criar runner de replay offline;
- [ ] medir baseline do router v1;
- [ ] versionar dataset e resultados.

critério de saída: existe baseline reproduzível antes de qualquer router candidato ativo.

## fase 6. políticas e hard gates

status: não iniciada.

- [ ] definir providers permitidos por workspace;
- [ ] definir modelos permitidos;
- [ ] definir classes de dados e privacidade;
- [ ] definir teto por solicitação;
- [ ] definir orçamento diário e mensal;
- [ ] definir ferramentas permitidas;
- [ ] definir fallback permitido;
- [ ] definir mock permitido;
- [ ] definir necessidade de aprovação;
- [ ] persistir políticas aplicadas na decisão;
- [ ] testar que política sempre vence score.

critério de saída: nenhuma pontuação pode violar segurança, orçamento ou governança.

## fase 7. scoring determinístico v2

status: não iniciada.

- [ ] criar gerador de candidatos;
- [ ] normalizar sinais de qualidade, custo, latência e saúde;
- [ ] definir pesos por modo;
- [ ] versionar pesos;
- [ ] explicar candidatos eliminados;
- [ ] persistir score e componentes;
- [ ] criar feature flag `router_scoring_v2`;
- [ ] rodar offline no dataset;
- [ ] comparar com baseline;
- [ ] impedir ativação se houver regressão de hard gate.

critério de saída: seleção baseada em score explicável supera ou iguala baseline sem violar política.

## fase 8. pesquisa de ferramentas externas

status: não iniciada.

Ferramentas iniciais para avaliação: Semantic Router, RouteLLM, LiteLLM, LangGraph, Temporal e alternativas identificadas durante a pesquisa.

Para cada ferramenta:

- [ ] problema concreto;
- [ ] responsabilidade proposta;
- [ ] compatibilidade com contratos;
- [ ] licença e custo;
- [ ] operação e observabilidade;
- [ ] multi-tenant e segurança;
- [ ] lock-in;
- [ ] plano de remoção;
- [ ] teste ou protótipo isolado;
- [ ] resultado no dataset;
- [ ] decisão: rejeitar, referenciar, adaptar ou adotar.

critério de saída: decisões documentadas, sem dependência adicionada por entusiasmo.

## fase 9. classificador semântico em shadow mode

status: não iniciada.

- [ ] definir contrato do adapter semântico;
- [ ] criar feature flag `router_semantic_shadow`;
- [ ] manter router v1 como executor ativo;
- [ ] persistir decisão sombra;
- [ ] proibir chamada paga duplicada sem experimento;
- [ ] medir divergência;
- [ ] medir confiança e calibração;
- [ ] revisar falsos positivos de cognition e ferramentas;
- [ ] criar painel ou relatório offline;
- [ ] definir gate para ativação parcial.

critério de saída: candidato semântico demonstra ganho medido antes de controlar tráfego.

## fase 10. saúde de providers e circuit breaker

status: não iniciada.

- [ ] definir estados de saúde;
- [ ] calcular sucesso por janela;
- [ ] calcular timeout e latência p95;
- [ ] classificar autenticação e rate limit;
- [ ] definir abertura do circuito;
- [ ] implementar half-open probe;
- [ ] registrar transições;
- [ ] excluir erros do usuário da métrica de saúde;
- [ ] criar feature flag `router_health_routing`;
- [ ] testar fallback orientado por saúde.

critério de saída: router evita provider degradado com decisão auditável e reversível.

## fase 11. contrato cognitivo v2

status: não iniciada.

- [ ] selecionar modelo cognitivo por contrato explícito;
- [ ] declarar ferramentas autorizadas no plano;
- [ ] declarar limite de iterações;
- [ ] declarar orçamento cognitivo;
- [ ] declarar aprovações necessárias;
- [ ] distinguir texto longo de tarefa multi-etapas;
- [ ] criar dataset direto versus cognition;
- [ ] medir custo e sucesso do cognition;
- [ ] manter fallback antes do primeiro delta.

critério de saída: cognition entra por capacidade concreta, não por regra vaga.

## fase 12. rollout controlado

status: não iniciada.

- [ ] offline e replay aprovados;
- [ ] shadow mode aprovado;
- [ ] ativar apenas no workspace interno;
- [ ] validar logs e auditoria;
- [ ] ativar pequena porcentagem;
- [ ] comparar custo, latência, erro e qualidade;
- [ ] ampliar gradualmente;
- [ ] provar rollback;
- [ ] remover caminho antigo somente após estabilidade.

critério de saída: router v2 ativo com métricas melhores ou iguais e rollback comprovado.

## fases futuras

### ferramentas governadas

- [ ] capability registry ativo;
- [ ] autorização por workspace;
- [ ] aprovação para ações destrutivas;
- [ ] auditoria completa.

### conselho de modelos

- [ ] experimento somente em shadow mode;
- [ ] orçamento explícito;
- [ ] critérios de consenso e desempate;
- [ ] prova de ganho que justifique custo.

### missões duráveis e monitoramento

- [ ] ADR específica;
- [ ] avaliar necessidade de Temporal ou alternativa;
- [ ] estado durável e idempotência;
- [ ] cancelamento, retry e auditoria.

## checklist obrigatório de cada PR do router

- [ ] problema e objetivo claros;
- [ ] contratos afetados;
- [ ] segurança e isolamento;
- [ ] migration quando necessária;
- [ ] testes unitários;
- [ ] testes de integração;
- [ ] dataset ou replay quando aplicável;
- [ ] feature flag;
- [ ] métricas;
- [ ] rollback;
- [ ] documentação;
- [ ] CI verde;
- [ ] nenhum segredo;
- [ ] nenhuma capacidade fingida.

## registro de decisões

Adicionar novas decisões nesta tabela e criar ADR quando exigido.

| data | decisão | estado | referência |
| --- | --- | --- | --- |
| 2026-07-18 | orbeRouter no control-api e Hermes subordinado ao cognition | aceito | ADR 0002 |
| 2026-07-19 | cadastro público fechado por padrão | fundido, ambiente pendente | PR #25 |
| 2026-07-19 | router será evoluído no github, validado na CI e só depois publicado | aceito | ADR 0003 |
| 2026-07-19 | semântica nova começa em shadow mode | aceito | ADR 0003 |
| 2026-07-19 | fase 2 de desenvolvimento encerrada no GitHub; rollout da center e ACL permanecem operacionais | aceito | `docs/phase-2-security-closure.md` |
| 2026-07-19 | perfis de modelos começam como catálogo versionado, sem participar do scoring | fundido | PR #28 |
| 2026-07-19 | confiabilidade e latência usam tentativas persistidas; tokens e custo usam model runs | fundido | PR #29 |
| 2026-07-19 | interface de perfis permanece somente leitura até existir enforcement por workspace | superado pela governança real | PR #30 e `docs/model-profiles.md` |
| 2026-07-19 | disponibilidade de modelo por workspace é versionada, auditada e aplicada antes da provider chain | em implementação | `docs/model-profiles.md` |
