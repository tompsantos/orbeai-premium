/**
 * orbeAI — Server router stub.
 * Espelha o orbeRouter client-side. Em Fase 2 esta função roda server-side
 * e chama callLLM() com fallback chain real.
 */
export async function serverResolveAndRun(_input: {
  prompt: string;
  mode?: string;
  model?: string;
}) {
  // TODO Fase 2: importar resolveRoute do shared package e callLLM aqui.
  return { ok: false, error: "Server router não implementado em mock mode." };
}
