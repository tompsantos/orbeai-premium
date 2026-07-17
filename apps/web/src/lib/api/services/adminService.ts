import { apiClient } from "@/lib/api/client";
import { localStore, STORAGE_KEYS } from "@/lib/storage/localStore";
import { mockAudit, mockFlags, mockUsage } from "@/lib/mock/data";
import type { AuditLog, FeatureFlag, ProviderSlug, UsageMetric, WorkspaceInfo, WorkspaceSettings } from "@/types";

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

interface BackendAuditLog {
  id: string;
  workspace_id: string | null;
  product: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  request_id: string | null;
  ip_address: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

interface BackendFeatureFlag {
  id: string;
  workspace_id: string;
  key: string;
  label: string;
  enabled: boolean;
  audience: string;
  description: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface BackendWorkspaceSettings {
  id: string;
  workspace_id: string;
  locale: string;
  timezone: string;
  default_chat_mode: string;
  default_model_preference: string;
  memory_policy: string;
  data_retention_days: number;
  allow_exports: boolean;
  allow_public_sharing: boolean;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface BackendWorkspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
  updated_at: string;
  settings: BackendWorkspaceSettings;
}

function toProviderSlug(value: string | null | undefined): ProviderSlug {
  if (value === "openai") return "openai";
  if (value === "anthropic") return "anthropic";
  if (value === "gemini") return "gemini";
  if (value === "qwen") return "qwen";
  if (value === "groq") return "groq";
  if (value === "local") return "local";

  return "mock";
}

function toAudience(value: string): FeatureFlag["audience"] {
  if (value === "todos" || value === "interno" || value === "beta") {
    return value;
  }

  return "interno";
}

function toFeatureFlag(flag: BackendFeatureFlag): FeatureFlag {
  return {
    key: flag.key,
    label: flag.label,
    enabled: flag.enabled,
    audience: toAudience(flag.audience),
  };
}

function toWorkspaceSettings(settings: BackendWorkspaceSettings): WorkspaceSettings {
  return {
    id: settings.id,
    workspaceId: settings.workspace_id,
    locale: settings.locale,
    timezone: settings.timezone,
    defaultChatMode: settings.default_chat_mode,
    defaultModelPreference: settings.default_model_preference,
    memoryPolicy: settings.memory_policy,
    dataRetentionDays: settings.data_retention_days,
    allowExports: settings.allow_exports,
    allowPublicSharing: settings.allow_public_sharing,
    meta: settings.meta ?? undefined,
    createdAt: settings.created_at,
    updatedAt: settings.updated_at,
  };
}

function toWorkspaceInfo(workspace: BackendWorkspace): WorkspaceInfo {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    plan: workspace.plan,
    createdAt: workspace.created_at,
    updatedAt: workspace.updated_at,
    settings: toWorkspaceSettings(workspace.settings),
  };
}

function dateKey(value: string) {
  return value.slice(0, 10);
}

function modelRunsToUsage(modelRuns: BackendModelRun[]): UsageMetric[] {
  const byDate = new Map<string, UsageMetric>();

  for (const run of modelRuns) {
    const key = dateKey(run.created_at);
    const inputTokens = run.input_tokens ?? 0;
    const outputTokens = run.output_tokens ?? 0;
    const tokens = inputTokens + outputTokens;
    const costUsd = run.estimated_cost_usd ?? 0;

    const current = byDate.get(key) ?? {
      date: key,
      tokens: 0,
      requests: 0,
      costUsd: 0,
      provider: toProviderSlug(run.provider_name),
    };

    current.tokens += tokens;
    current.requests += 1;
    current.costUsd += costUsd;
    current.provider = toProviderSlug(run.provider_name);

    byDate.set(key, current);
  }

  return Array.from(byDate.values()).sort((a, b) => (a.date > b.date ? 1 : -1));
}

function auditLevel(log: BackendAuditLog): AuditLog["level"] {
  const status = String(log.meta?.status ?? "");
  const action = log.action.toLowerCase();

  if (action.includes("delete") || action.includes("remove") || action.includes("archive")) return "warn";
  if (status === "error" || action.includes("error")) return "error";

  return "info";
}

function toAuditLog(log: BackendAuditLog): AuditLog {
  return {
    id: log.id,
    actor: log.product ?? "orbeAI backend",
    action: log.action,
    target: log.resource_id ?? log.resource_type ?? log.id,
    at: log.created_at,
    level: auditLevel(log),
    product: log.product ?? undefined,
    resourceType: log.resource_type ?? undefined,
    resourceId: log.resource_id ?? undefined,
    meta: log.meta ?? undefined,
  };
}

export const adminService = {
  async audit(filter?: { level?: AuditLog["level"]; q?: string }): Promise<AuditLog[]> {
    if (!apiClient.isMock) {
      const params = new URLSearchParams();

      params.set("limit", "200");
      if (filter?.q) params.set("q", filter.q);

      const logs = await apiClient.request<BackendAuditLog[]>(`/v1/audit-logs?${params.toString()}`);
      let list = logs.map(toAuditLog);

      if (filter?.level) list = list.filter((l) => l.level === filter.level);

      return list.sort((a, b) => (a.at < b.at ? 1 : -1));
    }

    localStore.ensureSeeded();

    let list = localStore.get<AuditLog[]>(STORAGE_KEYS.auditLogs, mockAudit);

    if (filter?.level) list = list.filter((l) => l.level === filter.level);

    if (filter?.q) {
      const q = filter.q.toLowerCase();

      list = list.filter((l) =>
        l.action.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q) ||
        l.actor.toLowerCase().includes(q),
      );
    }

    return list.slice().sort((a, b) => (a.at < b.at ? 1 : -1));
  },

  async usage(): Promise<UsageMetric[]> {
    if (!apiClient.isMock) {
      const modelRuns = await apiClient.request<BackendModelRun[]>("/v1/model-runs?limit=200");
      return modelRunsToUsage(modelRuns);
    }

    return localStore.get<UsageMetric[]>(STORAGE_KEYS.usageEvents, mockUsage);
  },

  async flags(): Promise<FeatureFlag[]> {
    if (!apiClient.isMock) {
      const flags = await apiClient.request<BackendFeatureFlag[]>("/v1/feature-flags");
      return flags.map(toFeatureFlag);
    }

    return localStore.get<FeatureFlag[]>(STORAGE_KEYS.featureFlags, mockFlags);
  },

  async toggleFlag(key: string): Promise<FeatureFlag | null> {
    if (!apiClient.isMock) {
      const flag = await apiClient.request<BackendFeatureFlag>(`/v1/feature-flags/${encodeURIComponent(key)}/toggle`, {
        method: "POST",
      });

      return toFeatureFlag(flag);
    }

    const list = localStore.get<FeatureFlag[]>(STORAGE_KEYS.featureFlags, mockFlags);
    const idx = list.findIndex((f) => f.key === key);

    if (idx < 0) return null;

    list[idx] = { ...list[idx], enabled: !list[idx].enabled };
    localStore.set(STORAGE_KEYS.featureFlags, list);

    return list[idx];
  },

  async workspace(): Promise<WorkspaceInfo> {
    if (!apiClient.isMock) {
      const workspace = await apiClient.request<BackendWorkspace>("/v1/workspace");
      return toWorkspaceInfo(workspace);
    }

    const now = new Date().toISOString();

    return {
      id: "ws_mock",
      name: "orbeOne",
      slug: "orbeone",
      plan: "internal",
      createdAt: now,
      updatedAt: now,
      settings: {
        id: "wsset_mock",
        workspaceId: "ws_mock",
        locale: "pt-BR",
        timezone: "America/Sao_Paulo",
        defaultChatMode: "strategist",
        defaultModelPreference: "auto",
        memoryPolicy: "balanced",
        dataRetentionDays: 365,
        allowExports: true,
        allowPublicSharing: false,
        createdAt: now,
        updatedAt: now,
      },
    };
  },

  async updateWorkspace(payload: Partial<Pick<WorkspaceInfo, "name" | "plan">>): Promise<WorkspaceInfo> {
    if (!apiClient.isMock) {
      const workspace = await apiClient.request<BackendWorkspace>("/v1/workspace", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      return toWorkspaceInfo(workspace);
    }

    const current = await this.workspace();

    return {
      ...current,
      ...payload,
      updatedAt: new Date().toISOString(),
    };
  },

  async updateWorkspaceSettings(payload: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
    const backendPayload = {
      locale: payload.locale,
      timezone: payload.timezone,
      default_chat_mode: payload.defaultChatMode,
      default_model_preference: payload.defaultModelPreference,
      memory_policy: payload.memoryPolicy,
      data_retention_days: payload.dataRetentionDays,
      allow_exports: payload.allowExports,
      allow_public_sharing: payload.allowPublicSharing,
      meta: payload.meta,
    };

    Object.keys(backendPayload).forEach((key) => {
      const typedKey = key as keyof typeof backendPayload;
      if (backendPayload[typedKey] === undefined) delete backendPayload[typedKey];
    });

    if (!apiClient.isMock) {
      const settings = await apiClient.request<BackendWorkspaceSettings>("/v1/workspace/settings", {
        method: "PATCH",
        body: JSON.stringify(backendPayload),
      });

      return toWorkspaceSettings(settings);
    }

    const current = await this.workspace();

    return {
      ...current.settings,
      ...payload,
      updatedAt: new Date().toISOString(),
    };
  },
};
