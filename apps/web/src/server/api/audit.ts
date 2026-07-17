/**
 * orbeAI — Server audit adapter (stub).
 * Em Fase 4: trilha imutável (append-only) com retenção configurável.
 */
export async function appendAuditEvent(_event: {
  actor: string; action: string; target: string; level?: "info" | "warn" | "error";
}) {
  return { ok: false, error: "Audit server-side não implementado em mock mode." };
}
