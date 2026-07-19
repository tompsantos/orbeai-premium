import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Clock3,
  Cpu,
  FlaskConical,
  Gauge,
  KeyRound,
  RefreshCw,
  Route as RouteIcon,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { OrbeMark } from "@/components/design-system/OrbeLogo";
import { Pill } from "@/components/design-system/Primitives";
import { Button } from "@/components/ui/button";
import { apiClient, modelService } from "@/lib/api";
import type { ModelProvider, ModelRun } from "@/types";

export const Route = createFileRoute("/app/models")({
  head: () => ({ meta: [{ title: "Laboratório · orbeAI" }] }),
  component: ModelsPage,
});

type LabState = {
  loading: boolean;
  providers: ModelProvider[];
  runs: ModelRun[];
  error?: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ModelsPage() {
  const [state, setState] = useState<LabState>({
    loading: true,
    providers: [],
    runs: [],
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: undefined }));
    try {
      const [providers, runs] = await Promise.all([
        modelService.providers(),
        modelService.runs(20),
      ]);
      setState({ loading: false, providers, runs });
    } catch (error) {
      setState({
        loading: false,
        providers: [],
        runs: [],
        error: error instanceof Error ? error.message : "Falha ao carregar o laboratório.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const operational = state.providers.filter((provider) => provider.status !== "placeholder");
    const online = operational.filter((provider) => provider.status === "online");
    const tokens = state.runs.reduce(
      (sum, run) => sum + run.inputTokens + run.outputTokens,
      0,
    );
    const errors = state.runs.filter((run) => run.status !== "success").length;
    return { operational: operational.length, online: online.length, tokens, errors };
  }, [state.providers, state.runs]);

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-6">
      <section className="overflow-hidden rounded-[1.8rem] border border-border/70 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98)_52%,rgba(238,242,255,0.82))] p-6 shadow-[0_24px_75px_-58px_rgba(15,23,42,0.72)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-white/80 bg-white/80 shadow-sm">
                <OrbeMark size={24} />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--orbe-blue)]">
                  laboratório
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">observabilidade e governança do orbeRouter</div>
              </div>
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-foreground md:text-[2.65rem]">
              Motores e execução
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              Visão operacional dos providers registrados e das execuções persistidas. Preferências locais e decisões simuladas foram removidas: qualquer controle real vive nos perfis de modelos e é aplicado pelo backend.
            </p>
          </div>

          <Button variant="outline" onClick={() => void load()} disabled={state.loading}>
            <RefreshCw className={`mr-2 size-4 ${state.loading ? "animate-spin" : ""}`} />
            atualizar
          </Button>
        </div>
      </section>

      {apiClient.isMock && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-semibold">modo de prévia</div>
              <div className="mt-1 text-amber-800">Os dados abaixo são locais e não representam telemetria do ambiente real.</div>
            </div>
          </div>
        </section>
      )}

      {state.error && (
        <section className="rounded-2xl border border-red-200 bg-red-50/70 px-5 py-4 text-sm text-red-900">
          {state.error}
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Cpu} label="providers operacionais" value={summary.operational} detail={`${summary.online} online`} />
        <SummaryCard icon={Activity} label="execuções recentes" value={state.runs.length} detail="últimos model runs" />
        <SummaryCard icon={Gauge} label="tokens observados" value={summary.tokens} detail="entrada + saída" />
        <SummaryCard icon={ShieldCheck} label="execuções com erro" value={summary.errors} detail="sem mascarar fallback" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <LabLinkCard
          icon={RouteIcon}
          title="Perfis de modelos"
          description="Capacidades, p50, p95, sucesso, timeout, custo comprovável e controles persistentes por workspace."
          to="/app/model-profiles"
          action="abrir catálogo operacional"
        />
        <LabLinkCard
          icon={KeyRound}
          title="Credenciais de IA"
          description="Salvar, testar e remover credenciais no cofre criptografado sem expor a chave completa."
          to="/app/provider-credentials"
          action="gerenciar conexões"
        />
      </section>

      <section className="rounded-[1.5rem] border border-border/70 bg-card p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Providers registrados</h2>
            <p className="mt-1 text-sm text-muted-foreground">Placeholders permanecem identificados e não são tratados como execução real.</p>
          </div>
          <FlaskConical className="size-5 text-muted-foreground" />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {state.providers.map((provider) => (
            <article key={provider.slug} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{provider.name}</div>
                <Pill tone={provider.status === "online" ? "success" : provider.status === "offline" ? "warn" : "muted"}>
                  {provider.status}
                </Pill>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">{provider.apiKeyStatus}</div>
              <div className="mt-3 space-y-1.5">
                {provider.models.map((model) => (
                  <div key={model} className="break-all rounded-lg bg-background/70 px-2.5 py-2 text-xs font-medium">
                    {model}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-border/70 bg-card p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Execuções recentes</h2>
            <p className="mt-1 text-sm text-muted-foreground">Model runs persistidos, sem decisão fabricada no frontend.</p>
          </div>
          <Clock3 className="size-5 text-muted-foreground" />
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border/70 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-3 font-medium">quando</th>
                <th className="px-3 py-3 font-medium">provider</th>
                <th className="px-3 py-3 font-medium">modelo</th>
                <th className="px-3 py-3 font-medium">status</th>
                <th className="px-3 py-3 font-medium">latência</th>
                <th className="px-3 py-3 font-medium">tokens</th>
              </tr>
            </thead>
            <tbody>
              {state.runs.map((run) => (
                <tr key={run.id} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-3 text-xs text-muted-foreground">{formatDate(run.createdAt)}</td>
                  <td className="px-3 py-3 font-medium">{run.providerName}</td>
                  <td className="px-3 py-3 text-xs">{run.modelName}</td>
                  <td className="px-3 py-3"><Pill tone={run.status === "success" ? "success" : "warn"}>{run.status}</Pill></td>
                  <td className="px-3 py-3 text-xs">{typeof run.latencyMs === "number" ? `${run.latencyMs} ms` : "—"}</td>
                  <td className="px-3 py-3 text-xs">{(run.inputTokens + run.outputTokens).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
              {!state.runs.length && !state.loading && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">nenhum model run encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, detail }: { icon: typeof Cpu; label: string; value: number; detail: string }) {
  return (
    <div className="rounded-[1.25rem] border border-border/70 bg-card p-4.5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight">{value.toLocaleString("pt-BR")}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function LabLinkCard({ icon: Icon, title, description, to, action }: { icon: typeof Cpu; title: string; description: string; to: "/app/model-profiles" | "/app/provider-credentials"; action: string }) {
  return (
    <Link to={to} className="group rounded-[1.5rem] border border-border/70 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--orbe-blue)]/30 hover:shadow-lg md:p-6">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--orbe-blue)_10%,var(--card))] text-[var(--orbe-blue)]"><Icon className="size-5" /></div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[var(--orbe-blue)]">{action}<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></div>
        </div>
      </div>
    </Link>
  );
}
