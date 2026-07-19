# orbeAI premium

A distribuição cognitiva premium da orbeOne.

Este repositório une o produto funcional de `tompsantos/orbeai` ao runtime agêntico do `NousResearch/hermes-agent`, preservando experiência, autenticação, governança e arquitetura multiusuário da orbeAI enquanto o Hermes fornece o núcleo de execução cognitiva quando o orbeRouter decide que ele é necessário.

## visão do produto

A orbeAI está sendo construída como um sistema operacional para inteligência artificial, com o chat como superfície principal e a complexidade técnica escondida sempre que ela não ajuda o usuário.

Princípios atuais:

- produto universal, útil para vida pessoal, estudos, viagens, criatividade, pesquisa, organização e trabalho;
- conversa como ponto de entrada principal;
- memória controlável e separada por contexto;
- modelos, provedores, fallback e roteamento escondidos da experiência comum;
- recursos técnicos disponíveis no Laboratório para quem precisa abrir o capô;
- separação clara entre Espaços, Projetos e Equipes;
- linguagem cotidiana antes de jargão técnico;
- voz tratada como experiência de frontend até a integração real de microfone, áudio e transporte.

## arquitetura

```text
internet
   ↓
orbeAI web
   ↓
orbeAI control API
   ↓
orbeRouter
   ├── provider gateway -> OpenAI, Gemini, NVIDIA NIM ou mock declarado
   └── orbe cognition core -> Hermes AIAgent
```

A orbeAI é o produto. O Hermes vive dentro de `services/cognition` e não controla autenticação, tenants, persistência, auditoria, orçamento ou políticas.

## documentação de continuidade

Antes de evoluir o router ou retomar o projeto em outro chat:

1. ler `docs/orberouter-manual.md`;
2. conferir `docs/orberouter-roadmap.md`;
3. ler `docs/adr/0002-orberouter-v1.md` e `docs/adr/0003-orberouter-evolution-by-evidence.md`;
4. comparar a documentação com o `main`, PRs abertos e última CI.

O desenvolvimento acontece no GitHub. A CI valida o commit e a center recebe somente releases imutáveis. Código, CI, publicação e validação no ambiente são estados diferentes.

## infraestrutura-alvo

- aplicação: `orbeone-center-01`;
- banco PostgreSQL: `orbeone-db-01`;
- bancada de CI: `orbeone-lab-01`;
- deploy: containers Docker isolados;
- persistência oficial: PostgreSQL da orbeOne;
- runtime cognitivo: serviço interno, sem exposição pública direta.

## estrutura do repositório

```text
apps/web                  interface premium da orbeAI
services/control-api      auth, espaços, políticas, router, auditoria e persistência
services/cognition        runtime cognitivo derivado do Hermes
packages/contracts        contratos compartilhados
infra                     compose, nginx e implantação
docs                      arquitetura, manual, roadmap e decisões
```

## estado atual

### era 0 - fundação

Concluída:

- monorepo e contratos arquiteturais;
- serviço `orbe-cognition` integrado ao projeto;
- import direto e fixado do `AIAgent`;
- isolamento por `workspace_id`, `user_id` e `chat_id`;
- autenticação, PostgreSQL, auditoria e feature flags;
- chave interna entre serviços;
- CI com jobs `control-api`, `cognition` e `web` na `orbeone-lab-01`;
- preparação para a infraestrutura Locaweb.

### era 1 - identidade e primeira volta

A primeira grande volta da interface foi concluída e integrada ao `main` pelos PRs #5 a #15, exceto Projetos, que foi mantido provisoriamente para uma revisão funcional posterior.

| área visível | rota interna atual | estado da primeira versão |
| --- | --- | --- |
| Dashboard | `/app` | reorganizado como ponto de partida da experiência |
| Chat | `/app/chat` | experiência principal redesenhada, com contexto e voz em frontend |
| Projetos | `/app/projects` | mantido provisoriamente, revisão futura planejada |
| Memória | `/app/memory` | gestão de lembranças em linguagem clara |
| Conhecimento | `/app/research` | pesquisa e materiais consultados pela orbeAI |
| Biblioteca | `/app/artifacts` | itens criados, histórico, edição e exportação |
| Equipes | `/app/agents` | colaboração entre pessoas e assistentes da orbeAI |
| Espaços | `/app/orbeone` | ambientes separados para vida pessoal, estudo e trabalho |
| Laboratório | `/app/models` | comportamento, motores, roteamento e atividade técnica em camadas |
| Administração | `/app/admin` | visão geral, proteção, atividade, consumo e saúde do sistema |
| Configurações | `/app/settings` | conta, experiência, privacidade, conexões e avisos |

Algumas rotas ainda conservam nomes internos herdados. Essa dívida não bloqueia a era 2.

### era 2 - orbeRouter

Primeira vitória real concluída e evolução orientada por evidência em construção:

- kernel com `RouterRequest`, classificação, `RouterDecision` e `ExecutionPlan`;
- registry de capacidades implementadas e futuras;
- provider registry com estados reais de configuração;
- adapters de OpenAI, Gemini e NVIDIA NIM;
- cofre de credenciais por workspace com teste pela interface;
- gateway direto com retry, tentativas e fallback explícito;
- decisão persistida antes da execução;
- separação entre provider direto e cognition;
- evento SSE `router.decision`;
- model run, latência, provider, modelo e tentativas persistidos;
- mock identificado como mock;
- respostas reais validadas no chat com os três providers;
- cadastro público fechado por padrão no código oficial pelo PR #25.

O próximo ciclo não começa escolhendo um framework. Ele começa criando perfis operacionais, telemetria, dataset e baseline. Depois entram políticas, scoring, pesquisa de ferramentas e shadow mode.

## limites conscientes

- alguns botões ainda usam mocks, estado local e mensagens de confirmação;
- Equipes e Espaços apresentam o modelo de uso, mas ainda precisam de integração funcional completa;
- a voz é apenas a casca visual, sem captura de microfone ou transporte de áudio;
- detalhes técnicos continuam acessíveis no Laboratório;
- o modo mock permite navegar pela prévia quando configurado explicitamente.

Nenhuma ação simulada deve ser tratada como persistência concluída. Uma resposta mock também não vale como evidência do orbeRouter.

## prévia no GitHub Codespaces

A prévia usa a porta `8080`:

```bash
cd /workspaces/orbeai-premium
bash .devcontainer/start-preview.sh
```

O script inicia o frontend em modo de prévia e valida uma rota protegida. Depois de trocar de branch, encerrar processos antigos antes de reiniciar para evitar código obsoleto na porta.

## validação

O workflow de CI possui três blocos:

- `web`: instalação, typecheck e build;
- `control-api`: PostgreSQL descartável, migration, lint e testes;
- `cognition`: lint e testes.

Merge só pode ocorrer quando os jobs do head atual estiverem verdes de verdade.

## próximo marco

1. publicar e validar no ambiente o fechamento do cadastro público;
2. registrar evidência sanitizada da primeira vitória real do router;
3. criar perfis operacionais dos modelos;
4. coletar telemetria real;
5. criar dataset e baseline reproduzível;
6. implementar políticas e scoring v2 atrás de feature flag;
7. avaliar ferramentas externas e semântica em shadow mode.

## upstreams

- produto-base: `tompsantos/orbeai`;
- runtime-base: `NousResearch/hermes-agent`;
- commit inicial fixado do Hermes: `36bf3c2673e39a7b237b04c5a637ff29e1278e66`.

O Hermes Agent é licenciado sob MIT. Os avisos legais e de copyright serão preservados nas distribuições derivadas.
