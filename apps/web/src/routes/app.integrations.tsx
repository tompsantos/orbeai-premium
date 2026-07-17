import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GlassCard, IconBadge, Pill, SectionHeader } from "@/components/design-system/Primitives";
import { Button } from "@/components/ui/button";
import { integrationService } from "@/lib/api";
import type { Integration } from "@/types";
import { Plug, Settings } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/integrations")({
  head: () => ({ meta: [{ title: "Integrações · orbeAI" }] }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const [items, setItems] = useState<Integration[]>([]);
  async function refresh() { setItems(await integrationService.list()); }
  useEffect(() => { void refresh(); }, []);

  const grouped = items.reduce<Record<string, Integration[]>>((acc, it) => {
    (acc[it.category] ??= []).push(it); return acc;
  }, {});

  async function toggle(it: Integration) {
    if (it.status === "conectado") {
      await integrationService.disconnect(it.slug);
      toast(`${it.name} desconectado`);
    } else {
      await integrationService.connect(it.slug);
      toast.success(`${it.name} conectado`);
    }
    await refresh();
  }

  async function configure(it: Integration) {
    await integrationService.configure(it.slug);
    toast.success(`${it.name} configurado (mock)`);
    await refresh();
  }

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="integration hub" title="Conecte a orbeAI ao seu mundo"
        description="Produtividade, dados, dev, comunicação e todo o ecossistema orbeOne." />

      {Object.entries(grouped).map(([cat, list]) => (
        <section key={cat} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="orbe-eyebrow">{cat}</div>
            <div className="orbe-hairline flex-1" />
            <span className="text-[11px] text-muted-foreground">{list.length}</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map((it) => {
              const connected = it.status === "conectado";
              return (
              <GlassCard key={it.slug} className={cn("flex flex-col", connected && "orbe-active")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconBadge icon={Plug} size="sm" tone={connected ? "blue" : "muted"} />
                    <div className="font-medium truncate">{it.name}</div>
                  </div>
                  <Pill tone={connected ? "success" : it.status === "configurar" ? "warn" : "muted"}>{it.status}</Pill>
                </div>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed flex-1">{it.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {it.permissions.map((p) => <span key={p} className="text-[10px] rounded-md bg-muted/60 border border-border/50 px-1.5 py-0.5 text-muted-foreground">{p}</span>)}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant={connected ? "outline" : "default"} className="flex-1" onClick={() => toggle(it)}>
                    {connected ? "Desconectar" : "Conectar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => configure(it)} title="Configurar"><Settings className="size-3.5" /></Button>
                </div>
              </GlassCard>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
