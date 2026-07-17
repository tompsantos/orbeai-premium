/**
 * orbeAI — localStore
 * Helper SSR-safe sobre window.localStorage com prefixo orbeai:.
 * Seed inicial a partir de mockData quando a chave não existe.
 */
import {
  mockAgents, mockArtifacts, mockAudit, mockChats, mockFlags, mockIntegrations,
  mockMemory, mockMessages, mockProjects, mockProviders, mockResearch, mockUsage,
} from "@/lib/mock/data";

const PREFIX = "orbeai:";

export const STORAGE_KEYS = {
  chats: `${PREFIX}chats`,
  messages: `${PREFIX}messages`,
  projects: `${PREFIX}projects`,
  artifacts: `${PREFIX}artifacts`,
  memory: `${PREFIX}memory`,
  integrations: `${PREFIX}integrations`,
  modelConfig: `${PREFIX}model-config`,
  featureFlags: `${PREFIX}feature-flags`,
  auditLogs: `${PREFIX}audit-logs`,
  usageEvents: `${PREFIX}usage-events`,
  agents: `${PREFIX}agents`,
  providers: `${PREFIX}providers`,
  research: `${PREFIX}research`,
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

// in-memory fallback for SSR so reads don't crash
const memoryStore = new Map<string, string>();

function readRaw(key: string): string | null {
  if (!isBrowser()) return memoryStore.get(key) ?? null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function writeRaw(key: string, value: string) {
  if (!isBrowser()) { memoryStore.set(key, value); return; }
  try { window.localStorage.setItem(key, value); } catch { /* quota or private mode */ }
}

export function get<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (raw == null) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function set<T>(key: string, value: T): T {
  writeRaw(key, JSON.stringify(value));
  return value;
}

export function update<T>(key: string, fallback: T, updater: (current: T) => T): T {
  const next = updater(get<T>(key, fallback));
  return set(key, next);
}

export function remove(key: string) {
  if (!isBrowser()) { memoryStore.delete(key); return; }
  try { window.localStorage.removeItem(key); } catch { /* ignore */ }
}

/** Seed a key with mock data if it's never been written. */
function seed<T>(key: string, seedValue: T): T {
  const existing = readRaw(key);
  if (existing != null) {
    try { return JSON.parse(existing) as T; } catch { /* fall through to reseed */ }
  }
  return set(key, seedValue);
}

/** Initialize all stores with mock data when missing. Safe to call repeatedly. */
export function ensureSeeded() {
  seed(STORAGE_KEYS.chats, mockChats);
  seed(STORAGE_KEYS.messages, mockMessages);
  seed(STORAGE_KEYS.projects, mockProjects);
  seed(STORAGE_KEYS.artifacts, mockArtifacts);
  seed(STORAGE_KEYS.memory, mockMemory);
  seed(STORAGE_KEYS.integrations, mockIntegrations);
  seed(STORAGE_KEYS.auditLogs, mockAudit);
  seed(STORAGE_KEYS.usageEvents, mockUsage);
  seed(STORAGE_KEYS.featureFlags, mockFlags);
  seed(STORAGE_KEYS.agents, mockAgents);
  seed(STORAGE_KEYS.providers, mockProviders);
  seed(STORAGE_KEYS.research, mockResearch);
  seed(STORAGE_KEYS.modelConfig, {
    defaultProvider: "mock" as const,
    fallbackChain: ["mock"] as const,
    routingMode: "automático" as const,
  });
}

/** Wipe all orbeai:* keys and reseed from mock data. */
export function resetDemoData() {
  Object.values(STORAGE_KEYS).forEach(remove);
  ensureSeeded();
}

export const localStore = {
  get, set, update, remove, ensureSeeded, resetDemoData, keys: STORAGE_KEYS,
};
