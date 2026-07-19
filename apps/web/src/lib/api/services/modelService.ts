import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { auditService } from "@/lib/api/services/auditInternal";
import { db, ensureDb } from "@/lib/db";
import { mapBackendModelProvider, mapBackendModelRun } from "@/lib/api/mappers";
import type {
  BackendModelProvider,
  BackendModelRun,
  ModelProvider,
  ModelRun,
  ProviderUsageSummary,
} from "@/types";

export const modelService = {
  async providers(): Promise<ModelProvider[]> {
    if (apiClient.isMock) {
      await ensureDb();
      return db.modelProviders.toArray();
    }
    const providers = await apiClient.request<BackendModelProvider[]>(ENDPOINTS.modelProviders);
    return providers.map(mapBackendModelProvider);
  },

  async runs(limit = 100): Promise<ModelRun[]> {
    if (apiClient.isMock) {
      await ensureDb();
      return db.modelRuns.orderBy("createdAt").reverse().limit(limit).toArray();
    }
    const runs = await apiClient.request<BackendModelRun[]>(`${ENDPOINTS.modelRuns}?limit=${limit}`);
    return runs.map(mapBackendModelRun);
  },

  async usageSummary(limit = 500): Promise<ProviderUsageSummary[]> {
    const runs = await this.runs(limit);
    const providers = await this.providers();

    return providers
      .map((provider) => {
        const related = runs.filter((run) => run.provider === provider.slug);
        const totalLatency = related.reduce((sum, run) => sum + (run.latencyMs ?? 0), 0);
        const lastRun = related.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

        return {
          provider: provider.slug,
          providerName: provider.name,
          requests: related.length,
          tokens: related.reduce((sum, run) => sum + run.inputTokens + run.outputTokens, 0),
          costUsd: related.reduce((sum, run) => sum + run.estimatedCostUsd, 0),
          avgLatencyMs: related.length ? Math.round(totalLatency / related.length) : 0,
          errors: related.filter((run) => run.status !== "success").length,
          lastRunAt: lastRun?.createdAt,
        };
      })
      .filter((item) => item.requests > 0);
  },

  async recordRun(run: Omit<ModelRun, "id" | "createdAt">): Promise<ModelRun> {
    if (!apiClient.isMock) {
      throw new Error("Model runs reais são registrados pelo backend durante a execução.");
    }
    await ensureDb();
    const payload: ModelRun = {
      ...run,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await db.modelRuns.add(payload);
    await auditService.record("Modelo executado", `${payload.provider} · ${payload.modelName}`, {
      resourceType: "model_run",
      resourceId: payload.id,
      meta: { status: payload.status, cost: payload.estimatedCostUsd },
    });
    return payload;
  },
};
