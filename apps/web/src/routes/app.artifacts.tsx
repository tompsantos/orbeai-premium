import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BookOpen,
  CheckSquare,
  Clock3,
  Code2,
  Copy,
  Download,
  FileText,
  FolderOpen,
  History,
  Library,
  ListChecks,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

import { ArtifactDialog } from "@/components/artifacts/ArtifactDialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { OrbeMark } from "@/components/design-system/OrbeLogo";
import { Pill } from "@/components/design-system/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { artifactService, projectService } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Artifact, ArtifactKind, Project } from "@/types";

export const Route = createFileRoute("/app/artifacts")({
  head: () => ({ meta: [{ title: "Biblioteca · orbeAI" }] }),
  component: LibraryPage,
});

type LibraryFilter = "todos" | "textos" | "planos" | "listas" | "técnicos";

const FILTERS: { id: LibraryFilter; label: string }[] = [
  { id: "todos", label: "Tudo" },
  { id: "textos", label: "Textos" },
  { id: "planos", label: "Planos" },
  { id: "listas", label: "Listas" },
  { id: "técnicos", label: "Técnicos" },
];

function kindLabel(kind: ArtifactKind) {
  if (kind === "plano de ação") return "plano";
  if (kind === "landing page") return "página";
  if (kind === "json") return "dados";
  if (kind === "código") return "código";
  return kind;
}

function kindGroup(kind: ArtifactKind): Exclude<LibraryFilter, "todos"> {
  if (["plano de ação", "playbook"].includes(kind)) return "planos";
  if (["checklist", "tabela"].includes(kind)) return "listas";
  if (["código", "json", "prompt"].includes(kind)) return "técnicos";
  return "textos";
}

function KindIcon({ kind, className }: { kind: ArtifactKind; className?: string }) {
  if (kind === "código" || kind === "json" || kind === "prompt") {
    return <Code2 className={className} />;
  }

  if (kind === "checklist" || kind === "tabela") {
    return <ListChecks className={className} />;
  }

  if (kind === "plano de ação" || kind === "playbook") {
    return <CheckSquare className={className} />;
  }

  return <FileText className={className} />;
}

function LibraryPage() {
  const [items, setItems] = useState<Artifact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [instructions, setInstructions] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("todos");
  const [newOpen, setNewOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [improving, setImproving] = useState(false);

  const active = items.find((item) => item.id === activeId) ?? null;
  const activeProject = projects.find((project) => project.id === active?.projectId);

  async function refresh(selectId?: string | null) {
    const [list, projectList] = await Promise.all([
      artifactService.list(),
      projectService.list(),
    ]);

    setItems(list);
    setProjects(projectList);

    const nextId = selectId ?? activeId ?? list[0]?.id ?? null;
    const nextItem = list.find((item) => item.id === nextId) ?? null;

    setActiveId(nextItem?.id ?? null);
    setContent(nextItem?.content ?? "");
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      if (filter !== "todos" && kindGroup(item.kind) !== filter) return false;
      if (!query) return true;

      return `${item.title} ${item.kind} ${item.content}`.toLowerCase().includes(query);
    });
  }, [filter, items, search]);

  const recentCount = items.filter((item) => {
    const updated = new Date(item.updatedAt).getTime();
    return Date.now() - updated <= 1000 * 60 * 60 * 24 * 7;
  }).length;

  async function onSave() {
    if (!active) return;

    setSaving(true);
    try {
      const updated = await artifactService.saveVersion(active.id, content, "Edição salva");
      if (!updated) return;

      toast.success("Alterações salvas");
      await refresh(updated.id);
    } finally {
      setSaving(false);
    }
  }

  async function onImprove() {
    if (!active) return;

    setImproving(true);
    try {
      const request = instructions.trim();
      const updated = request
        ? await artifactService.saveVersion(
            active.id,
            `${content}\n\n---\n\n_Ajuste solicitado à orbeAI:_ ${request}\n\n- Estrutura revisada\n- Clareza aprimorada\n- Próximos passos destacados`,
            "Melhorado com a orbeAI",
          )
        : await artifactService.enhanceMock(active.id);

      if (!updated) return;

      setContent(updated.content);
      setInstructions("");
      toast.success("Nova versão criada", {
        description: "A anterior continua disponível no histórico.",
      });
      await refresh(updated.id);
    } finally {
      setImproving(false);
    }
  }

  async function onQuickTransform(kind: "resumo" | "checklist") {
    if (!active) return;

    const addition = kind === "resumo"
      ? "\n\n## Resumo\n\n- Ideia principal organizada\n- Pontos essenciais destacados\n- Próximo passo sugerido"
      : "\n\n## Checklist\n\n- [ ] Revisar conteúdo\n- [ ] Confirmar pontos principais\n- [ ] Compartilhar ou exportar";

    const updated = await artifactService.saveVersion(
      active.id,
      `${content}${addition}`,
      kind === "resumo" ? "Transformado em resumo" : "Transformado em checklist",
    );

    if (!updated) return;

    setContent(updated.content);
    toast.success(kind === "resumo" ? "Resumo criado" : "Checklist criado");
    await refresh(updated.id);
  }

  async function onExport() {
    if (!active) return;

    const result = await artifactService.exportText(active.id);
    if (!result) return;

    const blob = new Blob([result.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo exportado");
  }

  async function onCreate(data: {
    title: string;
    kind: Artifact["kind"];
    content: string;
    projectId?: string;
  }) {
    const created = await artifactService.create(data);
    toast.success("Item criado na Biblioteca");
    await refresh(created.id);
  }

  async function onRemove() {
    if (!active) return;

    const currentId = active.id;
    await artifactService.remove(currentId);
    setRemoveOpen(false);
    toast.success("Item removido");

    const nextId = items.find((item) => item.id !== currentId)?.id ?? null;
    await refresh(nextId);
  }

  function selectItem(item: Artifact) {
    setActiveId(item.id);
    setContent(item.content);
    setInstructions("");
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-[linear-gradient(135deg,rgba(239,246,255,0.94),rgba(255,255,255,0.98)_52%,rgba(236,254,255,0.72))] p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)] md:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
          <div>
            <div className="mb-4 flex size-11 items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-sm">
              <OrbeMark size={24} />
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Biblioteca
            </div>
            <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              Tudo que você criou, pronto para continuar.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Guarde textos, planos, relatórios, listas e outras criações da orbeAI. Você pode editar, melhorar, exportar ou retomar qualquer item depois.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => setNewOpen(true)}>
                <Plus className="mr-1.5 size-4" /> Criar novo
              </Button>
              <Button variant="outline" onClick={() => document.getElementById("library-search")?.focus()}>
                <Search className="mr-1.5 size-4" /> Buscar na Biblioteca
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <LibraryStat icon={Library} value={items.length} label="itens" />
            <LibraryStat icon={Clock3} value={recentCount} label="recentes" />
            <LibraryStat
              icon={FolderOpen}
              value={new Set(items.map((item) => item.projectId).filter(Boolean)).size}
              label="projetos"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-card shadow-[0_20px_60px_-50px_rgba(15,23,42,0.65)]">
        <div className="grid min-h-[680px] lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-b border-border/70 bg-slate-50/65 lg:border-b-0 lg:border-r">
            <div className="space-y-3 border-b border-border/60 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="library-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por título ou conteúdo…"
                  className="h-10 bg-white pl-9"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                      filter === item.id
                        ? "bg-slate-950 text-white"
                        : "border border-border/70 bg-white text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {filteredItems.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <BookOpen className="mx-auto size-6 text-muted-foreground/50" />
                  <div className="mt-3 text-sm font-medium">Nada encontrado</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tente outro termo ou escolha uma categoria diferente.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {filteredItems.map((item) => {
                    const selected = item.id === activeId;
                    const project = projects.find((projectItem) => projectItem.id === item.projectId);

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => selectItem(item)}
                          className={cn(
                            "group w-full rounded-xl border p-3 text-left transition",
                            selected
                              ? "border-blue-200 bg-white shadow-sm"
                              : "border-transparent hover:border-border/70 hover:bg-white/80",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                              selected ? "bg-blue-50 text-blue-700" : "bg-white text-muted-foreground",
                            )}>
                              <KindIcon kind={item.kind} className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className={cn("truncate text-sm", selected && "font-semibold")}>{item.title}</div>
                              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <span>{kindLabel(item.kind)}</span>
                                {project && (
                                  <>
                                    <span>·</span>
                                    <span className="truncate">{project.name}</span>
                                  </>
                                )}
                              </div>
                              <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-muted-foreground/85">
                                {item.content.replace(/[#*_`>-]/g, " ").replace(/\s+/g, " ").trim() || "Item sem conteúdo ainda."}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-border/60 p-3">
              <Button variant="outline" className="w-full bg-white" onClick={() => setNewOpen(true)}>
                <Plus className="mr-1.5 size-4" /> Novo item
              </Button>
            </div>
          </aside>

          {active ? (
            <div className="flex min-w-0 flex-col">
              <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <KindIcon kind={active.kind} className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold sm:text-base">{active.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>{kindLabel(active.kind)}</span>
                      {activeProject && (
                        <>
                          <span>·</span>
                          <span>{activeProject.name}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>atualizado {formatDistanceToNow(new Date(active.updatedAt), { addSuffix: true, locale: ptBR })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="icon" variant="ghost" title="Ver histórico">
                        <History className="size-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80">
                      <div className="text-sm font-semibold">Histórico de versões</div>
                      <p className="mt-1 text-xs text-muted-foreground">Você pode conferir quando cada versão foi criada.</p>
                      <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                        {active.versions.slice().reverse().map((version, index) => (
                          <li key={version.id} className="rounded-lg border border-border/60 p-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-medium">{version.note}</span>
                              {index === 0 && <Pill tone="blue">atual</Pill>}
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              {new Date(version.createdAt).toLocaleString("pt-BR")}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </PopoverContent>
                  </Popover>

                  <Button
                    size="icon"
                    variant="ghost"
                    title="Copiar"
                    onClick={() => {
                      void navigator.clipboard.writeText(content);
                      toast.success("Conteúdo copiado");
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Exportar" onClick={onExport}>
                    <Download className="size-4" />
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="icon" variant="ghost" title="Mais opções">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-48 p-1.5">
                      <button
                        type="button"
                        onClick={() => setRemoveOpen(true)}
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="size-4" /> Remover item
                      </button>
                    </PopoverContent>
                  </Popover>
                  <Button size="sm" onClick={onSave} disabled={saving}>
                    <Save className="mr-1.5 size-3.5" /> {saving ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              </header>

              <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_310px]">
                <div className="flex min-h-[520px] min-w-0 flex-col border-b border-border/60 p-4 sm:p-5 xl:border-b-0 xl:border-r">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Conteúdo</div>
                      <div className="text-[11px] text-muted-foreground">Edite livremente e salve quando terminar.</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">{content.length} caracteres</div>
                  </div>
                  <Textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    className="min-h-[440px] flex-1 resize-none border-border/60 bg-white p-5 font-sans text-sm leading-7 shadow-inner focus-visible:ring-blue-200"
                    placeholder="Comece a escrever…"
                  />
                </div>

                <aside className="space-y-4 bg-slate-50/55 p-4 sm:p-5">
                  <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <WandSparkles className="size-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">Melhorar com a orbeAI</div>
                        <div className="text-[10px] text-muted-foreground">A versão atual fica guardada.</div>
                      </div>
                    </div>
                    <Textarea
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                      placeholder="Ex.: deixe mais claro, mais curto ou com um tom mais leve…"
                      rows={5}
                      className="mt-3 resize-none bg-slate-50/70 text-xs leading-5"
                    />
                    <Button className="mt-3 w-full" size="sm" onClick={onImprove} disabled={improving}>
                      <Sparkles className="mr-1.5 size-3.5" /> {improving ? "Melhorando…" : "Criar versão melhorada"}
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-white p-4">
                    <div className="text-sm font-semibold">Transformações rápidas</div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Reorganize o conteúdo sem perder a versão atual.
                    </p>
                    <div className="mt-3 grid gap-2">
                      <Button variant="outline" size="sm" className="justify-start" onClick={() => onQuickTransform("resumo")}>
                        <FileText className="mr-2 size-3.5" /> Criar resumo
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start" onClick={() => onQuickTransform("checklist")}>
                        <ListChecks className="mr-2 size-3.5" /> Transformar em checklist
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sobre este item</div>
                    <dl className="mt-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">tipo</dt>
                        <dd>{kindLabel(active.kind)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">projeto</dt>
                        <dd className="truncate text-right">{activeProject?.name ?? "sem projeto"}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">versões</dt>
                        <dd>{active.versions.length}</dd>
                      </div>
                    </dl>
                  </div>
                </aside>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[620px] items-center justify-center p-6">
              <EmptyState
                icon={<Library className="size-6" />}
                title="Sua Biblioteca está pronta"
                description="Crie um texto, plano, relatório ou lista para começar. Resultados salvos em Conhecimento também aparecem aqui."
                action={(
                  <Button onClick={() => setNewOpen(true)}>
                    <Plus className="mr-1.5 size-4" /> Criar primeiro item
                  </Button>
                )}
              />
            </div>
          )}
        </div>
      </section>

      <ArtifactDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        projects={projects}
        onSubmit={onCreate}
      />
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remover este item?"
        description="Esta ação apaga o conteúdo e todas as versões salvas."
        confirmLabel="Remover"
        destructive
        onConfirm={onRemove}
      />
    </div>
  );
}

function LibraryStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Library;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-3 text-center shadow-sm backdrop-blur">
      <Icon className="mx-auto size-4 text-blue-700" />
      <div className="mt-2 text-xl font-semibold tabular-nums text-slate-950">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
    </div>
  );
}
