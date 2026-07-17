import { localStore, STORAGE_KEYS } from "@/lib/storage/localStore";
import { mockIntegrations } from "@/lib/mock/data";
import { auditService } from "@/lib/api/services/auditInternal";
import type { Integration } from "@/types";

function all(): Integration[] {
  localStore.ensureSeeded();
  return localStore.get<Integration[]>(STORAGE_KEYS.integrations, mockIntegrations);
}
function save(list: Integration[]) { localStore.set(STORAGE_KEYS.integrations, list); }

export const integrationService = {
  async list() { return all(); },
  async setStatus(slug: string, status: Integration["status"]) {
    const list = all();
    const idx = list.findIndex((i) => i.slug === slug);
    if (idx < 0) return null;
    list[idx] = { ...list[idx], status };
    save(list);
    auditService.log({ action: `integration.${status}`, target: slug });
    return list[idx];
  },
  async connect(slug: string) { return this.setStatus(slug, "conectado"); },
  async disconnect(slug: string) { return this.setStatus(slug, "disponível"); },
  async configure(slug: string) {
    auditService.log({ action: "integration.configure", target: slug });
    return this.setStatus(slug, "conectado");
  },
};
