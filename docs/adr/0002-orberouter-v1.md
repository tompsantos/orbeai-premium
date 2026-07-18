# ADR 0002 — orbeRouter v1 como córtex executivo

## status

aceito

## contexto

O produto já possuía um router provisório baseado em regex e mapas fixos, enquanto o chat vivo tentava o `orbe cognition core` em toda mensagem. A decisão registrada não controlava de fato a estratégia de execução, providers sem adapter podiam terminar silenciosamente no mock e latência, custo e qualidade eram apresentados por valores estáticos.

## decisão

O `orbeRouter` passa a viver no `control-api` e a produzir contratos persistíveis separados da execução:

- `RouterRequest`;
- `SemanticClassification`;
- `RouterDecision`;
- `ExecutionPlan`;
- registry de capacidades;
- registry de providers;
- gateway de execução direta.

O router escolhe entre execução direta por provider e execução cognitiva. O Hermes permanece dentro de `services/cognition` e só recebe o turno quando o plano escolher `cognition`.

A decisão é persistida antes da execução e correlacionada por `request_id`, `workspace_id`, `chat_id` e mensagem. O estado terminal registra provider, modelo, tentativas, fallback, latência, model run e resposta.

## compatibilidade

- a feature flag `orbe_router_v1` permite identificar a ponte de migração;
- o modo mock permanece disponível para testes e prévia;
- mock deve ser declarado explicitamente e não vale como prova do marco real;
- memória e conhecimento antecipados continuam como contexto autorizado;
- fallback do cognition para provider direto só pode ocorrer antes do primeiro delta.

## providers

O registry v1 contém somente adapters diretos existentes:

- OpenAI;
- Gemini;
- mock.

Providers futuros podem aparecer em documentação ou interfaces, mas não entram no catálogo operacional até existir adapter, configuração e teste. Provider desconhecido gera erro explícito.

Preço e latência estimados só podem ser considerados operacionais quando vierem de configuração validada ou telemetria real. O router v1 não usa números cenográficos para decidir.

## capacidades futuras

Missões duráveis, monitoramento, conselho de modelos e ferramentas governadas podem ser declarados como contratos com `implemented=false`. Não devem ser roteados como capacidade disponível.

## consequências

- mensagens simples podem evitar o custo de um loop agêntico;
- solicitações complexas podem usar o cognition sem transformar o Hermes no controlador geral;
- decisão e execução ficam testáveis separadamente;
- fallback e mock deixam rastros verificáveis;
- adapters sem suporte não são mascarados;
- Semantic Router, RouteLLM, LiteLLM, LangGraph e Temporal permanecem opcionais e exigem ADR própria quando assumirem responsabilidade concreta.
