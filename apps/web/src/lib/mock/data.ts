import type {
  Agent, Artifact, AuditLog, Chat, FeatureFlag, Integration, MemoryItem,
  Message, ModelProvider, OrbeProduct, Project, ResearchReport, UsageMetric, User, Workspace,
} from "@/types";

export const mockUser: User = {
  id: "u_1", name: "orbeOne Admin", email: "admin@orbeone.com.br",
  role: "owner", workspaceId: "w_1",
};

export const mockWorkspace: Workspace = {
  id: "w_1", name: "orbeOne HQ", plan: "enterprise", seats: 24,
  createdAt: "2024-11-02T10:00:00Z",
};

export const orbeProducts: OrbeProduct[] = [
  { slug: "orbeAI", name: "orbeAI", tagline: "sistema operacional cognitivo", description: "Sistema operacional cognitivo central da orbeOne: conversa multimodal, memória controlável, agentes, pesquisa profunda, artifacts e roteamento inteligente de modelos.", status: "ativo", category: "core" },
  { slug: "orbeRadar", name: "orbeRadar", tagline: "inteligência comercial", description: "Plataforma de inteligência comercial para prospecção, sinais de mercado, scoring de leads, detecção de oportunidades e estratégia consultiva de vendas.", status: "ativo", category: "intelligence" },
  { slug: "orbeRisk", name: "orbeRisk", tagline: "risco e reputação", description: "Plataforma de análise de risco documental, empresarial e reputacional, com evidências, alertas e trilhas auditáveis.", status: "ativo", category: "governance" },
  { slug: "orbeAuto", name: "orbeAuto", tagline: "oficinas e funilarias", description: "SaaS para oficinas mecânicas e funilarias: orçamentos, veículos, fotos, workflow, documentos de seguradora e gestão operacional.", status: "ativo", category: "automation" },
  { slug: "orbeVault", name: "orbeVault", tagline: "cofre inteligente", description: "Cofre seguro e inteligente para documentos sensíveis, certificados, chaves, certificados digitais, arquivos, assinaturas, memória e acesso controlado.", status: "ativo", category: "governance" },
  { slug: "orbeGov", name: "orbeGov", tagline: "setor público", description: "Inteligência para setor público: termos de referência, contratações, licitações, compliance e fluxos administrativos.", status: "beta", category: "governance" },
  { slug: "orbeCorp", name: "orbeCorp", tagline: "camada corporativa", description: "Camada corporativa de IA e automação para empresas, processos, departamentos e tomada de decisão.", status: "ativo", category: "intelligence" },
  { slug: "orbeZen", name: "orbeZen", tagline: "foco e bem-estar", description: "Assistente de foco, rotina, energia mental e bem-estar.", status: "beta", category: "wellbeing" },
  { slug: "orbeX", name: "orbeX", tagline: "laboratório experimental", description: "Laboratório experimental para produtos avançados de IA da orbeOne.", status: "em breve", category: "experimental" },
  { slug: "orbeScience", name: "orbeScience", tagline: "ciência aplicada", description: "Pesquisa, papers, síntese científica e inteligência de ciência aplicada.", status: "em breve", category: "experimental" },
];

export const mockProjects: Project[] = [
  { id: "p_1", name: "orbeAI Core", description: "Núcleo do sistema operacional cognitivo da orbeOne.", status: "ativo", product: "orbeAI", memoryMode: "compartilhada", filesCount: 42, chatsCount: 18, artifactsCount: 12, agents: ["orbe strategist", "orbe dev", "orbe research"], updatedAt: "2026-06-25T14:20:00Z", brief: "Definir arquitetura, roadmap e narrativa de orbeAI como cockpit cognitivo da orbeOne." },
  { id: "p_2", name: "orbeRadar Launch", description: "Lançamento comercial da inteligência de mercado.", status: "ativo", product: "orbeRadar", memoryMode: "isolada", filesCount: 23, chatsCount: 9, artifactsCount: 7, agents: ["orbe strategist", "orbe sales"], updatedAt: "2026-06-24T19:11:00Z" },
  { id: "p_3", name: "orbeRisk Framework", description: "Modelo de risco operacional e regulatório.", status: "ativo", product: "orbeRisk", memoryMode: "isolada", filesCount: 31, chatsCount: 12, artifactsCount: 5, agents: ["orbe risk", "orbe document"], updatedAt: "2026-06-23T09:00:00Z" },
  { id: "p_4", name: "orbeAuto Workflows", description: "Catálogo inicial de automações conectadas.", status: "pausado", product: "orbeAuto", memoryMode: "compartilhada", filesCount: 14, chatsCount: 4, artifactsCount: 3, agents: ["orbe ops"], updatedAt: "2026-06-18T16:45:00Z" },
  { id: "p_5", name: "orbeVault Knowledge", description: "Migração e curadoria do conhecimento corporativo.", status: "ativo", product: "orbeVault", memoryMode: "somente leitura", filesCount: 188, chatsCount: 22, artifactsCount: 9, agents: ["orbe document", "orbe research"], updatedAt: "2026-06-22T12:00:00Z" },
  { id: "p_6", name: "orbeGov Licitações", description: "Análise automatizada de editais e TRs.", status: "ativo", product: "orbeGov", memoryMode: "isolada", filesCount: 56, chatsCount: 11, artifactsCount: 8, agents: ["orbe gov", "orbe document"], updatedAt: "2026-06-21T10:00:00Z" },
  { id: "p_7", name: "orbeCorp Comercial", description: "Inteligência comercial e propostas.", status: "ativo", product: "orbeCorp", memoryMode: "compartilhada", filesCount: 27, chatsCount: 14, artifactsCount: 6, agents: ["orbe sales", "orbe strategist"], updatedAt: "2026-06-20T15:30:00Z" },
  { id: "p_8", name: "orbeZen Rotina", description: "Protocolo de foco e bem-estar cognitivo.", status: "rascunho", product: "orbeZen", memoryMode: "isolada", filesCount: 7, chatsCount: 3, artifactsCount: 2, agents: ["orbe zen", "orbe mentor"], updatedAt: "2026-06-15T08:00:00Z" },
  { id: "p_9", name: "orbeX Experiments", description: "Sandbox de produtos experimentais.", status: "rascunho", product: "orbeX", memoryMode: "isolada", filesCount: 4, chatsCount: 2, artifactsCount: 1, agents: ["orbe lab"], updatedAt: "2026-06-10T11:00:00Z" },
  { id: "p_10", name: "orbeScience Papers", description: "Síntese de literatura científica aplicada.", status: "ativo", product: "orbeScience", memoryMode: "somente leitura", filesCount: 61, chatsCount: 6, artifactsCount: 4, agents: ["orbe research", "orbe document"], updatedAt: "2026-06-19T14:00:00Z" },
];

export const mockChats: Chat[] = [
  { id: "c_1", title: "Posicionamento de orbeAI", projectId: "p_1", mode: "strategist", model: "auto", updatedAt: "2026-06-25T14:00:00Z", pinned: true },
  { id: "c_2", title: "Arquitetura do model router", projectId: "p_1", mode: "dev", model: "claude", updatedAt: "2026-06-25T11:30:00Z" },
  { id: "c_3", title: "Edital TJSP — análise rápida", projectId: "p_6", mode: "document", model: "gpt", updatedAt: "2026-06-24T19:00:00Z" },
  { id: "c_4", title: "Pesquisa: concorrentes em LATAM", projectId: "p_2", mode: "research", model: "gemini", updatedAt: "2026-06-24T15:10:00Z" },
  { id: "c_5", title: "Plano de foco da semana", projectId: "p_8", mode: "mentor", model: "auto", updatedAt: "2026-06-23T08:20:00Z" },
  { id: "c_6", title: "Refatorar serviço de memória", projectId: "p_1", mode: "dev", model: "qwen", updatedAt: "2026-06-22T22:10:00Z" },
];

export const mockMessages: Record<string, Message[]> = {
  c_1: [
    { id: "m_1", chatId: "c_1", role: "user", content: "Vamos posicionar o orbeAI como cockpit cognitivo da orbeOne. Quero uma narrativa premium, sem hype.", createdAt: "2026-06-25T13:55:00Z" },
    { id: "m_2", chatId: "c_1", role: "assistant", model: "claude", mode: "strategist", createdAt: "2026-06-25T13:55:10Z", content:
`### Narrativa proposta

**orbeAI** é o **sistema operacional cognitivo da orbeOne** — uma única superfície onde inteligência, memória, agentes e automação se encontram.

**Três pilares**
1. **Memória controlável** — o usuário decide o que é lembrado, editado ou apagado.
2. **Roteamento inteligente** — cada tarefa vai para o modelo certo (custo, qualidade, latência).
3. **Ecossistema orbeOne** — orbeAI conecta orbeRadar, orbeRisk, orbeAuto, orbeVault e os demais produtos.

**Promessa central**: *converse, pesquise, crie, automatize e conecte inteligência em um único cockpit premium.*` },
    { id: "m_3", chatId: "c_1", role: "user", content: "Gostei. Transforma isso em um artifact tipo plano de ação para o time de produto.", createdAt: "2026-06-25T13:58:00Z" },
    { id: "m_4", chatId: "c_1", role: "assistant", model: "claude", mode: "strategist", createdAt: "2026-06-25T13:58:08Z", content:
`Criei o artifact **Plano de Posicionamento orbeAI v1**. Próximos passos sugeridos:

- Validar narrativa com fundadores na quinta.
- Conectar com orbeRadar para reforçar provas de inteligência.
- Rodar pesquisa profunda sobre concorrentes globais.

Quer que eu inicie a pesquisa agora no **orbe research**?` },
  ],
  c_2: [
    { id: "m_5", chatId: "c_2", role: "user", content: "Como você modelaria o router para cair em fallback sem perder contexto?", createdAt: "2026-06-25T11:25:00Z" },
    { id: "m_6", chatId: "c_2", role: "assistant", model: "claude", mode: "dev", createdAt: "2026-06-25T11:25:09Z", content:
`O router resolve em três etapas:

1. **Classificação da tarefa** — modo + sinais do prompt (código, documento, multimodal).
2. **Seleção do provedor** — política de roteamento (qualidade, custo, latência).
3. **Fallback resiliente** — se o provedor responder erro/timeout, o próximo da cadeia recebe o mesmo \`MessageContext\` serializado.

\`\`\`ts
const route = router.resolve({ mode, signals });
const response = await runWithFallback(route, context);
\`\`\`` },
  ],
  c_3: [
    { id: "m_7", chatId: "c_3", role: "user", content: "Resumo executivo desse edital e principais riscos.", createdAt: "2026-06-24T18:55:00Z" },
    { id: "m_8", chatId: "c_3", role: "assistant", model: "gpt", mode: "document", createdAt: "2026-06-24T18:55:11Z", content:
`**Resumo executivo**
Edital TJSP nº 042/2026 — contratação de plataforma de inteligência documental, prazo 12 meses, valor estimado R$ 3,8M.

**Riscos detectados**
- Cláusula 7.3 exige certificação ISO 27001 vigente.
- SLA de 99,5% com multa progressiva.
- Habilitação técnica pede 3 atestados de capacidade técnica em órgãos públicos.` },
  ],
};

export const mockArtifacts: Artifact[] = [
  { id: "a_1", title: "Plano de Posicionamento orbeAI v1", kind: "plano de ação", projectId: "p_1", updatedAt: "2026-06-25T14:10:00Z", versions: [{ id: "v_1", createdAt: "2026-06-25T14:10:00Z", note: "Versão inicial" }], content:
`# Plano de Posicionamento — orbeAI

## Visão
orbeAI é o sistema operacional cognitivo da orbeOne.

## Pilares
1. Memória controlável
2. Roteamento inteligente
3. Ecossistema orbeOne

## Próximas ações
- [ ] Validar narrativa com fundadores
- [ ] Pesquisa de concorrentes globais
- [ ] Landing premium publicada
` },
  { id: "a_2", title: "Arquitetura do orbeRouter", kind: "documento", projectId: "p_1", updatedAt: "2026-06-25T11:40:00Z", versions: [{ id: "v_2", createdAt: "2026-06-25T11:40:00Z", note: "Draft técnico" }], content:
`# orbeRouter — Arquitetura

Classificação → Seleção → Fallback. Cada etapa é serializável e auditável.` },
  { id: "a_3", title: "Snippet — fallback chain", kind: "código", projectId: "p_1", updatedAt: "2026-06-25T11:45:00Z", versions: [{ id: "v_3", createdAt: "2026-06-25T11:45:00Z", note: "Exemplo" }], content:
`export async function runWithFallback(route, ctx) {
  for (const p of [route.primary, ...route.fallbacks]) {
    try { return await p.invoke(ctx); }
    catch (e) { continue; }
  }
  throw new Error("Nenhum provedor disponível");
}` },
  { id: "a_4", title: "Checklist de Memória", kind: "checklist", projectId: "p_1", updatedAt: "2026-06-24T10:00:00Z", versions: [{ id: "v_4", createdAt: "2026-06-24T10:00:00Z", note: "v1" }], content:
`- [x] Política de retenção
- [x] Controles do usuário
- [ ] Exportação completa
- [ ] Trilha de auditoria` },
  { id: "a_5", title: "Resumo executivo — Edital TJSP", kind: "relatório", projectId: "p_6", updatedAt: "2026-06-24T19:05:00Z", versions: [{ id: "v_5", createdAt: "2026-06-24T19:05:00Z", note: "v1" }], content:
`Edital TJSP 042/2026 — riscos críticos: ISO 27001, SLA 99,5%, 3 atestados públicos.` },
];

export const mockMemory: MemoryItem[] = [
  { id: "mem_1", scope: "global", label: "Tom de voz da orbeOne", content: "Premium, direto, sem hype, em pt-BR.", source: "manual", confidence: 0.98, lastUsed: "2026-06-25T14:00:00Z", status: "ativa" },
  { id: "mem_2", scope: "global", label: "Naming oficial", content: "Sempre escrever orbeAI e orbeOne nessa grafia.", source: "manual", confidence: 1, lastUsed: "2026-06-25T14:00:00Z", status: "ativa" },
  { id: "mem_3", scope: "projeto", label: "Pilares de orbeAI", content: "Memória controlável, roteamento inteligente, ecossistema.", source: "chat", confidence: 0.92, lastUsed: "2026-06-25T13:55:00Z", status: "ativa", projectId: "p_1" },
  { id: "mem_4", scope: "sensível", label: "Cláusulas-chave TJSP 042/2026", content: "ISO 27001 vigente; SLA 99,5%; 3 atestados públicos.", source: "documento", confidence: 0.88, lastUsed: "2026-06-24T19:00:00Z", status: "ativa", projectId: "p_6" },
  { id: "mem_5", scope: "projeto", label: "Concorrentes LATAM", content: "Lista parcial — completar com pesquisa profunda.", source: "agente", confidence: 0.6, lastUsed: "2026-06-24T15:10:00Z", status: "pendente", projectId: "p_2" },
  { id: "mem_6", scope: "global", label: "Preferência de roteamento", content: "Priorizar qualidade em strategist e research; custo em ops.", source: "manual", confidence: 0.95, lastUsed: "2026-06-22T11:00:00Z", status: "ativa" },
  { id: "mem_7", scope: "projeto", label: "Arquitetura legada", content: "Antigo router monolítico — arquivado.", source: "chat", confidence: 0.4, lastUsed: "2026-05-30T11:00:00Z", status: "arquivada", projectId: "p_1" },
];

export const mockAgents: Agent[] = [
  { slug: "orbe-strategist", name: "orbe strategist", role: "Estratégia, produto e negócios", description: "Constrói narrativas, posicionamento, planos e decisões estratégicas.", status: "ativo", tools: ["pesquisa", "artifacts", "memória"], memoryScope: "global" },
  { slug: "orbe-dev", name: "orbe dev", role: "Código, arquitetura e debug", description: "Apoia decisões técnicas, code review e arquitetura de software.", status: "ativo", tools: ["código", "execução", "documentos"], memoryScope: "projeto" },
  { slug: "orbe-research", name: "orbe research", role: "Pesquisa profunda e síntese", description: "Conduz investigações multifonte com evidências e incertezas.", status: "ativo", tools: ["web", "arquivos", "integrações"], memoryScope: "projeto" },
  { slug: "orbe-document", name: "orbe document", role: "Análise de documentos", description: "Lê, resume, compara e extrai obrigações de documentos longos.", status: "ativo", tools: ["pdf", "ocr", "memória"], memoryScope: "projeto" },
  { slug: "orbe-sales", name: "orbe sales", role: "Inteligência comercial", description: "Qualifica leads, prepara propostas e analisa pipeline.", status: "ativo", tools: ["crm", "memória", "artifacts"], memoryScope: "projeto" },
  { slug: "orbe-ops", name: "orbe ops", role: "Processos e automações", description: "Desenha e executa workflows operacionais.", status: "ativo", tools: ["automação", "integrações"], memoryScope: "projeto" },
  { slug: "orbe-risk", name: "orbe risk", role: "Risco, compliance e verificação", description: "Mapeia riscos regulatórios, operacionais e reputacionais.", status: "beta", tools: ["pesquisa", "documentos"], memoryScope: "projeto" },
  { slug: "orbe-gov", name: "orbe gov", role: "Governo, TR, licitações", description: "Especialista em editais, termos de referência e processos públicos.", status: "beta", tools: ["pdf", "pesquisa", "memória"], memoryScope: "projeto" },
  { slug: "orbe-zen", name: "orbe zen", role: "Rotina, foco e bem-estar", description: "Apoia rotina cognitiva e gestão de energia mental.", status: "em treinamento", tools: ["memória", "lembretes"], memoryScope: "isolada" },
  { slug: "orbe-lab", name: "orbe lab", role: "Produtos experimentais", description: "Sandbox de ideias e protótipos da orbeOne.", status: "em treinamento", tools: ["pesquisa", "código"], memoryScope: "isolada" },
];

export const mockIntegrations: Integration[] = [
  { slug: "google-drive", name: "Google Drive", category: "produtividade", status: "conectado", description: "Sincronize documentos para uso em projetos e memória.", permissions: ["leitura", "escrita"] },
  { slug: "gmail", name: "Gmail", category: "comunicação", status: "disponível", description: "Resumos, triagem e respostas assistidas.", permissions: ["leitura", "envio"] },
  { slug: "google-calendar", name: "Google Calendar", category: "produtividade", status: "conectado", description: "Contexto de agenda em conversas e agentes.", permissions: ["leitura"] },
  { slug: "github", name: "GitHub", category: "dev", status: "conectado", description: "Repos, PRs e issues como contexto técnico.", permissions: ["leitura"] },
  { slug: "notion", name: "Notion", category: "produtividade", status: "disponível", description: "Bases de conhecimento sincronizadas.", permissions: ["leitura"] },
  { slug: "slack", name: "Slack", category: "comunicação", status: "configurar", description: "Notificações e agentes em canais.", permissions: ["leitura", "envio"] },
  { slug: "whatsapp", name: "WhatsApp", category: "comunicação", status: "disponível", description: "Atendimento e agentes via WhatsApp Business.", permissions: ["envio"] },
  { slug: "supabase", name: "Supabase", category: "dados", status: "configurar", description: "Banco, auth e storage para orbeAI.", permissions: ["admin"] },
  { slug: "postgresql", name: "PostgreSQL", category: "dados", status: "disponível", description: "Conexão direta a bases relacionais.", permissions: ["leitura"] },
  { slug: "web-search", name: "Web Search", category: "dados", status: "conectado", description: "Busca web para pesquisa profunda.", permissions: ["leitura"] },
  { slug: "orbeVault", name: "orbeVault", category: "orbeOne", status: "conectado", description: "Memória corporativa segura.", permissions: ["leitura"] },
  { slug: "orbeRadar", name: "orbeRadar", category: "orbeOne", status: "conectado", description: "Sinais de mercado em tempo real.", permissions: ["leitura"] },
  { slug: "orbeRisk", name: "orbeRisk", category: "orbeOne", status: "conectado", description: "Camada de risco e compliance.", permissions: ["leitura"] },
  { slug: "orbeAuto", name: "orbeAuto", category: "orbeOne", status: "disponível", description: "Automações operacionais.", permissions: ["execução"] },
  { slug: "orbeGov", name: "orbeGov", category: "orbeOne", status: "configurar", description: "Editais e processos públicos.", permissions: ["leitura"] },
  { slug: "orbeCorp", name: "orbeCorp", category: "orbeOne", status: "conectado", description: "Operação corporativa.", permissions: ["leitura"] },
  { slug: "orbeZen", name: "orbeZen", category: "orbeOne", status: "disponível", description: "Rotina cognitiva.", permissions: ["leitura"] },
  { slug: "orbeX", name: "orbeX", category: "orbeOne", status: "configurar", description: "Laboratório experimental.", permissions: ["leitura"] },
  { slug: "orbeScience", name: "orbeScience", category: "orbeOne", status: "configurar", description: "Ciência aplicada.", permissions: ["leitura"] },
];

export const mockProviders: ModelProvider[] = [
  { slug: "openai", name: "OpenAI", status: "placeholder", models: ["gpt-5.2", "gpt-5.2-mini", "gpt-4.1"], apiKeyStatus: "não configurado", latencyMs: 820, costPerKTokens: 0.012 },
  { slug: "anthropic", name: "Anthropic", status: "placeholder", models: ["claude-sonnet-4.5", "claude-opus-4.1", "claude-haiku-4"], apiKeyStatus: "não configurado", latencyMs: 760, costPerKTokens: 0.015 },
  { slug: "gemini", name: "Google Gemini", status: "placeholder", models: ["gemini-3-pro", "gemini-3-flash"], apiKeyStatus: "não configurado", latencyMs: 690, costPerKTokens: 0.008 },
  { slug: "qwen", name: "Qwen", status: "placeholder", models: ["qwen3-max", "qwen3-coder"], apiKeyStatus: "não configurado", latencyMs: 940, costPerKTokens: 0.006 },
  { slug: "groq", name: "Groq", status: "placeholder", models: ["llama-3.3-70b", "mixtral-8x22b"], apiKeyStatus: "não configurado", latencyMs: 220, costPerKTokens: 0.004 },
  { slug: "local", name: "Modelos locais", status: "offline", models: ["llama-cpp", "mlx"], apiKeyStatus: "ambiente", latencyMs: 1200 },
  { slug: "mock", name: "orbeMock", status: "online", models: ["orbe-mock-1"], apiKeyStatus: "ambiente", latencyMs: 120, costPerKTokens: 0 },
];

export const mockResearch: ResearchReport[] = [
  { id: "r_1", question: "Quem são os concorrentes globais de cockpits cognitivos enterprise?", status: "em andamento", updatedAt: "2026-06-24T15:30:00Z",
    plan: ["Mapear players globais", "Comparar abordagem de memória", "Comparar roteamento de modelos", "Identificar gaps de mercado"],
    sources: [
      { id: "s_1", title: "Relatório Gartner — AI Cockpits 2026", kind: "web", excerpt: "Mercado de cockpits cognitivos cresce 38% a/a.", confidence: 0.86, url: "https://example.com" },
      { id: "s_2", title: "Notas internas — orbeRadar", kind: "interna", excerpt: "Players LATAM ainda em estágio inicial.", confidence: 0.78 },
      { id: "s_3", title: "Whitepaper concorrente A", kind: "arquivo", excerpt: "Foco em automação, fraco em memória.", confidence: 0.7 },
    ],
    summary: "Mercado em consolidação. orbeAI pode liderar pela combinação memória + roteamento + ecossistema.",
    risks: ["Players globais com mais capital", "Dependência de provedores externos de modelos"],
  },
];

export const mockAudit: AuditLog[] = [
  { id: "al_1", actor: "orbeOne Admin", action: "criou projeto", target: "orbeAI Core", at: "2026-06-25T14:20:00Z", level: "info" },
  { id: "al_2", actor: "system", action: "fallback acionado", target: "openai → anthropic", at: "2026-06-25T13:11:00Z", level: "warn" },
  { id: "al_3", actor: "orbeOne Admin", action: "removeu memória sensível", target: "mem_old_42", at: "2026-06-24T22:00:00Z", level: "info" },
  { id: "al_4", actor: "agent:orbe-research", action: "iniciou pesquisa", target: "concorrentes LATAM", at: "2026-06-24T15:10:00Z", level: "info" },
  { id: "al_5", actor: "system", action: "erro de provedor", target: "qwen timeout", at: "2026-06-23T10:02:00Z", level: "error" },
];

export const mockUsage: UsageMetric[] = [
  { date: "2026-06-19", tokens: 312000, requests: 410, costUsd: 4.12, provider: "anthropic" },
  { date: "2026-06-20", tokens: 280500, requests: 388, costUsd: 3.74, provider: "anthropic" },
  { date: "2026-06-21", tokens: 410200, requests: 502, costUsd: 5.21, provider: "openai" },
  { date: "2026-06-22", tokens: 365800, requests: 470, costUsd: 4.66, provider: "gemini" },
  { date: "2026-06-23", tokens: 522100, requests: 611, costUsd: 6.81, provider: "anthropic" },
  { date: "2026-06-24", tokens: 488300, requests: 580, costUsd: 6.18, provider: "openai" },
  { date: "2026-06-25", tokens: 540900, requests: 642, costUsd: 7.02, provider: "anthropic" },
];

export const mockFlags: FeatureFlag[] = [
  { key: "research-lab-v2", label: "Research Lab v2", enabled: true, audience: "beta" },
  { key: "artifact-collab", label: "Artifact colaborativo", enabled: false, audience: "interno" },
  { key: "voice-input", label: "Entrada por voz", enabled: false, audience: "todos" },
  { key: "router-cost-mode", label: "Roteamento por custo", enabled: true, audience: "todos" },
];
