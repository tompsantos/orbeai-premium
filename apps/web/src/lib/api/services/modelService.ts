import { apiClient } from "@/lib/api/client";
import { localStore, STORAGE_KEYS } from "@/lib/storage/localStore";
import { mockProviders } from "@/lib/mock/data";
import type {
  ModelConfig,
  ModelProvider,
  ModelRun,
  ProviderSlug,
  ProviderUsageSummary,
  RoutingMode,
} from "@/types";

const DEFAULT_CONFIG: ModelConfig = {
  defaultProvider: "mock",
  fallbackChain: ["mock"],
  routingMode: "automático",
};

interface BackendModelProvider {
  slug: string;
  name: string;
  status: string;
  models: string[];
  api_key_status: string;
  latency_ms: number | null;
  cost_per_k_tokens: number | null;
}

interface BackendModelRun {
  id: string;
  workspace_id: string | null;
  chat_id: string | null;
  message_id: string | null;
  provider_name: string;
  model_name: string;
  task_type: string | null;
  status: string;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost_usd: number | null;
  router_reason: string | null;
  fallback_chain: unknown[] | null;
  error_message: string | null;
  created_at: string;
}

function toProviderSlug(value: string | null | undefined): ProviderSlug {
  const normalized = (value ?? "").toLowerCase();

  if (normalized.includes("openai") || normalized.includes("gpt")) return "openai";
  if (normalized.includes("anthropic") || normalized.includes("claude")) return "anthropic";
  if (normalized.includes("gemini")) return "gemini";
  if (normalized.includes("qwen")) return "qwen";
  if (normalized.includes("groq")) return "groq";
  if (normalized.includes("local")) return "local";

  return "mock";
}

function toStatus(value: string): ModelProvider["status"] {
  if (value === "online") return "online";
  if (value === "offline") return "offline";

  return "placeholder";
}

function toApiKeyStatus(value: string): ModelProvider["apiKeyStatus"] {
  if (value === "configurado") return "configurado";
  if (value === "ambiente") return "ambiente";

  return "não configurado";
}

function toModelProvider(dto: BackendModelProvider): ModelProvider {
  return {
    slug: toProviderSlug(dto.slug),
    name: dto.name,
    status: toStatus(dto.status),
    models: dto.models,
    apiKeyStatus: toApiKeyStatus(dto.api_key_status),
    latencyMs: dto.latency_ms ?? undefined,
    costPerKTokens: dto.cost_per_k_tokens ?? undefined,
  };
}

function toModelRun(dto: BackendModelRun): ModelRun {
  return {
    id: dto.id,
    chatId: dto.chat_id ?? undefined,
    messageId: dto.message_id ?? undefined,
    provider: toProviderSlug(dto.provider_name),
    providerName: dto.provider_name,
    modelName: dto.model_name,
    taskType: dto.task_type ?? undefined,
    status: dto.status,
    latencyMs: dto.latency_ms ?? undefined,
    inputTokens: dto.input_tokens ?? 0,
    outputTokens: dto.output_tokens ?? 0,
    estimatedCostUsd: dto.estimated_cost_usd ?? 0,
    routerReason: dto.router_reason ?? undefined,
    fallbackChain: (dto.fallback_chain ?? []).map(String),
    errorMessage: dto.error_message ?? undefined,
    createdAt: dto.created_at,
  };
}

async function loadModelRuns(limit = 100): Promise<ModelRun[]> {
  if (apiClient.isMock) return [];

  const runs = await apiClient.request<BackendModelRun[]>(`/v1/model-runs?limit=${limit}`);
  return runs.map(toModelRun);
}

function summarizeRuns(runs: ModelRun[]): ProviderUsageSummary[] {
  const grouped = new Map<
    ProviderSlug,
    {
      summary: ProviderUsageSummary;
      latencySum: number;
      latencyCount: number;
    }
  >();

  for (const run of runs) {
    const current = grouped.get(run.provider) ?? {
      summary: {
        provider: run.provider,
        providerName: run.providerName,
        requests: 0,
        tokens: 0,
        costUsd: 0,
        avgLatencyMs: 0,
        errors: 0,
        lastRunAt: undefined,
      },
      latencySum: 0,
      latencyCount: 0,
    };

    current.summary.requests += 1;
    current.summary.tokens += run.inputTokens + run.outputTokens;
    current.summary.costUsd += run.estimatedCostUsd;

    if (run.errorMessage || run.status !== "success") {
      current.summary.errors += 1;
    }

    if (typeof run.latencyMs === "number") {
      current.latencySum += run.latencyMs;
      current.latencyCount += 1;
      current.summary.avgLatencyMs = Math.round(current.latencySum / current.latencyCount);
    }

    if (!current.summary.lastRunAt || run.createdAt > current.summary.lastRunAt) {
      current.summary.lastRunAt = run.createdAt;
    }

    grouped.set(run.provider, current);
  }

  return Array.from(grouped.values())
    .map((item) => item.summary)
    .sort((a, b) => b.requests - a.requests);
}

export const modelService = {
  async providers(): Promise<ModelProvider[]> {
    if (!apiClient.isMock) {
      const providers = await apiClient.request<BackendModelProvider[]>("/v1/model-providers");
      return providers.map(toModelProvider);
    }

    localStore.ensureSeeded();
    return localStore.get<ModelProvider[]>(STORAGE_KEYS.providers, mockProviders);
  },

  async modelRuns(limit = 50): Promise<ModelRun[]> {
    return loadModelRuns(limit);
  },

  async providerUsage(): Promise<ProviderUsageSummary[]> {
    const runs = await loadModelRuns(200);
    return summarizeRuns(runs);
  },

  async getConfig(): Promise<ModelConfig> {
    return localStore.get<ModelConfig>(STORAGE_KEYS.modelConfig, DEFAULT_CONFIG);
  },

  async setDefaultProvider(slug: ProviderSlug) {
    const cfg = await this.getConfig();
    return localStore.set(STORAGE_KEYS.modelConfig, { ...cfg, defaultProvider: slug });
  },

  async setRoutingMode(mode: RoutingMode) {
    const cfg = await this.getConfig();
    return localStore.set(STORAGE_KEYS.modelConfig, { ...cfg, routingMode: mode });
  },

  async setFallbackChain(chain: ProviderSlug[]) {
    const cfg = await this.getConfig();
    return localStore.set(STORAGE_KEYS.modelConfig, { ...cfg, fallbackChain: chain });
  },
};
