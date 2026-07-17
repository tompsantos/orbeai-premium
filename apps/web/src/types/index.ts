// Core orbeAI domain types

export type ID = string;

export type UserRole = "owner" | "admin" | "member" | "viewer";

export interface User {
  id: ID;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  workspaceId: ID;
}

export interface Workspace {
  id: ID;
  name: string;
  plan: "free" | "pro" | "enterprise";
  seats: number;
  createdAt: string;
}

export type OrbeProductSlug =
  | "orbeAI"
  | "orbeRadar"
  | "orbeRisk"
  | "orbeAuto"
  | "orbeVault"
  | "orbeGov"
  | "orbeCorp"
  | "orbeZen"
  | "orbeX"
  | "orbeScience";

export interface OrbeProduct {
  slug: OrbeProductSlug;
  name: string;
  tagline: string;
  description: string;
  status: "ativo" | "beta" | "em breve";
  category: "core" | "intelligence" | "automation" | "governance" | "wellbeing" | "experimental";
}

export interface Project {
  id: ID;
  name: string;
  description: string;
  status: "ativo" | "pausado" | "concluído" | "rascunho";
  product?: OrbeProductSlug;
  memoryMode: "isolada" | "compartilhada" | "somente leitura";
  filesCount: number;
  chatsCount: number;
  artifactsCount: number;
  agents: string[];
  updatedAt: string;
  brief?: string;
}

export type ChatMode =
  | "padrão"
  | "strategist"
  | "dev"
  | "research"
  | "document"
  | "creative"
  | "ops"
  | "mentor"
  | "safe";

export type ModelKey =
  | "auto"
  | "gpt"
  | "claude"
  | "gemini"
  | "qwen"
  | "groq"
  | "local";

export interface Chat {
  id: ID;
  title: string;
  projectId?: ID;
  mode: ChatMode;
  model: ModelKey;
  updatedAt: string;
  pinned?: boolean;
}

export type MessageRole = "user" | "assistant" | "system";

export interface Attachment {
  id: ID;
  name: string;
  kind: "image" | "doc" | "audio" | "code";
  sizeKb: number;
}

export interface Message {
  id: ID;
  chatId: ID;
  role: MessageRole;
  content: string;
  createdAt: string;
  model?: ModelKey;
  provider?: ProviderSlug;
  providerName?: string;
  modelName?: string;
  inputTokens?: number;
  outputTokens?: number;
  modelRunId?: string;
  mode?: ChatMode;
  attachments?: Attachment[];
  pinned?: boolean;
}

export type ArtifactKind =
  | "documento"
  | "prompt"
  | "código"
  | "relatório"
  | "plano de ação"
  | "tabela"
  | "json"
  | "playbook"
  | "contrato"
  | "landing page"
  | "checklist";

export interface ArtifactVersion {
  id: ID;
  createdAt: string;
  note: string;
}

export interface Artifact {
  id: ID;
  title: string;
  kind: ArtifactKind;
  projectId?: ID;
  content: string;
  updatedAt: string;
  versions: ArtifactVersion[];
}

export interface MemoryItem {
  id: ID;
  scope: "global" | "projeto" | "sensível";
  label: string;
  content: string;
  source: "chat" | "documento" | "manual" | "agente";
  confidence: number; // 0-1
  lastUsed: string;
  status: "ativa" | "pendente" | "arquivada";
  projectId?: ID;
  sensitivity?: "normal" | "sensível" | string;
  sourceProduct?: string;
  sourceEntityId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Agent {
  slug: string;
  name: string;
  role: string;
  description: string;
  status: "ativo" | "beta" | "em treinamento";
  tools: string[];
  memoryScope: "global" | "projeto" | "isolada";
}

export interface Integration {
  slug: string;
  name: string;
  category: "produtividade" | "dev" | "dados" | "comunicação" | "orbeOne";
  status: "conectado" | "disponível" | "configurar";
  description: string;
  permissions: string[];
}

export type ProviderSlug = "openai" | "anthropic" | "gemini" | "qwen" | "groq" | "local" | "mock";

export interface ModelProvider {
  slug: ProviderSlug;
  name: string;
  status: "online" | "offline" | "placeholder";
  models: string[];
  apiKeyStatus: "configurado" | "não configurado" | "ambiente";
  latencyMs?: number;
  costPerKTokens?: number;
}

export interface ModelRun {
  id: ID;
  chatId?: ID;
  messageId?: ID;
  provider: ProviderSlug;
  providerName: string;
  modelName: string;
  taskType?: string;
  status: string;
  latencyMs?: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  routerReason?: string;
  fallbackChain: string[];
  errorMessage?: string;
  createdAt: string;
}

export interface ProviderUsageSummary {
  provider: ProviderSlug;
  providerName: string;
  requests: number;
  tokens: number;
  costUsd: number;
  avgLatencyMs: number;
  errors: number;
  lastRunAt?: string;
}

export interface ModelConfig {
  defaultProvider: ProviderSlug;
  fallbackChain: ProviderSlug[];
  routingMode: RoutingMode;
}

export type RoutingMode =
  | "menor custo"
  | "melhor qualidade"
  | "mais rápido"
  | "raciocínio profundo"
  | "código"
  | "pesquisa"
  | "documento"
  | "multimodal"
  | "automático";

export interface ModelRoute {
  task: string;
  provider: ProviderSlug;
  model: string;
  reason: string;
}

export interface ResearchSource {
  id: ID;
  title: string;
  url?: string;
  kind: "web" | "arquivo" | "interna" | "integração";
  excerpt: string;
  confidence: number;
}

export interface ResearchReport {
  id: ID;
  question: string;
  status: "rascunho" | "em andamento" | "concluído";
  plan: string[];
  sources: ResearchSource[];
  summary: string;
  risks: string[];
  updatedAt: string;
}

export interface AuditLog {
  id: ID;
  actor: string;
  action: string;
  target: string;
  at: string;
  level: "info" | "warn" | "error";
  product?: string;
  resourceType?: string;
  resourceId?: string;
  meta?: Record<string, unknown>;
}

export interface UsageMetric {
  date: string;
  tokens: number;
  requests: number;
  costUsd: number;
  provider: ProviderSlug;
}

export interface FeatureFlag {
  key: string;
  label: string;
  enabled: boolean;
  audience: "todos" | "interno" | "beta";
}

export interface WorkspaceSettings {
  id: ID;
  workspaceId: ID;
  locale: string;
  timezone: string;
  defaultChatMode: string;
  defaultModelPreference: string;
  memoryPolicy: string;
  dataRetentionDays: number;
  allowExports: boolean;
  allowPublicSharing: boolean;
  meta?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceInfo {
  id: ID;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
  settings: WorkspaceSettings;
}

