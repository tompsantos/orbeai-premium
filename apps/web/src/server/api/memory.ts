/**
 * orbeAI — Server memory adapter (stub).
 * Em Fase 3: integrar memória vetorial (pgvector/Pinecone/Qdrant) e embeddings.
 * Em mock mode, a memória vive em localStore client-side (memoryService).
 */
export async function indexMemory(_payload: { content: string; metadata?: Record<string, unknown> }) {
  return { ok: false, error: "Memória vetorial não implementada em mock mode." };
}

export async function searchMemory(_query: string, _k = 5) {
  return { ok: false, error: "Memória vetorial não implementada em mock mode." };
}
