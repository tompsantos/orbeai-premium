/**
 * orbeAI — Server API types (server-side only).
 * Shared shapes between TanStack server functions and the future real backend.
 * Keep free of browser-only imports.
 */
export type ServerOk<T> = { ok: true; data: T };
export type ServerErr = { ok: false; error: string; code?: string };
export type ServerResult<T> = ServerOk<T> | ServerErr;

export interface LLMCallInput {
  provider: "openai" | "anthropic" | "gemini" | "qwen" | "groq" | "local";
  model: string;
  prompt: string;
  system?: string;
  temperature?: number;
}

export interface LLMCallOutput {
  content: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
}
