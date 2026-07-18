# orbeAI premium

A distribuição cognitiva premium da orbeOne.

Este repositório une o produto funcional de `tompsantos/orbeai` ao runtime agêntico do `NousResearch/hermes-agent`, preservando experiência, autenticação, governança e arquitetura multiusuário da orbeAI enquanto o Hermes fornece o núcleo de execução, ferramentas, contexto, sessões, skills e evolução procedural.

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
   ↓ rede interna
orbe cognition core
   ↓
modelos · memória · skills · ferramentas · subagentes
```

## infraestrutura-alvo

- aplicação: `orbeone-center-01`;
- banco PostgreSQL: `orbeone-db-01`;
- deploy: containers Docker isolados;
- persistência oficial: PostgreSQL da orbeOne;
- runtime cognitivo: serviço interno, sem exposição pública direta.

## estrutura do repositório

```text
apps/web                  interface premium da orbeAI
services/control-api      auth, espaços, políticas, auditoria e persistência
services/cognition        runtime cognitivo derivado do Hermes
packages/contracts        contratos compartilhados
infra                     compose, nginx e implantação
docs                      arquitetura e decisões
```

## estado atual

### fundação técnica

A fundação atual entrega:

- monorepo e contratos arquiteturais;
- serviço `orbe-cognition` integrado ao projeto;
- import direto e fixado do `AIAgent`;
- isolamento por `workspace_id`, `user_id` e `chat_id`;
- identidade nativa da orbeAI;
- chave interna entre serviços;
- restrição inicial de ferramentas;
- healthcheck, capabilities e testes;
- control API operando em modo cognition-first;
- fallback legado temporário para migração segura e observável;
- preparação para a infraestrutura Locaweb.

### fundação da experiência

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

Algumas rotas ainda conservam nomes internos herdados, como `research`, `artifacts`, `agents` e `orbeone`. Os nomes exibidos ao usuário já refletem a arquitetura nova. A renomeação técnica poderá acontecer depois, com migração controlada para não quebrar links e o route tree.

## limites conscientes da prévia

A interface já representa a direção oficial do produto, mas ainda mistura fluxos reais com demonstrações de frontend.

- alguns botões usam mocks, estado local e mensagens de confirmação;
- nem toda criação, alteração ou preferência já possui persistência no banco;
- Equipes e Espaços apresentam o modelo de uso, mas ainda precisam de integração funcional completa;
- a voz é apenas a casca visual, sem captura de microfone ou transporte de áudio;
- o seletor de modelo foi removido da experiência comum e o roteamento permanece automático;
- detalhes técnicos continuam acessíveis no Laboratório;
- o modo mock permite navegar pela prévia sem autenticação real quando `VITE_MOCK_MODE` não está definido como `false`.

Nenhuma ação simulada deve ser tratada como persistência concluída até que o respectivo serviço esteja conectado e validado.

## prévia no GitHub Codespaces

A prévia usa a porta `8080`:

```bash
cd /workspaces/orbeai-premium
bash .devcontainer/start-preview.sh
```

O script inicia o frontend em modo de prévia e valida uma rota protegida. Depois de trocar de branch, encerre processos antigos do Vite antes de reiniciar para evitar código obsoleto na porta.

Se a URL externa devolver `401`, a porta do Codespaces provavelmente está privada. Para uma inspeção temporária:

```bash
gh codespace ports visibility 8080:public -c "$CODESPACE_NAME"
```

Depois da inspeção, a porta pode voltar ao modo privado:

```bash
gh codespace ports visibility 8080:private -c "$CODESPACE_NAME"
```

## validação

As mudanças da fundação visual passam pelo workflow de CI com três blocos:

- `web`: instalação, typecheck e build;
- `control-api`: migração de banco de teste, lint e testes;
- `cognition`: lint e testes.

A primeira volta da interface foi encerrada com os três blocos aprovados.

## próxima fase

A próxima etapa deixa de ser apenas uma reforma visual e passa a conectar o sistema por dentro:

1. mapear cada ação simulada e classificar como real, parcial ou apenas demonstrativa;
2. conectar Chat, Memória, Conhecimento e Biblioteca em fluxos contínuos;
3. implementar persistência real de Equipes, Espaços, preferências e permissões;
4. revisar profundamente Projetos, Administração, Equipes e Espaços;
5. integrar autenticação real sem prejudicar o modo seguro de prévia;
6. concluir transporte de voz quando a arquitetura de áudio estiver definida;
7. revisar responsividade, acessibilidade, estados vazios, carregamento e erros;
8. planejar a migração das rotas internas herdadas;
9. preparar uma matriz de recursos por tela, serviço, endpoint e tabela de banco;
10. validar a jornada completa de um usuário pessoal e de um usuário profissional.

## upstreams

- produto-base: `tompsantos/orbeai`;
- runtime-base: `NousResearch/hermes-agent`;
- commit inicial fixado do Hermes: `36bf3c2673e39a7b237b04c5a637ff29e1278e66`.

O Hermes Agent é licenciado sob MIT. Os avisos legais e de copyright serão preservados nas distribuições derivadas.

## produto transplantado

A interface e o backend funcional da orbeAI original vivem em:

- `apps/web`;
- `services/control-api`.

O endpoint de chat do control API opera em modo cognition-first e chama `services/cognition`, mantendo fallback legado temporário para uma migração segura e observável.
