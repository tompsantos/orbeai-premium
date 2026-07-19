# ADR 0003 - evolução do orbeRouter por evidência

## status

aceito

## contexto

O orbeRouter v1 já controla o chat vivo, providers diretos e a entrada no cognition. A próxima etapa inclui perfis de modelos, políticas, scoring, classificação semântica, saúde de providers e avaliação de ferramentas externas.

Sem uma regra de evolução, o kernel poderia virar uma coleção de heurísticas não testáveis ou ser substituído cedo demais por uma dependência externa sem evidência própria da orbeAI.

## decisão

O orbeRouter continuará pertencendo ao `control-api` e evoluirá por camadas versionadas e reversíveis.

Toda mudança relevante deverá seguir esta sequência:

1. contrato e responsabilidade explícitos;
2. testes unitários e de integração;
3. dataset ou casos de replay quando aplicável;
4. execução offline;
5. shadow mode para decisões candidatas;
6. ativação por feature flag;
7. rollout no workspace interno;
8. ampliação gradual com métricas;
9. rollback comprovado.

Ferramentas como Semantic Router, RouteLLM, LiteLLM, LangGraph e Temporal permanecem referências ou componentes candidatos. Elas só assumem responsabilidade concreta depois de análise, protótipo isolado, resultado medido e ADR própria quando virarem dependência estrutural.

O desenvolvimento ocorre no GitHub por branch e pull request. A CI oficial na `orbeone-lab-01` valida web, control-api e cognition. A `orbeone-center-01` recebe somente releases imutáveis de commits fundidos no `main`.

Os estados abaixo permanecem separados:

- implementado no código;
- validado na CI;
- publicado no ambiente;
- validado no ambiente.

## regras obrigatórias

- política e segurança vencem qualquer score;
- decisão e execução continuam separadas;
- mock não conta como evidência real;
- custo, latência e qualidade usam dados validados;
- nova semântica começa em shadow mode;
- nenhuma ferramenta externa vira dona do produto por conveniência;
- nenhuma correção de código é feita diretamente na VM;
- cada fase atualiza manual, roadmap e evidência.

## consequências

- a evolução fica mais lenta do que uma troca imediata de framework, mas muito mais segura;
- decisões podem ser comparadas e reproduzidas;
- dependências podem ser removidas;
- regressões podem ser detectadas antes do tráfego real;
- rollout e rollback deixam de depender de impressão subjetiva;
- um novo chat ou colaborador pode retomar o projeto pelas fontes documentais.

## fontes operacionais

- `docs/orberouter-manual.md`;
- `docs/orberouter-roadmap.md`;
- `docs/adr/0002-orberouter-v1.md`;
- `docs/roadmap.md`.
