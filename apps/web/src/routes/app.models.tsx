import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Code2,
  Cpu,
  FileSearch,
  Gauge,
  KeyRound,
  Layers3,
  RefreshCw,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { OrbeMark } from "@/components/design-system/OrbeLogo";
import { Pill } from "@/components/design-system/Primitives";
import { Button } from "@/components/ui/button";
import { modelService } from "@/lib/api";
import { resolveRoute } from "@/lib/ai/router";
import { cn } from "@/lib/utils";
import type {
  ModelConfig,
  ModelProvider,
  ModelRun,
  ProviderSlug,
  ProviderUsageSummary,
  RoutingMode,
} from "@/types";

export const Route = createFileRoute("/app/models")({
  head: () => ({ meta: [{ title: "Laboratório · orbeAI" }] }),
  component: LaboratoryPage,
});

type LaboratoryTab = "visao" | "roteamento" | "motores" | "atividade";

type StrategyOption = {
  mode: RoutingMode;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  hint: string;
};

const MAIN_STRATEGIES: StrategyOption[] = [
  {
    mode: "automático",
    title: "Deixar a orbeAI decidir",
    description: "Equilibra qualidade, velocidade e disponibilidade para cada pedido.",
    icon: Sparkles,
    hint: "recomendado",
  },
  {
    mode: "melhor qualidade",
    title: "Priorizar a melhor resposta",
    description: "Usa opções mais fortes quando profundidade e acabamento importam mais.",
    icon: WandSparkles,
    hint: "mais cuidadoso",
  },
  {
    mode: "mais rápido",
    title: "Responder mais rápido",
    description: "Favorece baixa espera para conversas e tarefas diretas.",
    icon: Zap,
    hint: "menor espera",
  },
  {
    mode: "menor custo",
    title: "Economizar recursos",
    description: "Escolhe alternativas eficientes sem abandonar a cadeia de segurança.",
    icon: CircleDollarSign,
    hint: "mais econômico",
  },
];

const SPECIALIZED_STRATEGIES: StrategyOption[] = [
  {
    mode: "raciocínio profundo",
    title: "Raciocínio profundo",
    description: "Para decisões complexas, planejamento e problemas com muitas etapas.",
    icon: BrainCircuit,
    hint: "análise",
  },
  {
    mode: "código",
    title: "Código e arquitetura",
    description: "Favorece motores preparados para programação, revisão e debug.",
    icon: Code2,
    hint: "desenvolvimento",
  },
  {
    mode: "pesquisa",
    title: "Pesquisa",
    description: "Dá preferência a investigação, síntese e trabalho com fontes.",
    icon: Search,
    hint: "investigação",
  },
  {
    mode: "documento",
    title: "Documentos",
    description: "Otimiza leitura, extração, comparação e produção de textos longos.",
    icon: FileSearch,
    hint: "arquivos",
  },
  {
    mode: "multimodal",
    title: "Imagens e arquivos",
    description: "Prioriza motores capazes de compreender diferentes formatos.",
    icon: Layers3,
    hint: "multimodal",
  },
];

const ALL_PROVIDERS: ProviderSlug[] = ["anthropic", "openai", "gemini", "groq", "qwen", "local", "mock"];

function formatDate(value?: string) {
  if (!value) return "ainda não usado";

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCost(value: number) {
  if (!Number.isFinite(value) || value === 0) return "US$ 0,00";
  if (Math.abs(value) < 0.01) return `US$ ${value.toFixed(4).replace(".", ",")}`;

  return `US$ ${value.toFixed(2).replace(".", ",")}`;
}

function providerStatus(provider: ModelProvider) {
  if (provider.status === "online") return { label: "pronto", tone: "success" as const };
  if (provider.status === "offline") return { label: "indisponível", tone: "warn" as const };
  return { label: "em preparação", tone: "muted" as const };
}

function credentialLabel(provider: ModelProvider) {
  if (provider.apiKeyStatus === "configurado") return "acesso configurado";
  if (provider.apiKeyStatus === "ambiente") return "gerenciado pelo ambiente";
  return "aguardando configuração";
}

function LaboratoryPage() {
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [runs, setRuns] = useState<ModelRun[]>([]);
  const [usage, setUsage] = useState<ProviderUsageSummary[]>([]);
  const [tab, setTab] = useState<LaboratoryTab>("visao");
  const [showSpecialized, setShowSpecialized] = useState(false);

  async function refresh() {
    const [nextProviders, nextConfig, nextRuns, nextUsage] = await Promise.all([
      modelService.providers(),
      modelService.getConfig(),
      modelService.modelRuns(30),
      modelService.providerUsage(),
    ]);

    setProviders(nextProviders);
    setConfig(nextConfig);
    setRuns(nextRuns);
    setUsage(nextUsage);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const preview = useMemo(
    () => (config ? resolveRoute({ routingMode: config.routingMode }) : null),
    [config],
  );

  const totals = useMemo(
    () => ({
      requests: usage.reduce((sum, item) => sum + item.requests, 0),
      tokens: usage.reduce((sum, item) => sum + item.tokens, 0),
      costUsd: usage.reduce((sum, item) => sum + item.costUsd, 0),
      errors: usage.reduce((sum, item) => sum + item.errors, 0),
    }),
    [usage],
  );

  const readyProviders = providers.filter((provider) => provider.status === "online").length;
  const currentProvider = providers.find((provider) => provider.slug === config?.defaultProvider);

  async function setMode(mode: RoutingMode) {
    await modelService.setRoutingMode(mode);
    await refresh();
    toast.success("Estratégia atualizada", {
      description: "A orbeAI vai usar essa preferência nas próximas escolhas.",
    });
  }

  async function setDefault(slug: ProviderSlug) {
    await modelService.setDefaultProvider(slug);
    await refresh();
    toast.success("Motor principal atualizado");
  }

  async function toggleFallback(slug: ProviderSlug) {
    if (!config) return;

    const nextChain = config.fallbackChain.includes(slug)
      ? config.fallbackChain.filter((provider) => provider !== slug)
      : [...config.fallbackChain, slug];

    await modelService.setFallbackChain(nextChain);
    await refresh();
  }

  if (!config) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Preparando o Laboratório…
      </div>
    );
  }

  const tabs: Array<{ id: LaboratoryTab; label: string }> = [
    { id: "visao", label: "Visão geral" },
    { id: "roteamento", label: "Como escolhe" },
    { id: "motores", label: "Motores" },
    { id: "atividade", label: "Atividade" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-6">
      <section className="overflow-hidden rounded-[1.8rem] border border-border/70 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98)_52%,rgba(236,254,255,0.76))] p-6 shadow-[0_24px_75px_-58px_rgba(15,23,42,0.72)] md:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-white/80 bg-white/80 shadow-sm">
                <OrbeMark size={24} />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--orbe-blue)]">área avançada</div>
                <div className="mt-0.5 text-sm text-muted-foreground">o cérebro técnico da orbeAI</div>
              </div>
            </div>

            <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-foreground md:text-[2.65rem] md:leading-[1.08]">
              Laboratório
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              A orbeAI escolhe automaticamente a inteligência mais adequada para cada pedido. Aqui você pode observar, ajustar preferências e abrir o capô quando precisar.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                <ShieldCheck className="size-3.5" /> funcionamento protegido
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white/75 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5 text-[var(--orbe-blue)]" /> escolha automática disponível
              </span>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/90 bg-white/78 p-5 shadow-[0_18px_55px_-45px_rgba(15,23,42,0.8)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">estado atual</div>
                <div className="mt-1 text-lg font-semibold">A orbeAI está no controle</div>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--orbe-blue)_12%,white)] text-[var(--orbe-blue)]">
                <BrainCircuit className="size-5" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3.5">
                <div className="text-[11px] text-muted-foreground">estratégia</div>
                <div className="mt-1 text-sm font-semibold capitalize">{config.routingMode}</div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3.5">
                <div className="text-[11px] text-muted-foreground">motores prontos</div>
                <div className="mt-1 text-sm font-semibold">{readyProviders} de {providers.length}</div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-border/60 bg-background/70 p-3.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">motor principal</span>
                <span className="font-medium">{currentProvider?.name ?? config.defaultProvider}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-muted-foreground">plano de segurança</span>
                <span className="font-medium">{config.fallbackChain.length} opção(ões)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 border-b border-border/70 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto pb-px">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "relative shrink-0 px-3.5 py-3 text-sm font-medium transition-colors",
                tab === item.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              {tab === item.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--orbe-blue)]" />}
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={() => void refresh()} className="mb-2 self-start text-muted-foreground sm:self-auto">
          <RefreshCw className="mr-1.5 size-3.5" /> atualizar
        </Button>
      </div>

      {tab === "visao" && (
        <div className="space-y-6">
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold tracking-tight">Como você prefere que ela trabalhe?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Essa escolha orienta o roteamento. No modo automático, a orbeAI se adapta a cada conversa.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {MAIN_STRATEGIES.map((strategy) => {
                const Icon = strategy.icon;
                const selected = config.routingMode === strategy.mode;

                return (
                  <button
                    key={strategy.mode}
                    onClick={() => void setMode(strategy.mode)}
                    className={cn(
                      "group relative rounded-[1.35rem] border p-5 text-left transition-all",
                      selected
                        ? "border-[color-mix(in_oklch,var(--orbe-blue)_45%,var(--border))] bg-[color-mix(in_oklch,var(--orbe-blue)_7%,var(--card))] shadow-[0_16px_45px_-38px_rgba(37,99,235,0.8)]"
                        : "border-border/70 bg-card hover:-translate-y-0.5 hover:border-border hover:shadow-sm",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={cn("flex size-10 items-center justify-center rounded-xl", selected ? "bg-[var(--orbe-blue)] text-white" : "bg-muted text-muted-foreground group-hover:text-foreground")}>
                        <Icon className="size-5" />
                      </div>
                      {selected ? (
                        <span className="flex size-6 items-center justify-center rounded-full bg-[var(--orbe-blue)] text-white"><Check className="size-3.5" /></span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">{strategy.hint}</span>
                      )}
                    </div>
                    <div className="mt-4 font-semibold">{strategy.title}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{strategy.description}</p>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowSpecialized((value) => !value)}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronDown className={cn("size-4 transition-transform", showSpecialized && "rotate-180")} />
              {showSpecialized ? "Ocultar modos especializados" : "Ver modos especializados"}
            </button>

            {showSpecialized && (
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {SPECIALIZED_STRATEGIES.map((strategy) => {
                  const Icon = strategy.icon;
                  const selected = config.routingMode === strategy.mode;

                  return (
                    <button
                      key={strategy.mode}
                      onClick={() => void setMode(strategy.mode)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-colors",
                        selected
                          ? "border-[var(--orbe-blue)] bg-[color-mix(in_oklch,var(--orbe-blue)_8%,var(--card))]"
                          : "border-border/70 bg-card hover:bg-accent/30",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn("size-4", selected ? "text-[var(--orbe-blue)]" : "text-muted-foreground")} />
                        <span className="text-sm font-semibold">{strategy.title}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{strategy.description}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Activity} label="pedidos processados" value={totals.requests.toLocaleString("pt-BR")} detail="execuções registradas" />
            <MetricCard icon={Clock3} label="atividade recente" value={runs.length ? formatDate(runs[0]?.createdAt) : "sem registros"} detail="última escolha observada" />
            <MetricCard icon={CircleDollarSign} label="custo estimado" value={formatCost(totals.costUsd)} detail="somatório disponível" />
            <MetricCard icon={ShieldCheck} label="intercorrências" value={String(totals.errors)} detail={totals.errors ? "pedem atenção" : "nenhum alerta registrado"} />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[1.4rem] border border-border/70 bg-card p-5 md:p-6">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--orbe-blue)_10%,var(--card))] text-[var(--orbe-blue)]">
                  <RouteIcon className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">O que acontece nos bastidores</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Cada pedido é interpretado, encaminhado para um motor adequado e protegido por alternativas. Para o usuário comum, tudo isso continua invisível.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["1", "Entender", "identifica o tipo de ajuda"],
                  ["2", "Escolher", "seleciona o motor adequado"],
                  ["3", "Proteger", "troca de rota se necessário"],
                ].map(([number, title, description]) => (
                  <div key={number} className="rounded-2xl bg-muted/45 p-4">
                    <div className="text-xs font-semibold text-[var(--orbe-blue)]">{number}</div>
                    <div className="mt-2 text-sm font-semibold">{title}</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-card p-5 md:p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">decisão simulada</div>
              {preview ? (
                <>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold capitalize">{preview.provider}</div>
                      <div className="mt-0.5 text-sm text-muted-foreground">nível {preview.qualityTier}</div>
                    </div>
                    <div className="flex size-10 items-center justify-center rounded-xl bg-muted"><Cpu className="size-5 text-muted-foreground" /></div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{preview.reason}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2.5 py-1">~{preview.estimatedLatencyMs} ms</span>
                    <span className="rounded-full bg-muted px-2.5 py-1">US$ {preview.estimatedCostUsd.toFixed(4)}/1k</span>
                  </div>
                </>
              ) : (
                <div className="mt-4 text-sm text-muted-foreground">Sem decisão disponível.</div>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === "roteamento" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="rounded-[1.4rem] border border-border/70 bg-card p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">motor principal</div>
                <h2 className="mt-1 text-xl font-semibold">Primeira opção da orbeAI</h2>
                <p className="mt-1 text-sm text-muted-foreground">No automático, o roteador ainda pode escolher outra opção conforme a tarefa.</p>
              </div>
              <Gauge className="size-5 text-[var(--orbe-blue)]" />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {providers.map((provider) => {
                const status = providerStatus(provider);
                const selected = config.defaultProvider === provider.slug;

                return (
                  <button
                    key={provider.slug}
                    onClick={() => void setDefault(provider.slug)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-all",
                      selected
                        ? "border-[var(--orbe-blue)] bg-[color-mix(in_oklch,var(--orbe-blue)_7%,var(--card))]"
                        : "border-border/70 hover:bg-accent/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{provider.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{provider.models.length} opção(ões) disponível(is)</div>
                      </div>
                      {selected ? <Pill tone="blue">principal</Pill> : <Pill tone={status.tone}>{status.label}</Pill>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-[1.4rem] border border-border/70 bg-card p-5 md:p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[var(--orbe-blue)]" />
              <h2 className="font-semibold">Plano de continuidade</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Quando uma opção falha ou está indisponível, a orbeAI tenta outra sem interromper a experiência.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {config.fallbackChain.length ? config.fallbackChain.map((slug, index) => (
                <div key={`${slug}-${index}`} className="flex items-center gap-2">
                  <span className="rounded-full border border-border/70 bg-muted/50 px-3 py-1.5 text-xs font-medium">{slug}</span>
                  {index < config.fallbackChain.length - 1 && <ArrowRight className="size-3 text-muted-foreground" />}
                </div>
              )) : <span className="text-sm text-muted-foreground">Nenhuma alternativa selecionada.</span>}
            </div>

            <div className="mt-5 border-t border-border/70 pt-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">incluir ou remover</div>
              <div className="flex flex-wrap gap-2">
                {ALL_PROVIDERS.map((slug) => {
                  const enabled = config.fallbackChain.includes(slug);
                  return (
                    <button
                      key={slug}
                      onClick={() => void toggleFallback(slug)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        enabled
                          ? "border-[var(--orbe-blue)] bg-[var(--orbe-blue)] text-white"
                          : "border-border/70 text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                      )}
                    >
                      {slug}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      )}

      {tab === "motores" && (
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Motores disponíveis</h2>
            <p className="mt-1 text-sm text-muted-foreground">Conexões e modelos ficam protegidos no backend. Esta tela mostra apenas o estado operacional.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {providers.map((provider) => {
              const status = providerStatus(provider);

              return (
                <article key={provider.slug} className="rounded-[1.4rem] border border-border/70 bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--orbe-blue)_10%,var(--card))] text-[var(--orbe-blue)]">
                        <Cpu className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{provider.name}</h3>
                        <div className="mt-0.5 text-xs text-muted-foreground">{provider.models.length} modelos</div>
                      </div>
                    </div>
                    <Pill tone={status.tone}>{status.label}</Pill>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-muted/45 p-3">
                      <div className="text-muted-foreground">tempo médio</div>
                      <div className="mt-1 font-semibold">{provider.latencyMs ? `${provider.latencyMs} ms` : "sem medida"}</div>
                    </div>
                    <div className="rounded-xl bg-muted/45 p-3">
                      <div className="text-muted-foreground">acesso</div>
                      <div className="mt-1 line-clamp-1 font-semibold">{credentialLabel(provider)}</div>
                    </div>
                  </div>

                  <details className="group mt-4 border-t border-border/70 pt-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
                      Ver modelos
                      <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {provider.models.map((model) => <Pill key={model} tone="muted">{model}</Pill>)}
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {tab === "atividade" && (
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={BarChart3} label="execuções" value={totals.requests.toLocaleString("pt-BR")} detail="no período disponível" />
            <MetricCard icon={Cpu} label="volume processado" value={totals.tokens.toLocaleString("pt-BR")} detail="unidades de contexto" />
            <MetricCard icon={CircleDollarSign} label="custo estimado" value={formatCost(totals.costUsd)} detail="estimativa acumulada" />
            <MetricCard icon={ShieldCheck} label="falhas observadas" value={String(totals.errors)} detail={totals.errors ? "verifique os registros" : "operação estável"} />
          </section>

          <section className="rounded-[1.4rem] border border-border/70 bg-card p-5 md:p-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">por motor</div>
              <h2 className="mt-1 text-xl font-semibold">Resumo de uso</h2>
            </div>

            {usage.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {usage.map((item) => (
                  <div key={item.provider} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold">{item.providerName}</div>
                      <Pill tone={item.errors ? "warn" : "success"}>{item.errors ? `${item.errors} alerta(s)` : "estável"}</Pill>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div><span className="text-muted-foreground">execuções</span><div className="mt-1 font-semibold">{item.requests}</div></div>
                      <div><span className="text-muted-foreground">tempo médio</span><div className="mt-1 font-semibold">{item.avgLatencyMs || "—"} ms</div></div>
                      <div><span className="text-muted-foreground">volume</span><div className="mt-1 font-semibold">{item.tokens.toLocaleString("pt-BR")}</div></div>
                      <div><span className="text-muted-foreground">estimativa</span><div className="mt-1 font-semibold">{formatCost(item.costUsd)}</div></div>
                    </div>
                    <div className="mt-3 text-[11px] text-muted-foreground">última atividade: {formatDate(item.lastRunAt)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Ainda não há atividade real para resumir nesta prévia.
              </div>
            )}
          </section>

          <section className="rounded-[1.4rem] border border-border/70 bg-card p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">registro técnico</div>
                <h2 className="mt-1 text-xl font-semibold">Execuções recentes</h2>
              </div>
              <KeyRound className="size-5 text-muted-foreground" />
            </div>

            {runs.length ? (
              <div className="mt-5 divide-y divide-border/70">
                {runs.map((run) => (
                  <div key={run.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{run.providerName}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="truncate text-sm text-muted-foreground">{run.modelName}</span>
                        <Pill tone={run.errorMessage || run.status !== "success" ? "warn" : "success"}>{run.status}</Pill>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{run.taskType ?? "tarefa geral"}</span>
                        <span>{run.inputTokens + run.outputTokens} unidades</span>
                        <span>{run.latencyMs ?? "—"} ms</span>
                        <span>{formatCost(run.estimatedCostUsd)}</span>
                      </div>
                      {(run.errorMessage || run.routerReason) && (
                        <p className={cn("mt-2 line-clamp-2 text-xs", run.errorMessage ? "text-[var(--warning)]" : "text-muted-foreground")}>
                          {run.errorMessage ?? run.routerReason}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(run.createdAt)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nenhuma execução recente nesta prévia.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-border/70 bg-card p-4.5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}
