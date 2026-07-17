import { localStore, STORAGE_KEYS } from "@/lib/storage/localStore";
import { mockChats, mockMessages } from "@/lib/mock/data";
import { resolveRoute, runWithFallback } from "@/lib/ai/router";
import type { RouterDecision } from "@/lib/ai/router";
import { auditService } from "@/lib/api/services/auditInternal";
import { apiClient } from "@/lib/api/client";
import type { Chat, ChatMode, Message, MessageRole, ModelKey, ProviderSlug } from "@/types";

interface BackendChat {
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  mode: string;
  model_preference: string;
  created_at: string;
  updated_at: string;
}

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

const CHAT_MODES: ChatMode[] = [
  "padrão",
  "strategist",
  "dev",
  "research",
  "document",
  "creative",
  "ops",
  "mentor",
  "safe",
];

const MODEL_KEYS: ModelKey[] = [
  "auto",
  "gpt",
  "claude",
  "gemini",
  "qwen",
  "groq",
  "local",
];

function allChats(): Chat[] {
  localStore.ensureSeeded();
  return localStore.get<Chat[]>(STORAGE_KEYS.chats, mockChats);
}

function saveChats(list: Chat[]) {
  localStore.set(STORAGE_KEYS.chats, list);
}

function allMessages(): Record<string, Message[]> {
  localStore.ensureSeeded();
  return localStore.get<Record<string, Message[]>>(STORAGE_KEYS.messages, mockMessages);
}

function saveMessages(map: Record<string, Message[]>) {
  localStore.set(STORAGE_KEYS.messages, map);
}

function toChatMode(value: string | null | undefined): ChatMode {
  if (value && CHAT_MODES.includes(value as ChatMode)) {
    return value as ChatMode;
  }

  return "padrão";
}

function toModelKey(value: string | null | undefined): ModelKey {
  if (!value) return "auto";

  if (MODEL_KEYS.includes(value as ModelKey)) {
    return value as ModelKey;
  }

  const normalized = value.toLowerCase();

  if (normalized.includes("gpt")) return "gpt";
  if (normalized.includes("claude")) return "claude";
  if (normalized.includes("gemini")) return "gemini";
  if (normalized.includes("qwen")) return "qwen";
  if (normalized.includes("groq")) return "groq";
  if (normalized.includes("local")) return "local";

  return "auto";
}

function toProviderSlug(value: string | null | undefined): ProviderSlug {
  const normalized = (value ?? "").toLowerCase();

  if (normalized.includes("openai") || normalized.includes("gpt")) return "openai";
  if (normalized.includes("anthropic") || normalized.includes("claude")) return "anthropic";
  if (normalized.includes("gemini")) return "gemini";
  if (normalized.includes("qwen")) return "qwen";
  if (normalized.includes("groq")) return "groq";
  if (normalized.includes("local")) return "local";

  return "mock";
}

function toChat(dto: BackendChat): Chat {
  return {
    id: dto.id,
    title: dto.title,
    projectId: dto.project_id ?? undefined,
    mode: toChatMode(dto.mode),
    model: toModelKey(dto.model_preference),
    updatedAt: dto.updated_at,
    pinned: false,
  };
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

function decisionFromBackend(payload: BackendChatSendResponse): RouterDecision {
  const provider = toProviderSlug(payload.provider);

  return {
    provider,
    model: payload.model,
    reason: `Resposta gerada pelo backend real da orbeAI usando ${payload.provider}/${payload.model}.`,
    fallbackChain: [provider],
    routingMode: "automático",
    estimatedLatencyMs: 0,
    estimatedCostUsd: 0,
    qualityTier: provider === "mock" ? "padrão" : "premium",
    taskHints: [],
    debugInfo: {
      modelRunId: payload.model_run_id,
      provider: payload.provider,
      model: payload.model,
      source: "backend",
    },
  };
}

export const chatService = {
  async list(): Promise<Chat[]> {
    if (apiClient.isMock) {
      return allChats();
    }

    const chats = await apiClient.request<BackendChat[]>("/v1/chats");
    return chats.map(toChat);
  },

  async get(id: string): Promise<Chat | null> {
    if (apiClient.isMock) {
      return allChats().find((c) => c.id === id) ?? null;
    }

    try {
      const chat = await apiClient.request<BackendChat>(`/v1/chats/${id}`);
      return toChat(chat);
    } catch {
      return null;
    }
  },

  async messages(chatId: string): Promise<Message[]> {
    if (apiClient.isMock) {
      return allMessages()[chatId] ?? [];
    }

    const messages = await apiClient.request<BackendMessage[]>(`/v1/chats/${chatId}/messages`);
    return messages.map(toMessage);
  },

  async create(input: Partial<Chat> & { title?: string } = {}): Promise<Chat> {
    if (!apiClient.isMock) {
      const chat = await apiClient.request<BackendChat>("/v1/chats", {
        method: "POST",
        body: JSON.stringify({
          title: input.title ?? "Nova conversa",
          project_id: input.projectId,
          mode: input.mode ?? "padrão",
          model_preference: input.model ?? "auto",
        }),
      });

      return toChat(chat);
    }

    const chat: Chat = {
      id: `c_${Date.now()}`,
      title: input.title ?? "Nova conversa",
      projectId: input.projectId,
      mode: input.mode ?? "padrão",
      model: input.model ?? "auto",
      updatedAt: new Date().toISOString(),
      pinned: false,
    };

    saveChats([chat, ...allChats()]);

    const map = allMessages();
    map[chat.id] = [];
    saveMessages(map);

    auditService.log({ action: "chat.create", target: chat.id });

    return chat;
  },

  async appendMessage(chatId: string, msg: Message) {
    if (!apiClient.isMock) {
      return;
    }

    const map = allMessages();
    map[chatId] = [...(map[chatId] ?? []), msg];
    saveMessages(map);

    const chats = allChats();
    const idx = chats.findIndex((c) => c.id === chatId);

    if (idx >= 0) {
      chats[idx] = { ...chats[idx], updatedAt: new Date().toISOString() };
      saveChats(chats);
    }
  },

  async remove(chatId: string): Promise<void> {
    if (!apiClient.isMock) {
      await apiClient.request<void>(`/v1/chats/${chatId}`, {
        method: "DELETE",
      });

      return;
    }

    const chats = allChats().filter((c) => c.id !== chatId);
    saveChats(chats);

    const map = allMessages();
    delete map[chatId];
    saveMessages(map);

    auditService.log({ action: "chat.delete", target: chatId, level: "warn" });
  },

  async togglePin(chatId: string, messageId: string) {
    if (!apiClient.isMock) {
      return;
    }

    const map = allMessages();

    map[chatId] = (map[chatId] ?? []).map((m) =>
      m.id === messageId ? { ...m, pinned: !m.pinned } : m,
    );

    saveMessages(map);
  },

  async send(chatId: string, content: string, opts: { mode?: ChatMode; model?: ModelKey } = {}) {
    if (!apiClient.isMock) {
      const payload = await apiClient.request<BackendChatSendResponse>("/v1/chat/send", {
        method: "POST",
        body: JSON.stringify({
          chat_id: chatId,
          content,
          mode: opts.mode ?? "strategist",
          model_preference: opts.model ?? "auto",
        }),
      });

      return {
        decision: decisionFromBackend(payload),
        response: {
          content: payload.assistant_message.content,
          provider: toProviderSlug(payload.provider),
          model: payload.model,
          latencyMs: 0,
        },
        userMessage: toMessage(payload.user_message),
        assistantMessage: {
          ...toMessage(payload.assistant_message),
          modelRunId: payload.model_run_id,
        },
        memoryEvents: payload.memory_events ?? [],
      };
    }

    const decision = resolveRoute({ mode: opts.mode, model: opts.model, prompt: content });
    const response = await runWithFallback(decision, {
      prompt: content,
      mode: opts.mode,
      model: opts.model,
    });

    auditService.log({ action: "chat.send", target: chatId, level: "info" });

    return { decision, response, userMessage: null, assistantMessage: null, memoryEvents: [] };
  },

  async compare(content: string, models: ModelKey[], mode?: ChatMode) {
    const results = await Promise.all(
      models.map(async (m) => {
        const decision = resolveRoute({ mode, model: m, prompt: content });

        try {
          const response = await runWithFallback(decision, {
            prompt: content,
            mode,
            model: m,
          });

          return { model: m, decision, response, error: null as string | null };
        } catch (e) {
          return {
            model: m,
            decision,
            response: null,
            error: (e as Error).message,
          };
        }
      }),
    );

    return results;
  },
};
