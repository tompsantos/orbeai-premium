import { createFileRoute } from "@tanstack/react-router";
import { GlassCard, Pill, SectionHeader } from "@/components/design-system/Primitives";
import { Button } from "@/components/ui/button";
import { mockAgents } from "@/lib/mock/data";
import { Bot, Settings, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/agents")({
  head: () => ({ meta: [{ title: "Agentes · orbeAI" }] }),
  component: AgentsPage,
});

function AgentsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="agent center" title="Agentes especializados da orbeAI"
        description="Cada agente tem papel, ferramentas e escopo de memória próprios." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockAgents.map((a) => (
          <GlassCard key={a.slug} className="orbe-card-hover flex flex-col">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-[var(--orbe-blue)] to-[var(--orbe-cyan)] flex items-center justify-center">
                  <Bot className="size-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-[11px] text-muted-foreground">{a.role}</div>
                </div>
              </div>
              <Pill tone={a.status === "ativo" ? "success" : "muted"}>{a.status}</Pill>
            </div>

            <p className="text-sm text-muted-foreground mt-3">{a.description}</p>

            <div className="mt-4 space-y-2 text-xs">
              <div><span className="text-muted-foreground">Ferramentas:</span> {a.tools.join(", ")}</div>
              <div><span className="text-muted-foreground">Escopo de memória:</span> {a.memoryScope}</div>
            </div>

            <div className="mt-auto pt-4 flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => toast.success(`${a.name} aberto`)}><Sparkles className="size-3.5 mr-1" /> Abrir</Button>
              <Button size="sm" variant="outline"><Settings className="size-3.5 mr-1" /> Configurar</Button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
