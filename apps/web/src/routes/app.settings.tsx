import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bell,
  Brain,
  Check,
  ChevronRight,
  Cloud,
  Download,
  Eye,
  Globe2,
  KeyRound,
  Laptop,
  LockKeyhole,
  Mail,
  Moon,
  Palette,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sun,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { GlassCard, Pill, SectionHeader, StatusDot } from "@/components/design-system/Primitives";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { mockUser, mockWorkspace } from "@/lib/mock/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Configurações · orbeAI" }] }),
  component: SettingsPage,
});

type SettingsSection = "account" | "experience" | "privacy" | "connections" | "notifications";

type ToggleSettingProps = {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  badge?: string;
};

const sections: Array<{
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof UserRound;
}> = [
  { id: "account", label: "Sua conta", description: "Perfil, idioma e espaço atual", icon: UserRound },
  { id: "experience", label: "Experiência", description: "Aparência, conversa e memória", icon: Palette },
  { id: "privacy", label: "Privacidade e segurança", description: "Dados, acesso e sessões", icon: ShieldCheck },
  { id: "connections", label: "Conexões", description: "Serviços ligados à orbeAI", icon: Cloud },
  { id: "notifications", label: "Avisos", description: "O que merece chamar sua atenção", icon: Bell },
];

function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>("account");
  const [name, setName] = useState(mockUser.name);
  const [email, setEmail] = useState(mockUser.email);
  const [language, setLanguage] = useState("pt-BR");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compactNavigation, setCompactNavigation] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [sensitiveConfirmation, setSensitiveConfirmation] = useState(true);
  const [personalizedReplies, setPersonalizedReplies] = useState(true);
  const [usageAnalytics, setUsageAnalytics] = useState(true);
  const [productImprovement, setProductImprovement] = useState(false);
  const [dailySummary, setDailySummary] = useState(true);
  const [researchAlerts, setResearchAlerts] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [teamActivity, setTeamActivity] = useState(false);

  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }, [name]);

  function saveProfile() {
    toast.success("Suas informações foram atualizadas");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="do seu jeito"
        title="Configurações"
        description="Ajuste sua conta, a forma como a orbeAI conversa, o que ela pode lembrar e como seus dados são protegidos."
      />

      <GlassCard hoverable={false} className="relative overflow-hidden p-0">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[var(--orbe-blue)]/10 to-transparent" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-14 ring-1 ring-border">
              <AvatarFallback className="bg-[var(--orbe-blue)]/15 text-base font-semibold text-[var(--orbe-blue)]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{name}</h2>
                <Pill tone="blue">conta principal</Pill>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot tone="success" pulse={false} /> conta protegida
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5" /> espaço atual: {mockWorkspace.name}
                </span>
              </div>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => setSection("privacy")}>
            <ShieldCheck className="mr-1.5 size-4" />
            Revisar proteção
          </Button>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-2">
          {sections.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
                  active
                    ? "border-[var(--orbe-blue)]/30 bg-[var(--orbe-blue)]/8 shadow-sm"
                    : "border-transparent hover:border-border hover:bg-card/60",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    active ? "bg-[var(--orbe-blue)] text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                </span>
                <ChevronRight className={cn("size-4 text-muted-foreground transition", active && "text-[var(--orbe-blue)]")} />
              </button>
            );
          })}
        </aside>

        <div className="min-w-0">
          {section === "account" && (
            <div className="space-y-4">
              <SettingsBlock
                icon={UserRound}
                title="Informações da conta"
                description="É assim que você aparece nos espaços e equipes compartilhadas."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Seu nome" value={name} onChange={setName} />
                  <Field label="Email" value={email} onChange={setEmail} type="email" />
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={saveProfile}>
                    <Save className="mr-1.5 size-4" /> Salvar informações
                  </Button>
                </div>
              </SettingsBlock>

              <SettingsBlock
                icon={Globe2}
                title="Idioma e região"
                description="Define o idioma da interface e como datas e horários aparecem."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Idioma da interface</span>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português do Brasil</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <Field label="Fuso horário" value="América/São Paulo" readOnly />
                </div>
              </SettingsBlock>

              <SettingsBlock
                icon={Users}
                title="Espaço atual"
                description="As configurações deste espaço não alteram seus outros ambientes."
              >
                <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{mockWorkspace.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{mockWorkspace.seats} lugares disponíveis · plano {mockWorkspace.plan}</div>
                  </div>
                  <a href="/app/orbeone">
                    <Button variant="outline" size="sm">Gerenciar espaços</Button>
                  </a>
                </div>
              </SettingsBlock>
            </div>
          )}

          {section === "experience" && (
            <div className="space-y-4">
              <SettingsBlock
                icon={Palette}
                title="Aparência"
                description="Escolha uma interface confortável para usar por bastante tempo."
              >
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "light" as const, label: "Clara", icon: Sun },
                    { id: "dark" as const, label: "Escura", icon: Moon },
                    { id: "system" as const, label: "Do sistema", icon: Laptop },
                  ].map((option) => {
                    const Icon = option.icon;
                    const active = theme === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setTheme(option.id)}
                        className={cn(
                          "relative flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition",
                          active ? "border-[var(--orbe-blue)] bg-[var(--orbe-blue)]/8" : "border-border/70 hover:bg-muted/40",
                        )}
                      >
                        {active && <Check className="absolute right-2 top-2 size-3.5 text-[var(--orbe-blue)]" />}
                        <Icon className="size-5" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 divide-y divide-border/60">
                  <ToggleSetting
                    label="Reduzir animações"
                    description="Diminui movimentos e transições na interface."
                    checked={reducedMotion}
                    onCheckedChange={setReducedMotion}
                  />
                  <ToggleSetting
                    label="Navegação compacta"
                    description="Mostra apenas os ícones no menu lateral."
                    checked={compactNavigation}
                    onCheckedChange={setCompactNavigation}
                  />
                </div>
              </SettingsBlock>

              <SettingsBlock
                icon={Sparkles}
                title="Como a orbeAI conversa"
                description="Preferências gerais para o jeito das respostas, sem escolher modelos ou motores."
              >
                <div className="divide-y divide-border/60">
                  <ToggleSetting
                    label="Respostas personalizadas"
                    description="Usa suas preferências e o contexto permitido para adaptar as respostas."
                    checked={personalizedReplies}
                    onCheckedChange={setPersonalizedReplies}
                  />
                  <ToggleSetting
                    label="Memória entre conversas"
                    description="Permite que lembranças aprovadas acompanhem você em novas conversas."
                    checked={memoryEnabled}
                    onCheckedChange={setMemoryEnabled}
                  />
                  <ToggleSetting
                    label="Confirmar informações sensíveis"
                    description="Pede sua autorização antes de guardar algo delicado."
                    checked={sensitiveConfirmation}
                    onCheckedChange={setSensitiveConfirmation}
                    badge="recomendado"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href="/app/memory"><Button variant="outline" size="sm"><Brain className="mr-1.5 size-4" />Abrir Memória</Button></a>
                  <a href="/app/models"><Button variant="ghost" size="sm"><SlidersHorizontal className="mr-1.5 size-4" />Opções avançadas</Button></a>
                </div>
              </SettingsBlock>
            </div>
          )}

          {section === "privacy" && (
            <div className="space-y-4">
              <SettingsBlock
                icon={Eye}
                title="Uso dos seus dados"
                description="Você decide quais informações podem ajudar a melhorar a experiência."
              >
                <div className="divide-y divide-border/60">
                  <ToggleSetting
                    label="Compartilhar métricas técnicas"
                    description="Envia dados anônimos sobre estabilidade e desempenho, sem o conteúdo das conversas."
                    checked={usageAnalytics}
                    onCheckedChange={setUsageAnalytics}
                  />
                  <ToggleSetting
                    label="Ajudar a melhorar a orbeAI"
                    description="Autoriza o uso controlado de interações para aperfeiçoar o produto."
                    checked={productImprovement}
                    onCheckedChange={setProductImprovement}
                  />
                </div>
                <div className="mt-4 rounded-xl border border-border/70 bg-muted/25 p-3 text-xs text-muted-foreground">
                  Conversas privadas, memórias sensíveis e arquivos protegidos não entram automaticamente em melhorias do produto.
                </div>
              </SettingsBlock>

              <SettingsBlock
                icon={Download}
                title="Seus dados"
                description="Leve uma cópia das suas informações ou revise o que está armazenado."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <ActionCard
                    icon={Download}
                    title="Baixar uma cópia"
                    description="Prepara conversas, memórias e itens da Biblioteca para exportação."
                    action="Solicitar arquivo"
                    onClick={() => toast.success("A preparação da sua cópia foi iniciada")}
                  />
                  <ActionCard
                    icon={Brain}
                    title="Revisar lembranças"
                    description="Veja, corrija ou apague o que a orbeAI lembra sobre você."
                    action="Abrir Memória"
                    href="/app/memory"
                  />
                </div>
              </SettingsBlock>

              <SettingsBlock
                icon={LockKeyhole}
                title="Segurança da conta"
                description="Proteções de acesso e aparelhos conectados."
              >
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 rounded-xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                        <KeyRound className="size-4" />
                      </span>
                      <div>
                        <div className="text-sm font-medium">Verificação em duas etapas</div>
                        <div className="mt-1 text-xs text-muted-foreground">Proteção adicional ativada nesta conta.</div>
                      </div>
                    </div>
                    <Pill tone="success">ativa</Pill>
                  </div>

                  <div className="rounded-xl border border-border/70 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Aparelhos conectados</div>
                        <div className="mt-1 text-xs text-muted-foreground">2 sessões reconhecidas</div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => toast.success("Outras sessões foram encerradas")}>Encerrar outras</Button>
                    </div>
                    <div className="space-y-2 text-xs">
                      <DeviceRow icon={Laptop} name="MacBook Pro" detail="Santos · sessão atual" current />
                      <DeviceRow icon={Smartphone} name="iPhone" detail="Santos · há 2 horas" />
                    </div>
                  </div>
                </div>
              </SettingsBlock>
            </div>
          )}

          {section === "connections" && (
            <div className="space-y-4">
              <SettingsBlock
                icon={Cloud}
                title="Serviços conectados"
                description="A orbeAI só acessa um serviço depois da sua autorização."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <ConnectionCard name="Google Drive" detail="Arquivos e pastas autorizados" connected />
                  <ConnectionCard name="Google Calendar" detail="Agenda e compromissos" connected />
                  <ConnectionCard name="GitHub" detail="Repositórios e projetos técnicos" connected />
                  <ConnectionCard name="Gmail" detail="Emails e conversas" connected={false} />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div>
                    <div className="text-sm font-medium">Central de conexões</div>
                    <div className="mt-1 text-xs text-muted-foreground">Gerencie permissões e descubra outros serviços compatíveis.</div>
                  </div>
                  <a href="/app/integrations"><Button variant="outline" size="sm">Abrir central</Button></a>
                </div>
              </SettingsBlock>
            </div>
          )}

          {section === "notifications" && (
            <div className="space-y-4">
              <SettingsBlock
                icon={Bell}
                title="Avisos importantes"
                description="Escolha quando a orbeAI deve interromper o silêncio."
              >
                <div className="divide-y divide-border/60">
                  <ToggleSetting
                    label="Resumo diário"
                    description="Um panorama curto com conversas, tarefas e decisões relevantes."
                    checked={dailySummary}
                    onCheckedChange={setDailySummary}
                  />
                  <ToggleSetting
                    label="Pesquisas concluídas"
                    description="Avise quando uma pesquisa longa terminar."
                    checked={researchAlerts}
                    onCheckedChange={setResearchAlerts}
                  />
                  <ToggleSetting
                    label="Segurança e acessos"
                    description="Novos aparelhos, alterações de senha e atividades incomuns."
                    checked={securityAlerts}
                    onCheckedChange={setSecurityAlerts}
                    badge="essencial"
                  />
                  <ToggleSetting
                    label="Atividade das equipes"
                    description="Novos convites, comentários e mudanças em materiais compartilhados."
                    checked={teamActivity}
                    onCheckedChange={setTeamActivity}
                  />
                </div>
              </SettingsBlock>

              <SettingsBlock
                icon={Mail}
                title="Onde receber"
                description="Os avisos essenciais continuam disponíveis dentro da orbeAI."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[var(--orbe-blue)]/30 bg-[var(--orbe-blue)]/8 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium"><Bell className="size-4" /> Dentro da orbeAI</div>
                    <div className="mt-2 text-xs text-muted-foreground">Canal principal para todos os avisos ativados.</div>
                  </div>
                  <div className="rounded-xl border border-border/70 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium"><Mail className="size-4" /> Email</div>
                    <div className="mt-2 text-xs text-muted-foreground">Usado para resumos e alertas de segurança.</div>
                  </div>
                </div>
              </SettingsBlock>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsBlock({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard hoverable={false}>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--orbe-blue)]/10 text-[var(--orbe-blue)]">
          <Icon className="size-4" />
        </span>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </GlassCard>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        className={cn(readOnly && "bg-muted/40 text-muted-foreground")}
      />
    </label>
  );
}

function ToggleSetting({ label, description, checked, onCheckedChange, badge }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium">{label}</div>
          {badge && <Pill tone="muted">{badge}</Pill>}
        </div>
        <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  action,
  onClick,
  href,
}: {
  icon: typeof Download;
  title: string;
  description: string;
  action: string;
  onClick?: () => void;
  href?: string;
}) {
  const button = (
    <Button variant="outline" size="sm" onClick={onClick}>{action}</Button>
  );

  return (
    <div className="rounded-xl border border-border/70 p-4">
      <Icon className="size-5 text-[var(--orbe-blue)]" />
      <div className="mt-3 text-sm font-medium">{title}</div>
      <div className="mt-1 min-h-10 text-xs leading-relaxed text-muted-foreground">{description}</div>
      <div className="mt-3">{href ? <a href={href}>{button}</a> : button}</div>
    </div>
  );
}

function DeviceRow({ icon: Icon, name, detail, current = false }: { icon: typeof Laptop; name: string; detail: string; current?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
      <Icon className="size-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground">{name}</div>
        <div className="mt-0.5 text-muted-foreground">{detail}</div>
      </div>
      {current && <Pill tone="success">este aparelho</Pill>}
    </div>
  );
}

function ConnectionCard({ name, detail, connected }: { name: string; detail: string; connected: boolean }) {
  return (
    <div className="rounded-xl border border-border/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
        </div>
        <StatusDot tone={connected ? "success" : "neutral"} pulse={false} />
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="mt-3 h-8 px-2"
        onClick={() => toast.success(connected ? `${name}: permissões abertas` : `${name}: conexão iniciada`)}
      >
        {connected ? "Revisar acesso" : "Conectar"}
      </Button>
    </div>
  );
}
