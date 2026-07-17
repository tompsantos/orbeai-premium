import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  EyeOff,
  FileText,
  Globe2,
  History,
  KeyRound,
  RefreshCw,
  Save,
  ServerCog,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  WalletCards,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { GlassCard, Pill, StatusDot } from "@/components/design-system/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminService } from "@/lib/api";
import { localStore } from "@/lib/storage/localStore";
import { cn } from "@/lib/utils";
import type { AuditLog, FeatureFlag, UsageMetric, WorkspaceInfo } from "@/types";

export const Route = createFileRoute("/app/admin")({
  head: () => ({ meta: [{ title: "Administração · orbeAI" }] }),
  component: AdminPage,
});

function formatCost(value: number) {
  if (!Number.isFinite(value) || value === 0) return "US$ 0,00";
  if (Math.abs(value) < 0.01) return `US$ ${value.toFixed(4).replace(".", ",")}`;
  return `US$ ${value.toFixed(2).replace(".", ",")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function humanAction(action: string) {
  const normalized = action.toLowerCase();

  if (normalized.includes("memory") && normalized.includes("remove")) return "Lembrança removida";
  if (normalized.includes("memory") && normalized.includes("create")) return "Nova lembrança guardada";
  if (normalized.includes("artifact") && normalized.includes("remove")) return "Item removido da Biblioteca";
  if (normalized.includes("artifact") && normalized.includes("version")) return "Nova versão salva na Biblioteca";
  if (normalized.includes("artifact") && normalized.includes("create")) return "Novo item criado na Biblioteca";
  if (normalized.includes("chat") && normalized.includes("create")) return "Nova conversa iniciada";
  if (normalized.includes("project") && normalized.includes("create")) return "Novo projeto criado";
  if (normalized.includes("error")) return "Falha registrada pelo sistema";

  return action.replaceAll(".", " · ").replaceAll("_", " ");
}

function actionIcon(action: string) {
  if (action.startsWith("memory")) return Brain;
  if (action.startsWith("artifact")) return FileText;
  if (action.startsWith("chat")) return Sparkles;
  if (action.includes("delete") || action.includes("remove")) return Trash2;
  return Activity;
}

function actionTone(log: AuditLog): "success" | "warn" | "danger" | "muted" | "blue" {
  if (log.level === "error") return "danger";
  if (log.level === "warn") return "warn";
  if (log.action.startsWith("memory")) return "blue";
  if (log.action.startsWith("chat")) return "success";
  return "muted";
}

function audienceLabel(audience: FeatureFlag["audience"]) {
  if (audience === "todos") return "Disponível para todos";
  if (audience === "beta") return "Grupo de testes";
  return "Somente equipe interna";
}

function memoryPolicyLabel(policy: string) {
  if (policy === "strict") return "Sempre confirmar";
  if (policy === "adaptive") return "Aprender com mais liberdade";
  return "Equilibrada";
}

function AdminPage() {
  const [tab, setTab] = useState("overview");
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
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<AuditLog["level"] | "todos">("todos");
  const [resetOpen, setResetOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);

    try {
      const [nextLogs, nextUsage, nextFlags, nextWorkspace] = await Promise.all([
        adminService.audit({ q: query || undefined, level: level === "todos" ? undefined : level }),
        adminService.usage(),
        adminService.flags(),
        adminService.workspace(),
      ]);

      setLogs(nextLogs);
      setUsage(nextUsage);
      setFlags(nextFlags);
      setWorkspace(nextWorkspace);
      setWorkspaceName(nextWorkspace.name);
      setWorkspacePlan(nextWorkspace.plan);
      setWorkspaceTimezone(nextWorkspace.settings.timezone);
      setDefaultChatMode(nextWorkspace.settings.defaultChatMode);
      setDefaultModelPreference(nextWorkspace.settings.defaultModelPreference);
      setMemoryPolicy(nextWorkspace.settings.memoryPolicy);
      setDataRetentionDays(String(nextWorkspace.settings.dataRetentionDays));
      setAllowExports(nextWorkspace.settings.allowExports);
      setAllowPublicSharing(nextWorkspace.settings.allowPublicSharing);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [query, level]);

  const totals = useMemo(() => {
    const requests = usage.reduce((sum, item) => sum + item.requests, 0);
    const tokens = usage.reduce((sum, item) => sum + item.tokens, 0);
    const costUsd = usage.reduce((sum, item) => sum + item.costUsd, 0);
    const alerts = logs.filter((item) => item.level === "warn" || item.level === "error").length;

    return {
      requests,
      tokens,
      costUsd,
      alerts,
      activeFlags: flags.filter((item) => item.enabled).length,
    };
  }, [usage, logs, flags]);

  const eventBuckets = useMemo(() => {
    const buckets = new Map<string, number>();

    for (const log of logs) {
      const key = log.resourceType ?? log.action.split(".")[0] ?? "sistema";
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    return Array.from(buckets.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [logs]);

  const engineUsage = useMemo(() => {
    const buckets = new Map<string, { tokens: number; requests: number; costUsd: number }>();

    for (const item of usage) {
      const current = buckets.get(item.provider) ?? { tokens: 0, requests: 0, costUsd: 0 };
      current.tokens += item.tokens;
      current.requests += item.requests;
      current.costUsd += item.costUsd;
      buckets.set(item.provider, current);
    }

    return Array.from(buckets.entries())
      .map(([provider, data]) => ({ provider, ...data }))
      .sort((a, b) => b.requests - a.requests);
  }, [usage]);

  async function onToggleFlag(key: string) {
    await adminService.toggleFlag(key);
    toast.success("Disponibilidade atualizada");
    await refresh();
  }

  async function onSaveWorkspace() {
    const retention = Number(dataRetentionDays);

    if (!Number.isFinite(retention) || retention < 1) {
      toast.error("Informe um prazo válido para guardar os dados");
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

    setWorkspace({ ...updatedWorkspace, settings: updatedSettings });
    toast.success("Preferências salvas");
    await refresh();
  }

  function onReset() {
    localStore.resetDemoData();
    toast.success("Dados da prévia restaurados");
    setResetOpen(false);
    void refresh();
  }

  const protectedEnvironment = !allowPublicSharing;

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98)_54%,rgba(236,254,255,0.74))] p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)] md:p-8">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/70 px-3 py-1.5 text-xs font-medium text-blue-700">
              <ShieldCheck className="size-3.5" />
              controle e proteção
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-balance md:text-4xl">
              Administração sem labirinto.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Acompanhe o ambiente, proteja os dados e ajuste as regras gerais da orbeAI em um só lugar.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Pill tone={protectedEnvironment ? "success" : "warn"}>
                {protectedEnvironment ? "acesso protegido" : "links públicos permitidos"}
              </Pill>
              <Pill tone="blue">memória {memoryPolicyLabel(memoryPolicy).toLowerCase()}</Pill>
              <Pill tone="muted">dados guardados por {dataRetentionDays} dias</Pill>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-white/80 bg-white/72 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">estado geral</div>
                <div className="mt-1 text-lg font-semibold">Tudo em ordem</div>
              </div>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="size-5" />
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-muted/45 p-3">
                <div className="text-xs text-muted-foreground">atividade</div>
                <div className="mt-1 font-semibold tabular-nums">{totals.requests} ações</div>
              </div>
              <div className="rounded-xl bg-muted/45 p-3">
                <div className="text-xs text-muted-foreground">alertas</div>
                <div className="mt-1 font-semibold tabular-nums">{totals.alerts}</div>
              </div>
            </div>

            <Button variant="outline" className="mt-4 w-full" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
              Atualizar informações
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: ShieldCheck,
            label: "Proteção",
            value: protectedEnvironment ? "Ativa" : "Revisar",
            detail: protectedEnvironment ? "sem compartilhamento público" : "links públicos liberados",
            tone: protectedEnvironment ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50",
          },
          {
            icon: Activity,
            label: "Atividade recente",
            value: logs.length.toString(),
            detail: "acontecimentos registrados",
            tone: "text-blue-600 bg-blue-50",
          },
          {
            icon: WalletCards,
            label: "Consumo estimado",
            value: formatCost(totals.costUsd),
            detail: `${totals.requests} solicitações processadas`,
            tone: "text-violet-600 bg-violet-50",
          },
          {
            icon: Sparkles,
            label: "Recursos em teste",
            value: totals.activeFlags.toString(),
            detail: "ativos neste ambiente",
            tone: "text-cyan-600 bg-cyan-50",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", item.tone)}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums">{item.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.detail}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card p-1.5">
          <TabsTrigger value="overview" className="rounded-xl">Visão geral</TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-xl">Segurança e preferências</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-xl">Atividade</TabsTrigger>
          <TabsTrigger value="usage" className="rounded-xl">Consumo</TabsTrigger>
          <TabsTrigger value="features" className="rounded-xl">Recursos em teste</TabsTrigger>
          <TabsTrigger value="system" className="rounded-xl">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
            <GlassCard hoverable={false} className="p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                <div>
                  <h2 className="font-semibold">O que aconteceu recentemente</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Uma leitura simples das últimas mudanças no ambiente.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setTab("activity")}>Ver tudo</Button>
              </div>

              {logs.length === 0 ? (
                <div className="p-8 text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</div>
              ) : (
                <ul className="divide-y divide-border/60 px-5">
                  {logs.slice(0, 6).map((log) => {
                    const Icon = actionIcon(log.action);
                    return (
                      <li key={log.id} className="flex items-start gap-3 py-3.5">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted/55">
                          <Icon className="size-4 text-[var(--orbe-blue)]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{humanAction(log.action)}</span>
                            {log.level !== "info" && <Pill tone={actionTone(log)}>{log.level === "error" ? "atenção" : "revisar"}</Pill>}
                          </div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">{log.target}</div>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{formatDate(log.at)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </GlassCard>

            <div className="space-y-4">
              <GlassCard hoverable={false}>
                <div className="flex items-center gap-2">
                  <Globe2 className="size-4 text-[var(--orbe-blue)]" />
                  <h2 className="font-semibold">Este ambiente</h2>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Nome</dt>
                    <dd className="font-medium">{workspace?.name ?? "orbeAI"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Plano</dt>
                    <dd className="font-medium capitalize">{workspace?.plan ?? "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Fuso horário</dt>
                    <dd className="text-right text-xs font-medium">{workspace?.settings.timezone ?? "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Exportações</dt>
                    <dd><Pill tone={allowExports ? "success" : "muted"}>{allowExports ? "permitidas" : "bloqueadas"}</Pill></dd>
                  </div>
                </dl>
                <Button variant="outline" className="mt-5 w-full" onClick={() => setTab("preferences")}>
                  Ajustar preferências
                </Button>
              </GlassCard>

              <GlassCard hoverable={false}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <h2 className="font-semibold">Pontos para acompanhar</h2>
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/45 p-3">
                    <span>Alertas recentes</span>
                    <strong className="tabular-nums">{totals.alerts}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/45 p-3">
                    <span>Recursos experimentais</span>
                    <strong className="tabular-nums">{totals.activeFlags}</strong>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="mt-5 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <GlassCard hoverable={false}>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Settings2 className="size-4" />
                </span>
                <div>
                  <h2 className="font-semibold">Identidade e funcionamento</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Preferências gerais que valem para este ambiente inteiro.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Nome do ambiente</span>
                  <Input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Plano</span>
                  <Input value={workspacePlan} onChange={(event) => setWorkspacePlan(event.target.value)} />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Fuso horário</span>
                  <Input value={workspaceTimezone} onChange={(event) => setWorkspaceTimezone(event.target.value)} />
                </label>
              </div>

              <details className="mt-5 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <summary className="cursor-pointer text-sm font-medium">Preferências avançadas das conversas</summary>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Normalmente a orbeAI escolhe tudo sozinha. Estas opções definem apenas o ponto de partida do ambiente.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Estilo inicial</span>
                    <Select value={defaultChatMode} onValueChange={setDefaultChatMode}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strategist">Planejar e organizar</SelectItem>
                        <SelectItem value="dev">Tecnologia e código</SelectItem>
                        <SelectItem value="document">Ler documentos</SelectItem>
                        <SelectItem value="research">Pesquisar assuntos</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Escolha dos motores</span>
                    <Select value={defaultModelPreference} onValueChange={setDefaultModelPreference}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automática</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="gemini">Gemini</SelectItem>
                        <SelectItem value="mock">Prévia local</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                </div>
              </details>
            </GlassCard>

            <GlassCard hoverable={false}>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <KeyRound className="size-4" />
                </span>
                <div>
                  <h2 className="font-semibold">Dados e permissões</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Escolha o que pode sair do ambiente e por quanto tempo as informações ficam guardadas.</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Como a memória deve aprender</span>
                  <Select value={memoryPolicy} onValueChange={setMemoryPolicy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strict">Sempre pedir confirmação</SelectItem>
                      <SelectItem value="balanced">Equilibrar ajuda e controle</SelectItem>
                      <SelectItem value="adaptive">Aprender com mais liberdade</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Por quanto tempo guardar os dados</span>
                  <div className="relative">
                    <Input value={dataRetentionDays} onChange={(event) => setDataRetentionDays(event.target.value)} inputMode="numeric" className="pr-14" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">dias</span>
                  </div>
                </label>

                <div className="rounded-2xl border border-border/60">
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium"><Download className="size-4 text-muted-foreground" /> Permitir exportações</div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Autoriza baixar itens e resultados criados.</p>
                    </div>
                    <Switch checked={allowExports} onCheckedChange={setAllowExports} />
                  </div>
                  <div className="border-t border-border/60" />
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium"><Globe2 className="size-4 text-muted-foreground" /> Links públicos</div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Permite compartilhar conteúdo sem exigir acesso ao ambiente.</p>
                    </div>
                    <Switch checked={allowPublicSharing} onCheckedChange={setAllowPublicSharing} />
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="flex justify-end">
            <Button onClick={onSaveWorkspace}>
              <Save className="mr-2 size-4" />
              Salvar preferências
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-5 space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <History className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar uma mudança ou item…"
                className="pl-9"
              />
            </div>
            <Select value={level} onValueChange={(value) => setLevel(value as AuditLog["level"] | "todos")}>
              <SelectTrigger className="sm:w-[190px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Tudo</SelectItem>
                <SelectItem value="info">Atividade comum</SelectItem>
                <SelectItem value="warn">Precisa de revisão</SelectItem>
                <SelectItem value="error">Falhas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <GlassCard hoverable={false} className="p-0 overflow-hidden">
            {logs.length === 0 ? (
              <div className="p-8 text-sm text-muted-foreground">Nenhum acontecimento encontrado.</div>
            ) : (
              <ul className="divide-y divide-border/60">
                {logs.map((log) => {
                  const Icon = actionIcon(log.action);
                  return (
                    <li key={log.id} className="flex items-start gap-3 px-5 py-4">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/55">
                        <Icon className="size-4 text-[var(--orbe-blue)]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{humanAction(log.action)}</span>
                          <Pill tone={actionTone(log)}>
                            {log.level === "error" ? "falha" : log.level === "warn" ? "revisar" : "registrado"}
                          </Pill>
                        </div>
                        <div className="mt-1 break-all text-xs text-muted-foreground">{log.target}</div>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[11px] text-muted-foreground">ver registro técnico</summary>
                          <div className="mt-2 rounded-lg bg-muted/45 p-2 font-mono text-[10px] text-muted-foreground">
                            {log.action} · {log.resourceType ?? "system"} · {log.actor}
                          </div>
                        </details>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{formatDate(log.at)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="usage" className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <GlassCard hoverable={false}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Zap className="size-3.5" /> Solicitações</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{totals.requests}</div>
            </GlassCard>
            <GlassCard hoverable={false}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><WalletCards className="size-3.5" /> Custo estimado</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{formatCost(totals.costUsd)}</div>
            </GlassCard>
            <GlassCard hoverable={false}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Database className="size-3.5" /> Volume processado</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{totals.tokens.toLocaleString("pt-BR")}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">unidades técnicas de texto</div>
            </GlassCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <GlassCard hoverable={false}>
              <h2 className="font-semibold">Por motor de inteligência</h2>
              <p className="mt-1 text-xs text-muted-foreground">Distribuição das solicitações processadas.</p>
              <div className="mt-4 space-y-3">
                {engineUsage.map((item) => (
                  <div key={item.provider} className="rounded-xl border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium capitalize">{item.provider}</span>
                      <Pill tone="blue">{item.requests} solicitações</Pill>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatCost(item.costUsd)}</span>
                      <span>{item.tokens.toLocaleString("pt-BR")} unidades</span>
                    </div>
                  </div>
                ))}
                {engineUsage.length === 0 && <p className="text-sm text-muted-foreground">Nenhum consumo registrado.</p>}
              </div>
            </GlassCard>

            <GlassCard hoverable={false}>
              <h2 className="font-semibold">Histórico de consumo</h2>
              <p className="mt-1 text-xs text-muted-foreground">Uma linha por período e motor utilizado.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border/60">
                      <th className="pb-3 font-medium">Data</th>
                      <th className="pb-3 font-medium">Motor</th>
                      <th className="pb-3 text-right font-medium">Solicitações</th>
                      <th className="pb-3 text-right font-medium">Custo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {usage.map((item, index) => (
                      <tr key={`${item.date}-${item.provider}-${index}`}>
                        <td className="py-3 text-muted-foreground">{item.date}</td>
                        <td className="py-3 capitalize">{item.provider}</td>
                        <td className="py-3 text-right tabular-nums">{item.requests}</td>
                        <td className="py-3 text-right font-medium tabular-nums">{formatCost(item.costUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        <TabsContent value="features" className="mt-5">
          <div className="mb-4 max-w-2xl">
            <h2 className="text-lg font-semibold">Recursos em teste</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Libere novidades aos poucos antes de disponibilizá-las para todo mundo.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {flags.map((flag) => (
              <GlassCard key={flag.key} hoverable={false} className={cn(flag.enabled && "border-blue-200/80 bg-blue-50/25")}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                      flag.enabled ? "bg-blue-100 text-blue-600" : "bg-muted text-muted-foreground",
                    )}>
                      <SlidersHorizontal className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium">{flag.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{audienceLabel(flag.audience)}</div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[11px] text-muted-foreground">identificador técnico</summary>
                        <code className="mt-1 block break-all rounded bg-muted/60 px-2 py-1 text-[10px]">{flag.key}</code>
                      </details>
                    </div>
                  </div>
                  <Switch checked={flag.enabled} onCheckedChange={() => onToggleFlag(flag.key)} />
                </div>
              </GlassCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="system" className="mt-5 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <GlassCard hoverable={false}>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <ServerCog className="size-4" />
                </span>
                <div>
                  <h2 className="font-semibold">Saúde da plataforma</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Estado das partes essenciais para a orbeAI funcionar.</p>
                </div>
              </div>

              <ul className="mt-5 divide-y divide-border/60">
                {[
                  { label: "Aplicação", value: "operacional" },
                  { label: "Armazenamento", value: "disponível" },
                  { label: "Motores de inteligência", value: "prontos com continuidade" },
                  { label: "Memória", value: "ativa e controlável" },
                  { label: "Histórico de segurança", value: "registrando mudanças" },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                    <StatusDot tone="success" pulse={false} />
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="ml-auto text-right text-xs text-muted-foreground">{item.value}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>

            <div className="space-y-4">
              <GlassCard hoverable={false}>
                <div className="flex items-center gap-2">
                  <Database className="size-4 text-[var(--orbe-blue)]" />
                  <h2 className="font-semibold">Identificação técnica</h2>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">endereço interno</dt><dd className="font-mono text-xs">{workspace?.slug ?? "—"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">idioma</dt><dd>{workspace?.settings.locale ?? "pt-BR"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">atualizado</dt><dd className="text-xs">{workspace ? formatDate(workspace.updatedAt) : "—"}</dd></div>
                </dl>
                <details className="mt-4 rounded-xl bg-muted/45 p-3">
                  <summary className="cursor-pointer text-xs font-medium">ver identificador completo</summary>
                  <code className="mt-2 block break-all text-[10px] text-muted-foreground">{workspace?.id ?? "—"}</code>
                </details>
              </GlassCard>

              <GlassCard hoverable={false} className="border-amber-200/70 bg-amber-50/25">
                <div className="flex items-start gap-3">
                  <EyeOff className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div>
                    <h2 className="text-sm font-semibold">Restaurar dados da prévia</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Apaga somente as alterações salvas neste navegador. Dados reais não são afetados.</p>
                  </div>
                </div>
                <Button variant="outline" className="mt-4 w-full" onClick={() => setResetOpen(true)}>
                  Restaurar prévia
                </Button>
              </GlassCard>
            </div>
          </div>

          {eventBuckets.length > 0 && (
            <GlassCard hoverable={false}>
              <h2 className="font-semibold">Distribuição dos registros técnicos</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {eventBuckets.slice(0, 8).map((bucket) => (
                  <div key={bucket.name} className="rounded-xl bg-muted/45 p-3">
                    <div className="truncate text-xs capitalize text-muted-foreground">{bucket.name}</div>
                    <div className="mt-1 text-xl font-semibold tabular-nums">{bucket.count}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Restaurar os dados desta prévia?"
        description="As alterações locais deste navegador serão apagadas. Nenhum dado real do servidor será removido."
        confirmLabel="Restaurar prévia"
        destructive
        onConfirm={onReset}
      />
    </div>
  );
}
