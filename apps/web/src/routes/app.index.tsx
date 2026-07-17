import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  FileSearch,
  FileText,
  FolderKanban,
  GraduationCap,
  Library,
  Lightbulb,
  MessageSquare,
  Mic,
  Paperclip,
  Search,
  Send,
  Sparkles,
  SunMedium,
  WandSparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { artifactService, chatService, memoryService, projectService } from "@/lib/api";
import { getStoredAuthUser } from "@/lib/auth/session";
import type { Artifact, Chat, MemoryItem, Project } from "@/types";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Início · orbeAI" }] }),
  component: Dashboard,
});

type ExploreItem = {
  title: string;
  description: string;
  icon: typeof MessageSquare;
  to: "/app/chat" | "/app/research" | "/app/artifacts" | "/app/projects";
  shellClass: string;
  iconClass: string;
};

const exploreItems: ExploreItem[] = [
  {
    title: "Conversar",
    description: "Fale sobre qualquer assunto",
    icon: MessageSquare,
    to: "/app/chat",
    shellClass: "border-blue-200/70 bg-blue-50/55",
    iconClass: "bg-blue-100/80 text-blue-600",
  },
  {
    title: "Pesquisar",
    description: "Encontre respostas confiáveis",
    icon: Search,
    to: "/app/research",
    shellClass: "border-emerald-200/70 bg-emerald-50/55",
    iconClass: "bg-emerald-100/80 text-emerald-600",
  },
  {
    title: "Analisar arquivo",
    description: "Extraia insights de qualquer documento",
    icon: FileSearch,
    to: "/app/chat",
    shellClass: "border-violet-200/70 bg-violet-50/55",
    iconClass: "bg-violet-100/80 text-violet-600",
  },
  {
    title: "Criar",
    description: "Gere conteúdos, ideias e soluções",
    icon: WandSparkles,
    to: "/app/artifacts",
    shellClass: "border-purple-200/70 bg-purple-50/45",
    iconClass: "bg-purple-100/80 text-purple-600",
  },
  {
    title: "Aprender",
    description: "Estude, entenda e evolua",
    icon: GraduationCap,
    to: "/app/chat",
    shellClass: "border-amber-200/70 bg-amber-50/55",
    iconClass: "bg-amber-100/80 text-amber-600",
  },
  {
    title: "Organizar ideia",
    description: "Transforme pensamentos em planos",
    icon: Lightbulb,
    to: "/app/projects",
    shellClass: "border-rose-200/70 bg-rose-50/50",
    iconClass: "bg-rose-100/80 text-rose-600",
  },
];

function relativeDate(value?: string) {
  if (!value) return "recentemente";

  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: ptBR });
  } catch {
    return "recentemente";
  }
}

function Dashboard() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  useEffect(() => {
    void Promise.all([
      chatService.list(),
      projectService.list(),
      memoryService.list({ status: "pendente" }),
      artifactService.list(),
    ]).then(([chatItems, projectItems, memoryItems, artifactItems]) => {
      setChats(chatItems);
      setProjects(projectItems);
      setMemories(memoryItems);
      setArtifacts(artifactItems);
    });
  }, []);

  const firstName = useMemo(() => {
    const user = getStoredAuthUser();
    return user?.name?.trim().split(/\s+/)[0] || "Tom";
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const latestChat = chats[0];
  const latestProject = projects[0];
  const latestArtifact = artifacts[0];
  const latestMemory = memories[0];
  const activeProjects = projects.filter((project) => project.status === "ativo").length;

  const documentCount = artifacts.filter((artifact) =>
    ["documento", "relatório", "contrato"].includes(artifact.kind),
  ).length;
  const planCount = artifacts.filter((artifact) =>
    ["plano de ação", "playbook", "checklist"].includes(artifact.kind),
  ).length;
  const otherArtifactCount = Math.max(0, artifacts.length - documentCount - planCount);

  const activities = [
    latestMemory && {
      key: `memory-${latestMemory.id}`,
      icon: Brain,
      iconClass: "bg-violet-100 text-violet-600",
      label: `Memória criada: ${latestMemory.label}`,
      date: latestMemory.updatedAt || latestMemory.createdAt || latestMemory.lastUsed,
    },
    latestArtifact && {
      key: `artifact-${latestArtifact.id}`,
      icon: FileText,
      iconClass: "bg-blue-100 text-blue-600",
      label: `Arquivo atualizado: ${latestArtifact.title}`,
      date: latestArtifact.updatedAt,
    },
    latestChat && {
      key: `chat-${latestChat.id}`,
      icon: MessageSquare,
      iconClass: "bg-sky-100 text-sky-600",
      label: `Conversa: ${latestChat.title}`,
      date: latestChat.updatedAt,
    },
    latestProject && {
      key: `project-${latestProject.id}`,
      icon: Lightbulb,
      iconClass: "bg-amber-100 text-amber-600",
      label: `Projeto atualizado: ${latestProject.name}`,
      date: latestProject.updatedAt,
    },
  ].filter(Boolean) as Array<{
    key: string;
    icon: typeof MessageSquare;
    iconClass: string;
    label: string;
    date: string;
  }>;

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card px-5 py-5 shadow-[0_16px_50px_-32px_rgba(15,23,42,0.45)] sm:px-7 sm:py-6">
        <div
          className="pointer-events-none absolute -right-20 -top-32 size-[28rem] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, #c4b5fd 0%, #bfdbfe 34%, transparent 68%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-36 right-1/4 size-72 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, var(--orbe-cyan), transparent 68%)" }}
        />

        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/85 shadow-sm">
              <SunMedium className="size-6 text-[var(--orbe-blue)]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {greeting}, {firstName}.
              </h1>
              <p className="mt-0.5 text-xl leading-tight text-foreground/75 sm:text-2xl">
                No que vamos mergulhar hoje?
              </p>
            </div>
            <Sparkles className="ml-auto mt-4 hidden size-7 text-[var(--orbe-blue)] sm:block" />
          </div>

          <Link
            to="/app/chat"
            className="group mt-5 flex min-h-13 w-full items-center gap-3 rounded-xl border border-blue-200/80 bg-background/90 px-4 py-3 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <span className="min-w-0 flex-1 text-sm text-muted-foreground sm:text-base">
              Envie uma mensagem para a orbeAI...
            </span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--orbe-blue)] text-white shadow-sm transition group-hover:scale-[1.03]">
              <Send className="size-4" />
            </span>
          </Link>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/app/chat"
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/75 px-4 py-2 text-xs font-medium transition hover:bg-accent sm:text-sm"
            >
              <Paperclip className="size-4" /> Anexar arquivo
            </Link>
            <Link
              to="/app/chat"
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/75 px-4 py-2 text-xs font-medium transition hover:bg-accent sm:text-sm"
            >
              <Mic className="size-4" /> Usar voz
            </Link>
            <Link
              to="/app/research"
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/75 px-4 py-2 text-xs font-medium transition hover:bg-accent sm:text-sm"
            >
              <Search className="size-4" /> Pesquisa profunda
            </Link>
            <Link
              to="/app/chat"
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/75 px-4 py-2 text-xs font-medium transition hover:bg-accent sm:text-sm"
            >
              <Sparkles className="size-4" /> Inspirar-me
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Escolha um caminho</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {exploreItems.map(({ title, description, icon: Icon, to, shellClass, iconClass }) => (
            <Link
              key={title}
              to={to}
              className={`group min-h-36 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${shellClass}`}
            >
              <div className={`flex size-9 items-center justify-center rounded-xl ${iconClass}`}>
                <Icon className="size-5" />
              </div>
              <h3 className="mt-5 font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-5 text-foreground/65">{description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Continuar de onde parou</h2>
            <Link to="/app/chat" className="text-sm font-medium text-[var(--orbe-blue)] hover:underline">
              Ver tudo
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              to="/app/chat"
              className="group flex min-h-16 items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <MessageSquare className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {latestChat?.title || "Comece uma conversa com a orbeAI"}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Conversa · {relativeDate(latestChat?.updatedAt)}
                </span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
            </Link>

            {latestProject ? (
              <Link
                to="/app/projects/$id"
                params={{ id: latestProject.id }}
                className="group flex min-h-16 items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3 shadow-sm transition hover:border-violet-200 hover:shadow-md"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <FolderKanban className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{latestProject.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Projeto · {relativeDate(latestProject.updatedAt)}
                  </span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <Link
                to="/app/projects"
                className="group flex min-h-16 items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3 shadow-sm transition hover:border-violet-200 hover:shadow-md"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <FolderKanban className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">Crie seu primeiro projeto</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Organize uma ideia em um só lugar</span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
              </Link>
            )}

            <Link
              to="/app/artifacts"
              className="group flex min-h-16 items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md sm:col-span-2 sm:max-w-[calc(50%-0.375rem)]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <FileText className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {latestArtifact?.title || "Sua biblioteca começa aqui"}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {latestArtifact ? `${latestArtifact.kind} · ${relativeDate(latestArtifact.updatedAt)}` : "Crie e guarde conteúdos importantes"}
                </span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Atividade recente</h2>
            <Link to="/app/admin" className="text-sm font-medium text-[var(--orbe-blue)] hover:underline">
              Ver tudo
            </Link>
          </div>

          <div className="mt-4 space-y-1">
            {activities.length > 0 ? (
              activities.map(({ key, icon: Icon, iconClass, label, date }) => (
                <div key={key} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-accent/45">
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground/80">{label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeDate(date)}</span>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                Suas conversas, arquivos e projetos recentes aparecerão aqui.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link to="/app/memory" className="rounded-2xl border border-border/70 bg-card p-5 transition hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <Brain className="size-5" />
              </span>
              <h2 className="font-semibold">Memórias</h2>
            </div>
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
              {memories.length} pendentes
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {memories.slice(0, 3).map((memory) => (
              <div key={memory.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-foreground/80">{memory.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeDate(memory.updatedAt || memory.createdAt)}</span>
              </div>
            ))}
            {memories.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma memória aguardando revisão.</p>}
          </div>
          <div className="mt-5 text-sm font-medium text-[var(--orbe-blue)]">Ver todas</div>
        </Link>

        <Link to="/app/projects" className="rounded-2xl border border-border/70 bg-card p-5 transition hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <FolderKanban className="size-5" />
              </span>
              <h2 className="font-semibold">Projetos</h2>
            </div>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
              {activeProjects} ativos
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {projects.slice(0, 3).map((project) => (
              <div key={project.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-foreground/80">{project.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeDate(project.updatedAt)}</span>
              </div>
            ))}
            {projects.length === 0 && <p className="text-sm text-muted-foreground">Seus projetos pessoais e profissionais aparecerão aqui.</p>}
          </div>
          <div className="mt-5 text-sm font-medium text-[var(--orbe-blue)]">Ver todos</div>
        </Link>

        <Link to="/app/artifacts" className="rounded-2xl border border-border/70 bg-card p-5 transition hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <Library className="size-5" />
              </span>
              <h2 className="font-semibold">Biblioteca</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {artifacts.length} itens
            </span>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-foreground/80"><FileText className="size-4 text-muted-foreground" /> Documentos</span>
              <span className="text-xs text-muted-foreground">{documentCount}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-foreground/80"><BookOpen className="size-4 text-muted-foreground" /> Planos e playbooks</span>
              <span className="text-xs text-muted-foreground">{planCount}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-foreground/80"><Library className="size-4 text-muted-foreground" /> Outros itens</span>
              <span className="text-xs text-muted-foreground">{otherArtifactCount}</span>
            </div>
          </div>
          <div className="mt-5 text-sm font-medium text-[var(--orbe-blue)]">Ver tudo</div>
        </Link>

        <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-[linear-gradient(145deg,rgba(255,251,235,0.95),rgba(255,247,237,0.95))] p-5 shadow-[0_18px_40px_-30px_rgba(245,158,11,0.65)]">
          <div className="pointer-events-none absolute -bottom-20 -right-16 size-48 rounded-full bg-amber-200/35 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-amber-500" />
              <h2 className="font-semibold">Sugestão para você</h2>
            </div>
            <p className="mt-5 text-sm leading-6 text-foreground/75">
              {latestChat
                ? `Que tal continuar sua conversa sobre “${latestChat.title}”? Todo o contexto está preservado.`
                : "Comece uma conversa e a orbeAI aprenderá quais assuntos você quer retomar com mais facilidade."}
            </p>
            <Link
              to="/app/chat"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              {latestChat ? "Continuar conversa" : "Começar conversa"}
              <ArrowRight className="size-4" />
            </Link>
            <Link to="/app/chat" className="mt-4 block text-sm font-medium text-[var(--orbe-blue)] hover:underline">
              Ver outras sugestões
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
