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
  ShieldOff,
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
  WorkspaceModelControl,
} from "@/types/modelProfiles";

export const Route = createFileRoute("/app/model-profiles")({
  head: () => ({ meta: [{ title: "Perfis operacionais · Laboratório · orbeAI" }] }),
  component: ModelProfilesPage,
});

type WindowDays = 7 | 30 | 90;

type LoadState = {
  status: "loading" | "ready" | "disabled" | "mock" | "error";
  profiles: ModelProfile[];
  controls: WorkspaceModelControl[] | null;
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
  const [updatingKey, setUpdatingKey] = useState<string>();
  const [controlError, setControlError] = useState<string>();
  const [state, setState] = useState<LoadState>({
    status: "loading",
    profiles: [],
    controls: null,
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading", error: undefined }));
    setControlError(undefined);
    try {
      const catalog = await modelProfileService.catalog(windowDays);
      if (catalog.status !== "ready") {
        setState({ status: catalog.status, profiles: [], controls: null });
        return;
      }
      const controls = await modelProfileService.controls();
      setState({ status: "ready", profiles: catalog.profiles, controls });
    } catch (error) {
      setState({
        status: "error",
        profiles: [],
        controls: null,
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
      failures,
      tokens,
      successRate: executed ? successes / executed : undefined,
    };
  }, [state.profiles]);

  const controlsByKey = useMemo(
    () => new Map((state.controls ?? []).map((control) => [control.controlKey, control])),
    [state.controls],
  );

  async function toggleModel(profile: ModelProfile) {
    const controlKey = `${profile.providerSlug}:${profile.modelName}`;
    setUpdatingKey(controlKey);
    setControlError(undefined);
    try {
      await modelProfileService.setControl(
        profile.providerSlug,
        profile.modelName,
        !profile.workspaceEnabled,
      );
      await load();
    } catch (error) {
      setControlError(error instanceof Error ? error.message : "Falha ao atualizar o modelo.");
    } finally {
      setUpdatingKey(undefined);
    }
  }

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
              Estado, capacidades, telemetria e disponibilidade efetiva dos modelos registrados no orbeRouter. Controles de owner e admin são persistidos e obedecidos pela cadeia de execução.
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

      {controlError && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <ShieldOff className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-semibold">controle não aplicado</div>
              <div className="mt-1 text-amber-800">{controlError}</div>
            </div>
          </div>
        </section>
      )}

      {state.status === "loading" && (
        <StateCard
          icon={RefreshCw}
          title="Lendo o catálogo operacional"
          description="Consultando perfis, controles e telemetria autorizados para este workspace."
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
              detail={`${state.profiles.filter((item) => item.workspaceEnabled).length} habilitado(s)`}
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

          {state.controls === null && (
            <section className="rounded-2xl border border-border/70 bg-card px-5 py-4 text-sm text-muted-foreground">
              Os perfis estão em modo somente leitura para sua função neste workspace. Owner e admin podem alterar disponibilidade operacional.
            </section>
          )}

          {state.profiles.length ? (
            <section className="grid gap-4 xl:grid-cols-2">
              {state.profiles.map((profile) => (
                <ProfileCard
                  key={profile.profileId}
                  profile={profile}
                  control={controlsByKey.get(`${profile.providerSlug}:${profile.modelName}`)}
                  canManage={state.controls !== null}
                  updating={updatingKey === `${profile.providerSlug}:${profile.modelName}`}
                  onToggle={() => void toggleModel(profile)}
                />
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

function ProfileCard({
  profile,
  control,
  canManage,
  updating,
  onToggle,
}: {
  profile: ModelProfile;
  control?: WorkspaceModelControl;
  canManage: boolean;
  updating: boolean;
  onToggle: () => void;
}) {
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

        <div className="space-y-2 text-right">
          <div className="text-xs text-muted-foreground">última tentativa: {formatDate(telemetry?.lastAttemptAt)}</div>
          {canManage && (
            <button
              type="button"
              aria-pressed={profile.workspaceEnabled}
              disabled={updating}
              onClick={onToggle}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                profile.workspaceEnabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {updating ? <RefreshCw className="size-3.5 animate-spin" /> : profile.workspaceEnabled ? <ShieldCheck className="size-3.5" /> : <ShieldOff className="size-3.5" />}
              {profile.workspaceEnabled ? "habilitado no workspace" : "desativado no workspace"}
            </button>
          )}
          {control?.updatedAt && (
            <div className="text-[10px] text-muted-foreground">alterado em {formatDate(control.updatedAt)}</div>
          )}
        </div>
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
          <CapabilityGroup title="capacidades obrigatórias" values={profile.requiredCapabilities} />
          <CapabilityGroup title="capacidades opcionais" values={profile.optionalCapabilities} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <InfoBlock label="streaming" value={profile.streaming} />
          <InfoBlock label="ferramentas" value={profile.toolSupport} />
          <InfoBlock
            label="contexto"
            value={profile.contextWindowTokens ? profile.contextWindowTokens.toLocaleString("pt-BR") : "não validado"}
          />
          <InfoBlock label="política de dados" value={profile.dataPolicy.replaceAll("_", " ")} />
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

function CapabilityGroup({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {values.length ? values.map((capability) => (
          <Pill key={capability} tone="muted">{capability}</Pill>
        )) : <span className="text-xs text-muted-foreground">nenhuma declarada</span>}
      </div>
    </div>
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
