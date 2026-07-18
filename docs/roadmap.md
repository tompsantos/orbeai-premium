# roadmap operacional por eras

> fonte operacional da orbeAI premium. decisões arquiteturais aceitas e o estado real do código prevalecem sobre planos históricos importados.

## era 0 — fundação

status: concluída.

- [x] monorepo premium;
- [x] control API, cognition e web separados;
- [x] PostgreSQL, migrations, autenticação, workspaces e auditoria;
- [x] CI real nos jobs `control-api`, `cognition` e `web`;
- [x] runner dedicado `orbeone-lab-01`.

## era 1 — identidade e primeira volta do produto

status: concluída o suficiente para avançar.

- [x] transplante do produto funcional;
- [x] chat vivo com SSE, interrupção e aprovações;
- [x] primeira grande volta da experiência premium;
- [x] persistência de mensagens, model runs, memória e artifacts;
- [ ] pendências visuais e de nomenclatura permanecem não bloqueantes.

## era 2 — orbeRouter

status: em construção.

objetivo: tornar o orbeRouter o córtex executivo da orbeAI. ele decide a estratégia de execução; o Hermes, dentro do `orbe cognition core`, executa loops cognitivos somente quando escolhido.

### bloco 2a — kernel e contratos

- [x] definir `RouterRequest`, `SemanticClassification`, `RouterDecision` e `ExecutionPlan`;
- [x] criar registry de capacidades;
- [x] declarar rotas futuras sem fingir implementação;
- [x] separar decisão de execução;
- [x] definir reason codes estáveis;
- [x] manter ponte reversível por feature flag `orbe_router_v1`.

### bloco 2b — provider registry e gateway

- [x] registrar apenas adapters diretos realmente existentes: OpenAI, Gemini e mock;
- [x] distinguir `configured`, `unavailable`, `disabled` e `mock`;
- [x] remover latência, custo e qualidade cenográficos da decisão operacional;
- [x] tornar provider sem adapter um erro explícito;
- [x] registrar tentativas, retry e fallback;
- [ ] validar provider real e credencial disponível na bancada sem expor segredo;
- [ ] adicionar health probes e circuit breaker orientados por métricas reais.

### bloco 2c — primeira fatia vertical real

- [x] conectar `POST /v1/chat/live` ao contrato do router v1;
- [x] persistir a decisão antes da execução;
- [x] emitir `router.decision` no SSE;
- [x] escolher execução direta ou cognition;
- [x] persistir provider, modelo, tentativas, fallback, latência e model run;
- [x] manter o frontend no mesmo fluxo vivo;
- [ ] provar em ambiente integrado uma resposta de provider real enviada pela interface;
- [ ] registrar a evidência do teste real com ids sanitizados.

critério de conclusão: mensagem enviada pelo frontend retorna resposta de modelo real e permite provar decisão, provider, modelo, motivo, fallback, latência, model run e mensagem correspondente.

### bloco 2d — integração formal com cognition

- [x] cognition deixa de ser caminho automático para toda mensagem;
- [x] fallback direto continua permitido apenas antes de deltas cognitivos;
- [x] interrupção, aprovação e isolamento multi-tenant são preservados;
- [ ] selecionar modelo cognitivo por contrato explícito;
- [ ] declarar capacidades de ferramentas autorizadas no plano;
- [ ] criar dataset de decisão direta versus cognitiva.

### bloco 2e — semântica, políticas e avaliação

- [x] classificação inicial de intenção, domínio, complexidade, risco e sensibilidade;
- [ ] adapter opcional de roteamento semântico por feature flag;
- [ ] shadow mode e comparação offline;
- [ ] orçamento, permissões e políticas por workspace;
- [ ] datasets, métricas, explicabilidade e rollback medido;
- [ ] experimento de conselho de modelos sem dependência estrutural prematura.

## era 3 — orbe-memory

status: componentes provisórios existem; era ainda não iniciada formalmente.

- CRUD, contexto textual, auto-memory e políticas atuais são pontes;
- provider multi-tenant `orbe-memory`, busca semântica e governança completa ficam para esta era.

## era 4 — conhecimento

status: trabalho antecipado congelado.

os PRs #18, #19 e #21 anteciparam persistência, seleção e rastreabilidade de conhecimento. não avançar agora em citações visuais, cartões de fontes, embeddings ou polimento fino até a primeira vitória real do router.

## eras futuras

- missões duráveis;
- ferramentas e integrações governadas;
- monitoramento;
- conselho de modelos;
- emotion engine e experiência multimodal;
- operação enterprise.
