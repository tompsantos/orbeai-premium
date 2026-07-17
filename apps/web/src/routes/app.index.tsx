import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  FileSearch,
  FolderKanban,
  GraduationCap,
  ImagePlus,
  Library,
  MessageSquare,
  Mic,
  Paperclip,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
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
  to: "/app/chat" | "/app/research" | "/app/artifacts" | "/app/projects" | "/app/memory";
};

const exploreItems: ExploreItem[] = [
  {
    title: "Conversar",
    description: "Pergunte, pense em voz alta ou simplesmente troque uma ideia.",
    icon: MessageSquare,
    to: "/app/chat",
  },
  {
    title: "Pesquisar",
    description: "Explore um assunto com mais profundidade e contexto.",
    icon: Search,
    to: "/app/research",
  },
  {
    title: "Analisar um arquivo",
    description: "Envie um documento, imagem ou material para entender melhor.",
    icon: FileSearch,
    to: "/app/chat",
  },
  {
    title: "Criar alguma coisa",
    description: "Transforme uma ideia em texto, plano, imagem ou artifact.",
    icon: WandSparkles,
    to: "/app/artifacts",
  },
  {
    title: "Aprender",
    description: "Estude no seu ritmo, com explicações feitas para você.",
    icon: GraduationCap,
    to: "/app/chat",
  },
  {
    title: "Organizar uma ideia",
    description: "Dê forma a planos pessoais, estudos ou projetos de trabalho.",
    icon: FolderKanban,
    to: "/app/projects",
  },
];

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
    if (hour < 12) return "bom dia";
    if (hour < 18) return "boa tarde";
    return "boa noite";
  }, []);

  const latestChat = chats[0];
  const latestProject = projects[0];
  const latestArtifact = artifacts[0];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card px-5 py-8 shadow-sm sm:px-8 md:px-12 md:py-12">
        <div
          className="pointer-events-none absolute -right-24 -top-32 size-96 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, var(--orbe-blue), transparent 64%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 left-1/3 size-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, var(--orbe-cyan), transparent 66%)" }}
        />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl border border-[color-mix(in_oklch,var(--orbe-blue)_25%,transparent)] bg-[color-mix(in_oklch,var(--orbe-blue)_10%,transparent)]">
            <Sparkles className="size-5 text-[var(--orbe-blue)]" />
          </div>

          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            {greeting}, {firstName}. No que vamos mergulhar hoje?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            Converse, crie, pesquise, estude ou organize qualquer parte da sua vida. A orbeAI se adapta ao seu contexto, não o contrário.
          </p>

          <Link
            to="/app/chat"
            className="group mx-auto mt-8 flex min-h-16 w-full max-w-3xl items-center gap-3 rounded-2xl border border-border/80 bg-background/90 px-4 py-3 text-left shadow-sm transition hover:border-[color-mix(in_oklch,var(--orbe-blue)_35%,var(--border))] hover:shadow-md sm:px-5"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--orbe-blue)_10%,transparent)]">
              <MessageSquare className="size-5 text-[var(--orbe-blue)]" />
            </div>
            <span className="min-w-0 flex-1 text-sm text-muted-foreground sm:text-base">
              Escreva uma pergunta, ideia ou assunto...
            </span>
            <div className="hidden items-center gap-1.5 text-muted-foreground sm:flex">
              <Paperclip className="size-4" />
              <Mic className="size-4" />
              <ImagePlus className="size-4" />
            </div>
            <ArrowRight className="size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-[var(--orbe-blue)]" />
          </Link>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["me ajuda a pensar", "explica isso pra mim", "vamos criar algo", "quero pesquisar um tema"].map((label) => (
              <Button key={label} variant="outline" size="sm" asChild className="rounded-full bg-background/65">
                <Link to="/app/chat">{label}</Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">explorar</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Escolha um ponto de partida</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {exploreItems.map(({ title, description, icon: Icon, to }) => (
            <Link
              key={title}
              to={to}
              className="group flex min-h-36 items-start gap-4 rounded-2xl border border-border/70 bg-card p-5 transition hover:-translate-y-0.5 hover:border-[color-mix(in_oklch,var(--orbe-blue)_30%,var(--border))] hover:shadow-md"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--orbe-blue)_9%,transparent)]">
                <Icon className="size-5 text-[var(--orbe-blue)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{title}</h3>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-[var(--orbe-blue)]" />
                </div>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">continuar</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Retome de onde parou</h2>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/chat">Ver tudo <ArrowRight className="ml-1 size-4" /></Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <Link
            to="/app/chat"
            className="group rounded-3xl border border-border/70 bg-card p-6 transition hover:border-[color-mix(in_oklch,var(--orbe-blue)_30%,var(--border))] hover:shadow-md lg:col-span-7"
          >
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--orbe-blue)_10%,transparent)]">
                <MessageSquare className="size-5 text-[var(--orbe-blue)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">última conversa</p>
                <h3 className="mt-2 truncate text-xl font-semibold">
                  {latestChat?.title || "Comece sua primeira conversa"}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {latestChat
                    ? `Continue no modo ${latestChat.mode || "padrão"} com todo o contexto preservado.`
                    : "A orbeAI está pronta para conhecer seu jeito de pensar e trabalhar com você."}
                </p>
                <div className="mt-5 flex items-center gap-2 text-sm font-medium text-[var(--orbe-blue)]">
                  {latestChat ? "Continuar conversa" : "Abrir chat"}
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </Link>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
            <Link
              to={latestProject ? "/app/projects/$id" : "/app/projects"}
              params={latestProject ? { id: latestProject.id } : undefined}
              className="group flex min-h-32 items-start gap-4 rounded-2xl border border-border/70 bg-card p-5 transition hover:border-[color-mix(in_oklch,var(--orbe-blue)_30%,var(--border))] hover:shadow-md"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--orbe-cyan)_10%,transparent)]">
                <FolderKanban className="size-5 text-[var(--orbe-blue)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">projeto recente</p>
                <h3 className="mt-1 truncate font-medium">{latestProject?.name || "Crie um espaço para uma ideia"}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {latestProject?.description || "Junte conversas, arquivos e referências em um só lugar."}
                </p>
              </div>
            </Link>

            <Link
              to="/app/artifacts"
              className="group flex min-h-32 items-start gap-4 rounded-2xl border border-border/70 bg-card p-5 transition hover:border-[color-mix(in_oklch,var(--orbe-blue)_30%,var(--border))] hover:shadow-md"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--orbe-blue)_9%,transparent)]">
                <Library className="size-5 text-[var(--orbe-blue)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">criação recente</p>
                <h3 className="mt-1 truncate font-medium">{latestArtifact?.title || "Sua biblioteca começa aqui"}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {latestArtifact ? `Criado ${formatDistanceToNow(new Date(latestArtifact.updatedAt), { addSuffix: true, locale: ptBR })}.` : "Textos, planos e criações ficam organizados para você reencontrar."}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link to="/app/memory" className="rounded-2xl border border-border/70 bg-card p-5 transition hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--orbe-blue)_9%,transparent)]">
              <Brain className="size-5 text-[var(--orbe-blue)]" />
            </div>
            <span className="text-2xl font-semibold tabular-nums">{memories.length}</span>
          </div>
          <h3 className="mt-4 font-medium">Memórias para revisar</h3>
          <p className="mt-1 text-sm text-muted-foreground">Você decide o que a orbeAI deve guardar sobre você.</p>
        </Link>

        <Link to="/app/projects" className="rounded-2xl border border-border/70 bg-card p-5 transition hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--orbe-cyan)_10%,transparent)]">
              <BookOpen className="size-5 text-[var(--orbe-blue)]" />
            </div>
            <span className="text-2xl font-semibold tabular-nums">{projects.length}</span>
          </div>
          <h3 className="mt-4 font-medium">Espaços em andamento</h3>
          <p className="mt-1 text-sm text-muted-foreground">De planos pessoais a projetos profissionais, tudo cabe aqui.</p>
        </Link>

        <Link to="/app/artifacts" className="rounded-2xl border border-border/70 bg-card p-5 transition hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--orbe-blue)_9%,transparent)]">
              <Library className="size-5 text-[var(--orbe-blue)]" />
            </div>
            <span className="text-2xl font-semibold tabular-nums">{artifacts.length}</span>
          </div>
          <h3 className="mt-4 font-medium">Itens na biblioteca</h3>
          <p className="mt-1 text-sm text-muted-foreground">Tudo o que você criou, pronto para continuar evoluindo.</p>
        </Link>
      </section>
    </div>
  );
}
