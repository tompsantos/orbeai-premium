import { apiClient } from "@/lib/api/client";
import { mockResearch } from "@/lib/mock/data";
import { localStore, STORAGE_KEYS } from "@/lib/storage/localStore";
import type { ResearchReport, ResearchSource } from "@/types";

const MATERIALS_KEY = "orbeai:knowledge-materials";

interface BackendKnowledgeMaterial {
  id: string;
  report_id: string | null;
  title: string;
  kind: ResearchSource["kind"];
  url: string | null;
  excerpt: string;
  confidence: number;
  updated_at: string;
}

interface BackendResearchReport {
  id: string;
  question: string;
  status: ResearchReport["status"];
  plan: string[];
  sources: BackendKnowledgeMaterial[];
  summary: string;
  risks: string[];
  updated_at: string;
}

interface MaterialCreateInput {
  title: string;
  kind: ResearchSource["kind"];
  excerpt: string;
  confidence?: number;
  url?: string;
  reportId?: string;
  sourceType?: string;
  sourceProduct?: string;
  sourceEntityId?: string;
  meta?: Record<string, unknown>;
}

function allReports(): ResearchReport[] {
  localStore.ensureSeeded();
  return localStore.get<ResearchReport[]>(STORAGE_KEYS.research, mockResearch);
}

function saveReports(list: ResearchReport[]) {
  localStore.set(STORAGE_KEYS.research, list);
}

function allMaterials(): ResearchSource[] {
  const reportSources = allReports().flatMap((report) => report.sources);
  const saved = localStore.get<ResearchSource[]>(MATERIALS_KEY, []);
  const unique = new Map<string, ResearchSource>();

  [...saved, ...reportSources].forEach((material) => unique.set(material.id, material));
  return Array.from(unique.values());
}

function saveMaterials(list: ResearchSource[]) {
  localStore.set(MATERIALS_KEY, list);
}

function toMaterial(dto: BackendKnowledgeMaterial): ResearchSource {
  return {
    id: dto.id,
    title: dto.title,
    kind: dto.kind,
    url: dto.url ?? undefined,
    excerpt: dto.excerpt,
    confidence: dto.confidence,
  };
}

function toReport(dto: BackendResearchReport): ResearchReport {
  return {
    id: dto.id,
    question: dto.question,
    status: dto.status,
    plan: dto.plan,
    sources: dto.sources.map(toMaterial),
    summary: dto.summary,
    risks: dto.risks,
    updatedAt: dto.updated_at,
  };
}

export const researchService = {
  async list(): Promise<ResearchReport[]> {
    if (apiClient.isMock) return allReports();
    const reports = await apiClient.request<BackendResearchReport[]>("/v1/knowledge/reports");
    return reports.map(toReport);
  },

  async get(id: string): Promise<ResearchReport | null> {
    if (apiClient.isMock) return allReports().find((report) => report.id === id) ?? null;

    try {
      const report = await apiClient.request<BackendResearchReport>(`/v1/knowledge/reports/${id}`);
      return toReport(report);
    } catch {
      return null;
    }
  },

  async create(input: { question: string }): Promise<ResearchReport> {
    if (!apiClient.isMock) {
      const report = await apiClient.request<BackendResearchReport>("/v1/knowledge/reports", {
        method: "POST",
        body: JSON.stringify({ question: input.question, status: "rascunho" }),
      });
      return toReport(report);
    }

    const report: ResearchReport = {
      id: `r_${Date.now()}`,
      question: input.question,
      status: "rascunho",
      plan: [
        "Quebrar a pergunta em hipóteses verificáveis",
        "Selecionar materiais e fontes relevantes",
        "Avaliar evidências e incertezas",
        "Preparar uma síntese rastreável",
      ],
      sources: [],
      summary: "",
      risks: [],
      updatedAt: new Date().toISOString(),
    };
    saveReports([report, ...allReports()]);
    return report;
  },

  async update(id: string, patch: Partial<ResearchReport>): Promise<ResearchReport | null> {
    if (!apiClient.isMock) {
      const report = await apiClient.request<BackendResearchReport>(`/v1/knowledge/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          question: patch.question,
          status: patch.status,
          plan: patch.plan,
          summary: patch.summary,
          risks: patch.risks,
        }),
      });
      return toReport(report);
    }

    const list = allReports();
    const index = list.findIndex((report) => report.id === id);
    if (index < 0) return null;

    list[index] = { ...list[index], ...patch, updatedAt: new Date().toISOString() };
    saveReports(list);
    return list[index];
  },

  async remove(id: string): Promise<void> {
    if (!apiClient.isMock) {
      await apiClient.request<void>(`/v1/knowledge/reports/${id}`, { method: "DELETE" });
      return;
    }
    saveReports(allReports().filter((report) => report.id !== id));
  },

  async listMaterials(): Promise<ResearchSource[]> {
    if (apiClient.isMock) return allMaterials();
    const materials = await apiClient.request<BackendKnowledgeMaterial[]>(
      "/v1/knowledge/materials",
    );
    return materials.map(toMaterial);
  },

  async createMaterial(input: MaterialCreateInput): Promise<ResearchSource> {
    if (!apiClient.isMock) {
      const material = await apiClient.request<BackendKnowledgeMaterial>(
        "/v1/knowledge/materials",
        {
          method: "POST",
          body: JSON.stringify({
            title: input.title,
            kind: input.kind,
            excerpt: input.excerpt,
            confidence: input.confidence ?? 1,
            url: input.url,
            report_id: input.reportId,
            source_type: input.sourceType,
            source_product: input.sourceProduct ?? "orbeAI",
            source_entity_id: input.sourceEntityId,
            meta: input.meta,
          }),
        },
      );
      return toMaterial(material);
    }

    const material: ResearchSource = {
      id: `km_${Date.now()}`,
      title: input.title,
      kind: input.kind,
      url: input.url,
      excerpt: input.excerpt,
      confidence: input.confidence ?? 1,
    };
    saveMaterials([material, ...allMaterials()]);
    return material;
  },
};
