import { createFileRoute } from "@tanstack/react-router";
import { GlassCard, SectionHeader } from "@/components/design-system/Primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { mockUser, mockWorkspace } from "@/lib/mock/data";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Configurações · orbeAI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="configurações" title="Preferências do seu cockpit"
        description="Perfil, workspace, aparência, memória, modelos, privacidade e segurança." />

      <Tabs defaultValue="profile">
        <TabsList className="flex flex-wrap">
          {[
            ["profile", "Perfil"], ["workspace", "Workspace"], ["appearance", "Aparência"],
            ["memory", "Memória"], ["models", "Modelos"], ["privacy", "Privacidade"],
            ["integrations", "Integrações"], ["notifications", "Notificações"], ["security", "Segurança"],
          ].map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="profile" className="mt-5">
          <GlassCard className="space-y-4 max-w-xl">
            <Field label="Nome" defaultValue={mockUser.name} />
            <Field label="Email" defaultValue={mockUser.email} />
            <Button onClick={() => toast.success("Perfil atualizado")}>Salvar alterações</Button>
          </GlassCard>
        </TabsContent>

        <TabsContent value="workspace" className="mt-5">
          <GlassCard className="space-y-4 max-w-xl">
            <Field label="Nome do workspace" defaultValue={mockWorkspace.name} />
            <Field label="Plano" defaultValue={mockWorkspace.plan} />
          </GlassCard>
        </TabsContent>

        <TabsContent value="appearance" className="mt-5">
          <GlassCard className="space-y-3 max-w-xl">
            <ToggleRow label="Modo escuro" desc="Tema escuro premium da orbeAI" />
            <ToggleRow label="Reduzir motion" desc="Diminui animações e transições" />
            <ToggleRow label="Compactar sidebar" desc="Ícones apenas" />
          </GlassCard>
        </TabsContent>

        <TabsContent value="memory" className="mt-5">
          <GlassCard className="space-y-3 max-w-xl">
            <ToggleRow label="Habilitar memória global" desc="A orbeAI lembra preferências entre projetos" defaultChecked />
            <ToggleRow label="Confirmação para memória sensível" desc="Pedir aprovação antes de salvar" defaultChecked />
            <ToggleRow label="Auto arquivamento" desc="Memórias não usadas há 90 dias" />
          </GlassCard>
        </TabsContent>

        <TabsContent value="models" className="mt-5">
          <GlassCard className="space-y-3 max-w-xl">
            <Field label="Provedor padrão" defaultValue="anthropic" />
            <Field label="Modo de roteamento padrão" defaultValue="automático" />
          </GlassCard>
        </TabsContent>

        <TabsContent value="privacy" className="mt-5">
          <GlassCard className="space-y-3 max-w-xl">
            <ToggleRow label="Treinar com meus dados" desc="Permite uso anônimo para melhorias" />
            <ToggleRow label="Compartilhar telemetria" desc="Métricas técnicas anônimas" defaultChecked />
          </GlassCard>
        </TabsContent>

        <TabsContent value="integrations" className="mt-5">
          <GlassCard><p className="text-sm text-muted-foreground">Gerencie no <a href="/app/integrations" className="text-[var(--orbe-blue)]">hub de integrações</a>.</p></GlassCard>
        </TabsContent>

        <TabsContent value="notifications" className="mt-5">
          <GlassCard className="space-y-3 max-w-xl">
            <ToggleRow label="Resumo diário" desc="Email com decisões e tarefas" defaultChecked />
            <ToggleRow label="Alertas de pesquisa" desc="Quando uma pesquisa profunda termina" defaultChecked />
          </GlassCard>
        </TabsContent>

        <TabsContent value="security" className="mt-5">
          <GlassCard className="space-y-3 max-w-xl">
            <ToggleRow label="Autenticação em duas etapas" desc="Recomendado para contas enterprise" defaultChecked />
            <ToggleRow label="Sessões confiáveis por 30 dias" desc="Reduz reautenticação" />
            <Button variant="outline">Revogar todas as sessões</Button>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input defaultValue={defaultValue} />
    </div>
  );
}

function ToggleRow({ label, desc, defaultChecked }: { label: string; desc?: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
