import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Clock3,
  Cpu,
  DatabaseZap,
  Gauge,
  RefreshCw,
  ShieldCheck,
  TimerReset,
} from "lucide-react";

import { OrbeMark } from "@/components/design-system/OrbeLogo";
import { Pill } from "@/components/design-system/Primitives";
import { Button } from "@/components/ui/button";
import { modelProfileService } from "@/lib/api/services/modelProfileService";
import type {
  ModelCostStatus,
  ModelLifecycle,
  ModelProfile,
  ModelProfileCatalogStatus,
} from "@/types/modelProfiles";

export const Route = createFileRoute("/app/model-profiles")({
  head: () => ({ meta: [{ title: "Perfis operacionais · Laboratório · orbeAI" }] }),
  component: ModelProfilesPage,
});

type WindowDays = 7 | 30 | 90;

type LoadState = {
  status: "loading" | "ready" | "disabled" | "mock" | "error";
  profiles: ModelProfile[];
  error?: string;
};

const WINDOWS: WindowDays[] = [7, 30, 90];

function formatPercent(value?: number) {
  if (typeof value !== "number") return "sem amostra";
  return `${(value * 100).toFixed(1).replace(".", ",")}%`;
}

function formatLatency(value?: number) {
  return typeof value === "number" ? `${value.toLocaleString("pt-BR")} ms` : "sem amostra";
}

function formatDate(value?: string) {
  if (!value) return "nenhuma tentativa";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCost(status: ModelCostStatus, value?: number) {
  if (status === "not_configured") return "tabela não configurada";
  if (status === "configured_no_samples") return "sem amostras de custo";
  if (status === "not_applicable") return "não aplicável";
  if (typeof value !== "number") return "sem amostra";
  if (value === 0) return "US$ 0,00";
  return `US$ ${value.toFixed(value < 0.01 ? 6 : 4).replace(".", ",")}`;
}

function lifecycleLabel(lifecycle: ModelLifecycle) {
  if (lifecycle === "approved") return "aprovado";
  if (lifecycle === "deprecated") return "descontinuando";
  if (lifecycle === "mock") return "mock declarado";
  return "experimental";
}

function lifecycleTone(lifecycle: ModelLifecycle): "success" | "warn" | "muted" | "blue" {
  if (lifecycle === "approved") return "success";
  if (lifecycle === "deprecated") return "warn";
  if (lifecycle === "mock") return "muted";
  return "blue";
}

function statusDescription(status: ModelProfileCatalogStatus) {
  if (status === "disabled") {
    return "A feature flag router_model_profiles está desligada neste workspace. Nenhum perfil foi exposto.";
  }
  return "O modo de prévia não consulta perfis operacionais do backend.";
}

function ModelProfilesPage() {
  const [windowDays, setWindowDays] = useState<WindowDays>(30);
  const [state, setState] = useState<LoadState>({ status: "loading", profiles: [] });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading", error: undefined }));
    try {
      const catalog = await modelProfileService.catalog(windowDays);
      setState({ status: catalog.status, profiles: catalog.profiles });
    } catch (error) {
      setState({
        status: "error",
        profiles: [],
        error: error instanceof Error ? error.message : "Falha ao carregar perfis operacionais.",
      });
    }
  }, [windowDays]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const telemetry = state.profiles.flatMap((profile) => (profile.telemetry ? [profile.telemetry] : []));
    const executed = telemetry.reduce((sum, item) => sum + item.executedAttemptCount, 0);
    const successes = telemetry.reduce((sum, item) => sum + item.successCount, 0);
    const failures = telemetry.reduce((sum, item) => sum + item.failureCount, 0);
    const tokens = telemetry.reduce(
      (sum, item) => sum + item.inputTokensTotal + item.outputTokensTotal,
      0,
    );

    return {
      executed,
      successes,
      failures,
      tokens,
      successRate: executed ? successes / executed : undefined,
    };
  }, [state.profiles]);

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-6">
      <section className="overflow-hidden rounded-[1.8rem] border border-border/70 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98)_52%,rgba(236,254,255,0.76))] p-6 shadow-[0_24px_75px_-58px_rgba(15,23,42,0.72)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              to="/app/models"
              className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> voltar ao laboratório
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-white/80 bg-white/80 shadow-sm">
                <OrbeMark size={24} />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--orbe-blue)]">
                  catálogo operacional
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">model-profile-v1 + model-telemetry-v1</div>
              </div>
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-foreground md:text-[2.65rem]">
              Perfis de modelos
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              Estado, capacidades e telemetria dos modelos realmente registrados no orbeRouter. Campos sem evidência permanecem explicitamente não validados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-border/70 bg-white/75 p-1">
              {WINDOWS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setWindowDays(days)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    windowDays === days
                      ? "bg-[var(--orbe-blue)] text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {days} dias
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={() => void load()} disabled={state.status === "loading"}>
              <RefreshCw className={`mr-2 size-4 ${state.status === "loading" ? "animate-spin" : ""}`} />
              atualizar
            </Button>
          </div>
        </div>
      </section>

      {state.status === "loading" && (
        <StateCard
          icon={RefreshCw}
          title="Lendo o catálogo operacional"
          description="Consultando perfis e telemetria autorizados para este workspace."
          spinning
        />
      )}

      {(state.status === "disabled" || state.status === "mock") && (
        <StateCard
          icon={ShieldCheck}
          title={state.status === "disabled" ? "Perfis protegidos por feature flag" : "Perfis indisponíveis na prévia"}
          description={statusDescription(state.status)}
        />
      )}

      {state.status === "error" && (
        <StateCard
          icon={TimerReset}
          title="Não foi possível carregar os perfis"
          description={state.error ?? "Falha desconhecida."}
          warning
        />
      )}

      {state.status === "ready" && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={Cpu}
              label="modelos registrados"
              value={state.profiles.length.toLocaleString("pt-BR")}
              detail="somente registry executável"
            />
            <SummaryCard
              icon={Activity}
              label="tentativas executadas"
              value={totals.executed.toLocaleString("pt-BR")}
              detail={`${totals.failures.toLocaleString("pt-BR")} falha(s)`}
            />
            <SummaryCard
              icon={ShieldCheck}
              label="taxa de sucesso"
              value={formatPercent(totals.successRate)}
              detail="skips fora do denominador"
            />
            <SummaryCard
              icon={DatabaseZap}
              label="tokens observados"
              value={totals.tokens.toLocaleString("pt-BR")}
              detail={`janela de ${windowDays} dias`}
            />
          </section>

          {state.profiles.length ? (
            <section className="grid gap-4 xl:grid-cols-2">
              {state.profiles.map((profile) => (
                <ProfileCard key={profile.profileId} profile={profile} />
              ))}
            </section>
          ) : (
            <StateCard
              icon={Cpu}
              title="Nenhum modelo registrado"
              description="O endpoint respondeu sem perfis operacionais para este workspace."
            />
          )}
        </>
      )}
    </div>
  );
}

function ProfileCard({ profile }: { profile: ModelProfile }) {
  const telemetry = profile.telemetry;
  const totalTokens = (telemetry?.inputTokensTotal ?? 0) + (telemetry?.outputTokensTotal ?? 0);

  return (
    <article className="rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-[0_18px_55px_-52px_rgba(15,23,42,0.75)] md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--orbe-blue)_10%,var(--card))] text-[var(--orbe-blue)]">
            <Cpu className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{profile.providerName}</h2>
              <Pill tone={profile.executable ? "success" : "warn"}>
                {profile.executable ? "executável" : profile.providerState}
              </Pill>
              <Pill tone={lifecycleTone(profile.lifecycle)}>{lifecycleLabel(profile.lifecycle)}</Pill>
            </div>
            <div className="mt-1 break-all text-sm text-muted-foreground">{profile.modelName}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{profile.profileVersion}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">última tentativa: {formatDate(telemetry?.lastAttemptAt)}</div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniMetric label="sucesso" value={formatPercent(telemetry?.successRate)} />
        <MiniMetric label="timeout" value={formatPercent(telemetry?.timeoutRate)} />
        <MiniMetric label="latência p50" value={formatLatency(telemetry?.latencyP50Ms)} />
        <MiniMetric label="latência p95" value={formatLatency(telemetry?.latencyP95Ms)} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <InfoBlock
          label="amostras"
          value={`${telemetry?.executedAttemptCount ?? 0} executadas`}
          detail={`${telemetry?.skippedCount ?? 0} pulada(s)`}
        />
        <InfoBlock
          label="tokens"
          value={totalTokens.toLocaleString("pt-BR")}
          detail={`${telemetry?.tokenSampleCount ?? 0} model run(s) com usage`}
        />
        <InfoBlock
          label="custo estimado"
          value={formatCost(telemetry?.costStatus ?? "not_configured", telemetry?.estimatedCostUsdTotal)}
          detail={`${telemetry?.costSampleCount ?? 0} amostra(s)`}
        />
      </div>

      <div className="mt-5 border-t border-border/70 pt-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">capacidades declaradas</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.capabilities.map((capability) => (
                <Pill key={capability} tone="muted">{capability}</Pill>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <InfoBlock label="streaming" value={profile.streaming} />
            <InfoBlock label="ferramentas" value={profile.toolSupport} />
            <InfoBlock
              label="contexto"
              value={profile.contextWindowTokens ? profile.contextWindowTokens.toLocaleString("pt-BR") : "não validado"}
            />
            <InfoBlock label="política de dados" value={profile.dataPolicy.replaceAll("_", " ")} />
          </div>
        </div>

        <details className="group mt-4 rounded-xl border border-border/60 bg-muted/20 p-3.5">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium">
            fontes de evidência
            <Gauge className="size-4 text-muted-foreground" />
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(profile.evidenceSources).map(([field, source]) => (
              <div key={field} className="flex items-center justify-between gap-3 rounded-lg bg-background/70 px-3 py-2 text-[11px]">
                <span className="text-muted-foreground">{field.replaceAll("_", " ")}</span>
                <span className="font-medium">{source.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </article>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
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

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/45 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function InfoBlock({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-xs font-semibold">{value}</div>
      {detail && <div className="mt-1 text-[10px] text-muted-foreground">{detail}</div>}
    </div>
  );
}

function StateCard({
  icon: Icon,
  title,
  description,
  spinning = false,
  warning = false,
}: {
  icon: typeof Clock3;
  title: string;
  description: string;
  spinning?: boolean;
  warning?: boolean;
}) {
  return (
    <section className={`rounded-[1.5rem] border p-8 text-center ${warning ? "border-amber-200 bg-amber-50/60" : "border-border/70 bg-card"}`}>
      <div className={`mx-auto flex size-11 items-center justify-center rounded-2xl ${warning ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
        <Icon className={`size-5 ${spinning ? "animate-spin" : ""}`} />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </section>
  );
}
