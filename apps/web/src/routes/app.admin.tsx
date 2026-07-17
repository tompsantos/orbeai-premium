import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GlassCard, Pill, SectionHeader, StatCard, StatusDot } from "@/components/design-system/Primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { adminService } from "@/lib/api";
import { localStore } from "@/lib/storage/localStore";
import type { AuditLog, FeatureFlag, UsageMetric, WorkspaceInfo } from "@/types";
import {
  Activity,
  AlertTriangle,
  Brain,
  Clock,
  Database,
  FileText,
  Globe2,
  Save,
  Settings,
  RefreshCw,
  Route as RouteIcon,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/admin")({
  head: () => ({ meta: [{ title: "Admin · orbeAI" }] }),
  component: AdminPage,
});

function formatCost(value: number) {
  if (!Number.isFinite(value) || value === 0) return "$0.000000";
  if (Math.abs(value) < 0.01) return `$${value.toFixed(6)}`;

  return `$${value.toFixed(4)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionIcon(action: string) {
  if (action.startsWith("memory")) return Brain;
  if (action.startsWith("artifact")) return FileText;
  if (action.startsWith("chat")) return RouteIcon;
  if (action.includes("delete")) return Trash2;

  return Activity;
}

function actionTone(log: AuditLog): "success" | "warn" | "danger" | "muted" | "blue" {
  if (log.level === "error") return "danger";
  if (log.level === "warn") return "warn";
  if (log.action.startsWith("memory")) return "blue";
  if (log.action.startsWith("artifact")) return "muted";
  if (log.action.startsWith("chat")) return "success";

  return "muted";
}

function AdminPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [usage, setUsage] = useState<UsageMetric[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspacePlan, setWorkspacePlan] = useState("");
  const [workspaceTimezone, setWorkspaceTimezone] = useState("America/Sao_Paulo");
  const [defaultChatMode, setDefaultChatMode] = useState("strategist");
  const [defaultModelPreference, setDefaultModelPreference] = useState("auto");
  const [memoryPolicy, setMemoryPolicy] = useState("balanced");
  const [dataRetentionDays, setDataRetentionDays] = useState("365");
  const [allowExports, setAllowExports] = useState(true);
  const [allowPublicSharing, setAllowPublicSharing] = useState(false);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<AuditLog["level"] | "todos">("todos");
  const [resetOpen, setResetOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);

    try {
      const [a, u, f, w] = await Promise.all([
        adminService.audit({ q: q || undefined, level: level === "todos" ? undefined : level }),
        adminService.usage(),
        adminService.flags(),
        adminService.workspace(),
      ]);

      setLogs(a);
      setUsage(u);
      setFlags(f);
      setWorkspace(w);
      setWorkspaceName(w.name);
      setWorkspacePlan(w.plan);
      setWorkspaceTimezone(w.settings.timezone);
      setDefaultChatMode(w.settings.defaultChatMode);
      setDefaultModelPreference(w.settings.defaultModelPreference);
      setMemoryPolicy(w.settings.memoryPolicy);
      setDataRetentionDays(String(w.settings.dataRetentionDays));
      setAllowExports(w.settings.allowExports);
      setAllowPublicSharing(w.settings.allowPublicSharing);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [q, level]);

  const totals = useMemo(() => {
    const totalTokens = usage.reduce((s, u) => s + u.tokens, 0);
    const totalCost = usage.reduce((s, u) => s + u.costUsd, 0);
    const totalRequests = usage.reduce((s, u) => s + u.requests, 0);
    const warnEvents = logs.filter((l) => l.level === "warn").length;
    const errorEvents = logs.filter((l) => l.level === "error").length;
    const criticalEvents = warnEvents + errorEvents;

    return {
      totalTokens,
      totalCost,
      totalRequests,
      criticalEvents,
      activeFlags: flags.filter((f) => f.enabled).length,
    };
  }, [usage, logs, flags]);

  const eventBuckets = useMemo(() => {
    const buckets = new Map<string, number>();

    for (const log of logs) {
      const key = log.resourceType ?? log.action.split(".")[0] ?? "system";
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    return Array.from(buckets.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [logs]);

  const providerUsage = useMemo(() => {
    const buckets = new Map<string, { tokens: number; requests: number; costUsd: number }>();

    for (const item of usage) {
      const current = buckets.get(item.provider) ?? { tokens: 0, requests: 0, costUsd: 0 };
      current.tokens += item.tokens;
      current.requests += item.requests;
      current.costUsd += item.costUsd;
      buckets.set(item.provider, current);
    }

    return Array.from(buckets.entries()).map(([provider, data]) => ({ provider, ...data }));
  }, [usage]);

  async function onToggleFlag(key: string) {
    await adminService.toggleFlag(key);
    toast.success("Flag atualizada");
    await refresh();
  }

  async function onSaveWorkspace() {
    const retention = Number(dataRetentionDays);

    if (!Number.isFinite(retention) || retention < 1) {
      toast.error("Retenção de dados inválida");
      return;
    }

    const updatedWorkspace = await adminService.updateWorkspace({
      name: workspaceName,
      plan: workspacePlan,
    });

    const updatedSettings = await adminService.updateWorkspaceSettings({
      timezone: workspaceTimezone,
      defaultChatMode,
      defaultModelPreference,
      memoryPolicy,
      dataRetentionDays: retention,
      allowExports,
      allowPublicSharing,
    });

    setWorkspace({
      ...updatedWorkspace,
      settings: updatedSettings,
    });

    toast.success("Workspace atualizado");
    await refresh();
  }

  function onReset() {
    localStore.resetDemoData();
    toast.success("Dados locais de demonstração resetados");
    setResetOpen(false);
    void refresh();
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="admin cockpit"
        title="Torre de controle da orbeAI"
        description="Auditoria, uso de modelos, eventos críticos e saúde operacional do workspace."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={cn("size-4 mr-1", loading && "animate-spin")} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
              Reset local
            </Button>
          </div>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Activity} label="Requisições" value={totals.totalRequests.toString()} hint="model_runs" />
        <StatCard icon={Zap} label="Tokens" value={totals.totalTokens.toLocaleString("pt-BR")} hint="todos os providers" />
        <StatCard icon={ShieldCheck} label="Audit logs" value={logs.length.toString()} hint="backend real" />
        <StatCard icon={AlertTriangle} label="Eventos críticos" value={totals.criticalEvents.toString()} hint="warn + error" />
        <StatCard icon={Database} label="Custo estimado" value={formatCost(totals.totalCost)} hint="provider pricing" />
      </div>

      <Tabs defaultValue="audit">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
          <TabsTrigger value="usage">Uso de modelos</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="flags">Feature flags</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="health">Saúde do sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="mt-5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Buscar ação, recurso, produto…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={level} onValueChange={(v) => setLevel(v as AuditLog["level"] | "todos")}>
              <SelectTrigger className="sm:w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">todos</SelectItem>
                <SelectItem value="info">info</SelectItem>
                <SelectItem value="warn">warn</SelectItem>
                <SelectItem value="error">error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <GlassCard hoverable={false}>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {logs.map((log) => {
                  const Icon = actionIcon(log.action);

                  return (
                    <li key={log.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start gap-3 text-sm">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                          <Icon className="size-4 text-[var(--orbe-blue)]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Pill tone={actionTone(log)}>{log.level}</Pill>
                            <span className="font-medium">{log.action}</span>
                            {log.resourceType && <Pill tone="muted">{log.resourceType}</Pill>}
                            {log.product && <span className="text-xs text-muted-foreground">{log.product}</span>}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground break-all">
                            alvo: {log.target}
                          </div>
                          {log.meta && (
                            <div className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
                              meta: {Object.keys(log.meta).slice(0, 6).join(", ") || "—"}
                            </div>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {formatDate(log.at)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="usage" className="mt-5 space-y-3">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {providerUsage.map((item) => (
              <GlassCard key={item.provider} hoverable={false}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{item.provider}</div>
                  <Pill tone="blue">{item.requests} req</Pill>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="orbe-surface p-2 tabular-nums">{item.tokens.toLocaleString("pt-BR")} tokens</div>
                  <div className="orbe-surface p-2 tabular-nums">{formatCost(item.costUsd)}</div>
                </div>
              </GlassCard>
            ))}
            {providerUsage.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum uso registrado.</p>
            )}
          </div>

          <GlassCard hoverable={false}>
            <ul className="divide-y divide-border/60">
              {usage.map((u, i) => (
                <li key={`${u.date}-${u.provider}-${i}`} className="py-3 flex items-center gap-3 text-sm flex-wrap first:pt-0 last:pb-0">
                  <span className="text-muted-foreground w-24 tabular-nums">{u.date}</span>
                  <Pill tone="blue">{u.provider}</Pill>
                  <span className="tabular-nums">{u.tokens.toLocaleString("pt-BR")} tokens</span>
                  <span className="text-muted-foreground tabular-nums">{u.requests} req</span>
                  <span className="ml-auto tabular-nums font-medium">{formatCost(u.costUsd)}</span>
                </li>
              ))}
              {usage.length === 0 && (
                <li className="py-3 text-sm text-muted-foreground">Nenhuma métrica de uso.</li>
              )}
            </ul>
          </GlassCard>
        </TabsContent>

        <TabsContent value="events" className="mt-5">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {eventBuckets.map((bucket) => (
              <GlassCard key={bucket.name} hoverable={false}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{bucket.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">eventos registrados</div>
                  </div>
                  <div className="text-2xl font-semibold tabular-nums">{bucket.count}</div>
                </div>
              </GlassCard>
            ))}
            {eventBuckets.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum evento agrupado.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="flags" className="mt-5">
          <div className="grid md:grid-cols-2 gap-3">
            {flags.map((f) => (
              <GlassCard key={f.key} className={cn(f.enabled && "orbe-active")}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      <StatusDot tone={f.enabled ? "success" : "neutral"} pulse={false} />
                      {f.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 font-mono">{f.key} · {f.audience}</div>
                  </div>
                  <Switch checked={f.enabled} onCheckedChange={() => onToggleFlag(f.key)} />
                </div>
              </GlassCard>
            ))}
          </div>
        </TabsContent>


        <TabsContent value="workspace" className="mt-5 space-y-3">
          <div className="grid lg:grid-cols-[1fr_320px] gap-3">
            <GlassCard hoverable={false}>
              <div className="flex items-center gap-2 mb-4">
                <Settings className="size-4 text-[var(--orbe-blue)]" />
                <div>
                  <div className="font-semibold">Configurações do workspace</div>
                  <div className="text-xs text-muted-foreground">Preferências persistidas no backend para a operação da orbeAI.</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Nome</span>
                  <Input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Plano</span>
                  <Input value={workspacePlan} onChange={(e) => setWorkspacePlan(e.target.value)} />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Timezone</span>
                  <Input value={workspaceTimezone} onChange={(e) => setWorkspaceTimezone(e.target.value)} />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Retenção de dados, dias</span>
                  <Input value={dataRetentionDays} onChange={(e) => setDataRetentionDays(e.target.value)} inputMode="numeric" />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Modo padrão do chat</span>
                  <Select value={defaultChatMode} onValueChange={setDefaultChatMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strategist">strategist</SelectItem>
                      <SelectItem value="dev">dev</SelectItem>
                      <SelectItem value="document">document</SelectItem>
                      <SelectItem value="research">research</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Modelo padrão</span>
                  <Select value={defaultModelPreference} onValueChange={setDefaultModelPreference}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">auto</SelectItem>
                      <SelectItem value="openai">openai</SelectItem>
                      <SelectItem value="gemini">gemini</SelectItem>
                      <SelectItem value="mock">mock</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Política de memória</span>
                  <Select value={memoryPolicy} onValueChange={setMemoryPolicy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strict">strict</SelectItem>
                      <SelectItem value="balanced">balanced</SelectItem>
                      <SelectItem value="adaptive">adaptive</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <div className="space-y-3 rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Permitir exportações</div>
                      <div className="text-xs text-muted-foreground">Controla exportação de dados e artifacts.</div>
                    </div>
                    <Switch checked={allowExports} onCheckedChange={setAllowExports} />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Compartilhamento público</div>
                      <div className="text-xs text-muted-foreground">Mantém links públicos desativados por padrão.</div>
                    </div>
                    <Switch checked={allowPublicSharing} onCheckedChange={setAllowPublicSharing} />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={onSaveWorkspace}>
                  <Save className="size-4 mr-1" />
                  Salvar workspace
                </Button>
              </div>
            </GlassCard>

            <GlassCard hoverable={false}>
              <div className="flex items-center gap-2">
                <Globe2 className="size-4 text-[var(--orbe-blue)]" />
                <div className="font-semibold">Identidade</div>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">slug</span>
                  <span className="font-mono text-xs">{workspace?.slug ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">id</span>
                  <span className="font-mono text-xs truncate max-w-[180px]">{workspace?.id ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">locale</span>
                  <span>{workspace?.settings.locale ?? "pt-BR"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">atualizado</span>
                  <span>{workspace ? formatDate(workspace.updatedAt) : "—"}</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        <TabsContent value="health" className="mt-5">
          <GlassCard hoverable={false}>
            <ul className="text-sm divide-y divide-border/60">
              {[
                { tone: "success" as const, label: "API backend", value: "operacional" },
                { tone: "success" as const, label: "Postgres", value: "persistência real" },
                { tone: "success" as const, label: "Providers", value: "OpenAI/Gemini + fallback" },
                { tone: "success" as const, label: "Memória", value: "automática, curável e contextual" },
                { tone: "success" as const, label: "Auditoria", value: "audit_logs real" },
              ].map((h) => (
                <li key={h.label} className="py-3 flex items-center gap-3 first:pt-0 last:pb-0">
                  <StatusDot tone={h.tone} />
                  <span className="font-medium">{h.label}</span>
                  <span className="ml-auto text-muted-foreground text-xs">{h.value}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Resetar dados locais de demonstração?"
        description="Isso afeta apenas dados locais do navegador. Dados reais do backend não são apagados."
        confirmLabel="Resetar local"
        destructive
        onConfirm={onReset}
      />
    </div>
  );
}
