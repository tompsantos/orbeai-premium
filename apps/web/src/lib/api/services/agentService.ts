import { localStore, STORAGE_KEYS } from "@/lib/storage/localStore";
import { mockAgents } from "@/lib/mock/data";
import type { Agent } from "@/types";

export const agentService = {
  async list(): Promise<Agent[]> {
    localStore.ensureSeeded();
    return localStore.get<Agent[]>(STORAGE_KEYS.agents, mockAgents);
  },
  async get(slug: string) { return (await this.list()).find((a) => a.slug === slug) ?? null; },
};
