import { apiClient } from "@/lib/api/client";
import { localStore, STORAGE_KEYS } from "@/lib/storage/localStore";
import { mockArtifacts } from "@/lib/mock/data";
import { auditService } from "@/lib/api/services/auditInternal";
import type { Artifact, ArtifactKind, ArtifactVersion } from "@/types";

interface BackendArtifactVersion {
  id: string;
  artifact_id: string;
  version_number: number;
  content: string;
  created_at: string;
}

interface BackendArtifact {
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  kind: string;
  status: string;
  source_type: string | null;
  source_product: string | null;
  source_entity_id: string | null;
  created_at: string;
  updated_at: string;
  versions: BackendArtifactVersion[];
}

function all(): Artifact[] {
  localStore.ensureSeeded();
  return localStore.get<Artifact[]>(STORAGE_KEYS.artifacts, mockArtifacts);
}

function save(list: Artifact[]) {
  localStore.set(STORAGE_KEYS.artifacts, list);
}

function toArtifactKind(value: string): ArtifactKind {
  const allowed: ArtifactKind[] = [
    "documento",
    "prompt",
    "código",
    "relatório",
    "plano de ação",
    "tabela",
    "json",
    "playbook",
    "contrato",
    "landing page",
    "checklist",
  ];

  if (allowed.includes(value as ArtifactKind)) {
    return value as ArtifactKind;
  }

  return "documento";
}

function latestVersion(dto: BackendArtifact): BackendArtifactVersion | undefined {
  return [...dto.versions].sort((a, b) => b.version_number - a.version_number)[0];
}

function toArtifactVersion(dto: BackendArtifactVersion): ArtifactVersion {
  return {
    id: dto.id,
    createdAt: dto.created_at,
    note: `Versão ${dto.version_number}`,
  };
}

function toArtifact(dto: BackendArtifact): Artifact {
  const latest = latestVersion(dto);

  return {
    id: dto.id,
    title: dto.title,
    kind: toArtifactKind(dto.kind),
    projectId: dto.project_id ?? undefined,
    content: latest?.content ?? "",
    updatedAt: dto.updated_at,
    versions: dto.versions
      .sort((a, b) => a.version_number - b.version_number)
      .map(toArtifactVersion),
  };
}

export const artifactService = {
  async list(): Promise<Artifact[]> {
    if (!apiClient.isMock) {
      const artifacts = await apiClient.request<BackendArtifact[]>("/v1/artifacts");
      return artifacts.map(toArtifact);
    }

    return all();
  },

  async get(id: string): Promise<Artifact | null> {
    if (!apiClient.isMock) {
      try {
        const artifact = await apiClient.request<BackendArtifact>(`/v1/artifacts/${id}`);
        return toArtifact(artifact);
      } catch {
        return null;
      }
    }

    return all().find((a) => a.id === id) ?? null;
  },

  async create(input: { title: string; kind: ArtifactKind; content?: string; projectId?: string }): Promise<Artifact> {
    if (!apiClient.isMock) {
      const artifact = await apiClient.request<BackendArtifact>("/v1/artifacts", {
        method: "POST",
        body: JSON.stringify({
          title: input.title,
          kind: input.kind,
          content: input.content ?? "",
          project_id: input.projectId,
          source_type: "frontend",
          source_product: "orbeAI",
        }),
      });

      return toArtifact(artifact);
    }

    const now = new Date().toISOString();
    const a: Artifact = {
      id: `a_${Date.now()}`,
      title: input.title,
      kind: input.kind,
      projectId: input.projectId,
      content: input.content ?? "",
      updatedAt: now,
      versions: [{ id: `v_${Date.now()}`, createdAt: now, note: "Versão inicial" }],
    };

    save([a, ...all()]);
    auditService.log({ action: "artifact.create", target: a.id });

    return a;
  },

  async saveVersion(id: string, content: string, note = "Edição"): Promise<Artifact | null> {
    if (!apiClient.isMock) {
      await apiClient.request<BackendArtifactVersion>(`/v1/artifacts/${id}/versions`, {
        method: "POST",
        body: JSON.stringify({
          content,
          note,
        }),
      });

      return this.get(id);
    }

    const list = all();
    const idx = list.findIndex((a) => a.id === id);

    if (idx < 0) return null;

    const now = new Date().toISOString();
    const updated: Artifact = {
      ...list[idx],
      content,
      updatedAt: now,
      versions: [...list[idx].versions, { id: `v_${Date.now()}`, createdAt: now, note }],
    };

    list[idx] = updated;
    save(list);
    auditService.log({ action: "artifact.version", target: id });

    return updated;
  },

  async update(id: string, patch: Partial<Artifact>): Promise<Artifact | null> {
    if (!apiClient.isMock) {
      const artifact = await apiClient.request<BackendArtifact>(`/v1/artifacts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: patch.title,
          kind: patch.kind,
          project_id: patch.projectId,
        }),
      });

      return toArtifact(artifact);
    }

    const list = all();
    const idx = list.findIndex((a) => a.id === id);

    if (idx < 0) return null;

    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    save(list);

    return list[idx];
  },

  async remove(id: string): Promise<void> {
    if (!apiClient.isMock) {
      await apiClient.request<void>(`/v1/artifacts/${id}`, {
        method: "DELETE",
      });

      return;
    }

    save(all().filter((a) => a.id !== id));
    auditService.log({ action: "artifact.remove", target: id, level: "warn" });
  },

  async exportText(id: string): Promise<{ filename: string; content: string } | null> {
    const a = await this.get(id);

    if (!a) return null;

    const ext = a.kind === "código" || a.kind === "json" ? "txt" : "md";

    return { filename: `${a.title.replace(/\s+/g, "_")}.${ext}`, content: a.content };
  },

  async enhanceMock(id: string): Promise<Artifact | null> {
    const a = await this.get(id);

    if (!a) return null;

    const improved = `${a.content}\n\n---\n\n_Refinado por orbeAI em ${new Date().toLocaleString("pt-BR")}_\n\n- Estrutura revisada\n- Tom premium aplicado\n- Pontos de ação destacados`;

    return this.saveVersion(id, improved, "Melhorado por orbeAI");
  },
};
