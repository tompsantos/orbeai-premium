import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  FolderOpen,
  Globe2,
  Link2,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { OrbeMark } from "@/components/design-system/OrbeLogo";
import { Pill } from "@/components/design-system/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { artifactService, researchService } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ResearchReport, ResearchSource } from "@/types";

export const Route = createFileRoute("/app/research")({
  head: () => ({ meta: [{ title: "Conhecimento · orbeAI" }] }),
  component: KnowledgePage,
});

function materialKindLabel(kind: ResearchSource["kind"]) {
  if (kind === "web") return "site";
  if (kind === "arquivo") return "arquivo";
  if (kind === "interna") return "espaço interno";
  return "fonte conectada";
}

function MaterialIcon({ kind }: { kind: ResearchSource["kind"] }) {
  if (kind === "web") return <Globe2 className="size-4" />;
  if (kind === "arquivo") return <FileText className="size-4" />;
  if (kind === "interna") return <FolderOpen className="size-4" />;
  return <Link2 className="size-4" />;
}

function KnowledgePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [materials, setMaterials] = useState<ResearchSource[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [search, setSearch] = useState("");
  const [running, setRunning] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  async function refresh(selectId?: string) {
    const [reportList, materialList] = await Promise.all([
      researchService.list(),
      researchService.listMaterials(),
    ]);
    setReports(reportList);
    setMaterials(materialList);
    setActiveId(selectId ?? activeId ?? reportList[0]?.id ?? null);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const active = reports.find((report) => report.id === activeId) ?? null;

  const filteredMaterials = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return materials;

    return materials.filter((material) =>
      `${material.title} ${material.excerpt}`.toLowerCase().includes(query),
    );
  }, [materials, search]);

  const ongoing = reports.filter((report) => report.status === "em andamento").length;
  const completed = reports.filter((report) => report.status === "concluído").length;

  async function startResearch() {
    if (!question.trim()) return;

    setRunning(true);
    try {
      const created = await researchService.create({ question: question.trim() });
      setQuestion("");
      await refresh(created.id);
      toast.success("Pesquisa salva", {
        description:
          "O plano ficou persistido como rascunho. A execução automática será conectada no próximo bloco.",
      });
    } finally {
      setRunning(false);
    }
  }

  async function addMaterial(file: File) {
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    const created = await researchService.createMaterial({
      title: file.name,
      kind: "arquivo",
      excerpt: `Referência persistida · ${sizeKb} KB · conteúdo do arquivo ainda não enviado`,
      confidence: 1,
      sourceType: "file-metadata",
      sourceProduct: "orbeAI",
      sourceEntityId: file.name,
      meta: {
        filename: file.name,
        size_bytes: file.size,
        mime_type: file.type || null,
        content_persisted: false,
      },
    });

    setLastAddedId(created.id);
    setMaterials(await researchService.listMaterials());
    toast.success("Referência salva", {
      description:
        "Nome e metadados foram persistidos. O conteúdo do arquivo ainda não foi enviado nesta etapa.",
    });
  }

  async function exportReport() {
    if (!active) return;

    const markdown = [
      `# ${active.question}`,
      "",
      active.summary || "Pesquisa ainda sem síntese.",
      "",
      "## Fontes",
      ...active.sources.map((source) => `- ${source.title}`),
      "",
      "## Pontos para conferir",
      ...active.risks.map((risk) => `- ${risk}`),
    ].join("\n");

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `conhecimento_${active.id}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function saveToLibrary() {
    if (!active) return;

    const markdown = `# ${active.question}\n\n${active.summary || "Pesquisa ainda sem síntese."}\n\n## Pontos para conferir\n${active.risks.map((risk) => `- ${risk}`).join("\n")}`;

    await artifactService.create({
      title: active.question.slice(0, 80),
      kind: "relatório",
      content: markdown,
      sourceType: "research",
      sourceProduct: "orbeAI",
      sourceEntityId: active.id,
    });

    toast.success("Salvo na Biblioteca", {
      description: "O item mantém a ligação com esta pesquisa.",
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1360px] space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-[linear-gradient(135deg,rgba(239,246,255,0.95),rgba(255,255,255,0.98)_55%,rgba(236,254,255,0.72))] p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)] md:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <div className="mb-5 flex size-11 items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-sm">
              <OrbeMark size={23} />
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              conhecimento
            </div>
            <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
              tudo que ajuda a orbeAI a entender melhor o que importa para você.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Reúna materiais, consulte fontes e faça perguntas mais profundas. A orbeAI organiza o caminho sem exigir que você configure ferramentas ou escolha onde procurar.
            </p>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/82 p-4 shadow-[0_18px_46px_-38px_rgba(15,23,42,0.65)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-blue-600" />
              o que você quer descobrir?
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void startResearch();
                }}
                placeholder="Ex.: monte um roteiro econômico para Buenos Aires"
                className="h-11 bg-white"
              />
              <Button
                size="icon"
                className="size-11 shrink-0 rounded-xl"
                onClick={() => void startResearch()}
                disabled={!question.trim() || running}
                aria-label="Pesquisar"
              >
                {running ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              Pesquisas e referências já ficam salvas. O uso automático nas conversas será conectado em uma etapa seguinte.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          value={materials.length}
          label="materiais disponíveis"
          icon={<BookOpen className="size-4" />}
        />
        <StatCard value={reports.length} label="pesquisas" icon={<Search className="size-4" />} />
        <StatCard
          value={ongoing || completed}
          label={ongoing > 0 ? "em andamento" : "concluídas"}
          icon={
            ongoing > 0 ? (
              <Loader2 className="size-4" />
            ) : (
              <CheckCircle2 className="size-4" />
            )
          }
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_18px_55px_-48px_rgba(15,23,42,0.7)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Seus materiais</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Referências de arquivos e fontes organizadas para uso futuro.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void addMaterial(file);
                  event.target.value = "";
                }}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Plus className="mr-1 size-4" /> Adicionar material
              </Button>
            </div>
          </div>

          <div className="relative mt-5">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nos materiais…"
              className="h-10 bg-background pl-9"
            />
          </div>

          {filteredMaterials.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={<BookOpen className="size-6" />}
                title={materials.length === 0 ? "Nenhum material ainda" : "Nada encontrado"}
                description={
                  materials.length === 0
                    ? "Adicione a referência de um arquivo para começar a construir seu conhecimento."
                    : "Tente buscar por outro nome ou assunto."
                }
                action={
                  materials.length === 0 ? (
                    <Button onClick={() => fileInputRef.current?.click()}>
                      <Plus className="mr-1 size-4" /> Adicionar material
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {filteredMaterials.map((material) => (
                <article
                  key={material.id}
                  className="rounded-xl border border-border/65 bg-background/65 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-white text-blue-700">
                      <MaterialIcon kind={material.kind} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-sm font-medium leading-5">
                          {material.title}
                        </h3>
                        {material.id === lastAddedId && <Pill tone="success">novo</Pill>}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {material.excerpt}
                      </p>
                      <div className="mt-3 text-[11px] text-muted-foreground">
                        {materialKindLabel(material.kind)}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_18px_55px_-48px_rgba(15,23,42,0.7)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Pesquisas recentes</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Perguntas salvas para investigação e síntese.
              </p>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/app/chat" aria-label="Abrir chat">
                <MessageSquare className="size-4" />
              </Link>
            </Button>
          </div>

          {reports.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center">
              <Search className="mx-auto size-5 text-muted-foreground" />
              <div className="mt-2 text-sm font-medium">Nenhuma pesquisa ainda</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Faça uma pergunta no topo da página para começar.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {reports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setActiveId(report.id)}
                  className={cn(
                    "w-full rounded-xl border p-3.5 text-left transition",
                    activeId === report.id
                      ? "border-blue-200 bg-blue-50/65"
                      : "border-border/60 bg-background/55 hover:border-border hover:bg-muted/35",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="line-clamp-2 text-sm font-medium leading-5">
                      {report.question}
                    </div>
                    <span
                      className={cn(
                        "mt-1 size-2 shrink-0 rounded-full",
                        report.status === "concluído" ? "bg-emerald-500" : "bg-amber-400",
                      )}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                    <span>{report.sources.length} fontes</span>
                    <span>
                      {formatDistanceToNow(new Date(report.updatedAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {active && (
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_18px_55px_-48px_rgba(15,23,42,0.7)]">
          <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
                <Sparkles className="size-3.5" /> pesquisa selecionada
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">{active.question}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <Pill tone={active.status === "concluído" ? "success" : "warn"}>
                  {active.status}
                </Pill>
                <Pill tone="muted">{active.sources.length} fontes encontradas</Pill>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void exportReport()}>
                <Download className="mr-1 size-4" /> Exportar
              </Button>
              <Button onClick={() => void saveToLibrary()}>
                <BookOpen className="mr-1 size-4" /> Salvar na Biblioteca
              </Button>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <div className="p-5 md:p-6">
              <h3 className="text-sm font-semibold">O que a orbeAI encontrou</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                {active.summary ||
                  "Esta pesquisa está salva como rascunho. A síntese aparecerá aqui quando a execução cognitiva for conectada."}
              </p>

              {active.risks.length > 0 && (
                <div className="mt-6 rounded-xl border border-amber-200/70 bg-amber-50/55 p-4">
                  <div className="text-sm font-semibold">Pontos que ainda merecem atenção</div>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {active.risks.map((risk) => (
                      <li key={risk} className="flex items-start gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" />
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <aside className="border-t border-border/60 bg-muted/20 p-5 lg:border-l lg:border-t-0">
              <h3 className="text-sm font-semibold">Fontes usadas</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Você sempre pode conferir de onde veio cada parte da resposta.
              </p>

              {active.sources.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                  As fontes aparecerão aqui quando a execução da pesquisa for conectada.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {active.sources.map((source) => (
                    <article
                      key={source.id}
                      className="rounded-xl border border-border/60 bg-card p-3.5"
                    >
                      <div className="flex items-center gap-2 text-blue-700">
                        <MaterialIcon kind={source.kind} />
                        <span className="text-[11px] font-medium">
                          {materialKindLabel(source.kind)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm font-medium leading-5">{source.title}</div>
                      <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                        {source.excerpt}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/65 bg-card px-4 py-3.5">
      <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        {icon}
      </div>
      <div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
