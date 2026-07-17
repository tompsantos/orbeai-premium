/**
 * orbeAI — Backend contracts.
 * Tipos compartilhados entre client (mock/local) e futuro server real.
 * Mantém a fronteira clara: o que entra, o que sai, o que pode ser auditado.
 */
import type {
  Artifact, ChatMode, MemoryItem, ModelKey, ProviderSlug, RoutingMode,
} from "@/types";
import type { RouterDecision, TaskHint } from "@/lib/ai/router";

export interface ChatSendInput {
  chatId: string;
  prompt: string;
  mode?: ChatMode;
  model?: ModelKey;
  attachments?: { id: string; name: string; kind: string }[];
}

export interface ChatSendResult {
  decision: RouterDecision;
  content: string;
  provider: ProviderSlug;
  model: string;
  latencyMs: number;
  hints: TaskHint[];
}

export interface MemorySaveInput {
  label: string;
  content: string;
  scope: MemoryItem["scope"];
  source: MemoryItem["source"];
  reason?: string;
  projectId?: string;
}

export interface ArtifactSaveInput {
  title: string;
  kind: Artifact["kind"];
  content: string;
  projectId?: string;
}

export interface RouterResolveInput {
  prompt?: string;
  mode?: ChatMode;
  model?: ModelKey;
  routingMode?: RoutingMode;
}

export interface AuditEntryInput {
  action: string;
  target: string;
  level?: "info" | "warn" | "error";
  actor?: string;
}

export interface BackendContract {
  chat: {
    send(input: ChatSendInput): Promise<ChatSendResult>;
  };
  router: {
    resolve(input: RouterResolveInput): Promise<RouterDecision>;
  };
  memory: {
    save(input: MemorySaveInput): Promise<MemoryItem>;
  };
  artifacts: {
    save(input: ArtifactSaveInput): Promise<Artifact>;
  };
  audit: {
    log(input: AuditEntryInput): Promise<void>;
  };
}
