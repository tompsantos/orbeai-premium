# arquitetura da orbeAI premium

## princípio central

A orbeAI é o produto. O Hermes é a linhagem do runtime cognitivo.

O frontend, a autenticação, os workspaces, os projetos, as políticas, a auditoria, o billing e a persistência oficial continuam pertencendo à orbeAI. O `AIAgent`, o loop agêntico, as ferramentas, a compressão de contexto, as skills, os subagentes e os mecanismos de reflexão passam a compor o `orbe cognition core`.

## serviços

### `apps/web`

Interface atual da orbeAI. Nunca acessa o runtime cognitivo diretamente.

### `services/control-api`

API pública da orbeAI. Responsável por autenticação, isolamento de tenant, workspaces, projetos, chats, mensagens, memória governada, planos, auditoria, custos e autorização de ferramentas.

### `services/cognition`

Serviço interno que importa o `AIAgent` diretamente e abriga os futuros plugins `orbe-memory`, `orbe-emotion` e `orbe-skills`.

## persistência

O PostgreSQL em `orbeone-db-01` será a fonte oficial de usuários, workspaces, chats, mensagens, memórias, artifacts, auditoria, custos, decisões e políticas.

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
