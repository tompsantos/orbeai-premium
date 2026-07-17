import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GlassCard, Pill, SectionHeader } from "@/components/design-system/Primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { ArtifactDialog } from "@/components/artifacts/ArtifactDialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { artifactService, chatService, memoryService, projectService } from "@/lib/api";
import type { Artifact, Chat, MemoryItem, Project } from "@/types";
import { ArrowLeft, Bot, FileText, MessageSquare, Pencil, Settings, Sparkles, Trash2, Workflow } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/projects/$id")({
  head: () => ({ meta: [{ title: `Projeto · orbeAI` }] }),
  component: ProjectPage,
  notFoundComponent: () => <div className="p-8">Projeto não encontrado. <Link to="/app/projects" className="text-[var(--orbe-blue)]">Voltar</Link></div>,
  errorComponent: ({ reset }) => (
    <div className="p-8 space-y-3">
      <div>Erro ao carregar projeto.</div>
      <Button size="sm" onClick={() => reset()}>Tentar novamente</Button>
    </div>
  ),
});

function ProjectPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  async function refresh() {
    const [p, as, ms, cs] = await Promise.all([
      projectService.get(id), artifactService.list(), memoryService.list(), chatService.list(),
    ]);
    if (!p) throw notFound();
    setProject(p);
    setArtifacts(as.filter((a) => a.projectId === id));
    setMemories(ms.filter((m) => m.projectId === id));
    setChats(cs.filter((c) => c.projectId === id));
  }
  useEffect(() => { void refresh(); }, [id]);

  if (!project) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;

  async function onEdit(data: Partial<Project> & { name: string }) {
    if (!project) return;
    await projectService.update(project.id, data);
    toast.success("Projeto atualizado");
    await refresh();
  }

  async function onNewArtifact(data: { title: string; kind: Artifact["kind"]; content: string; projectId?: string }) {
    if (!project) return;
    await artifactService.create({ ...data, projectId: project.id });
    toast.success("Artifact criado");
    await refresh();
  }

  async function openProjectChat() {
    if (!project) return;
    const existing = chats[0];
    if (existing) { navigate({ to: "/app/chat" }); return; }
    const c = await chatService.create({ title: `Chat — ${project.name}`, projectId: project.id, mode: "strategist", model: "auto" });
    toast.success("Conversa criada");
    navigate({ to: "/app/chat" });
    void c;
  }

  async function onRemoveProject() {
    if (!project) return;
    await projectService.remove(project.id);
    toast.success("Projeto removido");
    navigate({ to: "/app/projects" });
  }

  return (
    <div className="space-y-6">
      <Link to="/app/projects" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ArrowLeft className="size-3.5" /> Projetos
      </Link>

      <section className="orbe-glass rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <Pill tone={project.status === "ativo" ? "success" : "muted"}>{project.status}</Pill>
            {project.product && <Pill tone="blue">{project.product}</Pill>}
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{project.description}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setRemoveOpen(true)}><Trash2 className="size-4" /></Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="size-4 mr-1" /> Editar</Button>
          <Button variant="outline" onClick={openProjectChat}><MessageSquare className="size-4 mr-1" /> Abrir chat</Button>
          <Button onClick={() => setArtifactOpen(true)}><Sparkles className="size-4 mr-1" /> Novo artifact</Button>
        </div>
      </section>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="chat">Chats</TabsTrigger>
          <TabsTrigger value="memory">Memória</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          <TabsTrigger value="agents">Agentes</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-5">
          <div className="grid lg:grid-cols-3 gap-4">
            <GlassCard className="lg:col-span-2">
              <SectionHeader eyebrow="brief" title="Inteligência do projeto" />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.brief ?? "Brief ainda não definido. Use o chat para gerar um."}</p>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="chats" value={chats.length} />
                <Stat label="artifacts" value={artifacts.length} />
                <Stat label="memórias" value={memories.length} />
                <Stat label="agentes" value={project.agents.length} />
              </div>
            </GlassCard>
            <GlassCard>
              <SectionHeader eyebrow="agentes ativos" title="Time cognitivo" />
              {project.agents.length === 0
                ? <p className="text-xs text-muted-foreground">Nenhum agente associado.</p>
                : <ul className="space-y-2">
                    {project.agents.map((a) => (
                      <li key={a} className="flex items-center gap-2 text-sm"><Bot className="size-4 text-[var(--orbe-blue)]" /> {a}</li>
                    ))}
                  </ul>}
            </GlassCard>
          </div>

          <GlassCard>
            <SectionHeader eyebrow="integração com produtos" title="Ecossistema conectado" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["orbeVault", "orbeRadar", "orbeRisk", "orbeAuto"].map((n) => (
                <div key={n} className="rounded-lg border p-3 flex items-center gap-2"><Workflow className="size-4 text-[var(--orbe-blue)]" /> <span className="text-sm">{n}</span></div>
              ))}
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          {chats.length === 0 ? (
            <GlassCard><p className="text-sm text-muted-foreground">Nenhuma conversa neste projeto. <button onClick={openProjectChat} className="text-[var(--orbe-blue)] underline">Criar agora</button>.</p></GlassCard>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {chats.map((c) => (
                <Link key={c.id} to="/app/chat" className="orbe-card orbe-card-hover p-4 block">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{c.title}</div>
                    <Pill tone="blue">orbe {c.mode}</Pill>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">{c.model}</div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="memory" className="mt-6">
          <div className="grid md:grid-cols-2 gap-3">
            {memories.length === 0 && <GlassCard><p className="text-sm text-muted-foreground">Nenhuma memória deste projeto ainda.</p></GlassCard>}
            {memories.map((m) => (
              <GlassCard key={m.id}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{m.label}</div>
                  <Pill tone={m.status === "ativa" ? "success" : m.status === "pendente" ? "warn" : "muted"}>{m.status}</Pill>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{m.content}</p>
              </GlassCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="artifacts" className="mt-6">
          {artifacts.length === 0 ? (
            <GlassCard><p className="text-sm text-muted-foreground">Nenhum artifact criado neste projeto.</p></GlassCard>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {artifacts.map((a) => (
                <Link key={a.id} to="/app/artifacts" className="orbe-card orbe-card-hover p-4 block">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{a.title}</div>
                    <Pill tone="blue">{a.kind}</Pill>
                  </div>
                  <pre className="mt-3 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-5 font-sans">{a.content}</pre>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          <div className="grid md:grid-cols-3 gap-3">
            {project.agents.map((a) => (
              <GlassCard key={a}><div className="flex items-center gap-2"><Bot className="size-4 text-[var(--orbe-blue)]" /> <span className="font-medium text-sm">{a}</span></div></GlassCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <GlassCard>
            <SectionHeader eyebrow="configurações" title="Política deste projeto" />
            <ul className="text-sm space-y-2">
              <li><Settings className="inline size-4 mr-2 text-muted-foreground" /> Modo de memória: <b>{project.memoryMode}</b></li>
              <li><Settings className="inline size-4 mr-2 text-muted-foreground" /> Produto associado: <b>{project.product ?? "—"}</b></li>
            </ul>
            <div className="mt-3"><Button size="sm" variant="outline" onClick={() => setEditOpen(true)}><Pencil className="size-3.5 mr-1" /> Editar</Button></div>
          </GlassCard>
        </TabsContent>
      </Tabs>

      <ProjectDialog open={editOpen} onOpenChange={setEditOpen} initial={project} onSubmit={onEdit} />
      <ArtifactDialog open={artifactOpen} onOpenChange={setArtifactOpen}
        projects={[project]} initial={{ projectId: project.id }} onSubmit={onNewArtifact} />
      <ConfirmDialog open={removeOpen} onOpenChange={setRemoveOpen}
        title="Remover projeto?" description="Esta ação não pode ser desfeita. Artifacts e memórias do projeto não serão removidos."
        confirmLabel="Remover" destructive onConfirm={onRemoveProject} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3 text-center">
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

// keep TS happy with the head meta typing
void FileText;
