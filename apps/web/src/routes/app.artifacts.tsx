import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GlassCard, Pill, SectionHeader } from "@/components/design-system/Primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArtifactDialog } from "@/components/artifacts/ArtifactDialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { artifactService, projectService } from "@/lib/api";
import type { Artifact, Project } from "@/types";
import { Copy, Download, FileText, History, MessageSquare, Plus, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/artifacts")({
  head: () => ({ meta: [{ title: "Artifact studio · orbeAI" }] }),
  component: ArtifactsPage,
});

function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [instructions, setInstructions] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const active = artifacts.find((a) => a.id === activeId) ?? null;
  const activeProject = projects.find((p) => p.id === active?.projectId);

  async function refresh(selectId?: string) {
    const [list, ps] = await Promise.all([artifactService.list(), projectService.list()]);
    setArtifacts(list); setProjects(ps);
    const id = selectId ?? activeId ?? list[0]?.id ?? null;
    setActiveId(id);
    const found = list.find((a) => a.id === id);
    setContent(found?.content ?? "");
  }

  useEffect(() => { void refresh(); }, []);

  async function onSave() {
    if (!active) return;
    const updated = await artifactService.saveVersion(active.id, content, "Edição manual");
    if (updated) { toast.success("Versão salva"); await refresh(updated.id); }
  }

  async function onEnhance() {
    if (!active) return;
    const updated = await artifactService.enhanceMock(active.id);
    if (updated) { toast.success("Refinado por orbeAI"); setContent(updated.content); await refresh(updated.id); }
  }

  async function onTransform() {
    if (!active) return;
    const next = content + "\n\n## Transformação aplicada\n\n- Estrutura convertida para formato executivo\n- Pontos-chave destacados";
    const updated = await artifactService.saveVersion(active.id, next, "Transformação de formato (mock)");
    if (updated) { setContent(updated.content); toast.success("Formato transformado"); await refresh(updated.id); }
  }

  async function onExport() {
    if (!active) return;
    const res = await artifactService.exportText(active.id);
    if (!res) return;
    const blob = new Blob([res.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = res.filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportado: ${res.filename}`);
  }

  async function onCreate(data: { title: string; kind: Artifact["kind"]; content: string; projectId?: string }) {
    const a = await artifactService.create(data);
    toast.success("Artifact criado");
    await refresh(a.id);
  }

  async function onRemove() {
    if (!active) return;
    await artifactService.remove(active.id);
    toast.success("Artifact removido");
    setRemoveOpen(false);
    await refresh(artifacts.find((a) => a.id !== active.id)?.id);
  }

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="artifact studio" title="Criação editável com versão"
        description="Documentos, código, planos e relatórios — gerados, editados e versionados."
        action={<Button onClick={() => setNewOpen(true)}><Plus className="size-4 mr-1" /> Novo artifact</Button>} />

      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        <aside className="orbe-card p-3 min-h-[50vh]">
          <div className="orbe-eyebrow px-1 mb-3">Seus artifacts</div>
          {artifacts.length === 0 ? (
            <div className="px-2 py-6 text-xs text-muted-foreground">Nenhum artifact ainda.</div>
          ) : (
            <ul className="space-y-1">
              {artifacts.map((a) => {
                const active = activeId === a.id;
                return (
                <li key={a.id}>
                  <button onClick={() => { setActiveId(a.id); setContent(a.content); }}
                    className={cn("w-full text-left rounded-lg px-2.5 py-2 text-sm transition-colors border",
                      active ? "orbe-active" : "border-transparent hover:bg-[var(--sidebar-accent)]")}>
                    <div className={cn("truncate", active && "font-medium")}>{a.title}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Pill tone={active ? "blue" : "muted"}>{a.kind}</Pill>
                      <span>v{a.versions.length}</span>
                    </div>
                  </button>
                </li>
                );
              })}
            </ul>
          )}
        </aside>

        {active ? (
          <section className="grid lg:grid-cols-[1fr_280px] gap-4 min-h-[60vh]">
            <GlassCard className="flex flex-col" hoverable={false}>
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="min-w-0">
                  <div className="orbe-eyebrow">{active.kind}</div>
                  <div className="font-semibold truncate mt-1">{active.title}</div>
                </div>
                <div className="flex gap-1">
                  <Popover>
                    <PopoverTrigger asChild><Button size="icon" variant="ghost" title="Histórico"><History className="size-4" /></Button></PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Versões</div>
                      <ul className="space-y-2 text-sm">
                        {active.versions.slice().reverse().map((v) => (
                          <li key={v.id} className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{v.note}</div>
                              <div className="text-[11px] text-muted-foreground">{new Date(v.createdAt).toLocaleString("pt-BR")}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </PopoverContent>
                  </Popover>
                  <Button size="icon" variant="ghost" title="Copiar" onClick={() => { navigator.clipboard.writeText(content); toast.success("Copiado"); }}><Copy className="size-4" /></Button>
                  <Button size="icon" variant="ghost" title="Exportar" onClick={onExport}><Download className="size-4" /></Button>
                  <Button size="icon" variant="ghost" title="Remover" onClick={() => setRemoveOpen(true)}><Trash2 className="size-4" /></Button>
                  <Button size="sm" onClick={onSave}><Save className="size-3.5 mr-1" /> Salvar</Button>
                </div>
              </div>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)}
                className="flex-1 font-mono text-[12.5px] leading-relaxed min-h-[320px] bg-muted/30 border-border/60 focus-visible:bg-card resize-none" />
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="tabular-nums">{content.length} caracteres · {active.versions.length} versões</span>
                <span className="inline-flex items-center gap-1"><Sparkles className="size-3 text-[var(--orbe-blue)]" /> editável</span>
              </div>
            </GlassCard>

            <div className="space-y-4">
              <GlassCard hoverable={false}>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="size-4 text-[var(--orbe-blue)]" />
                  <div className="font-semibold text-sm">Instruções para a orbeAI</div>
                </div>
                <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Descreva como melhorar este artifact." rows={4} className="text-xs" />
                <div className="mt-3 flex flex-col gap-2">
                  <Button size="sm" onClick={onEnhance}><Wand2 className="size-3.5 mr-1" /> Melhorar com IA</Button>
                  <Button size="sm" variant="outline" onClick={onTransform}>Transformar formato</Button>
                </div>
              </GlassCard>

              <GlassCard>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Metadata</div>
                <ul className="text-xs space-y-1.5">
                  <li className="flex justify-between"><span className="text-muted-foreground">tipo</span><Pill tone="blue">{active.kind}</Pill></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">projeto</span><span>{activeProject?.name ?? "—"}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">versões</span><span>{active.versions.length}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">atualizado</span><span>{formatDistanceToNow(new Date(active.updatedAt), { addSuffix: true, locale: ptBR })}</span></li>
                </ul>
              </GlassCard>
            </div>
          </section>
        ) : (
          <EmptyState icon={<FileText className="size-6" />}
            title="Nenhum artifact selecionado"
            description="Crie seu primeiro artifact para começar."
            action={<Button onClick={() => setNewOpen(true)}><Plus className="size-4 mr-1" /> Novo artifact</Button>} />
        )}
      </div>

      <ArtifactDialog open={newOpen} onOpenChange={setNewOpen} projects={projects} onSubmit={onCreate} />
      <ConfirmDialog open={removeOpen} onOpenChange={setRemoveOpen}
        title="Remover artifact?" description="Esta ação não pode ser desfeita."
        confirmLabel="Remover" destructive onConfirm={onRemove} />
    </div>
  );
}
