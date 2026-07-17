import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GlassCard, Pill, SectionHeader } from "@/components/design-system/Primitives";
import { Button } from "@/components/ui/button";
import { modelService } from "@/lib/api";
import { resolveRoute } from "@/lib/ai/router";
import type {
  ModelConfig,
  ModelProvider,
  ModelRun,
  ProviderSlug,
  ProviderUsageSummary,
  RoutingMode,
} from "@/types";
import { Activity, AlertTriangle, BarChart3, Clock, Cpu, KeyRound, RefreshCw, Route as RouteIcon, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/models")({
  head: () => ({ meta: [{ title: "Modelos · orbeAI" }] }),
  component: ModelsPage,
});

const MODES: RoutingMode[] = ["automático", "menor custo", "melhor qualidade", "mais rápido", "raciocínio profundo", "código", "pesquisa", "documento", "multimodal"];
const ALL: ProviderSlug[] = ["anthropic", "openai", "gemini", "groq", "qwen", "local", "mock"];

function formatDate(value?: string) {
  if (!value) return "—";

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCost(value: number) {
  if (!Number.isFinite(value) || value === 0) return "US$ 0.000000";
  if (Math.abs(value) < 0.01) return `US$ ${value.toFixed(6)}`;

  return `US$ ${value.toFixed(4)}`;
}

function formatCostPerK(value?: number) {
  if (!value) return "$0.000000/1k";
  if (Math.abs(value) < 0.01) return `$${value.toFixed(6)}/1k`;

  return `$${value.toFixed(4)}/1k`;
}

function ModelsPage() {
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [runs, setRuns] = useState<ModelRun[]>([]);
  const [usage, setUsage] = useState<ProviderUsageSummary[]>([]);

  async function refresh() {
    const [ps, cfg, rs, us] = await Promise.all([
      modelService.providers(),
      modelService.getConfig(),
      modelService.modelRuns(20),
      modelService.providerUsage(),
    ]);

    setProviders(ps);
    setConfig(cfg);
    setRuns(rs);
    setUsage(us);
  }

  useEffect(() => { void refresh(); }, []);

  const preview = useMemo(() => config ? resolveRoute({ routingMode: config.routingMode }) : null, [config]);

  const totals = useMemo(() => ({
    requests: usage.reduce((sum, item) => sum + item.requests, 0),
    tokens: usage.reduce((sum, item) => sum + item.tokens, 0),
    costUsd: usage.reduce((sum, item) => sum + item.costUsd, 0),
    errors: usage.reduce((sum, item) => sum + item.errors, 0),
  }), [usage]);

  if (!config) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;

  async function setDefault(slug: ProviderSlug) {
    await modelService.setDefaultProvider(slug);
    toast.success(`Padrão: ${slug}`);
    await refresh();
  }

  async function setMode(mode: RoutingMode) {
    await modelService.setRoutingMode(mode);
    await refresh();
  }

  async function toggleFallback(slug: ProviderSlug) {
    const chain = config!.fallbackChain.includes(slug)
      ? config!.fallbackChain.filter((p) => p !== slug)
      : [...config!.fallbackChain, slug];

    await modelService.setFallbackChain(chain);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader eyebrow="model router" title="Roteamento inteligente de modelos"
          description="orbeRouter escolhe o melhor provedor por tarefa, custo, latência e disponibilidade." />
        <Button variant="outline" size="sm" onClick={() => void refresh()}>
          <RefreshCw className="size-3.5 mr-1.5" />
          Atualizar métricas
        </Button>
      </div>

      <GlassCard hoverable={false} className="border-[color-mix(in_oklch,var(--orbe-blue)_28%,var(--border))] bg-[color-mix(in_oklch,var(--orbe-blue)_6%,var(--card))]">
        <div className="flex items-start gap-3 text-sm">
          <span className="flex items-center justify-center size-8 rounded-lg bg-[color-mix(in_oklch,var(--orbe-blue)_18%,transparent)] shrink-0">
            <AlertTriangle className="size-4 text-[var(--orbe-blue)]" />
          </span>
          <div>
            <div className="font-medium">Providers reais ficam protegidos no backend.</div>
            <p className="text-muted-foreground mt-1 text-pretty">
              OpenAI e Gemini já podem executar server-side quando habilitados por ambiente. Outros providers seguem como placeholder até serem plugados no roteiro.
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassCard hoverable={false}>
          <div className="text-xs text-muted-foreground">requisições</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{totals.requests}</div>
        </GlassCard>
        <GlassCard hoverable={false}>
          <div className="text-xs text-muted-foreground">tokens</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{totals.tokens.toLocaleString("pt-BR")}</div>
        </GlassCard>
        <GlassCard hoverable={false}>
          <div className="text-xs text-muted-foreground">custo estimado</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{formatCost(totals.costUsd)}</div>
        </GlassCard>
        <GlassCard hoverable={false}>
          <div className="text-xs text-muted-foreground">erros/fallbacks</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{totals.errors}</div>
        </GlassCard>
      </div>

      <GlassCard hoverable={false}>
        <SectionHeader eyebrow="modo de roteamento" title="Como a orbeAI escolhe modelos" />
        <div className="flex flex-wrap gap-1.5">
          {MODES.map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                config.routingMode === m
                  ? "bg-[var(--orbe-blue)] text-white border-transparent shadow-[var(--shadow-xs)]"
                  : "border-border/70 text-muted-foreground hover:text-foreground hover:bg-accent/50")}>
              {m}
            </button>
          ))}
        </div>
        {preview && (
          <div className="mt-4 grid sm:grid-cols-2 gap-3 text-xs">
            <div className="orbe-surface p-3.5">
              <div className="orbe-eyebrow">decisão preview</div>
              <div className="mt-2 font-medium text-sm">{preview.provider} · {preview.qualityTier}</div>
              <div className="text-muted-foreground mt-0.5">{preview.reason}</div>
              <div className="text-muted-foreground mt-1.5 tabular-nums">~{preview.estimatedLatencyMs}ms · US$ {preview.estimatedCostUsd.toFixed(4)}/1k</div>
            </div>
            <div className="orbe-surface p-3.5">
              <div className="orbe-eyebrow">cadeia de fallback</div>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium"><RouteIcon className="size-3 text-[var(--orbe-blue)]" /> {config.fallbackChain.join(" → ")}</div>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {ALL.map((slug) => (
                  <button key={slug} onClick={() => toggleFallback(slug)}
                    className={cn("px-2 py-0.5 rounded-md text-[11px] border transition-colors",
                      config.fallbackChain.includes(slug)
                        ? "bg-[var(--orbe-blue)] text-white border-transparent"
                        : "border-border/70 text-muted-foreground hover:bg-accent/40")}>
                    {slug}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </GlassCard>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {providers.map((p) => (
          <GlassCard key={p.slug} className="orbe-card-hover">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-lg bg-gradient-to-br from-[var(--orbe-blue)] to-[var(--orbe-cyan)] flex items-center justify-center"><Cpu className="size-4 text-white" /></div>
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.models.length} modelos</div>
                </div>
              </div>
              <Pill tone={p.status === "online" ? "success" : p.status === "placeholder" ? "muted" : "warn"}>{p.status}</Pill>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="orbe-surface p-2 tabular-nums"><Activity className="inline size-3 mr-1 text-muted-foreground" /> {p.latencyMs ?? "—"} ms</div>
              <div className="orbe-surface p-2 tabular-nums"><Zap className="inline size-3 mr-1 text-muted-foreground" /> {formatCostPerK(p.costPerKTokens)}</div>
            </div>
            <div className="mt-3">
              <div className="orbe-eyebrow mb-1.5">Modelos</div>
              <div className="flex flex-wrap gap-1">{p.models.map((m) => <Pill key={m} tone="muted">{m}</Pill>)}</div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1"><KeyRound className="size-3" /> {p.apiKeyStatus}</span>
              <Button size="sm" variant={config.defaultProvider === p.slug ? "default" : "outline"} onClick={() => setDefault(p.slug)}>
                {config.defaultProvider === p.slug ? "Padrão" : "Definir padrão"}
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard hoverable={false}>
        <SectionHeader eyebrow="uso por provider" title="Execuções agregadas"
          description="Resumo calculado a partir dos model_runs reais gravados no backend." />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {usage.map((item) => (
            <div key={item.provider} className="orbe-surface p-3.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{item.providerName}</div>
                <Pill tone={item.errors ? "warn" : "success"}>{item.errors ? `${item.errors} erro(s)` : "ok"}</Pill>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><BarChart3 className="inline size-3 mr-1 text-muted-foreground" /> {item.requests} chamadas</div>
                <div><Cpu className="inline size-3 mr-1 text-muted-foreground" /> {item.tokens.toLocaleString("pt-BR")} tokens</div>
                <div><Clock className="inline size-3 mr-1 text-muted-foreground" /> {item.avgLatencyMs || "—"} ms méd.</div>
                <div><Zap className="inline size-3 mr-1 text-muted-foreground" /> {formatCost(item.costUsd)}</div>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">última execução: {formatDate(item.lastRunAt)}</div>
            </div>
          ))}
          {usage.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhuma execução real registrada ainda.</div>
          )}
        </div>
      </GlassCard>

      <GlassCard hoverable={false}>
        <SectionHeader eyebrow="model_runs" title="Execuções recentes"
          description="Últimas chamadas feitas pelo backend, incluindo provider, modelo, tokens e fallback." />
        <div className="space-y-2">
          {runs.map((run) => (
            <div key={run.id} className="orbe-surface p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">
                  {run.providerName} · {run.modelName}
                </div>
                <div className="text-muted-foreground tabular-nums">{formatDate(run.createdAt)}</div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-2 text-muted-foreground">
                <span>{run.taskType ?? "task"}</span>
                <span>·</span>
                <span>{run.inputTokens}+{run.outputTokens} tokens</span>
                <span>·</span>
                <span>{run.latencyMs ?? "—"} ms</span>
                <span>·</span>
                <span>{formatCost(run.estimatedCostUsd)}</span>
              </div>
              {run.errorMessage && (
                <div className="mt-2 text-[11px] text-[var(--warning)] line-clamp-2">
                  {run.errorMessage}
                </div>
              )}
              {run.routerReason && (
                <div className="mt-2 text-[11px] text-muted-foreground line-clamp-2">
                  {run.routerReason}
                </div>
              )}
            </div>
          ))}
          {runs.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhuma execução recente.</div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
