# roadmap operacional por eras

> fonte operacional da orbeAI premium. decisões arquiteturais aceitas e o estado real do código prevalecem sobre planos históricos importados.

O plano detalhado do router vive em `docs/orberouter-roadmap.md`. O manual de arquitetura, desenvolvimento, avaliação, publicação e retomada de contexto vive em `docs/orberouter-manual.md`.

## era 0 - fundação

status: concluída.

- [x] monorepo premium;
- [x] control API, cognition e web separados;
- [x] PostgreSQL, migrations, autenticação, workspaces e auditoria;
- [x] CI real nos jobs `control-api`, `cognition` e `web`;
- [x] runner dedicado `orbeone-lab-01`.

## era 1 - identidade e primeira volta do produto

status: concluída o suficiente para avançar.

- [x] transplante do produto funcional;
- [x] chat vivo com SSE, interrupção e aprovações;
- [x] primeira grande volta da experiência premium;
- [x] persistência de mensagens, model runs, memória e artifacts;
- [ ] pendências visuais e de nomenclatura permanecem não bloqueantes.

## era 2 - orbeRouter

status: primeira vitória real e observabilidade concluídas; baseline sintético v1 validado, casos reais sanitizados são o próximo marco.

objetivo: tornar o orbeRouter o córtex executivo da orbeAI. ele decide a estratégia de execução; o Hermes, dentro do `orbe cognition core`, executa loops cognitivos somente quando escolhido.

### bloco 2a - kernel e contratos

- [x] definir `RouterRequest`, `SemanticClassification`, `RouterDecision` e `ExecutionPlan`;
- [x] criar registry de capacidades;
- [x] declarar rotas futuras sem fingir implementação;
- [x] separar decisão de execução;
- [x] definir reason codes estáveis;
- [x] manter ponte reversível por feature flag `orbe_router_v1`.

### bloco 2b - provider registry e gateway

- [x] registrar adapters diretos de OpenAI, Gemini, NVIDIA NIM e mock declarado;
- [x] distinguir `configured`, `unavailable`, `disabled` e `mock`;
- [x] remover latência, custo e qualidade cenográficos da decisão operacional;
- [x] tornar provider sem adapter um erro explícito;
- [x] registrar tentativas, retry e fallback;
- [x] validar credenciais reais pela interface sem expor segredo;
- [x] validar OpenAI, Gemini e NVIDIA NIM;
- [x] adicionar perfis operacionais versionados por modelo;
- [x] persistir tentativas e telemetria real por provider e modelo;
- [x] aplicar disponibilidade operacional por workspace antes da provider chain;
- [ ] adicionar health probes e circuit breaker orientados por métricas reais.

### bloco 2c - primeira fatia vertical real

- [x] conectar `POST /v1/chat/live` ao contrato do router v1;
- [x] persistir a decisão antes da execução;
- [x] emitir `router.decision` no SSE;
- [x] escolher execução direta ou cognition;
- [x] persistir provider, modelo, tentativas, fallback, latência e model run;
- [x] correlacionar tentativas com chat, mensagem e model run;
- [x] criar model run para falha terminal e stop antes do primeiro delta;
- [x] manter o frontend no mesmo fluxo vivo;
- [x] provar em ambiente integrado respostas de providers reais enviadas pela interface;
- [ ] registrar evidência técnica do teste real com ids sanitizados.

critério da primeira vitória: cumprido no ambiente integrado. falta consolidar a evidência sanitizada no repositório.

### bloco 2d - integração formal com cognition

- [x] cognition deixa de ser caminho automático para toda mensagem;
- [x] fallback direto continua permitido apenas antes de deltas cognitivos;
- [x] interrupção, aprovação e isolamento multi-tenant são preservados;
- [ ] selecionar modelo cognitivo por contrato explícito;
- [ ] declarar capacidades de ferramentas autorizadas no plano;
- [x] criar dataset sintético direto versus cognition;
- [ ] adicionar casos reais sanitizados direto versus cognition.

### bloco 2e - segurança e fechamento operacional

- [x] fechar cadastro público no código por padrão;
- [x] remover formulário público de cadastro;
- [x] remover credenciais de desenvolvimento preenchidas na tela;
- [x] validar PR #25 na CI e fundir no `main`;
- [ ] publicar a release do PR #25 no ambiente;
- [ ] validar endpoint de registro bloqueado no ambiente;
- [ ] restaurar ACL restritiva e validar conectividade.

### bloco 2f - perfis, dataset e baseline

- [x] criar perfis operacionais de modelos;
- [x] coletar telemetria real de latência, sucesso, timeout, tokens e custo;
- [x] expor telemetria e controles seguros no Laboratório;
- [x] validar contexto e política de dados por id exato quando houver fonte oficial;
- [x] manter modelos e campos desconhecidos como `not_validated`;
- [x] associar tentativas de chat a mensagem e model run;
- [x] usar retenção do workspace e purge auditado;
- [x] manter agregação sob demanda até 90 dias;
- [x] criar dataset sintético versionado com 28 casos;
- [x] criar replay offline sem provider, credencial ou custo;
- [x] medir baseline sintético reproduzível do router v1;
- [ ] adicionar casos reais sanitizados;
- [ ] ampliar entradas longas e fronteiras ambíguas;
- [ ] definir critério quantitativo de saída da fase 5.

### bloco 2g - políticas e scoring v2

- [ ] orçamento, permissões e políticas por workspace;
- [ ] geração de candidatos;
- [ ] score explicável e versionado;
- [ ] persistência dos componentes do score;
- [ ] feature flag e rollback.

### bloco 2h - semântica e shadow mode

- [x] classificação inicial de intenção, domínio, complexidade, risco e sensibilidade;
- [ ] avaliar Semantic Router, RouteLLM, LiteLLM, LangGraph, Temporal e alternativas;
- [ ] criar adapter opcional de roteamento semântico;
- [ ] executar candidato em shadow mode;
- [ ] comparar offline e medir calibração;
- [ ] ativar somente após ganho comprovado.

### bloco 2i - saúde, avaliação e rollout

- [ ] avaliar rollups históricos com volume real;
- [ ] circuit breaker;
- [ ] métricas de decisão e execução;
- [ ] explicabilidade segura;
- [ ] rollout por workspace e porcentagem;
- [ ] rollback medido;
- [ ] experimento de conselho de modelos sem dependência prematura.

## era 3 - orbe-memory

status: componentes provisórios existem; era ainda não iniciada formalmente.

- CRUD, contexto textual, auto-memory e políticas atuais são pontes;
- provider multi-tenant `orbe-memory`, busca semântica e governança completa ficam para esta era.

## era 4 - conhecimento

status: trabalho antecipado congelado.

Os PRs #18, #19 e #21 anteciparam persistência, seleção e rastreabilidade de conhecimento. Não avançar em citações visuais, cartões de fontes, embeddings ou polimento fino antes dos próximos marcos medidos do router.

## eras futuras

- missões duráveis;
- ferramentas e integrações governadas;
- monitoramento;
- conselho de modelos;
- emotion engine e experiência multimodal;
- operação enterprise.
