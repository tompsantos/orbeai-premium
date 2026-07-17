/**
 * Internal audit helper used by services to record actions.
 * Kept separate to avoid circular imports with adminService.
 */
import { localStore, STORAGE_KEYS } from "@/lib/storage/localStore";
import { mockAudit } from "@/lib/mock/data";
import type { AuditLog } from "@/types";

export const auditService = {
  log(entry: { action: string; target: string; actor?: string; level?: AuditLog["level"] }) {
    const list = localStore.get<AuditLog[]>(STORAGE_KEYS.auditLogs, mockAudit);
    const next: AuditLog = {
      id: `log_${Date.now()}`,
      actor: entry.actor ?? "orbeOne Admin",
      action: entry.action,
      target: entry.target,
      at: new Date().toISOString(),
      level: entry.level ?? "info",
    };
    localStore.set(STORAGE_KEYS.auditLogs, [next, ...list].slice(0, 500));
    return next;
  },
};
