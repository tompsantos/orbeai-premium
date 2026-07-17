import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Clock3,
  FolderKanban,
  Library,
  MessageSquare,
  Plus,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { GlassCard, IconBadge, Pill, SectionHeader } from "@/components/design-system/Primitives";
import { Button } from "@/components/ui/button";
import { artifactService, chatService, memoryService, projectService } from "@/lib/api";
import { getStoredAuthUser } from "@/lib/auth/session";
import type { Artifact, Chat, MemoryItem, Project } from "@/types";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard · orbeAI" }] }),
  component: Dashboard,
});

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
  const activeProjects = projects.filter((project) => project.status === "ativo").length;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card px-6 py-7 md:px-9 md:py-9">
        <div
          className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, var(--orbe-blue), transparent 64%)" }}
        />
        <div className="relative max-w-3xl">
          <Pill tone="blue">seu espaço de trabalho</Pill>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            A orbeAI reuniu o que está em movimento para você retomar o contexto sem vasculhar a plataforma inteira.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/app/chat">
                <MessageSquare className="mr-1 size-4" /> conversar com a orbeAI
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/projects">
                <Plus className="mr-1 size-4" /> novo projeto
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="visão do dia" title="O que merece sua atenção" />
        <div className="grid gap-3 md:grid-cols-3">
          <OverviewCard
            icon={FolderKanban}
            value={String(activeProjects)}
            label="projetos ativos"
            description="frentes abertas no seu workspace"
            to="/app/projects"
          />
          <OverviewCard
            icon={Brain}
            value={String(memories.length)}
            label="memórias pendentes"
            description="itens aguardando sua curadoria"
            to="/app/memory"
          />
          <OverviewCard
            icon={Library}
            value={String(artifacts.length)}
            label="itens na biblioteca"
            description="conteúdos e entregáveis criados"
            to="/app/artifacts"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionHeader
            eyebrow="continue de onde parou"
            title="Projetos recentes"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/projects">ver todos <ArrowRight className="ml-1 size-3.5" /></Link>
              </Button>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.slice(0, 4).map((project) => (
              <Link
                key={project.id}
                to="/app/projects/$id"
                params={{ id: project.id }}
                className="group orbe-card orbe-card-hover block p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <IconBadge icon={FolderKanban} size="sm" />
                  <ArrowRight className="size-4 text-muted-foreground/30 transition-transform group-hover:translate-x-1 group-hover:text-muted-foreground" />
                </div>
                <h3 className="mt-4 font-medium">{project.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{project.description}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{project.chatsCount} conversas</span>
                  <span>{project.filesCount} arquivos</span>
                  <span>{project.artifactsCount} criações</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader eyebrow="retomar conversa" title="Último diálogo" />
          <GlassCard className="h-full min-h-52 flex flex-col justify-between" hoverable={false}>
            {latestChat ? (
              <>
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="size-3.5" />
                    {formatDistanceToNow(new Date(latestChat.updatedAt), { addSuffix: true, locale: ptBR })}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{latestChat.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">continue com o mesmo contexto, modo e histórico.</p>
                </div>
                <Button className="mt-6 w-full" asChild>
                  <Link to="/app/chat">retomar conversa <ArrowRight className="ml-1 size-4" /></Link>
                </Button>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="size-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">sua primeira conversa começa aqui.</p>
                <Button className="mt-4" asChild><Link to="/app/chat">abrir chat</Link></Button>
              </div>
            )}
          </GlassCard>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionHeader eyebrow="memória" title="Aguardando sua decisão" />
          {memories.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {memories.slice(0, 4).map((memory) => (
                <Link key={memory.id} to="/app/memory" className="orbe-card orbe-card-hover block p-4">
                  <div className="flex items-center gap-2">
                    <Brain className="size-4 text-[var(--orbe-blue)]" />
                    <span className="text-sm font-medium">{memory.label}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{memory.content}</p>
                </Link>
              ))}
            </div>
          ) : (
            <GlassCard hoverable={false}>
              <p className="text-sm text-muted-foreground">nenhuma memória pendente. tudo organizado por aqui.</p>
            </GlassCard>
          )}
        </section>

        <section>
          <SectionHeader eyebrow="sugestão da orbeAI" title="Próximo passo" />
          <GlassCard className="relative overflow-hidden" hoverable={false}>
            <Sparkles className="size-5 text-[var(--orbe-blue)]" />
            <h3 className="mt-4 font-semibold">Transforme contexto em conhecimento</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Reúna documentos e referências de um projeto para a orbeAI responder com uma base mais sólida.
            </p>
            <Button variant="outline" className="mt-5 w-full" asChild>
              <Link to="/app/research"><BookOpen className="mr-1 size-4" /> abrir conhecimento</Link>
            </Button>
          </GlassCard>
        </section>
      </div>
    </div>
  );
}

function OverviewCard({
  icon,
  value,
  label,
  description,
  to,
}: {
  icon: typeof FolderKanban;
  value: string;
  label: string;
  description: string;
  to: string;
}) {
  const Icon = icon;

  return (
    <Link to={to as never} className="group orbe-card orbe-card-hover flex items-center gap-4 p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--orbe-blue)_10%,transparent)]">
        <Icon className="size-5 text-[var(--orbe-blue)]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">{value}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="size-4 text-muted-foreground/30 transition-transform group-hover:translate-x-1 group-hover:text-muted-foreground" />
    </Link>
  );
}
