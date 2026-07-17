import { localStore, STORAGE_KEYS } from "@/lib/storage/localStore";
import { mockResearch } from "@/lib/mock/data";
import type { ResearchReport } from "@/types";

function all(): ResearchReport[] {
  localStore.ensureSeeded();
  return localStore.get<ResearchReport[]>(STORAGE_KEYS.research, mockResearch);
}
function save(list: ResearchReport[]) { localStore.set(STORAGE_KEYS.research, list); }

export const researchService = {
  async list() { return all(); },
  async get(id: string) { return all().find((r) => r.id === id) ?? null; },
  async create(input: { question: string }): Promise<ResearchReport> {
    const r: ResearchReport = {
      id: `r_${Date.now()}`,
      question: input.question,
      status: "rascunho",
      plan: [
        "Quebrar a pergunta em hipóteses verificáveis",
        "Buscar fontes primárias e secundárias",
        "Avaliar evidências e incertezas",
        "Sintetizar resposta executiva",
      ],
      sources: [],
      summary: "",
      risks: [],
      updatedAt: new Date().toISOString(),
    };
    save([r, ...all()]);
    return r;
  },
  async update(id: string, patch: Partial<ResearchReport>) {
    const list = all();
    const idx = list.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    save(list);
    return list[idx];
  },
  async remove(id: string) { save(all().filter((r) => r.id !== id)); },
};
