import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard, IconBadge, Pill, SectionHeader, StatusDot } from "@/components/design-system/Primitives";
import {
  Activity, ArrowUpRight, Bot, FileText, FlaskConical, GitBranch, LineChart,
  MessageSquare, Network, Plus, Sparkles, Workflow,
} from "lucide-react";
import {
  chatService, projectService, modelService, adminService, memoryService, artifactService, orbeOneService,
} from "@/lib/api";
import type { Artifact, AuditLog, Chat, MemoryItem, ModelProvider, OrbeProduct, Project, UsageMetric } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Cockpit · orbeAI" }] }),
  component: Cockpit,
});

function Cockpit() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [usage, setUsage] = useState<UsageMetric[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [products, setProducts] = useState<OrbeProduct[]>([]);

  useEffect(() => {
    void Promise.all([
      chatService.list(), projectService.list(), modelService.providers(),
      adminService.usage(), adminService.audit(),
      memoryService.list({ status: "pendente" }), artifactService.list(),
      orbeOneService.products(),
    ]).then(([c, p, pr, u, a, m, ar, prods]) => {
      setChats(c); setProjects(p); setProviders(pr);
      setUsage(u); setLogs(a); setMemories(m); setArtifacts(ar);
      setProducts(prods);
    });
  }, []);

  const totalCost = usage.reduce((a, b) => a + b.costUsd, 0);
  const totalTokens = usage.reduce((a, b) => a + b.tokens, 0);

  return (
    <div className="space-y-8">
      <section className="orbe-glass rounded-3xl p-8 md:p-10 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 size-72 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, var(--orbe-blue), transparent 60%)" }} />
        <Pill tone="blue">cockpit cognitivo</Pill>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">
          <span className="orbe-gradient-text">orbeAI</span>
        </h1>
        <p className="mt-2 text-lg text-foreground/85">o sistema operacional cognitivo da orbeOne.</p>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Comece uma conversa, abra um projeto, conduza uma pesquisa profunda ou crie um artifact.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild><Link to="/app/chat"><MessageSquare className="size-4 mr-1" /> Nova conversa</Link></Button>
          <Button variant="outline" asChild><Link to="/app/projects"><Plus className="size-4 mr-1" /> Novo projeto</Link></Button>
          <Button variant="outline" asChild><Link to="/app/research"><FlaskConical className="size-4 mr-1" /> Pesquisa profunda</Link></Button>
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="ações rápidas" title="O que você quer fazer agora?" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { i: MessageSquare, t: "Nova conversa", to: "/app/chat" },
            { i: Plus, t: "Novo projeto", to: "/app/projects" },
            { i: FlaskConical, t: "Pesquisa profunda", to: "/app/research" },
            { i: Sparkles, t: "Criar artifact", to: "/app/artifacts" },
            { i: FileText, t: "Memória", to: "/app/memory" },
            { i: Network, t: "Comparar modelos", to: "/app/models" },
          ].map(({ i: Icon, t, to }) => (
            <Link key={t} to={to} className="group orbe-card orbe-card-hover p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <IconBadge icon={Icon} size="sm" />
                <ArrowUpRight className="size-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
              </div>
              <span className="text-sm font-medium">{t}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <SectionHeader eyebrow="projetos recentes" title="Continue de onde parou"
            action={<Button variant="ghost" size="sm" asChild><Link to="/app/projects">Ver todos <ArrowUpRight className="size-3.5 ml-1" /></Link></Button>} />
          <div className="grid sm:grid-cols-2 gap-3">
            {projects.slice(0, 4).map((p) => (
              <Link key={p.id} to="/app/projects/$id" params={{ id: p.id }} className="orbe-card orbe-card-hover p-5 block">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</div>
                  </div>
                  <Pill tone={p.status === "ativo" ? "success" : "muted"}>{p.status}</Pill>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{p.chatsCount} chats</span>
                  <span>{p.artifactsCount} artifacts</span>
                  <span>{p.filesCount} arquivos</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader eyebrow="conversas recentes" title="Últimos diálogos"
            action={<Button variant="ghost" size="sm" asChild><Link to="/app/chat">Abrir chat</Link></Button>} />
          <GlassCard className="p-1.5" hoverable={false}>
            <ul>
              {chats.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link to="/app/chat" className="group flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent/50 transition-colors">
                    <span className="flex items-center justify-center size-8 rounded-lg bg-[color-mix(in_oklch,var(--orbe-blue)_10%,transparent)] shrink-0">
                      <MessageSquare className="size-4 text-[var(--orbe-blue)]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{c.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        orbe {c.mode} · {formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true, locale: ptBR })}
                      </div>
                    </div>
                    <ArrowUpRight className="size-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </GlassCard>
        </section>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <SectionHeader eyebrow="memória pendente" title="Aguardando sua curadoria" />
          {memories.length === 0
            ? <GlassCard><p className="text-sm text-muted-foreground">Nada pendente. <Link to="/app/memory" className="text-[var(--orbe-blue)]">Abrir memory center</Link>.</p></GlassCard>
            : <div className="grid sm:grid-cols-2 gap-3">
                {memories.slice(0, 4).map((m) => (
                  <Link key={m.id} to="/app/memory" className="orbe-card orbe-card-hover p-4 block">
                    <div className="font-medium text-sm">{m.label}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.content}</p>
                  </Link>
                ))}
              </div>}
        </section>

        <section>
          <SectionHeader eyebrow="artifacts recentes" title="Últimos criados"
            action={<Button variant="ghost" size="sm" asChild><Link to="/app/artifacts">Studio</Link></Button>} />
          <GlassCard className="p-0">
            <ul className="divide-y">
              {artifacts.slice(0, 5).map((a) => (
                <li key={a.id} className="p-3 text-sm flex items-center justify-between gap-2">
                  <span className="truncate">{a.title}</span>
                  <Pill tone="blue">{a.kind}</Pill>
                </li>
              ))}
              {artifacts.length === 0 && <li className="p-4 text-xs text-muted-foreground">Nenhum artifact ainda.</li>}
            </ul>
          </GlassCard>
        </section>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section>
          <SectionHeader eyebrow="ecossistema orbeOne" title="Produtos conectados"
            action={<Button variant="ghost" size="sm" asChild><Link to="/app/orbeone">Abrir <ArrowUpRight className="size-3.5 ml-1" /></Link></Button>} />
          <GlassCard className="space-y-3">
            {products.slice(0, 5).map((p) => (
              <div key={p.slug} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-gradient-to-br from-[var(--orbe-blue)] to-[var(--orbe-cyan)]" />
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.tagline}</div>
                  </div>
                </div>
                <Pill tone={p.status === "ativo" ? "success" : p.status === "beta" ? "warn" : "muted"}>{p.status}</Pill>
              </div>
            ))}
          </GlassCard>
        </section>

        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">status dos modelos</div>
              <div className="font-semibold mt-1">orbeRouter</div>
            </div>
            <Network className="size-5 text-[var(--orbe-blue)]" />
          </div>
          <ul className="space-y-2">
            {providers.slice(0, 5).map((p) => (
              <li key={p.slug} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><StatusDot tone={p.status === "online" ? "success" : p.status === "offline" ? "danger" : "warn"} /> {p.name}</span>
                <span className="text-xs text-muted-foreground">{p.apiKeyStatus}</span>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">uso (7d)</div>
              <div className="font-semibold mt-1">{(totalTokens / 1000).toFixed(0)}k tokens</div>
            </div>
            <LineChart className="size-5 text-[var(--orbe-blue)]" />
          </div>
          <div className="text-3xl font-semibold tracking-tight tabular-nums">US$ {totalCost.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-1">Custo estimado · {usage.length} dias</div>
          <div className="mt-4 flex gap-1 h-14 items-end">
            {usage.map((u, i) => (
              <div key={i} className="flex-1 rounded-md bg-gradient-to-t from-[var(--orbe-blue)] to-[var(--orbe-cyan)] opacity-85 hover:opacity-100 transition-opacity min-h-[3px]"
                style={{ height: `${Math.min(100, (u.tokens / 600000) * 100)}%` }}
                title={`${(u.tokens / 1000).toFixed(0)}k tokens`} />
            ))}
          </div>
        </GlassCard>
      </div>

      <section>
        <SectionHeader eyebrow="atividade" title="Auditoria recente"
          action={<Button variant="ghost" size="sm" asChild><Link to="/app/admin">Ver tudo</Link></Button>} />
        <GlassCard>
          {logs.length === 0
            ? <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2"><GitBranch className="size-3.5 mt-1 text-muted-foreground" /> <span>Sem eventos ainda. Crie/edite algo para popular o audit log.</span></li>
                <li className="flex items-start gap-2"><Workflow className="size-3.5 mt-1 text-muted-foreground" /> <span>Integrações orbeOne pré-conectadas.</span></li>
                <li className="flex items-start gap-2"><Activity className="size-3.5 mt-1 text-muted-foreground" /> <span>orbeRouter em modo automático.</span></li>
              </ul>
            : <ul className="space-y-2 text-sm">
                {logs.slice(0, 6).map((l) => (
                  <li key={l.id} className="flex items-center gap-3 flex-wrap">
                    <Bot className="size-3.5 text-[var(--orbe-blue)]" />
                    <span className="font-medium">{l.actor}</span>
                    <span className="text-muted-foreground">{l.action}</span>
                    <span className="text-muted-foreground">→ {l.target}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{formatDistanceToNow(new Date(l.at), { addSuffix: true, locale: ptBR })}</span>
                  </li>
                ))}
              </ul>}
        </GlassCard>
      </section>
    </div>
  );
}
