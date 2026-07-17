import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bot,
  Brain,
  BriefcaseBusiness,
  ChevronRight,
  Copy,
  FileText,
  GraduationCap,
  Link2,
  LockKeyhole,
  MessageSquare,
  Plane,
  Plus,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { OrbeMark } from "@/components/design-system/OrbeLogo";
import { Pill } from "@/components/design-system/Primitives";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { mockAgents } from "@/lib/mock/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/agents")({
  head: () => ({ meta: [{ title: "Equipes · orbeAI" }] }),
  component: TeamsPage,
});

type TeamMember = {
  name: string;
  initials: string;
  role: string;
};

type TeamSpace = {
  id: string;
  name: string;
  description: string;
  kind: "pessoal" | "estudo" | "viagem" | "trabalho";
  members: TeamMember[];
  assistantSlugs: string[];
  activity: string;
  privacy: "só convidados" | "qualquer pessoa com link";
};

const INITIAL_TEAMS: TeamSpace[] = [
  {
    id: "team_trip",
    name: "Viagem para o Chile",
    description: "Roteiro, reservas, orçamento e ideias reunidos num só lugar.",
    kind: "viagem",
    members: [
      { name: "Tom", initials: "TS", role: "organizador" },
      { name: "Ezequiel", initials: "EZ", role: "participante" },
    ],
    assistantSlugs: ["orbe-research", "orbe-document"],
    activity: "roteiro atualizado há 18 min",
    privacy: "só convidados",
  },
  {
    id: "team_study",
    name: "Grupo de estudos",
    description: "Materiais, resumos e encontros para aprender em conjunto.",
    kind: "estudo",
    members: [
      { name: "Tom", initials: "TS", role: "organizador" },
      { name: "Marina", initials: "MA", role: "participante" },
      { name: "Lucas", initials: "LU", role: "participante" },
    ],
    assistantSlugs: ["orbe-research", "orbe-document"],
    activity: "novo resumo criado ontem",
    privacy: "qualquer pessoa com link",
  },
  {
    id: "team_product",
    name: "orbeAI produto",
    description: "Decisões, entregas e conhecimento compartilhado do produto.",
    kind: "trabalho",
    members: [
      { name: "Tom", initials: "TS", role: "responsável" },
      { name: "Produto", initials: "PR", role: "equipe" },
    ],
    assistantSlugs: ["orbe-strategist", "orbe-dev", "orbe-research"],
    activity: "3 decisões registradas hoje",
    privacy: "só convidados",
  },
];

function TeamKindIcon({ kind }: { kind: TeamSpace["kind"] }) {
  if (kind === "viagem") return <Plane className="size-5" />;
  if (kind === "estudo") return <GraduationCap className="size-5" />;
  if (kind === "trabalho") return <BriefcaseBusiness className="size-5" />;
  return <Users className="size-5" />;
}

function friendlyAgentStatus(status: string) {
  if (status === "ativo") return "pronto para ajudar";
  if (status === "beta") return "em testes";
  return "em preparação";
}

function agentTone(status: string): "success" | "warn" | "muted" {
  if (status === "ativo") return "success";
  if (status === "beta") return "warn";
  return "muted";
}

function memoryLabel(scope: string) {
  if (scope === "global") return "pode usar preferências gerais";
  if (scope === "isolada") return "lembra apenas desta conversa";
  return "lembra apenas desta equipe ou projeto";
}

function TeamsPage() {
  const [teams, setTeams] = useState<TeamSpace[]>(INITIAL_TEAMS);
  const [activeTeam, setActiveTeam] = useState<TeamSpace | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [assistantSlug, setAssistantSlug] = useState("orbe-research");
  const [assistantSearch, setAssistantSearch] = useState("");

  const filteredAgents = useMemo(() => {
    const query = assistantSearch.trim().toLowerCase();
    if (!query) return mockAgents;

    return mockAgents.filter((agent) =>
      `${agent.name} ${agent.role} ${agent.description}`.toLowerCase().includes(query),
    );
  }, [assistantSearch]);

  const peopleCount = useMemo(() => {
    const names = new Set(teams.flatMap((team) => team.members.map((member) => member.name)));
    return names.size;
  }, [teams]);

  const assistantsInUse = useMemo(
    () => new Set(teams.flatMap((team) => team.assistantSlugs)).size,
    [teams],
  );

  function createTeam() {
    if (!teamName.trim()) return;

    const created: TeamSpace = {
      id: `team_${Date.now()}`,
      name: teamName.trim(),
      description: teamDescription.trim() || "Um espaço compartilhado para conversar, criar e organizar juntos.",
      kind: "pessoal",
      members: [{ name: "Você", initials: "VC", role: "organizador" }],
      assistantSlugs: assistantSlug ? [assistantSlug] : [],
      activity: "criada agora",
      privacy: "só convidados",
    };

    setTeams((current) => [created, ...current]);
    setTeamName("");
    setTeamDescription("");
    setAssistantSlug("orbe-research");
    setCreateOpen(false);
    toast.success("Equipe criada", {
      description: "Agora você pode convidar pessoas e escolher novos assistentes.",
    });
  }

  function copyInvite(team: TeamSpace) {
    void navigator.clipboard.writeText(`https://orbe.ai/equipe/${team.id}`);
    toast.success("Convite copiado");
  }

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98)_55%,rgba(236,254,255,0.72))] p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)] md:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 shadow-sm">
                <Users className="size-5 text-[var(--orbe-blue)]" />
              </span>
              <Pill tone="blue">colaboração</Pill>
            </div>

            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              Pessoas e assistentes trabalhando no mesmo espaço.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Crie uma equipe para uma viagem, estudo, casa, projeto criativo ou trabalho. Cada grupo escolhe o que compartilha e quais assistentes podem ajudar.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 size-4" />
                Criar equipe
              </Button>
              <Button variant="outline" onClick={() => toast.success("Convite pronto para ser enviado") }>
                <UserPlus className="mr-1.5 size-4" />
                Entrar com convite
              </Button>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/70 bg-white/78 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <OrbeMark size={36} />
              <div>
                <div className="font-semibold">Tudo continua sob controle</div>
                <div className="text-xs text-muted-foreground">cada equipe tem contexto e acesso próprios</div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-muted/45 p-3">
                <div className="text-xl font-semibold tabular-nums">{teams.length}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">equipes</div>
              </div>
              <div className="rounded-xl bg-muted/45 p-3">
                <div className="text-xl font-semibold tabular-nums">{peopleCount}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">pessoas</div>
              </div>
              <div className="rounded-xl bg-muted/45 p-3">
                <div className="text-xl font-semibold tabular-nums">{assistantsInUse}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">assistentes</div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
              <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[var(--orbe-blue)]" />
              Uma conversa pessoal nunca entra numa equipe sem sua escolha.
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="teams" className="space-y-5">
        <TabsList className="h-auto rounded-xl bg-muted/55 p-1">
          <TabsTrigger value="teams" className="rounded-lg px-4">Minhas equipes</TabsTrigger>
          <TabsTrigger value="assistants" className="rounded-lg px-4">Assistentes</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="mt-0 space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Espaços compartilhados</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cada equipe reúne conversas, arquivos, memória e criações daquele grupo.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-3.5" />
              Nova equipe
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {teams.map((team) => {
              const assistants = team.assistantSlugs
                .map((slug) => mockAgents.find((agent) => agent.slug === slug))
                .filter(Boolean);

              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setActiveTeam(team)}
                  className="group flex min-h-[280px] flex-col rounded-[1.4rem] border border-border/70 bg-card p-5 text-left shadow-[0_18px_45px_-42px_rgba(15,23,42,0.65)] transition hover:-translate-y-0.5 hover:border-[color-mix(in_oklch,var(--orbe-blue)_35%,var(--border))] hover:shadow-[0_24px_55px_-42px_rgba(15,23,42,0.7)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--orbe-blue)_12%,transparent)] text-[var(--orbe-blue)]">
                      <TeamKindIcon kind={team.kind} />
                    </span>
                    <Pill tone={team.privacy === "só convidados" ? "muted" : "blue"}>
                      {team.privacy === "só convidados" ? "privada" : "com link"}
                    </Pill>
                  </div>

                  <div className="mt-5">
                    <h3 className="text-lg font-semibold">{team.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {team.description}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 4).map((member) => (
                        <Avatar key={`${team.id}-${member.name}`} className="size-8 border-2 border-card">
                          <AvatarFallback className="bg-muted text-[10px] font-semibold">
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {team.members.length} {team.members.length === 1 ? "pessoa" : "pessoas"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {assistants.slice(0, 3).map((assistant) => (
                      <span
                        key={assistant!.slug}
                        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/35 px-2 py-1 text-[11px] text-muted-foreground"
                      >
                        <Sparkles className="size-3 text-[var(--orbe-blue)]" />
                        {assistant!.name.replace("orbe ", "")}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
                    <span>{team.activity}</span>
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="assistants" className="mt-0 space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Assistentes da orbeAI</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Você escolhe quem entra em cada equipe. Eles não trabalham fora do contexto permitido.
                  </p>
                </div>
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={assistantSearch}
                    onChange={(event) => setAssistantSearch(event.target.value)}
                    placeholder="Buscar ajuda para…"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {filteredAgents.map((agent) => (
                  <article key={agent.slug} className="rounded-[1.3rem] border border-border/70 bg-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--orbe-blue)_12%,transparent)]">
                          <Bot className="size-5 text-[var(--orbe-blue)]" />
                        </span>
                        <div>
                          <div className="font-semibold">{agent.name}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{agent.role}</div>
                        </div>
                      </div>
                      <Pill tone={agentTone(agent.status)}>{friendlyAgentStatus(agent.status)}</Pill>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-muted-foreground">{agent.description}</p>

                    <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                      <div className="flex items-start gap-2 rounded-lg bg-muted/35 p-2.5">
                        <Brain className="mt-0.5 size-3.5 shrink-0 text-[var(--orbe-blue)]" />
                        {memoryLabel(agent.memoryScope)}
                      </div>
                      <div className="flex items-start gap-2 rounded-lg bg-muted/35 p-2.5">
                        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[var(--orbe-blue)]" />
                        {agent.tools.slice(0, 3).join(" · ")}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => toast.success(`${agent.name} pronto para ser adicionado`)}
                    >
                      <Plus className="mr-1.5 size-3.5" />
                      Adicionar a uma equipe
                    </Button>
                  </article>
                ))}
              </div>
            </section>

            <aside className="space-y-3">
              <div className="rounded-[1.3rem] border border-border/70 bg-card p-5">
                <div className="flex items-center gap-2 font-semibold">
                  <LockKeyhole className="size-4 text-[var(--orbe-blue)]" />
                  Contexto separado
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  O que acontece numa equipe fica naquela equipe, a menos que você escolha levar algo para sua memória pessoal.
                </p>
              </div>

              <div className="rounded-[1.3rem] border border-border/70 bg-card p-5">
                <div className="font-semibold">O que uma equipe reúne</div>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><MessageSquare className="size-4 text-[var(--orbe-blue)]" /> conversas compartilhadas</li>
                  <li className="flex items-center gap-2"><FileText className="size-4 text-[var(--orbe-blue)]" /> arquivos e criações</li>
                  <li className="flex items-center gap-2"><Brain className="size-4 text-[var(--orbe-blue)]" /> lembranças daquele grupo</li>
                  <li className="flex items-center gap-2"><Bot className="size-4 text-[var(--orbe-blue)]" /> assistentes escolhidos</li>
                </ul>
              </div>
            </aside>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar uma equipe</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Nome</span>
              <Input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Ex.: Viagem em família"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium">Para que vocês vão usar este espaço?</span>
              <Textarea
                value={teamDescription}
                onChange={(event) => setTeamDescription(event.target.value)}
                placeholder="Conte em uma frase. Isso ajuda a orbeAI a organizar o espaço."
                rows={3}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium">Primeiro assistente</span>
              <Select value={assistantSlug} onValueChange={setAssistantSlug}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockAgents.map((agent) => (
                    <SelectItem key={agent.slug} value={agent.slug}>
                      {agent.name} · {agent.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/35 p-3 text-xs text-muted-foreground">
              <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[var(--orbe-blue)]" />
              A equipe começa privada. Você decide quem entra e o que pode ser compartilhado.
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button disabled={!teamName.trim()} onClick={createTeam}>Criar equipe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(activeTeam)} onOpenChange={(open) => !open && setActiveTeam(null)}>
        <DialogContent className="sm:max-w-2xl">
          {activeTeam && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--orbe-blue)_12%,transparent)] text-[var(--orbe-blue)]">
                    <TeamKindIcon kind={activeTeam.kind} />
                  </span>
                  <div>
                    <DialogTitle>{activeTeam.name}</DialogTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{activeTeam.description}</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">Pessoas</div>
                    <Button variant="ghost" size="sm" onClick={() => copyInvite(activeTeam)}>
                      <Copy className="mr-1.5 size-3.5" />
                      Copiar convite
                    </Button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {activeTeam.members.map((member) => (
                      <div key={member.name} className="flex items-center gap-3 rounded-lg bg-muted/35 p-2.5">
                        <Avatar className="size-8"><AvatarFallback className="text-[10px]">{member.initials}</AvatarFallback></Avatar>
                        <div>
                          <div className="text-sm font-medium">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 p-4">
                  <div className="font-medium">Assistentes</div>
                  <div className="mt-3 space-y-2">
                    {activeTeam.assistantSlugs.map((slug) => {
                      const agent = mockAgents.find((item) => item.slug === slug);
                      if (!agent) return null;

                      return (
                        <div key={slug} className="flex items-center gap-3 rounded-lg bg-muted/35 p-2.5">
                          <span className="flex size-8 items-center justify-center rounded-lg bg-background">
                            <Sparkles className="size-4 text-[var(--orbe-blue)]" />
                          </span>
                          <div>
                            <div className="text-sm font-medium">{agent.name}</div>
                            <div className="text-xs text-muted-foreground">{agent.role}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {activeTeam.privacy === "só convidados" ? <LockKeyhole className="size-4" /> : <Link2 className="size-4" />}
                  {activeTeam.privacy}
                </div>
                <Button onClick={() => toast.success(`${activeTeam.name} aberto`)}>
                  Abrir equipe
                  <ChevronRight className="ml-1.5 size-4" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
