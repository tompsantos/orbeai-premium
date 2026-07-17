import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  FolderKanban,
  Home,
  LockKeyhole,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { GlassCard, Pill, SectionHeader } from "@/components/design-system/Primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/orbeone")({
  head: () => ({ meta: [{ title: "Espaços · orbeAI" }] }),
  component: WorkspacesPage,
});

type SpaceKind = "pessoal" | "estudos" | "trabalho" | "outro";
type SpaceVisibility = "privado" | "compartilhado";

type Space = {
  id: string;
  name: string;
  description: string;
  kind: SpaceKind;
  visibility: SpaceVisibility;
  people: number;
  projects: number;
  memories: number;
  updatedLabel: string;
};

const INITIAL_SPACES: Space[] = [
  {
    id: "personal",
    name: "Meu espaço",
    description: "Conversas, ideias, rotina e tudo o que pertence somente a você.",
    kind: "pessoal",
    visibility: "privado",
    people: 1,
    projects: 4,
    memories: 18,
    updatedLabel: "agora",
  },
  {
    id: "orbeone",
    name: "orbeOne",
    description: "Projetos, decisões, documentos e colaboração da empresa.",
    kind: "trabalho",
    visibility: "compartilhado",
    people: 5,
    projects: 8,
    memories: 32,
    updatedLabel: "há 12 min",
  },
  {
    id: "studies",
    name: "Faculdade e estudos",
    description: "Matérias, pesquisas, resumos e planos de aprendizagem.",
    kind: "estudos",
    visibility: "privado",
    people: 1,
    projects: 3,
    memories: 11,
    updatedLabel: "ontem",
  },
];

const KIND_OPTIONS: Array<{
  value: SpaceKind;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { value: "pessoal", label: "Pessoal", description: "Vida, rotina e interesses", icon: Home },
  { value: "estudos", label: "Estudos", description: "Cursos, matérias e pesquisas", icon: BookOpen },
  { value: "trabalho", label: "Trabalho", description: "Empresa, clientes e projetos", icon: BriefcaseBusiness },
  { value: "outro", label: "Outro", description: "Um espaço do seu jeito", icon: Sparkles },
];

function kindIcon(kind: SpaceKind) {
  return KIND_OPTIONS.find((option) => option.value === kind)?.icon ?? Sparkles;
}

function kindLabel(kind: SpaceKind) {
  return KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "Outro";
}

function WorkspacesPage() {
  const [spaces, setSpaces] = useState<Space[]>(INITIAL_SPACES);
  const [activeSpaceId, setActiveSpaceId] = useState("personal");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"todos" | SpaceVisibility>("todos");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<SpaceKind>("pessoal");
  const [visibility, setVisibility] = useState<SpaceVisibility>("privado");

  const activeSpace = spaces.find((space) => space.id === activeSpaceId) ?? spaces[0];

  const filteredSpaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return spaces.filter((space) => {
      const matchesFilter = filter === "todos" || space.visibility === filter;
      const matchesQuery =
        !normalized ||
        space.name.toLowerCase().includes(normalized) ||
        space.description.toLowerCase().includes(normalized) ||
        kindLabel(space.kind).toLowerCase().includes(normalized);

      return matchesFilter && matchesQuery;
    });
  }, [filter, query, spaces]);

  function enterSpace(space: Space) {
    setActiveSpaceId(space.id);
    toast.success(`${space.name} agora é o espaço ativo`);
  }

  function createSpace() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Dê um nome ao novo espaço");
      return;
    }

    const newSpace: Space = {
      id: `space-${Date.now()}`,
      name: trimmedName,
      description: description.trim() || "Um novo lugar para reunir conversas, projetos e memórias.",
      kind,
      visibility,
      people: 1,
      projects: 0,
      memories: 0,
      updatedLabel: "agora",
    };

    setSpaces((current) => [newSpace, ...current]);
    setActiveSpaceId(newSpace.id);
    setCreateOpen(false);
    setName("");
    setDescription("");
    setKind("pessoal");
    setVisibility("privado");
    toast.success("Novo espaço criado");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="workspaces, em linguagem humana"
        title="Espaços"
        description="Separe contextos da sua vida sem criar contas diferentes. Cada espaço guarda suas próprias conversas, memórias, arquivos, projetos e pessoas."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            Novo espaço
          </Button>
        }
      />

      <GlassCard
        hoverable={false}
        className="overflow-hidden border-[color-mix(in_oklch,var(--orbe-blue)_24%,var(--border))] bg-[color-mix(in_oklch,var(--orbe-blue)_5%,var(--card))]"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--orbe-blue)]">
              <ShieldCheck className="size-4" />
              Contextos realmente separados
            </div>
            <h2 className="mt-3 max-w-2xl text-xl font-semibold tracking-tight sm:text-2xl">
              Sua conversa pessoal não precisa aparecer no trabalho. Sua pesquisa da faculdade não precisa disputar espaço com uma viagem.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              A orbeAI usa apenas o contexto do espaço ativo. Trocar de espaço é como entrar em outro ambiente, levando apenas o que pertence a ele.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: LockKeyhole, title: "Memória separada", copy: "O que ela aprende em um espaço não vaza para outro." },
              { icon: Users, title: "Pessoas certas", copy: "Você decide quem pode entrar em cada ambiente." },
              { icon: FolderKanban, title: "Projetos dentro", copy: "Cada espaço pode reunir vários assuntos e projetos." },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/55 p-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--orbe-blue)]/10 text-[var(--orbe-blue)]">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.copy}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {activeSpace && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/55 p-4 sm:flex-row sm:items-center">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--orbe-blue)] to-[var(--orbe-cyan)] text-white shadow-sm">
            {(() => {
              const Icon = kindIcon(activeSpace.kind);
              return <Icon className="size-5" />;
            })()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{activeSpace.name}</span>
              <Pill tone="success">espaço ativo</Pill>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              Chat, busca e novas criações usarão o contexto deste espaço.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.success("Preferências do espaço abertas")}> 
            Gerenciar
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar espaços…"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {([
            ["todos", "Todos"],
            ["privado", "Privados"],
            ["compartilhado", "Compartilhados"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === value
                  ? "border-transparent bg-[var(--orbe-blue)] text-white"
                  : "border-border/70 text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filteredSpaces.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredSpaces.map((space) => {
            const Icon = kindIcon(space.kind);
            const isActive = space.id === activeSpaceId;

            return (
              <GlassCard
                key={space.id}
                className={cn(
                  "flex min-h-[250px] flex-col transition-all",
                  isActive && "border-[color-mix(in_oklch,var(--orbe-blue)_42%,var(--border))] shadow-[var(--shadow-sm)]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--orbe-blue)]/10 text-[var(--orbe-blue)]">
                    <Icon className="size-5" />
                  </span>
                  <div className="flex items-center gap-2">
                    {isActive && <Pill tone="success">ativo</Pill>}
                    <button
                      type="button"
                      onClick={() => toast.success(`Opções de ${space.name}`)}
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      aria-label={`Opções de ${space.name}`}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{space.name}</h3>
                    <Pill tone="muted">{kindLabel(space.kind)}</Pill>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{space.description}</p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-muted/45 px-2 py-2.5">
                    <div className="font-semibold tabular-nums">{space.people}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{space.people === 1 ? "pessoa" : "pessoas"}</div>
                  </div>
                  <div className="rounded-lg bg-muted/45 px-2 py-2.5">
                    <div className="font-semibold tabular-nums">{space.projects}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">projetos</div>
                  </div>
                  <div className="rounded-lg bg-muted/45 px-2 py-2.5">
                    <div className="font-semibold tabular-nums">{space.memories}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">memórias</div>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {space.visibility === "privado" ? <LockKeyhole className="size-3" /> : <Users className="size-3" />}
                    {space.visibility} · atualizado {space.updatedLabel}
                  </div>
                  <Button
                    size="sm"
                    variant={isActive ? "outline" : "default"}
                    disabled={isActive}
                    onClick={() => enterSpace(space)}
                  >
                    {isActive ? (
                      <>
                        <Check className="mr-1 size-3.5" />
                        Em uso
                      </>
                    ) : (
                      <>
                        Entrar
                        <ChevronRight className="ml-1 size-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <GlassCard hoverable={false} className="py-12 text-center">
          <Search className="mx-auto size-6 text-muted-foreground" />
          <div className="mt-3 font-medium">Nenhum espaço encontrado</div>
          <p className="mt-1 text-sm text-muted-foreground">Tente outro termo ou remova o filtro selecionado.</p>
        </GlassCard>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <GlassCard hoverable={false}>
          <div className="flex items-center gap-2">
            <FolderKanban className="size-4 text-[var(--orbe-blue)]" />
            <h3 className="font-semibold">Espaço não é projeto</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 p-3.5">
              <div className="text-sm font-medium">Espaço</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Um contexto amplo da sua vida, com pessoas, regras e memória próprias. Exemplo: pessoal, estudos ou empresa.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-3.5">
              <div className="text-sm font-medium">Projeto</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Um assunto específico dentro de um espaço. Exemplo: viagem para a Bolívia, uma matéria ou o lançamento de um produto.
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard hoverable={false}>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--orbe-blue)]" />
            <h3 className="font-semibold">Quando criar outro espaço?</h3>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {[
              "Quando memórias e arquivos não devem se misturar.",
              "Quando um grupo diferente de pessoas precisa ter acesso.",
              "Quando aquele contexto precisa de regras ou preferências próprias.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--orbe-blue)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Criar um novo espaço</DialogTitle>
            <DialogDescription>
              Escolha um contexto que merece memória, projetos e participantes separados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Nome</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Minha casa, Pós-graduação, Agência…" />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium">Para que este espaço será usado?</span>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Uma descrição curta ajuda a orbeAI a entender o contexto."
                className="min-h-24 resize-none"
              />
            </label>

            <div>
              <div className="text-sm font-medium">Tipo de espaço</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {KIND_OPTIONS.map((option) => {
                  const Icon = option.icon;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setKind(option.value)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                        kind === option.value
                          ? "border-[var(--orbe-blue)] bg-[var(--orbe-blue)]/6"
                          : "border-border/70 hover:bg-accent/40",
                      )}
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-[var(--orbe-blue)]" />
                      <span>
                        <span className="block text-sm font-medium">{option.label}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">Quem poderá entrar?</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {([
                  ["privado", LockKeyhole, "Só você", "Pode convidar pessoas depois."],
                  ["compartilhado", Users, "Compartilhado", "Preparado para colaborar desde o início."],
                ] as const).map(([value, Icon, label, copy]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setVisibility(value)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                      visibility === value
                        ? "border-[var(--orbe-blue)] bg-[var(--orbe-blue)]/6"
                        : "border-border/70 hover:bg-accent/40",
                    )}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-[var(--orbe-blue)]" />
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{copy}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={createSpace}>Criar espaço</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
