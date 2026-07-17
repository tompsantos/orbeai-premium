# orbeAI premium

A distribuição cognitiva premium da orbeOne.

Este repositório une o produto funcional de `tompsantos/orbeai` ao runtime agêntico do `NousResearch/hermes-agent`, preservando a experiência, autenticação, governança e arquitetura multiusuário da orbeAI enquanto o Hermes fornece o núcleo de execução, ferramentas, contexto, sessões, skills e evolução procedural.

## arquitetura

```text
internet
   ↓
orbeAI web
   ↓
orbeAI control API
   ↓ rede interna
orbe cognition core
   ↓
modelos · memória · skills · ferramentas · subagentes
```

## infraestrutura-alvo

- aplicação: `orbeone-center-01`
- banco PostgreSQL: `orbeone-db-01`
- deploy: containers Docker isolados
- persistência oficial: PostgreSQL da orbeOne
- runtime cognitivo: serviço interno, sem exposição pública direta

## estrutura planejada

```text
apps/web                  interface premium da orbeAI
services/control-api      auth, workspaces, políticas, auditoria e persistência
services/cognition        runtime cognitivo derivado do Hermes
packages/contracts        contratos compartilhados
infra                     compose, nginx e implantação
docs                      arquitetura e decisões
```

## estado atual

A fundação inicial entrega:

- monorepo e contratos arquiteturais;
- primeiro serviço `orbe-cognition`;
- import direto e fixado do `AIAgent`;
- isolamento por `workspace_id`, `user_id` e `chat_id`;
- identidade nativa da orbeAI;
- chave interna entre serviços;
- restrição inicial de ferramentas;
- healthcheck, capabilities e testes;
- preparação para a infraestrutura Locaweb.

A incorporação do frontend e do backend atuais será feita preservando o produto, sem reescrever tudo do zero.

## upstreams

- produto-base: `tompsantos/orbeai`
- runtime-base: `NousResearch/hermes-agent`
- commit inicial fixado do Hermes: `36bf3c2673e39a7b237b04c5a637ff29e1278e66`

O Hermes Agent é licenciado sob MIT. Os avisos legais e de copyright serão preservados nas distribuições derivadas.

## produto transplantado

A interface e o backend funcional da orbeAI original agora vivem em:

- `apps/web`
- `services/control-api`

O endpoint de chat do control API opera em modo cognition-first e chama
`services/cognition`, mantendo fallback legado temporário para uma migração
segura e observável.
