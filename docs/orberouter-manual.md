# manual mestre do orbeRouter

## finalidade

Este documento é a fonte de continuidade para projetar, desenvolver, testar, publicar e evoluir o orbeRouter. Ao retomar o projeto em outro chat ou com outro agente, ler nesta ordem:

1. este manual;
2. `docs/orberouter-roadmap.md`;
3. `docs/adr/0002-orberouter-v1.md`;
4. `docs/architecture.md`;
5. pull requests abertos, último commit do `main` e última CI.

O código real, os ADRs aceitos, os PRs fundidos e a CI prevalecem sobre planos antigos.

## visão central

O orbeRouter é o córtex executivo da orbeAI. Ele transforma uma solicitação autorizada em uma decisão explicável, persistível e executável.

A orbeAI continua sendo o produto. O Hermes permanece dentro do `orbe cognition core` e só recebe um turno quando o plano escolhe execução cognitiva.

```text
frontend
  -> control-api resolve identidade, workspace, contexto e políticas
  -> orbeRouter classifica, restringe, pontua e cria o plano
      -> provider gateway para execução direta
      -> orbe cognition core para execução cognitiva
  -> decisão, tentativas e resultado são persistidos
  -> frontend recebe somente estados seguros
```

## estado real de partida

### concluído

- contratos `RouterRequest`, `SemanticClassification`, `RouterDecision` e `ExecutionPlan`;
- decisão separada da execução e persistida antes dela;
- evento SSE `router.decision`;
- seleção entre provider direto e cognition;
- registry de capacidades reais e futuras;
- registry de providers com estados operacionais;
- adapters de OpenAI, Gemini e NVIDIA NIM;
- gateway com timeout, retry, tentativas e fallback explícito;
- credenciais criptografadas por workspace;
- interface para salvar, testar e remover credenciais;
- execução real dos três providers validada pela interface;
- persistência de provider, modelo, latência, fallback e model run;
- memória e conhecimento autorizados como contexto;
- CI de web, control-api e cognition na `orbeone-lab-01`;
- aplicação publicada em `ai.orbeone.com.br`;
- cadastro público fechado no código oficial pelo PR #25.

### ainda provisório

- classificação baseada principalmente em padrões e tamanho;
- regras fixas por tipo de tarefa;
- fallback estático;
- ausência de perfis operacionais completos por modelo;
- ausência de health score e circuit breaker;
- ausência de orçamento e políticas granulares por workspace;
- ausência de dataset oficial, replay e shadow mode;
- ausência de avaliação comparativa de qualidade;
- contrato de ferramentas ainda não implementado;
- modelo do cognition ainda não é selecionado por contrato explícito.

### código, CI e ambiente são estados diferentes

Uma mudança fundida no `main` não está automaticamente ativa na `orbeone-center-01`. Toda fase deve registrar separadamente:

- implementado no código;
- validado na CI;
- publicado no ambiente;
- validado no ambiente.

## princípios não negociáveis

1. a decisão pertence à orbeAI. ferramentas externas são componentes opcionais;
2. decisão e execução permanecem separadas;
3. capacidade futura fica com `implemented=false` e não pode ser roteada;
4. mock nunca conta como vitória real;
5. custo, latência e qualidade precisam vir de dados validados;
6. política, segurança e isolamento vencem qualquer pontuação;
7. fallback nunca pode esconder falhas;
8. mensagens simples evitam loops agênticos desnecessários;
9. lógica nova nasce reversível, com feature flag e rollout gradual;
10. código nunca é desenvolvido diretamente na VM de staging ou produção.

## responsabilidades

### frontend

- captura mensagem e preferências;
- consome SSE;
- mostra estados seguros;
- mantém detalhes técnicos no Laboratório e Administração;
- nunca acessa provider ou cognition diretamente.

### control-api

- autenticação e isolamento de tenant;
- contexto autorizado;
- políticas e orçamento;
- auditoria e persistência oficial;
- execução do orbeRouter;
- chamada ao gateway ou cognition.

### kernel do router

- normaliza a solicitação;
- classifica intenção, domínio, complexidade, risco e sensibilidade;
- aplica hard gates e políticas;
- determina capacidades necessárias;
- gera e pontua candidatos;
- escolhe estratégia, provider e modelo;
- cria decisão e plano com reason codes estáveis.

O kernel decide. Ele não faz chamada externa.

### provider registry

Mantém somente providers e modelos realmente executáveis. Cada perfil deverá incluir estado, capacidades, streaming, ferramentas, limites, saúde, custo configurado e versão.

### provider gateway

Executa o plano direto, aplica timeout e retry, percorre fallback, registra cada tentativa e devolve um resultado padronizado. Ele não redefine política.

### orbe cognition core

Executa loops cognitivos, múltiplas etapas, skills, subagentes e ferramentas autorizadas. Ele não controla usuários, tenants, billing, políticas ou persistência oficial.

## contratos oficiais

### RouterRequest

Deve carregar conteúdo, preferências, ids autorizados, contexto disponível, capacidades permitidas, limites, orçamento e flags de rollout.

### SemanticClassification

Deve registrar intenção, domínio, complexidade, risco, sensibilidade, requisitos de formato, necessidade de ferramentas e confiança. Também deve guardar classificador e versão.

### RouterDecision

Deve registrar versão do router, estratégia, route kind, provider e modelo, reason codes, fallback, políticas aplicadas, capacidades, classificação e ids de experimento.

### ExecutionPlan

Deve ser suficiente para executar sem recalcular a decisão: executor, provider chain, modelos, capacidades, timeout, retry, limites, ferramentas autorizadas, política de fallback e versão de adapters.

### ProviderAttempt

Cada tentativa deve registrar provider, modelo, número, status, latência, erro sanitizado, state reason e correlation id.

## pipeline de decisão

A ordem das camadas é obrigatória.

### 1. normalização

Validar entrada, resolver contexto autorizado, preferências, ids e versão do experimento.

### 2. hard gates

Eliminar provider desabilitado, credencial ausente, capacidade não implementada, ferramenta proibida, violação de privacidade, estouro de orçamento e circuito aberto.

### 3. classificação

Combinar regras determinísticas, sinais estruturais e classificador semântico opcional. O classificador semântico começa em shadow mode.

### 4. requisitos de capacidade

Converter a solicitação em requisitos como texto, código, documento, pesquisa, contexto longo, ferramenta, visão, áudio, JSON, baixa latência, baixo custo ou execução cognitiva.

### 5. candidatos

Manter apenas modelos configurados que atendam requisitos, política, orçamento e saúde.

### 6. pontuação

```text
score =
  aderência à tarefa
  + qualidade prevista
  + confiabilidade recente
  + adequação de formato e contexto
  + preferência do workspace
  - custo previsto
  - latência prevista
  - risco operacional
  - penalidade de fallback
```

Pesos mudam por modo, mas são versionados e auditáveis.

### 7. estratégia

Escolher entre determinístico, provider direto, cognition, indisponível, bloqueado ou aprovação necessária.

### 8. persistência

Persistir a decisão antes da primeira chamada externa e emitir somente o payload seguro no SSE.

### 9. execução

Gateway ou cognition executam o plano. Mudanças viram retry, fallback, aprovação ou interrupção registrada.

### 10. resultado

Persistir resultado, provider efetivo, modelo, tentativas, latência, tokens e custo quando disponíveis.

## modos de roteamento

- automático: equilíbrio geral;
- mais qualidade: aumenta peso de aderência e confiabilidade;
- mais rápido: aumenta peso de latência e disponibilidade;
- menor custo: minimiza custo sem aceitar modelo incapaz;
- privado: restringe providers e tratamento de dados;
- cognitivo: favorece cognition quando ele agrega coordenação concreta;
- manual: respeita escolha permitida e falha de forma explícita quando indisponível.

## provider direto versus cognition

Usar provider direto quando a tarefa cabe em uma resposta, não exige ferramenta, aprovação ou coordenação de etapas.

Usar cognition quando há inspeção, ação, validação, correção, ferramentas autorizadas, subagentes ou aprovações intermediárias.

Texto longo sozinho não obriga cognition.

## perfis operacionais de modelos

Cada modelo terá perfil versionado com:

- provider, modelo e data de validação;
- capacidades e formatos;
- contexto validado;
- streaming e ferramentas;
- latência p50 e p95;
- taxa de sucesso e timeout;
- custo configurado;
- qualidade por classe de tarefa;
- limitações conhecidas;
- política de dados;
- estado experimental, aprovado ou descontinuado.

Toda informação precisa indicar se veio de documentação oficial, benchmark interno ou telemetria.

## saúde e circuit breaker

Estados planejados: `healthy`, `degraded`, `unavailable`, `circuit_open`, `disabled` e `unknown`.

Sinais mínimos: sucesso por janela, timeout, p95, autenticação, rate limit, falhas consecutivas e último teste bem-sucedido.

O circuito abre por critérios versionados, entra em half-open com probe controlado e registra toda transição.

## ferramentas externas

Semantic Router, RouteLLM, LiteLLM, LangGraph, Temporal e outras alternativas serão avaliadas como peças, não como nova arquitetura automática.

A análise deve responder:

- problema concreto resolvido;
- responsabilidade assumida;
- integração com contratos atuais;
- custo, licença, lock-in e operação;
- segurança, multi-tenant, telemetria e segredos;
- plano de remoção;
- ganho medido no dataset da orbeAI.

Resultado possível: rejeitada, referência, adapter opcional, componente aprovado ou dependência estrutural com ADR própria.

## dataset e avaliação

O dataset deve conter solicitações sanitizadas, capacidades exigidas, estratégia esperada, rotas aceitáveis, rotas proibidas e motivo.

Categorias mínimas:

- conversa simples;
- escrita;
- código;
- documento;
- pesquisa;
- estratégia;
- risco;
- memória e conhecimento;
- ferramenta;
- múltiplas etapas;
- seleção manual;
- provider indisponível;
- limite de custo;
- conteúdo sensível.

Métricas mínimas:

- acerto de estratégia;
- acerto de provider e modelo;
- violações de hard gate;
- fallback e fallback evitável;
- custo e latência previstos versus reais;
- sucesso terminal;
- qualidade humana ou automática;
- confiança e calibração.

## shadow mode

```text
router ativo executa
router candidato recebe os mesmos sinais autorizados
candidato decide sem executar
sistema persiste comparação
avaliação mede divergência, qualidade, custo e risco
```

Shadow mode não pode enviar dados extras a terceiros nem duplicar chamadas pagas sem experimento aprovado.

## políticas por workspace

O router deverá respeitar providers e modelos permitidos, orçamento por solicitação e período, ferramentas, classes de dados, retenção, regiões, fallback, mock, modos disponíveis e necessidade de aprovação.

A política sempre vence o score.

## segurança

- credenciais permanecem criptografadas e nunca entram em logs ou SSE;
- contexto é autorizado antes de chegar ao router;
- telemetria não guarda segredo;
- datasets usam conteúdo sintético ou sanitizado;
- ferramentas começam desabilitadas e exigem capability, política e auditoria;
- ações destrutivas exigem aprovação.

## feature flags previstas

- `orbe_router_v1`;
- `router_model_profiles`;
- `router_scoring_v2`;
- `router_semantic_shadow`;
- `router_semantic_active`;
- `router_health_routing`;
- `router_budget_policies`;
- `router_cognition_contract_v2`;
- `router_model_council_shadow`.

## fluxo oficial de desenvolvimento

1. definir problema, contratos, métricas, flag e rollback;
2. criar branch focada a partir do `main`;
3. desenvolver somente no repositório;
4. adicionar testes unitários e de integração;
5. abrir PR com arquitetura, segurança, limites e rollback;
6. exigir CI verde para web, control-api e cognition;
7. fundir no `main`;
8. criar release imutável do commit exato;
9. reconstruir somente serviços afetados;
10. validar saúde, login, router, streaming e persistência;
11. ativar ou restaurar a release anterior.

Nunca copiar arquivos avulsos sobre a release ativa.

## serviços normalmente afetados

| mudança | serviços |
| --- | --- |
| classificação, scoring, políticas, registry ou gateway | control-api |
| Hermes, skills, subagentes e ferramentas | cognition |
| interface e explicabilidade visual | web |
| contrato frontend e API | web e control-api |
| contrato API e cognition | control-api e cognition |
| migration | migration e consumidores |

## rollout padrão

1. testes unitários;
2. dataset offline;
3. replay;
4. shadow mode;
5. workspace interno;
6. pequena porcentagem;
7. ampliação gradual;
8. remoção do caminho antigo somente após estabilidade.

## definição de concluído

Uma fase só termina quando houver código no `main`, CI verde, documentação atualizada, rollback, evidência sanitizada e critérios medidos. Quando a fase exige execução real, também precisa de publicação e validação no ambiente.

## decisões que exigem ADR

- dependência estrutural nova;
- LLM no caminho crítico de classificação;
- workflow durável;
- model council ativo;
- execução autônoma de ferramentas;
- alteração da persistência oficial;
- mudança da fronteira entre control-api e cognition;
- alteração da regra de fallback após o primeiro delta.

## anti-padrões proibidos

- desenvolver na center;
- usar staging como bancada de código;
- regra sem teste;
- número inventado de custo ou qualidade;
- fallback silencioso;
- mock apresentado como real;
- ferramenta com acesso excessivo;
- dependência sem plano de remoção;
- decisão não persistida;
- marcar fase concluída porque a tela existe.

## regra final

O orbeRouter será construído por camadas verificáveis: contratos, telemetria, perfis, políticas, scoring, shadow mode, avaliação e rollout. A inteligência pode crescer sem diminuir a capacidade da orbeOne de explicar, testar, desligar e substituir cada peça.
