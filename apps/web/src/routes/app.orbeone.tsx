import { createFileRoute, Link } from "@tanstack/react-router";
import { GlassCard, Pill, SectionHeader } from "@/components/design-system/Primitives";
import { OrbeMark } from "@/components/design-system/OrbeLogo";
import { orbeProducts } from "@/lib/mock/data";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/orbeone")({
  head: () => ({ meta: [{ title: "Ecossistema orbeOne · orbeAI" }] }),
  component: OrbeOnePage,
});

function OrbeOnePage() {
  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="ecossistema orbeOne" title="orbeAI no centro da inteligência"
        description="A orbeAI conecta inteligência, memória, agentes e automação em todos os produtos da orbeOne." />

      <section className="relative orbe-glass rounded-3xl p-10 overflow-hidden">
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-gradient-to-br from-[var(--orbe-blue)]/30 to-[var(--orbe-cyan)]/10 blur-3xl" />
        <div className="relative flex flex-col items-center text-center">
          <OrbeMark size={64} />
          <h2 className="mt-4 text-2xl font-semibold">orbeAI</h2>
          <p className="text-sm text-muted-foreground max-w-xl mt-2">
            Conecta inteligência, memória, agentes e automação aos produtos do ecossistema orbeOne.
          </p>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {orbeProducts.filter((p) => p.slug !== "orbeAI").map((p) => (
            <GlassCard key={p.slug} className="orbe-card-hover">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.tagline}</div>
                </div>
                <Pill tone={p.status === "ativo" ? "success" : p.status === "beta" ? "warn" : "muted"}>{p.status}</Pill>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{p.description}</p>
              <div className="mt-3 text-[11px] inline-flex items-center gap-1 text-[var(--orbe-blue)]">
                <Sparkles className="size-3" /> conectado via orbeAI
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <div className="text-sm text-muted-foreground">
        Quer voltar ao cockpit? <Link to="/app" className="text-[var(--orbe-blue)]">Abrir orbeAI →</Link>
      </div>
    </div>
  );
}
