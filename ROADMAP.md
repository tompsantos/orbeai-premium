# roadmap vivo · orbeAI premium

> atualizado em 17 de julho de 2026

> fonte operacional do projeto. atualizar em todo PR que conclua, adie ou altere uma etapa.

## leitura obrigatória

- visão e constituição: `docs/PROJETO-ORBEAI-PREMIUM.md`
- snapshot executivo: `docs/PROJETO-ORBEAI-PREMIUM.pdf`
- arquitetura e decisões existentes: `docs/`

## legenda

- `[x]` concluído e incorporado à `main`
- `[~]` em andamento
- `[ ]` planejado
- `[!]` bloqueio ou decisão pendente
- `[lab]` experimento sem compromisso de adoção

## checkpoint atual

- **era:** 1 - identidade e maquete
- **estado:** pronta para iniciar
- **último marco:** projeto-mãe e roadmap institucionalizados
- **próxima entrega:** reconstrução visual do frontend mantendo o design atual refinado
- **ambiente de visualização:** Codespaces em mock mode
- **deploy real:** ainda não realizado na `orbeone-center-01`
- **memória Hermes:** permanece desligada até `orbe-memory` multi-tenant

## concluído

- [x] fundação do monorepo e contratos

- [x] serviço `orbe-cognition` baseado no Hermes Agent

- [x] Hermes fixado por commit e avisos de licença preservados

- [x] transplante do frontend e control-api da orbeAI original

- [x] PostgreSQL e migrations validados em CI

- [x] chat cognition-first com fallback legado controlado

- [x] streaming SSE ponta a ponta

- [x] interrupção real e approvals isolados por usuário/workspace

- [x] persistência e auditoria do chat ao vivo

- [x] preview seguro em Codespaces com dados mock

- [x] autenticação local do preview mock

- [x] documento `Projeto orbeAI Premium` versão 1.0

## Era 1 - identidade e maquete

- [ ] reformular arquitetura de informação

- [ ] novo menu orientado à experiência

- [ ] novo início e cards coerentes

- [ ] chat tratado como microfone central

- [ ] maquetes funcionais de espaços, missões, entregas, memória e acompanhar

- [ ] preservar rotas e contratos existentes por adapters e feature flags


### critérios de conclusão da era 1

- [ ] nova navegação aprovada visualmente no Codespaces
- [ ] home sem cards técnicos misturados
- [ ] chat priorizado como microfone central
- [ ] maquetes navegáveis para espaços, missões, entregas, memória e acompanhar
- [ ] compatibilidade com rotas atuais preservada
- [ ] typecheck, build e CI verdes

## Era 2 - orbeRouter v1

- [ ] registry de capacidades e caminho sem LLM

- [ ] rotas determinísticas e semânticas

- [ ] política, orçamento e privacidade

- [ ] gateway de modelos em laboratório

- [ ] fallback, health scoring e telemetria

- [ ] conselho de modelos inicial

- [ ] shadow mode e avaliação comparativa

## Era 3 - orbe-memory

- [ ] modelo temporal e multi-escopo

- [ ] pessoas, entidades, relações, fatos, preferências e procedimentos

- [ ] extração, deduplicação, consolidação e esquecimento

- [ ] retrieval contextual e explicável

- [ ] interface de revisão e privacidade

- [ ] integração controlada com Hermes

- [ ] benchmarks Letta, Mem0 e implementação própria

## Era 4 - conhecimento

- [ ] upload e storage governado

- [ ] parsing, chunking, OCR e metadados

- [ ] retrieval, reranking e citações

- [ ] bibliotecas por espaço e projeto

- [ ] conectores iniciais

## Era 5 - missões

- [ ] estado durável e checkpoints

- [ ] etapas, sinais, pausa e retomada

- [ ] aprovações e autonomia graduada

- [ ] agendamentos e monitoramentos

- [ ] entregas persistidas

## Era 6 - braços

- [ ] orbe-browser isolado

- [ ] orbe-code em workspace efêmero

- [ ] pesquisa e documentos especializados

- [ ] conectores orbeOne e externos

- [ ] MCP revisado e registry de tools

## Era 7 - presença

- [ ] benchmark LiveKit e Pipecat

- [ ] voz natural e interrupção

- [ ] visão, câmera, compartilhamento de tela e reuniões

- [ ] aplicativos móveis e telefonia

## Era 8 - inteligência contínua

- [ ] observabilidade e avaliações em produção

- [ ] router calibrado por resultados

- [ ] aprendizado com correções

- [ ] laboratórios autônomos

- [ ] proatividade com limites

- [ ] melhoria contínua de skills e procedimentos

## radar de decisões técnicas

- **Hermes Agent** · incorporado · runtime cognitivo e agentivo · licença: MIT

- **LiteLLM** · aprovado para laboratório · gateway unificado de modelos · licença: MIT fora de áreas comerciais

- **Semantic Router** · aprovado para laboratório · sensor semântico de rotas · licença: MIT

- **RouteLLM** · referência e experimento · pontuação forte versus econômico · licença: Apache-2.0

- **Letta** · fonte arquitetural e adapter experimental · agentes persistentes e blocos de memória · licença: Apache-2.0

- **Mem0** · aprovado para benchmark · extração e recuperação de memória · licença: Apache-2.0

- **Temporal** · candidato principal para missões · workflows duráveis · licença: MIT

- **LangGraph** · laboratório e referência · grafos de agentes stateful · licença: MIT

- **LlamaIndex** · aprovado para seleção modular · conhecimento e documentos · licença: MIT

- **Browser Use** · aprovado para worker isolado · automação de navegador · licença: MIT no core

- **OpenHands Software Agent SDK** · aprovado para prova de conceito · engenharia e sandbox de código · licença: MIT no SDK/core; enterprise separado

- **LiveKit Agents** · finalista de benchmark · voz, visão, WebRTC e telefonia · licença: Apache-2.0

- **Pipecat** · finalista de benchmark · pipelines de voz e multimodal · licença: BSD-2-Clause

- **Langfuse** · aprovado para laboratório · observabilidade e avaliações · licença: MIT fora de pastas EE

- **MCP** · adotado como protocolo, não como confiança automática · protocolo de ferramentas · licença: SDKs e referências com licenças abertas


## regras de atualização

1. atualizar o checkpoint no mesmo PR da implementação;
2. mover itens apenas após CI verde e merge;
3. registrar decisões rejeitadas para não repetir pesquisa;
4. incluir PR, commit e data nos checkpoints importantes;
5. revalidar licença e commit upstream antes de qualquer transplante;
6. não marcar um recurso como concluído apenas porque existe em mock.

## prompt de continuidade para outro chat

```text
continue o desenvolvimento da orbeAI premium pelo repositório tompsantos/orbeai-premium. leia primeiro docs/PROJETO-ORBEAI-PREMIUM.md e ROADMAP.md na main. confirme o checkpoint atual, inspecione o último PR concluído e prossiga somente da próxima etapa pendente. trabalhe diretamente no GitHub com branch, testes, CI, PR e merge. não repita etapas concluídas e atualize ROADMAP.md ao fechar o bloco.
```
