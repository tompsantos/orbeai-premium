import { apiClient } from "@/lib/api/client";
import { localStore, STORAGE_KEYS } from "@/lib/storage/localStore";
import { mockMemory } from "@/lib/mock/data";
import { auditService } from "@/lib/api/services/auditInternal";
import type { MemoryItem } from "@/types";

export interface MemoryItemExt extends MemoryItem {
  reason?: string;
}

interface BackendMemory {
  id: string;
  workspace_id: string;
  project_id: string | null;
  product: string | null;
  label: string;
  content: string;
  scope: string;
  status: string;
  sensitivity: string;
  confidence: number | null;
  source_type: string | null;
  source_product: string | null;
  source_entity_id: string | null;
  created_at: string;
  updated_at: string;
}

type MemoryFilter = {
  scope?: MemoryItem["scope"];
  status?: MemoryItem["status"];
  projectId?: string;
  q?: string;
};

function all(): MemoryItemExt[] {
  localStore.ensureSeeded();
  return localStore.get<MemoryItemExt[]>(STORAGE_KEYS.memory, mockMemory as MemoryItemExt[]);
}

function save(list: MemoryItemExt[]) {
  localStore.set(STORAGE_KEYS.memory, list);
}

function toScope(value: string): MemoryItem["scope"] {
  if (value === "global" || value === "projeto" || value === "sensível") {
    return value;
  }

  if (value === "workspace") return "global";

  return "projeto";
}

function fromScope(value: MemoryItem["scope"] | undefined): string | undefined {
  if (!value) return undefined;
  if (value === "global") return "global";

  return value;
}

function toStatus(value: string): MemoryItem["status"] {
  if (value === "ativa" || value === "pendente" || value === "arquivada") {
    return value;
  }

  if (value === "active") return "ativa";
  if (value === "draft") return "pendente";
  if (value === "archived") return "arquivada";

  return "pendente";
}

function toSource(value: string | null): MemoryItem["source"] {
  if (value === "chat" || value === "documento" || value === "manual" || value === "agente") {
    return value;
  }

  return "manual";
}

function toMemoryItem(dto: BackendMemory): MemoryItemExt {
  const source = toSource(dto.source_type);

  return {
    id: dto.id,
    scope: toScope(dto.scope),
    label: dto.label,
    content: dto.content,
    source,
    confidence: dto.confidence ?? 0.8,
    lastUsed: dto.updated_at,
    status: toStatus(dto.status),
    projectId: dto.project_id ?? undefined,
    sensitivity: dto.sensitivity,
    sourceProduct: dto.source_product ?? undefined,
    sourceEntityId: dto.source_entity_id ?? undefined,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    reason: source === "chat" && dto.source_entity_id ? "Memória capturada automaticamente a partir do chat" : undefined,
  };
}

function buildQuery(filter?: MemoryFilter): string {
  const params = new URLSearchParams();

  const scope = fromScope(filter?.scope);
  if (scope) params.set("scope", scope);
  if (filter?.status) params.set("status", filter.status);
  if (filter?.projectId) params.set("project_id", filter.projectId);
  if (filter?.q) params.set("q", filter.q);

  const query = params.toString();

  return query ? `?${query}` : "";
}

export const memoryService = {
  async list(filter?: MemoryFilter): Promise<MemoryItemExt[]> {
    if (!apiClient.isMock) {
      const memories = await apiClient.request<BackendMemory[]>(`/v1/memories${buildQuery(filter)}`);
      return memories.map(toMemoryItem);
    }

    let list = all();

    if (filter?.scope) list = list.filter((m) => m.scope === filter.scope);
    if (filter?.status) list = list.filter((m) => m.status === filter.status);
    if (filter?.projectId) list = list.filter((m) => m.projectId === filter.projectId);

    if (filter?.q) {
      const q = filter.q.toLowerCase();
      list = list.filter((m) => m.label.toLowerCase().includes(q) || m.content.toLowerCase().includes(q));
    }

    return list;
  },

  async create(input: Partial<MemoryItemExt> & { label: string; content: string }): Promise<MemoryItemExt> {
    if (!apiClient.isMock) {
      const memory = await apiClient.request<BackendMemory>("/v1/memories", {
        method: "POST",
        body: JSON.stringify({
          label: input.label,
          content: input.content,
          scope: fromScope(input.scope) ?? "projeto",
          status: input.status ?? "pendente",
          confidence: input.confidence ?? 0.8,
          project_id: input.projectId,
          source_type: input.source ?? "manual",
          source_product: "orbeAI",
        }),
      });

      return toMemoryItem(memory);
    }

    const item: MemoryItemExt = {
      id: `mem_${Date.now()}`,
      scope: input.scope ?? "projeto",
      label: input.label,
      content: input.content,
      source: input.source ?? "manual",
      confidence: input.confidence ?? 0.8,
      lastUsed: new Date().toISOString(),
      status: input.status ?? "pendente",
      projectId: input.projectId,
      reason: input.reason,
    };

    save([item, ...all()]);
    auditService.log({ action: "memory.create", target: item.id });

    return item;
  },

  async update(id: string, patch: Partial<MemoryItemExt>): Promise<MemoryItemExt | null> {
    if (!apiClient.isMock) {
      const memory = await apiClient.request<BackendMemory>(`/v1/memories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: patch.label,
          content: patch.content,
          scope: fromScope(patch.scope),
          status: patch.status,
          confidence: patch.confidence,
          project_id: patch.projectId,
          source_type: patch.source,
        }),
      });

      return toMemoryItem(memory);
    }

    const list = all();
    const idx = list.findIndex((m) => m.id === id);

    if (idx < 0) return null;

    list[idx] = { ...list[idx], ...patch };
    save(list);

    return list[idx];
  },

  async remove(id: string): Promise<void> {
    if (!apiClient.isMock) {
      await apiClient.request<void>(`/v1/memories/${id}`, {
        method: "DELETE",
      });

      return;
    }

    save(all().filter((m) => m.id !== id));
    auditService.log({ action: "memory.remove", target: id, level: "warn" });
  },

  async approve(id: string) {
    return this.update(id, { status: "ativa" });
  },

  async reject(id: string) {
    return this.update(id, { status: "arquivada" });
  },
};
