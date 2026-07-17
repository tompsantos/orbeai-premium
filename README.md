# orbeAI premium

A distribuição cognitiva premium da orbeOne.

Este repositório nasce para unir o produto já funcional da `tompsantos/orbeai` ao runtime agêntico do `NousResearch/hermes-agent`, preservando a experiência, autenticação, governança e arquitetura multiusuário da orbeAI enquanto o Hermes fornece o núcleo de execução, ferramentas, contexto, sessões, skills e evolução procedural.

## visão

```text
orbeAI web
   ↓
orbeAI control API
   ↓
orbe cognition core
   ↓
modelos · memória · skills · ferramentas · subagentes
```

## infraestrutura-alvo

- aplicação: `orbeone-center-01`
- banco PostgreSQL: `orbeone-db-01`
- deploy: containers Docker isolados
- persistência oficial: PostgreSQL da orbeOne
- runtime cognitivo: serviço interno não exposto diretamente à internet

## estado

🚧 fundação inicial em construção.

A primeira entrega cria o monorepo, o serviço `orbe-cognition`, contratos internos, segurança básica e documentação da implantação futura.

## upstreams

- produto-base: `tompsantos/orbeai`
- runtime-base: `NousResearch/hermes-agent`

O Hermes Agent é licenciado sob MIT. Os avisos legais serão preservados nas distribuições derivadas.
