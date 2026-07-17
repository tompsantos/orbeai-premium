import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Brain,
  Check,
  Download,
  Folder,
  Globe2,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { MemoryDialog } from "@/components/memory/MemoryDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { memoryService } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { MemoryItem } from "@/types";

export const Route = createFileRoute("/app/memory")({
  head: () => ({ meta: [{ title: "Memória · orbeAI" }] }),
  component: MemoryPage,
});

type MemoryWithMeta = MemoryItem & { reason?: string };
type Filter = "todas" | "ativas" | "pendentes" | "arquivadas";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "todas", label: "Tudo" },
  { key: "ativas", label: "Em uso" },
  { key: "pendentes", label: "Para confirmar" },
  { key: "arquivadas", label: "Guardadas" },
];

function isAutomatic(memory: MemoryWithMeta) {
  return memory.source === "chat" && Boolean(memory.sourceEntityId);
}

function memoryOrigin(memory: MemoryWithMeta) {
  if (isAutomatic(memory)) return "Aprendida numa conversa";
  if (memory.source === "chat") return "Salva de uma conversa";
  if (memory.source === "documento") return "Lembrada de um arquivo";
  if (memory.source === "agente") return "Sugerida pela orbeAI";
  return "Adicionada por você";
}

function relativeDate(value?: string) {
  if (!value) return "recentemente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recentemente";
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
}

function MemoryPage() {
  const [items, setItems] = useState<MemoryWithMeta[]>([]);
  const [filter, setFilter] = useState<Filter>("todas");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<MemoryWithMeta | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  async function refresh() {
    setItems(await memoryService.list());
  }

  useEffect(() => {
    void refresh();
  }, []);

  const stats = useMemo(
    () => ({
      active: items.filter((item) => item.status === "ativa").length,
      pending: items.filter((item) => item.status === "pendente").length,
      archived: items.filter((item) => item.status === "arquivada").length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      if (
        normalizedQuery &&
        !`${item.label} ${item.content}`.toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }

      if (filter === "ativas") return item.status === "ativa";
      if (filter === "pendentes") return item.status === "pendente";
      if (filter === "arquivadas") return item.status === "arquivada";
      return true;
    });
  }, [filter, items, query]);

  function openNewMemory() {
    setEditing(null);
    setDialogOpen(true);
  }

  async function onSubmit(data: {
    label: string;
    content: string;
    scope: MemoryItem["scope"];
    status: MemoryItem["status"];
    reason?: string;
  }) {
    if (editing) {
      await memoryService.update(editing.id, data);
      toast.success("Lembrança atualizada");
    } else {
      await memoryService.create(data);
      toast.success("A orbeAI vai lembrar disso");
    }

    setEditing(null);
    await refresh();
  }

  async function onApprove(id: string) {
    await memoryService.approve(id);
    toast.success("Pronto, a orbeAI pode lembrar disso");
    await refresh();
  }

  async function onReject(id: string) {
    await memoryService.reject(id);
    toast("Lembrança guardada", {
      description: "Ela continua visível, mas não será usada nas conversas.",
    });
    await refresh();
  }

  async function onExport(memory: MemoryWithMeta) {
    const text = [`# ${memory.label}`, "", memory.content, ""].join("\n");
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${memory.label.replace(/\s+/g, "_")}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function onRemove() {
    if (!removeId) return;
    await memoryService.remove(removeId);
    setRemoveId(null);
    toast.success("Lembrança apagada");
    await refresh();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            o que a orbeAI lembra
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Memória</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Veja, corrija ou apague qualquer informação usada para tornar suas conversas mais pessoais.
          </p>
        </div>
        <Button onClick={openNewMemory} className="rounded-xl">
          <Plus className="mr-1.5 size-4" />
          Adicionar lembrança
        </Button>
      </header>

      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-[linear-gradient(135deg,rgba(239,246,255,0.92),rgba(255,255,255,0.98)_52%,rgba(238,242,255,0.78))] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-2xl items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Você escolhe o que fica</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                A orbeAI pode perceber informações úteis durante uma conversa, mas sugestões novas ficam esperando sua confirmação. Nada precisa ficar escondido.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
            <MemoryStat label="em uso" value={stats.active} />
            <MemoryStat label="confirmar" value={stats.pending} highlight={stats.pending > 0} />
            <MemoryStat label="guardadas" value={stats.archived} />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-border/70 bg-card p-1">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition",
                filter === item.key
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
              {item.key === "pendentes" && stats.pending > 0 && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar nas lembranças"
            className="h-9 rounded-xl pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card px-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Brain className="size-6" />
          </div>
          <h2 className="mt-4 font-semibold">Nada por aqui</h2>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            Tente outro filtro ou adicione algo que você gostaria que a orbeAI lembrasse.
          </p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={openNewMemory}>
            <Plus className="mr-1.5 size-4" />
            Adicionar lembrança
          </Button>
        </section>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onApprove={() => void onApprove(memory.id)}
              onReject={() => void onReject(memory.id)}
              onEdit={() => {
                setEditing(memory);
                setDialogOpen(true);
              }}
              onExport={() => void onExport(memory)}
              onRemove={() => setRemoveId(memory.id)}
            />
          ))}
        </div>
      )}

      <MemoryDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        initial={editing ?? undefined}
        onSubmit={onSubmit}
      />

      <ConfirmDialog
        open={Boolean(removeId)}
        onOpenChange={(open) => !open && setRemoveId(null)}
        title="Apagar esta lembrança?"
        description="A orbeAI deixará de usar essa informação e ela não poderá ser recuperada."
        confirmLabel="Apagar"
        destructive
        onConfirm={onRemove}
      />
    </div>
  );
}

function MemoryStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white/75 px-3 py-3 text-center shadow-sm",
        highlight ? "border-amber-200" : "border-white/80",
      )}
    >
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function MemoryCard({
  memory,
  onApprove,
  onReject,
  onEdit,
  onExport,
  onRemove,
}: {
  memory: MemoryWithMeta;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onExport: () => void;
  onRemove: () => void;
}) {
  const pending = memory.status === "pendente";
  const archived = memory.status === "arquivada";

  const scope =
    memory.scope === "global"
      ? { label: "Em qualquer conversa", icon: Globe2 }
      : memory.scope === "sensível"
        ? { label: "Informação sensível", icon: LockKeyhole }
        : { label: "Só neste projeto", icon: Folder };

  const ScopeIcon = scope.icon;

  return (
    <article
      className={cn(
        "group flex min-h-56 flex-col rounded-2xl border bg-card p-4 shadow-[0_12px_35px_-30px_rgba(15,23,42,0.55)] transition",
        pending && "border-amber-200 bg-amber-50/30",
        archived && "opacity-75",
        memory.scope === "sensível" && !pending && "border-violet-200/80",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            pending
              ? "bg-amber-100 text-amber-700"
              : archived
                ? "bg-muted text-muted-foreground"
                : "bg-blue-50 text-blue-600",
          )}
        >
          {isAutomatic(memory) ? <Sparkles className="size-4" /> : <Brain className="size-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="truncate text-sm font-semibold">{memory.label}</h2>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold",
                pending && "bg-amber-100 text-amber-700",
                memory.status === "ativa" && "bg-emerald-50 text-emerald-700",
                archived && "bg-muted text-muted-foreground",
              )}
            >
              {pending ? "confirmar" : archived ? "guardada" : "em uso"}
            </span>
          </div>
          <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">
            {memory.content}
          </p>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ScopeIcon className="size-3.5" />
            {scope.label}
          </span>
          <span>•</span>
          <span>{memoryOrigin(memory)}</span>
          <span>•</span>
          <span>{relativeDate(memory.updatedAt ?? memory.createdAt ?? memory.lastUsed)}</span>
        </div>

        {pending ? (
          <div className="mt-4 flex gap-2 border-t border-amber-200/70 pt-3">
            <Button size="sm" className="h-8 flex-1 rounded-lg" onClick={onApprove}>
              <Check className="mr-1.5 size-3.5" />
              Lembrar disso
            </Button>
            <Button size="sm" variant="outline" className="h-8 flex-1 rounded-lg" onClick={onReject}>
              <X className="mr-1.5 size-3.5" />
              Não usar
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-end gap-0.5 border-t border-border/60 pt-2">
            {archived && (
              <span className="mr-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Archive className="size-3" /> não entra nas conversas
              </span>
            )}
            <IconAction label="Editar" onClick={onEdit} icon={Pencil} />
            <IconAction label="Baixar" onClick={onExport} icon={Download} />
            <IconAction label="Apagar" onClick={onRemove} icon={Trash2} destructive />
          </div>
        )}
      </div>
    </article>
  );
}

function IconAction({
  label,
  onClick,
  icon: Icon,
  destructive = false,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Pencil;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground",
        destructive && "hover:bg-red-50 hover:text-red-600",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
