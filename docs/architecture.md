# arquitetura da orbeAI premium

## princípio central

A orbeAI é o produto. O Hermes é a linhagem do runtime cognitivo.

O frontend, a autenticação, os workspaces, os projetos, as políticas, a auditoria, o billing e a persistência oficial continuam pertencendo à orbeAI. O `AIAgent`, o loop agêntico, as ferramentas, a compressão de contexto, as skills, os subagentes e os mecanismos de reflexão passam a compor o `orbe cognition core`.

## serviços

### `apps/web`

Interface atual da orbeAI. Nunca acessa o runtime cognitivo diretamente. Consome o stream público do `control-api` e apresenta somente estados seguros.

### `services/control-api`

API pública da orbeAI. Responsável por autenticação, isolamento de tenant, workspaces, projetos, chats, mensagens, memória governada, planos, auditoria, custos e autorização de ferramentas.

O `orbeRouter` vive nesta fronteira porque depende de identidade, contexto autorizado, políticas, orçamento, providers configurados e persistência oficial.

### `services/cognition`

Serviço interno que importa o `AIAgent` diretamente e abriga os futuros plugins `orbe-memory`, `orbe-emotion` e `orbe-skills`.

O cognition não controla o produto. Ele recebe um turno quando o `orbeRouter` escolhe uma execução cognitiva ou agêntica.

## fluxo executivo do orbeRouter v1

```text
frontend
  -> control-api persiste mensagem e resolve contexto autorizado
  -> orbeRouter classifica e cria RouterDecision + ExecutionPlan
  -> decisão é persistida e emitida no SSE
  -> estratégia direta: provider gateway -> adapter real ou mock declarado
  -> estratégia cognitiva: orbe cognition core -> Hermes AIAgent
  -> fallback cognitivo somente antes do primeiro delta
  -> resposta, tentativas, latência, model run e auditoria são persistidos
  -> frontend recebe o estado terminal correspondente
```

### camadas

1. determinística e compatibilidade;
2. classificação semântica inicial;
3. contexto e políticas;
4. estratégia de execução;
5. provider e modelo;
6. gateway, retry e fallback;
7. avaliação e explicabilidade.

Semantic Router, RouteLLM, LiteLLM, LangGraph e Temporal permanecem referências ou adapters opcionais. Nenhuma dessas ferramentas é dependência estrutural do kernel v1 sem responsabilidade concreta e decisão arquitetural própria.

## contratos principais

- `RouterRequest`: solicitação e sinais autorizados usados na decisão;
- `SemanticClassification`: intenção, domínio, complexidade, risco e sensibilidade;
- `RouterDecision`: decisão explicável e persistível;
- `ExecutionPlan`: executor, capacidades, provider chain, timeout e retry;
- `ProviderRegistry`: catálogo operacional de adapters realmente existentes;
- `ProviderGateway`: execução direta, tentativas e fallback explícito.

Capacidades futuras podem existir no registry como `implemented=false`. Isso declara direção arquitetural sem apresentar missão, monitoramento, conselho ou ferramenta como funcional.

## persistência

O PostgreSQL em `orbeone-db-01` será a fonte oficial de usuários, workspaces, chats, mensagens, memórias, artifacts, auditoria, custos, decisões e políticas.

A decisão do router é persistida antes da execução em auditoria e metadados da mensagem do usuário. O estado terminal mantém a mesma decisão, as tentativas de provider, o model run e a mensagem do assistente.

O Hermes poderá manter estado operacional local no volume do container, mas esse estado não será a fonte oficial do produto.

## memória

A memória embutida do Hermes começa desabilitada no serviço multiusuário para impedir vazamento entre tenants. O primeiro estágio injeta no runtime apenas o contexto autorizado pelo `control-api`.

O estágio seguinte implementará `orbe-memory`, um `MemoryProvider` nativo com escopos por usuário, workspace, projeto, produto, conversa e skill.

## segurança

- `services/cognition` só aceita chamadas com chave interna;
- a porta fica presa a `127.0.0.1` no host;
- o frontend nunca recebe credenciais;
- terminal e navegador ficam desabilitados por padrão;
- ferramentas futuras serão liberadas por política;
- providers sem adapter não podem cair silenciosamente em mock;
- mock é identificado e não vale como prova de execução real;
- aplicação e banco ficam em VMs separadas;
- PostgreSQL será acessado somente pela rede privada da VPC.

## implantação Locaweb

```text
orbeone-center-01
/opt/orbeone/apps/orbeai-premium
├── web
├── control-api
├── cognition
└── compose.yaml

orbeone-db-01
PostgreSQL
└── database: orbeai
    role: orbeai_user
```
