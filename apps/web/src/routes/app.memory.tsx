import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GlassCard, Pill, SectionHeader } from "@/components/design-system/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemoryDialog } from "@/components/memory/MemoryDialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { memoryService } from "@/lib/api";
import type { MemoryItem } from "@/types";
import {
  Archive,
  Brain,
  Check,
  Clock,
  Download,
  Pencil,
  Plus,
  Search,
  Shield,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/memory")({
  head: () => ({ meta: [{ title: "Memória · orbeAI" }] }),
  component: MemoryPage,
});

const TABS = ["todas", "ativas", "pendentes", "automáticas", "global", "projeto", "sensível", "arquivada"] as const;
type Tab = typeof TABS[number];

type MemoryWithMeta = MemoryItem & {
  reason?: string;
};

function isAutoMemory(memory: MemoryWithMeta) {
  return memory.source === "chat" && Boolean(memory.sourceEntityId);
}

function sourceLabel(memory: MemoryWithMeta) {
  if (isAutoMemory(memory)) return "automática";
  if (memory.source === "chat") return "chat manual";

  return memory.source;
}

function contextLabel(memory: MemoryWithMeta) {
  if (memory.status === "ativa") return "entra no contexto";
  if (memory.status === "pendente") return "aguardando curadoria";

  return "fora do contexto";
}

function contextTone(memory: MemoryWithMeta): "success" | "warn" | "muted" {
  if (memory.status === "ativa") return "success";
  if (memory.status === "pendente") return "warn";

  return "muted";
}

function confidenceTone(memory: MemoryWithMeta): "success" | "warn" | "muted" {
  if (memory.confidence >= 0.9) return "success";
  if (memory.confidence >= 0.75) return "warn";

  return "muted";
}

function shortDate(value?: string) {
  if (!value) return "—";

  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: ptBR });
}

function MemoryPage() {
  const [items, setItems] = useState<MemoryWithMeta[]>([]);
  const [tab, setTab] = useState<Tab>("todas");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<MemoryItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  async function refresh() {
    setItems(await memoryService.list());
  }

  useEffect(() => {
    void refresh();
  }, []);

  const stats = useMemo(() => {
    const active = items.filter((m) => m.status === "ativa").length;
    const pending = items.filter((m) => m.status === "pendente").length;
    const archived = items.filter((m) => m.status === "arquivada").length;
    const automatic = items.filter(isAutoMemory).length;

    return {
      total: items.length,
      active,
      pending,
      archived,
      automatic,
    };
  }, [items]);

  const filtered = items.filter((m) => {
    const query = q.toLowerCase().trim();

    if (query && !(m.label.toLowerCase().includes(query) || m.content.toLowerCase().includes(query))) {
      return false;
    }

    if (tab === "todas") return true;
    if (tab === "ativas") return m.status === "ativa";
    if (tab === "pendentes") return m.status === "pendente";
    if (tab === "automáticas") return isAutoMemory(m);
    if (tab === "global" || tab === "projeto" || tab === "sensível") return m.scope === tab;

    return m.status === tab;
  });

  async function onSubmit(data: { label: string; content: string; scope: MemoryItem["scope"]; status: MemoryItem["status"]; reason?: string }) {
    if (editing) {
      await memoryService.update(editing.id, data);
      toast.success("Memória atualizada");
    } else {
      await memoryService.create(data);
      toast.success("Memória criada");
    }

    setEditing(null);
    await refresh();
  }

  async function onApprove(id: string) {
    await memoryService.approve(id);
    toast.success("Memória aprovada", { description: "Ela pode entrar no contexto quando for relevante." });
    await refresh();
  }

  async function onReject(id: string) {
    await memoryService.reject(id);
    toast("Memória arquivada", { description: "Ela não será usada como contexto ativo." });
    await refresh();
  }

  async function onExport(m: MemoryWithMeta) {
    const txt = [
      `# ${m.label}`,
      "",
      `Escopo: ${m.scope}`,
      `Fonte: ${sourceLabel(m)}`,
      `Status: ${m.status}`,
      `Confiança: ${(m.confidence * 100).toFixed(0)}%`,
      `Contexto: ${contextLabel(m)}`,
      `Criada: ${m.createdAt ?? "—"}`,
      `Atualizada: ${m.updatedAt ?? m.lastUsed}`,
      "",
      m.content,
      "",
    ].join("\n");

    const blob = new Blob([txt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${m.label.replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onRemove() {
    if (!removeId) return;

    await memoryService.remove(removeId);
    setRemoveId(null);
    toast.success("Memória removida");
    await refresh();
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="memory center"
        title="Memória inteligente e governável"
        description="A orbeAI pode lembrar sozinha, mas toda memória fica visível, editável e removível."
        action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="size-4 mr-1" /> Nova memória</Button>}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <GlassCard hoverable={false}>
          <div className="text-xs text-muted-foreground">total</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{stats.total}</div>
        </GlassCard>
        <GlassCard hoverable={false}>
          <div className="text-xs text-muted-foreground">ativas no contexto</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{stats.active}</div>
        </GlassCard>
        <GlassCard hoverable={false}>
          <div className="text-xs text-muted-foreground">pendentes</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{stats.pending}</div>
        </GlassCard>
        <GlassCard hoverable={false}>
          <div className="text-xs text-muted-foreground">automáticas</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{stats.automatic}</div>
        </GlassCard>
        <GlassCard hoverable={false}>
          <div className="text-xs text-muted-foreground">arquivadas</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{stats.archived}</div>
        </GlassCard>
      </div>

      <GlassCard className="orbe-active" hoverable={false}>
        <div className="flex items-start gap-3.5">
          <div className="size-10 rounded-xl bg-gradient-to-br from-[var(--orbe-blue)] to-[var(--orbe-cyan)] flex items-center justify-center shrink-0 shadow-[var(--shadow-soft)]">
            <Shield className="size-5 text-white" />
          </div>
          <div>
            <div className="font-semibold">Política de memória</div>
            <p className="text-sm text-muted-foreground mt-1 text-pretty">
              Memórias explícitas entram como ativas. Memórias inferidas entram como pendentes até aprovação. Memórias arquivadas não entram no contexto.
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex flex-wrap gap-1 p-1 rounded-xl orbe-surface">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
                tab === t ? "bg-card text-foreground shadow-[var(--shadow-xs)]" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative md:ml-auto md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar memórias…" className="pl-9 h-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Brain className="size-6" />}
          title="Nenhuma memória neste filtro"
          description="Crie uma nova memória manual ou ajuste os filtros."
          action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="size-4 mr-1" /> Nova memória</Button>}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((m) => (
            <GlassCard key={m.id} className={cn(m.scope === "sensível" && "border-[var(--warning)]/40")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isAutoMemory(m) ? (
                      <Sparkles className="size-4 text-[var(--orbe-blue)]" />
                    ) : (
                      <Brain className="size-4 text-[var(--orbe-blue)]" />
                    )}
                    <span className="font-medium text-sm truncate">{m.label}</span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{m.content}</p>

                  {m.reason && (
                    <p className="text-[11px] italic text-muted-foreground mt-1">motivo: {m.reason}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <Pill tone={m.scope === "sensível" ? "warn" : m.scope === "global" ? "blue" : "muted"}>{m.scope}</Pill>
                    <Pill tone="muted">origem: {sourceLabel(m)}</Pill>
                    <Pill tone={confidenceTone(m)}>conf. {(m.confidence * 100).toFixed(0)}%</Pill>
                    <Pill tone={m.status === "ativa" ? "success" : m.status === "pendente" ? "warn" : "muted"}>{m.status}</Pill>
                    <Pill tone={contextTone(m)}>{contextLabel(m)}</Pill>
                  </div>

                  <div className="mt-3 grid sm:grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                    <div className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      criada {shortDate(m.createdAt)}
                    </div>
                    <div className="inline-flex items-center gap-1">
                      <Archive className="size-3" />
                      atualizada {shortDate(m.updatedAt ?? m.lastUsed)}
                    </div>
                  </div>

                  {m.sourceEntityId && (
                    <div className="mt-1 text-[10px] text-muted-foreground/70 truncate">
                      origem técnica: {m.sourceEntityId}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  {m.status === "pendente" && (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => onApprove(m.id)} title="Aprovar">
                        <Check className="size-3.5 text-[var(--success)]" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onReject(m.id)} title="Arquivar">
                        <X className="size-3.5" />
                      </Button>
                    </>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(m); setDialogOpen(true); }} title="Editar">
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onExport(m)} title="Exportar">
                    <Download className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setRemoveId(m.id)} title="Remover">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <MemoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing ?? undefined}
        onSubmit={onSubmit}
      />

      <ConfirmDialog
        open={!!removeId}
        onOpenChange={(v) => !v && setRemoveId(null)}
        title="Remover memória?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        destructive
        onConfirm={onRemove}
      />
    </div>
  );
}
