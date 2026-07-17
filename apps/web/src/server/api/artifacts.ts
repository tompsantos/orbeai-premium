/**
 * orbeAI — Server artifacts adapter (stub).
 * Em Fase 1: persistir em Postgres + storage de arquivos.
 */
export async function persistArtifact(_input: { title: string; content: string }) {
  return { ok: false, error: "Persistência de artifacts server-side não implementada." };
}
