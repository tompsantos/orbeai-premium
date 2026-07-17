import { apiClient } from "@/lib/api/client";
import { localStore, STORAGE_KEYS } from "@/lib/storage/localStore";
import { mockProjects } from "@/lib/mock/data";
import type { OrbeProductSlug, Project } from "@/types";

interface BackendProject {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  product: string | null;
  status: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function all(): Project[] {
  localStore.ensureSeeded();
  return localStore.get<Project[]>(STORAGE_KEYS.projects, mockProjects);
}

function save(list: Project[]) {
  localStore.set(STORAGE_KEYS.projects, list);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function toProduct(value: string | null | undefined): OrbeProductSlug | undefined {
  const allowed: OrbeProductSlug[] = [
    "orbeAI",
    "orbeRadar",
    "orbeRisk",
    "orbeAuto",
    "orbeVault",
    "orbeGov",
    "orbeCorp",
    "orbeZen",
    "orbeX",
    "orbeScience",
  ];

  if (value && allowed.includes(value as OrbeProductSlug)) {
    return value as OrbeProductSlug;
  }

  return undefined;
}

function toStatus(value: string): Project["status"] {
  if (value === "active" || value === "ativo") return "ativo";
  if (value === "paused" || value === "pausado") return "pausado";
  if (value === "done" || value === "concluído") return "concluído";
  return "rascunho";
}

function fromStatus(value: Project["status"] | string | undefined): string {
  if (value === "ativo") return "active";
  if (value === "pausado") return "paused";
  if (value === "concluído") return "done";
  if (value === "rascunho") return "draft";
  return value ?? "active";
}

function toProject(dto: BackendProject): Project {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? "",
    status: toStatus(dto.status),
    product: toProduct(dto.product),
    memoryMode: "isolada",
    filesCount: 0,
    chatsCount: 0,
    artifactsCount: 0,
    agents: [],
    updatedAt: dto.updated_at,
    brief: dto.slug,
  };
}

export const projectService = {
  async list(): Promise<Project[]> {
    if (apiClient.isMock) {
      return all();
    }

    const projects = await apiClient.request<BackendProject[]>("/v1/projects");
    return projects.map(toProject);
  },

  async get(id: string): Promise<Project | null> {
    if (apiClient.isMock) {
      return all().find((p) => p.id === id) ?? null;
    }

    try {
      const project = await apiClient.request<BackendProject>(`/v1/projects/${id}`);
      return toProject(project);
    } catch {
      return null;
    }
  },

  async create(input: Partial<Project> & { name: string }): Promise<Project> {
    if (!apiClient.isMock) {
      const project = await apiClient.request<BackendProject>("/v1/projects", {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          slug: slugify(input.brief || input.name || `project-${Date.now()}`),
          product: input.product,
          description: input.description ?? "",
        }),
      });

      return toProject(project);
    }

    const list = all();

    const project: Project = {
      id: `p_${Date.now()}`,
      name: input.name,
      description: input.description ?? "",
      status: input.status ?? "rascunho",
      product: input.product,
      memoryMode: input.memoryMode ?? "isolada",
      filesCount: 0,
      chatsCount: 0,
      artifactsCount: 0,
      agents: input.agents ?? [],
      updatedAt: new Date().toISOString(),
      brief: input.brief,
    };

    save([project, ...list]);

    return project;
  },

  async update(id: string, patch: Partial<Project>): Promise<Project | null> {
    if (!apiClient.isMock) {
      const project = await apiClient.request<BackendProject>(`/v1/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: patch.name,
          slug: patch.brief ? slugify(patch.brief) : undefined,
          product: patch.product,
          status: patch.status ? fromStatus(patch.status) : undefined,
          description: patch.description,
        }),
      });

      return toProject(project);
    }

    const list = all();
    const idx = list.findIndex((p) => p.id === id);

    if (idx < 0) return null;

    const next = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    list[idx] = next;
    save(list);

    return next;
  },

  async remove(id: string) {
    if (!apiClient.isMock) {
      throw new Error("Remoção de projetos ainda não está disponível no backend.");
    }

    save(all().filter((p) => p.id !== id));
  },
};
