import type { RouterDecision, TaskHint } from "@/lib/ai/router";
import { apiClient } from "@/lib/api/client";
import { chatService } from "@/lib/api/services/chatService";
import type { ChatMode, Message, MessageRole, ModelKey, ProviderSlug } from "@/types";

interface BackendMessage {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  provider: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

interface BackendMemoryEvent {
  memory_id: string;
  label: string;
  status: string;
  action: string;
  reason: string;
}

interface BackendChatSendResponse {
  chat_id: string;
  provider: string;
  model: string;
  model_run_id: string;
  user_message: BackendMessage;
  assistant_message: BackendMessage;
  memory_events?: BackendMemoryEvent[];
}

export interface LiveChatResult {
  decision: RouterDecision;
  response: {
    content: string;
    provider: ProviderSlug;
    model: string;
    latencyMs: number;
  };
  userMessage: Message | null;
  assistantMessage: Message | null;
  memoryEvents: BackendMemoryEvent[];
}

export type LiveApprovalChoice = "once" | "session" | "deny";

export interface LiveChatEvent {
  type: string;
  requestId?: string;
  chatId?: string;
  runtime?: string;
  delta?: string;
  message?: string;
  content?: string;
  reason?: string;
  error?: string;
  toolName?: string;
  preview?: string | null;
  ok?: boolean;
  durationSeconds?: number;
  title?: string;
  description?: string;
  choices?: LiveApprovalChoice[];
  partialResponse?: string;
  decision?: Record<string, unknown>;
  result?: LiveChatResult | null;
}

const MODEL_KEYS: ModelKey[] = ["auto", "gpt", "claude", "gemini", "qwen", "groq", "local"];
const TASK_HINTS: TaskHint[] = [
  "código",
  "documento",
  "pesquisa",
  "estratégia",
  "criatividade",
  "risco",
  "multimodal",
  "ops",
  "governo",
  "vendas",
];

function toModelKey(value: string | null | undefined): ModelKey {
  if (!value) return "auto";
  if (MODEL_KEYS.includes(value as ModelKey)) return value as ModelKey;

  const normalized = value.toLowerCase();
  if (normalized.includes("gpt")) return "gpt";
  if (normalized.includes("claude")) return "claude";
  if (normalized.includes("gemini")) return "gemini";
  if (normalized.includes("qwen")) return "qwen";
  if (normalized.includes("groq")) return "groq";
  return "local";
}

function toProviderSlug(value: string | null | undefined): ProviderSlug {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("openai") || normalized.includes("gpt")) return "openai";
  if (normalized.includes("anthropic") || normalized.includes("claude")) return "anthropic";
  if (normalized.includes("gemini")) return "gemini";
  if (normalized.includes("qwen")) return "qwen";
  if (normalized.includes("groq")) return "groq";
  if (normalized.includes("cognition") || normalized.includes("local")) return "local";
  return "mock";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function toTaskHints(value: unknown): TaskHint[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (hint): hint is TaskHint => typeof hint === "string" && TASK_HINTS.includes(hint as TaskHint),
  );
}

function toFallbackChain(value: unknown, actualProvider: ProviderSlug): ProviderSlug[] {
  if (!Array.isArray(value)) return [actualProvider];
  const chain = value
    .filter((provider): provider is string => typeof provider === "string")
    .map(toProviderSlug);
  return chain.length ? chain : [actualProvider];
}

function toMessage(dto: BackendMessage): Message {
  const role: MessageRole =
    dto.role === "user" || dto.role === "assistant" || dto.role === "system"
      ? dto.role
      : "assistant";

  return {
    id: dto.id,
    chatId: dto.chat_id,
    role,
    content: dto.content,
    createdAt: dto.created_at,
    model: toModelKey(dto.model ?? dto.provider),
    provider: toProviderSlug(dto.provider),
    providerName: dto.provider ?? undefined,
    modelName: dto.model ?? undefined,
    inputTokens: dto.input_tokens ?? undefined,
    outputTokens: dto.output_tokens ?? undefined,
  };
}

function normalizeResult(payload: BackendChatSendResponse): LiveChatResult {
  const provider = toProviderSlug(payload.provider);
  const assistantMeta = payload.assistant_message.meta ?? {};
  const routerDecision = asRecord(assistantMeta.router_decision);
  const latencyMs = typeof assistantMeta.latency_ms === "number" ? assistantMeta.latency_ms : 0;
  const estimatedLatencyMs = routerDecision?.estimated_latency_ms;
  const estimatedCostUsd = routerDecision?.estimated_cost_usd;

  const decision: RouterDecision = {
    provider,
    model: payload.model,
    reason:
      typeof routerDecision?.reason === "string"
        ? routerDecision.reason
        : `Resposta entregue pelo runtime vivo ${payload.provider}/${payload.model}.`,
    fallbackChain: toFallbackChain(routerDecision?.fallback_chain, provider),
    routingMode: "automático",
    estimatedLatencyMs:
      typeof estimatedLatencyMs === "number" ? estimatedLatencyMs : latencyMs,
    estimatedCostUsd:
      typeof estimatedCostUsd === "number" ? estimatedCostUsd : 0,
    qualityTier: payload.provider === "orbe-mock" ? "padrão" : "premium",
    taskHints: toTaskHints(routerDecision?.task_hints),
    debugInfo: {
      modelRunId: payload.model_run_id,
      provider: payload.provider,
      model: payload.model,
      latencyMs,
      source: "backend-live",
      routerDecision,
      providerAttempts: assistantMeta.provider_attempts,
      estimatedCostAvailable: typeof estimatedCostUsd === "number",
      estimatedLatencyAvailable: typeof estimatedLatencyMs === "number",
    },
  };

  return {
    decision,
    response: {
      content: payload.assistant_message.content,
      provider,
      model: payload.model,
      latencyMs,
    },
    userMessage: toMessage(payload.user_message),
    assistantMessage: {
      ...toMessage(payload.assistant_message),
      modelRunId: payload.model_run_id,
    },
    memoryEvents: payload.memory_events ?? [],
  };
}

function normalizeEvent(raw: Record<string, unknown>): LiveChatEvent {
  const response = raw.response as BackendChatSendResponse | null | undefined;
  return {
    type: String(raw.type ?? "message"),
    requestId: typeof raw.request_id === "string" ? raw.request_id : undefined,
    chatId: typeof raw.chat_id === "string" ? raw.chat_id : undefined,
    runtime: typeof raw.runtime === "string" ? raw.runtime : undefined,
    delta: typeof raw.delta === "string" ? raw.delta : undefined,
    message: typeof raw.message === "string" ? raw.message : undefined,
    content: typeof raw.content === "string" ? raw.content : undefined,
    reason: typeof raw.reason === "string" ? raw.reason : undefined,
    error: typeof raw.error === "string" ? raw.error : undefined,
    toolName:
      typeof raw.tool_name === "string"
        ? raw.tool_name
        : typeof raw.toolName === "string"
          ? raw.toolName
          : undefined,
    preview: typeof raw.preview === "string" ? raw.preview : null,
    ok: typeof raw.ok === "boolean" ? raw.ok : undefined,
    durationSeconds:
      typeof raw.duration_seconds === "number" ? raw.duration_seconds : undefined,
    title: typeof raw.title === "string" ? raw.title : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
    choices: Array.isArray(raw.choices)
      ? raw.choices.filter(
          (choice): choice is LiveApprovalChoice =>
            choice === "once" || choice === "session" || choice === "deny",
        )
      : undefined,
    partialResponse:
      typeof raw.partial_response === "string" ? raw.partial_response : undefined,
    decision: asRecord(raw.decision) ?? undefined,
    result: response ? normalizeResult(response) : response === null ? null : undefined,
  };
}

function parseEventBlock(block: string): Record<string, unknown> | null {
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");

  if (!data) return null;
  return JSON.parse(data) as Record<string, unknown>;
}

async function consumeSse(
  response: Response,
  onEvent: (event: LiveChatEvent) => void | Promise<void>,
): Promise<void> {
  if (!response.body) {
    throw new Error("O navegador não recebeu o fluxo vivo da orbeAI.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");

    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const raw = parseEventBlock(block);
      if (raw) await onEvent(normalizeEvent(raw));
      boundary = buffer.indexOf("\n\n");
    }

    if (done) break;
  }

  const tail = parseEventBlock(buffer.trim());
  if (tail) await onEvent(normalizeEvent(tail));
}

function mockChunks(content: string, target = 42): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const word of content.split(" ")) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > target) {
      chunks.push(`${current} `);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export const liveChatService = {
  async send(
    chatId: string,
    content: string,
    opts: { mode?: ChatMode; model?: ModelKey } = {},
    onEvent: (event: LiveChatEvent) => void | Promise<void>,
    signal?: AbortSignal,
  ): Promise<void> {
    if (apiClient.isMock) {
      const requestId = `mock_live_${Date.now()}`;
      await onEvent({
        type: "run.started",
        requestId,
        chatId,
        runtime: "mock-preview",
      });
      await onEvent({ type: "run.status", message: "orbeAI organizando o contexto…" });

      const result = await chatService.send(chatId, content, opts);
      for (const delta of mockChunks(result.response.content)) {
        if (signal?.aborted) {
          await onEvent({ type: "response.stopped", requestId, chatId });
          return;
        }
        await onEvent({ type: "response.delta", requestId, chatId, delta });
        await new Promise((resolve) => window.setTimeout(resolve, 18));
      }
      await onEvent({ type: "response.completed", requestId, chatId, result });
      return;
    }

    const response = await apiClient.stream("/v1/chat/live", {
      method: "POST",
      body: JSON.stringify({
        chat_id: chatId,
        content,
        mode: opts.mode ?? "strategist",
        model_preference: opts.model ?? "auto",
      }),
      signal,
    });
    await consumeSse(response, onEvent);
  },

  async stop(requestId: string): Promise<{ accepted: boolean }> {
    if (apiClient.isMock) return { accepted: true };
    return apiClient.request<{ accepted: boolean }>(`/v1/chat/live/${requestId}/stop`, {
      method: "POST",
    });
  },

  async approve(
    requestId: string,
    choice: LiveApprovalChoice,
  ): Promise<{ accepted: boolean; resolved: number }> {
    if (apiClient.isMock) return { accepted: true, resolved: 1 };
    return apiClient.request<{ accepted: boolean; resolved: number }>(
      `/v1/chat/live/${requestId}/approval`,
      {
        method: "POST",
        body: JSON.stringify({ choice }),
      },
    );
  },
};
