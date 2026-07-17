import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GlassCard, Pill, SectionHeader } from "@/components/design-system/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/common/EmptyState";
import { researchService, artifactService } from "@/lib/api";
import type { ResearchReport } from "@/types";
import { AlertTriangle, Calendar, Download, FileSearch, FlaskConical, Globe, Library, Loader2, Save, Send, Workflow } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/research")({
  head: () => ({ meta: [{ title: "Pesquisa profunda · orbeAI" }] }),
  component: ResearchPage,
});

const SOURCES = [
  { id: "web", label: "Web", icon: Globe },
  { id: "files", label: "Arquivos do projeto", icon: FileSearch },
  { id: "internal", label: "Base interna orbeOne", icon: Library },
  { id: "uploads", label: "Documentos enviados", icon: FileSearch },
  { id: "integrations", label: "Integrações conectadas", icon: Workflow },
];

function ResearchPage() {
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState("Quem são os concorrentes globais de cockpits cognitivos enterprise?");
  const [selected, setSelected] = useState<string[]>(["web", "internal"]);
  const [running, setRunning] = useState(false);

  async function refresh(selectId?: string) {
    const list = await researchService.list();
    setReports(list);
    setActiveId(selectId ?? activeId ?? list[0]?.id ?? null);
  }
  useEffect(() => { void refresh(); }, []);

  const active = reports.find((r) => r.id === activeId) ?? null;

  function toggle(id: string) {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  async function start() {
    if (!q.trim()) return;
    setRunning(true);
    const r = await researchService.create({ question: q });
    await new Promise((res) => setTimeout(res, 1200));
    await researchService.update(r.id, { status: "em andamento" });
    setRunning(false);
    toast.success("Pesquisa iniciada");
    await refresh(r.id);
  }

  async function exportReport() {
    if (!active) return;
    const md = `# ${active.question}\n\n## Plano\n${active.plan.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\n## Síntese\n${active.summary || "—"}\n\n## Riscos\n${active.risks.map((r) => `- ${r}`).join("\n")}\n`;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `pesquisa_${active.id}.md`; a.click();
    URL.revokeObjectURL(url);
  }

  async function saveAsArtifact() {
    if (!active) return;
    const md = `# ${active.question}\n\n${active.summary}\n\n## Riscos\n${active.risks.map((r) => `- ${r}`).join("\n")}`;
    await artifactService.create({ title: `Pesquisa — ${active.question.slice(0, 60)}`, kind: "relatório", content: md });
    toast.success("Salvo como artifact");
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="research lab" title="Pesquisa profunda multifonte"
        description="Plano de pesquisa, fontes, evidências, incertezas e síntese executiva." />

      <GlassCard>
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium">Pergunta de pesquisa</label>
          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Formule a pergunta…" />
            <Button onClick={start} disabled={running}>
              {running ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Send className="size-4 mr-1" />}
              {running ? "Pesquisando…" : "Iniciar"}
            </Button>
          </div>
          <div>
            <div className="orbe-eyebrow mb-2">Fontes</div>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((s) => {
                const Icon = s.icon; const on = selected.includes(s.id);
                return (
                  <label key={s.id} className={cn("inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors",
                    on ? "border-[color-mix(in_oklch,var(--orbe-blue)_40%,transparent)] bg-[color-mix(in_oklch,var(--orbe-blue)_8%,transparent)]" : "border-border/70 hover:bg-accent/40")}>
                    <Checkbox checked={on} onCheckedChange={() => toggle(s.id)} />
                    <Icon className={cn("size-4", on ? "text-[var(--orbe-blue)]" : "text-muted-foreground")} /> {s.label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </GlassCard>

      {reports.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {reports.map((r) => (
            <button key={r.id} onClick={() => setActiveId(r.id)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                activeId === r.id
                  ? "bg-[var(--orbe-blue)] text-white border-transparent shadow-[var(--shadow-xs)]"
                  : "border-border/70 text-muted-foreground hover:text-foreground hover:bg-accent/50")}>
              {r.question.slice(0, 48)}{r.question.length > 48 ? "…" : ""}
            </button>
          ))}
        </div>
      )}

      {!active ? (
        <EmptyState icon={<FlaskConical className="size-6" />} title="Nenhuma pesquisa ainda"
          description="Formule uma pergunta acima e inicie a primeira investigação." />
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            <GlassCard className="lg:col-span-2">
              <SectionHeader eyebrow="plano de pesquisa" title="Etapas previstas" />
              <ol className="space-y-3.5">
                {active.plan.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="size-6 rounded-full bg-gradient-to-br from-[var(--orbe-blue)] to-[var(--orbe-cyan)] text-white text-xs font-medium flex items-center justify-center shrink-0 shadow-[var(--shadow-xs)]">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{step}</div>
                      <Progress value={i === 0 ? 100 : i === 1 ? 60 : 20} className="mt-2 h-1.5" />
                    </div>
                  </li>
                ))}
              </ol>
            </GlassCard>

            <GlassCard>
              <SectionHeader eyebrow="ações" title="Resultados" />
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={exportReport}><Download className="size-4 mr-1" /> Exportar .md</Button>
                <Button variant="outline" onClick={saveAsArtifact}><Save className="size-4 mr-1" /> Salvar como artifact</Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <div className="inline-flex items-center gap-1.5"><Calendar className="size-3" /> {new Date(active.updatedAt).toLocaleString("pt-BR")}</div>
                <div className="mt-1">Status: <Pill tone={active.status === "concluído" ? "success" : "warn"}>{active.status}</Pill></div>
              </div>
            </GlassCard>
          </div>

          {active.sources.length > 0 && (
            <>
              <SectionHeader eyebrow="evidências" title="Fontes coletadas" />
              <div className="grid md:grid-cols-3 gap-3">
                {active.sources.map((s) => (
                  <GlassCard key={s.id}>
                    <div className="flex items-center justify-between">
                      <Pill tone="blue">{s.kind}</Pill>
                      <span className="text-xs text-muted-foreground tabular-nums">conf. {(s.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="font-medium mt-2.5 text-sm">{s.title}</div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-4">{s.excerpt}</p>
                  </GlassCard>
                ))}
              </div>
            </>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <GlassCard>
              <SectionHeader eyebrow="síntese executiva" title="Resumo" />
              <p className="text-sm whitespace-pre-wrap">{active.summary || "Síntese ainda não consolidada."}</p>
            </GlassCard>
            <GlassCard>
              <SectionHeader eyebrow="incertezas e riscos" title="O que ainda não é certo" />
              {active.risks.length === 0
                ? <p className="text-sm text-muted-foreground">Nenhum risco mapeado ainda.</p>
                : <ul className="space-y-2">
                    {active.risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm"><AlertTriangle className="size-4 text-[var(--warning)] mt-0.5" /> {r}</li>
                    ))}
                  </ul>}
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}
