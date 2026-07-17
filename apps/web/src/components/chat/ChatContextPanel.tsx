import { Pill } from "@/components/design-system/Primitives";
import { Link } from "@tanstack/react-router";
import type { Artifact, Chat, MemoryItem } from "@/types";
import type { RouterDecision } from "@/lib/ai/router";
import { Brain, FileSearch, FolderOpen, MessageSquare, Network, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatContextPanel({
  chat, decision, projectName, projectId, artifacts, memories, memoryScope, layout = "column",
}: {
  chat?: Chat | null;
  decision?: RouterDecision | null;
  projectName?: string;
  projectId?: string;
  artifacts: Artifact[];
  memories: MemoryItem[];
  memoryScope: string;
  layout?: "column" | "grid";
}) {
  return (
    <div
      className={cn(
        "text-sm",
        layout === "grid"
          ? "grid gap-3 md:grid-cols-2 2xl:grid-cols-3"
          : "flex h-full flex-col gap-3 overflow-y-auto pr-1",
      )}
    >
      <Section title="Conversa" icon={<MessageSquare className="size-3.5" />}>
        <div className="font-medium truncate">{chat?.title ?? "—"}</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {chat && <Pill tone="blue">orbe {chat.mode}</Pill>}
          {chat && <Pill tone="muted">{chat.model}</Pill>}
        </div>
      </Section>

      {projectId && (
        <Section title="Projeto" icon={<FolderOpen className="size-3.5" />}>
          <Link to="/app/projects/$id" params={{ id: projectId }} className="inline-flex items-center gap-1.5 text-[var(--orbe-blue)] hover:underline">
            <FolderOpen className="size-3.5" /> {projectName ?? projectId}
          </Link>
        </Section>
      )}

      <Section title="Última decisão do orbeRouter" icon={<Network className="size-3.5" />}>
        {decision ? (
          <div className="space-y-1.5 text-xs">
            <Row k="provider" v={decision.provider} />
            <Row k="modelo" v={decision.model} />
            <Row k="qualidade" v={decision.qualityTier} />
            <Row k="latência est." v={`~${decision.estimatedLatencyMs}ms`} />
            <Row k="custo est." v={`US$ ${decision.estimatedCostUsd.toFixed(4)}/1k`} />
            <Row k="motivo" v={decision.reason} />
            {decision.taskHints.length > 0 && (
              <div className="pt-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">sinais</div>
                <div className="flex flex-wrap gap-1">{decision.taskHints.map((h) => <Pill key={h} tone="muted">{h}</Pill>)}</div>
              </div>
            )}
            <div className="pt-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">fallback</div>
              <div className="flex flex-wrap gap-1">{decision.fallbackChain.slice(0, 4).map((p) => <Pill key={p} tone="muted">{p}</Pill>)}</div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Envie uma mensagem para ver a decisão de roteamento.</div>
        )}
      </Section>

      <Section title="Memória" icon={<Brain className="size-3.5" />}>
        <div className="text-xs text-muted-foreground mb-2">Escopo: <span className="text-foreground font-medium">{memoryScope}</span></div>
        {memories.length === 0
          ? <div className="text-xs text-muted-foreground">Sem memórias relacionadas.</div>
          : <ul className="space-y-1.5 text-xs">
              {memories.slice(0, 4).map((m) => (
                <li key={m.id} className="rounded-md bg-muted/40 p-2">
                  <div className="font-medium truncate">{m.label}</div>
                  <div className="text-muted-foreground line-clamp-2">{m.content}</div>
                </li>
              ))}
            </ul>}
      </Section>

      <Section title="Artifacts recentes" icon={<Sparkles className="size-3.5" />}>
        {artifacts.length === 0
          ? <div className="text-xs text-muted-foreground">Nenhum artifact ligado.</div>
          : <ul className="space-y-1.5 text-xs">
              {artifacts.slice(0, 5).map((a) => (
                <li key={a.id} className="rounded-md bg-muted/40 p-2">
                  <div className="font-medium truncate">{a.title}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{a.kind}</div>
                </li>
              ))}
            </ul>}
      </Section>

      <Section title="Ações sugeridas" icon={<FileSearch className="size-3.5" />}>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>• Salvar a última resposta como memória.</li>
          <li>• Transformar resposta em artifact.</li>
          <li>• Comparar com outro modelo.</li>
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="orbe-card orbe-card-hover p-4">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/60">
        {icon && (
          <span className="flex items-center justify-center size-6 rounded-md bg-[color-mix(in_oklch,var(--orbe-blue)_12%,transparent)] text-[var(--orbe-blue)]">
            {icon}
          </span>
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right truncate max-w-[60%]">{v}</span>
    </div>
  );
}
