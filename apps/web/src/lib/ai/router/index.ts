import type { ChatMode, ModelKey, ProviderSlug, RoutingMode } from "@/types";
import { providersBySlug, type AIRequest, type AIResponse } from "@/lib/ai/providers";

export type TaskHint =
  | "código" | "documento" | "pesquisa" | "estratégia" | "criatividade"
  | "risco" | "multimodal" | "ops" | "governo" | "vendas";

export type QualityTier = "essencial" | "padrão" | "premium" | "flagship";

export interface RouterDecision {
  provider: ProviderSlug;
  model: string;
  reason: string;
  fallbackChain: ProviderSlug[];
  routingMode: RoutingMode;
  estimatedLatencyMs: number;
  estimatedCostUsd: number;
  qualityTier: QualityTier;
  taskHints: TaskHint[];
  debugInfo?: Record<string, unknown>;
}

const MODE_TO_PROVIDER: Record<ChatMode, ProviderSlug> = {
  padrão: "mock", strategist: "anthropic", dev: "anthropic", research: "gemini",
  document: "openai", creative: "openai", ops: "groq", mentor: "anthropic", safe: "openai",
};

const MODEL_TO_PROVIDER: Record<Exclude<ModelKey, "auto">, ProviderSlug> = {
  gpt: "openai", claude: "anthropic", gemini: "gemini",
  qwen: "qwen", groq: "groq", local: "local",
};

const PROVIDER_LATENCY: Record<ProviderSlug, number> = {
  openai: 1400, anthropic: 1600, gemini: 1300, qwen: 1100, groq: 380, local: 900, mock: 720,
};
const PROVIDER_COST: Record<ProviderSlug, number> = {
  openai: 0.005, anthropic: 0.006, gemini: 0.004, qwen: 0.002, groq: 0.0005, local: 0, mock: 0,
};
const PROVIDER_QUALITY: Record<ProviderSlug, QualityTier> = {
  openai: "premium", anthropic: "flagship", gemini: "premium",
  qwen: "padrão", groq: "essencial", local: "essencial", mock: "padrão",
};

const HINT_PATTERNS: Array<{ hint: TaskHint; regex: RegExp }> = [
  { hint: "código", regex: /\b(c[óo]digo|bug|debug|stack ?trace|typescript|python|api|refactor|implementa\w+)\b/i },
  { hint: "documento", regex: /\b(pdf|documento|contrato|edital|cl[áa]usula|relat[óo]rio|anexo)\b/i },
  { hint: "pesquisa", regex: /\b(pesquis\w+|fontes|investig\w+|concorrentes|mercado|benchmark)\b/i },
  { hint: "estratégia", regex: /\b(estrat[ée]gi\w+|posicion\w+|narrativa|roadmap|tese|GTM)\b/i },
  { hint: "criatividade", regex: /\b(criativ\w+|copy|slogan|naming|landing|storytell\w+)\b/i },
  { hint: "risco", regex: /\b(risco|complian\w+|LGPD|auditoria|regulat[óo]ri\w+)\b/i },
  { hint: "multimodal", regex: /\b(imagem|foto|v[ií]deo|[áa]udio|anexo|screenshot)\b/i },
  { hint: "ops", regex: /\b(workflow|automa\w+|processo|opera\w+|SLA|runbook)\b/i },
  { hint: "governo", regex: /\b(licita\w+|edital|TR|termo de refer[êe]ncia|setor p[úu]blico|TJSP)\b/i },
  { hint: "vendas", regex: /\b(vendas|lead|pipeline|proposta|comercial|prospec\w+)\b/i },
];

function detectHints(prompt?: string): TaskHint[] {
  if (!prompt) return [];
  return HINT_PATTERNS.filter((p) => p.regex.test(prompt)).map((p) => p.hint);
}

function buildFallback(primary: ProviderSlug): ProviderSlug[] {
  const order: ProviderSlug[] = ["anthropic", "openai", "gemini", "groq", "mock"];
  return order.filter((p) => p !== primary);
}

export function resolveRoute(opts: {
  mode?: ChatMode;
  model?: ModelKey;
  routingMode?: RoutingMode;
  prompt?: string;
}): RouterDecision {
  const { mode, model, routingMode, prompt } = opts;
  const hints = detectHints(prompt);

  let provider: ProviderSlug = "mock";
  let reason = "Roteamento automático orbeRouter";
  const effectiveRouting: RoutingMode = routingMode ?? "automático";

  if (model && model !== "auto") {
    provider = MODEL_TO_PROVIDER[model];
    reason = `Modelo selecionado manualmente (${model})`;
  } else if (routingMode === "menor custo") {
    provider = "groq"; reason = "Política de menor custo";
  } else if (routingMode === "mais rápido") {
    provider = "groq"; reason = "Política de menor latência";
  } else if (routingMode === "raciocínio profundo" || routingMode === "melhor qualidade") {
    provider = "anthropic"; reason = "Raciocínio profundo / qualidade máxima";
  } else if (hints.includes("código")) {
    provider = "anthropic"; reason = "Sinal de código no prompt → claude";
  } else if (hints.includes("pesquisa")) {
    provider = "gemini"; reason = "Sinal de pesquisa → gemini";
  } else if (hints.includes("documento") || hints.includes("governo")) {
    provider = "openai"; reason = "Documento/edital → gpt";
  } else if (hints.includes("ops") || hints.includes("vendas")) {
    provider = "groq"; reason = "Operação/comercial → latência baixa";
  } else if (mode) {
    provider = MODE_TO_PROVIDER[mode];
    reason = `Modo orbe ${mode} → provedor ideal`;
  }

  return {
    provider,
    model: providersBySlug[provider].slug,
    reason,
    fallbackChain: buildFallback(provider),
    routingMode: effectiveRouting,
    estimatedLatencyMs: PROVIDER_LATENCY[provider],
    estimatedCostUsd: PROVIDER_COST[provider],
    qualityTier: PROVIDER_QUALITY[provider],
    taskHints: hints,
    debugInfo: { hints, mode, model, routingMode },
  };
}

export async function runWithFallback(decision: RouterDecision, req: AIRequest): Promise<AIResponse> {
  const seen = new Set<ProviderSlug>();
  const order: ProviderSlug[] = [decision.provider, ...decision.fallbackChain].filter((s) => {
    if (seen.has(s)) return false; seen.add(s); return true;
  });
  let lastError: unknown;
  for (const slug of order) {
    const p = providersBySlug[slug];
    if (!p.isConfigured()) { lastError = new Error(`${slug} não configurado`); continue; }
    try { return await p.complete(req); }
    catch (e) { lastError = e; continue; }
  }
  throw lastError ?? new Error("Nenhum provedor disponível");
}
