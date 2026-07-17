/**
 * orbeAI — LLM server adapter (stub).
 *
 * TODO Fase 2:
 *  - Implementar createServerFn por provedor.
 *  - Ler chaves de process.env DENTRO do handler (Workers env por request).
 *  - Nunca expor chaves para o client. Nunca importar este arquivo do client.
 *
 * Chaves esperadas (server-side only):
 *  - OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, QWEN_API_KEY, GROQ_API_KEY
 */
import type { LLMCallInput, LLMCallOutput, ServerResult } from "./types";

export async function callLLM(_input: LLMCallInput): Promise<ServerResult<LLMCallOutput>> {
  // Placeholder seguro — não chama provedor real até Fase 2.
  return {
    ok: false,
    error: "LLM real ainda não conectado. Use MockProvider via orbeRouter.",
    code: "LLM_NOT_CONFIGURED",
  };
}
