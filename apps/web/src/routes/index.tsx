import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { OrbeWordmark, OrbeMark } from "@/components/design-system/OrbeLogo";
import { GlassCard, IconBadge, Pill, SectionHeader, StatusDot } from "@/components/design-system/Primitives";
import {
  ArrowRight, Bot, Boxes, Check, Compass, FlaskConical, MessageSquare,
  Network, ShieldCheck, Sparkles, Workflow,
} from "lucide-react";
import { orbeProducts } from "@/lib/mock/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "orbeAI · o sistema operacional cognitivo da orbeOne" },
      { name: "description", content: "Converse, pesquise, crie, automatize e conecte inteligência aos produtos da orbeOne em um único cockpit premium." },
      { property: "og:title", content: "orbeAI · cockpit cognitivo da orbeOne" },
      { property: "og:description", content: "Memória controlável, roteamento inteligente e agentes especializados." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-16">
          <OrbeWordmark />
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#visao" className="hover:text-foreground">Visão</a>
            <a href="#features" className="hover:text-foreground">Recursos</a>
            <a href="#ecossistema" className="hover:text-foreground">Ecossistema</a>
            <a href="#seguranca" className="hover:text-foreground">Segurança</a>
            <a href="#agentes" className="hover:text-foreground">Agentes</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/login">Entrar</Link></Button>
            <Button asChild><Link to="/login">Abrir cockpit <ArrowRight className="ml-1 size-4" /></Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-20 pb-16 text-center flex flex-col items-center">
        <Pill tone="blue"><Sparkles className="size-3" /> orbeOne · cockpit cognitivo</Pill>
        <h1 className="mt-6 text-6xl md:text-8xl font-semibold tracking-tight">
          <span className="orbe-gradient-text">orbeAI</span>
        </h1>
        <p className="mt-4 text-xl md:text-2xl font-medium text-foreground/90 text-balance">
          o sistema operacional cognitivo da orbeOne.
        </p>
        <p className="mt-5 mx-auto max-w-2xl text-muted-foreground text-pretty leading-relaxed">
          Converse, pesquise, crie, automatize e conecte inteligência aos produtos da orbeOne em um único cockpit premium.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild><Link to="/login">Abrir cockpit <ArrowRight className="ml-1 size-4" /></Link></Button>
          <Button size="lg" variant="outline" asChild><a href="#ecossistema">Conhecer o ecossistema</a></Button>
        </div>

        <div className="mt-14 relative">
          <div className="orbe-glass rounded-2xl p-3 mx-auto max-w-5xl">
            <div className="rounded-xl bg-card border p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
              {[
                { icon: MessageSquare, label: "Chat multimodal" },
                { icon: Boxes, label: "Memória controlável" },
                { icon: Network, label: "Roteamento inteligente" },
                { icon: Bot, label: "Agentes especializados" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="size-9 rounded-lg orbe-glass flex items-center justify-center"><Icon className="size-4 text-[var(--orbe-blue)]" /></div>
                  <span className="text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section id="visao" className="mx-auto max-w-7xl px-6 py-20">
        <SectionHeader eyebrow="visão de produto" title="Inteligência operacional, sob seu controle."
          description="orbeAI une conversa, memória, agentes e automação em um só cockpit — com transparência e sofisticação enterprise." />
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { t: "Memória controlável", d: "Você decide o que é salvo, editado ou apagado. Sempre auditável." },
            { t: "Roteamento inteligente", d: "Cada tarefa vai para o modelo certo — qualidade, custo, latência." },
            { t: "Ecossistema orbeOne", d: "Conecta orbeRadar, orbeRisk, orbeAuto, orbeVault e os demais produtos." },
          ].map((x) => (
            <GlassCard key={x.t}>
              <h3 className="text-lg font-semibold">{x.t}</h3>
              <p className="text-sm text-muted-foreground mt-2">{x.d}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <SectionHeader eyebrow="recursos-chave" title="Tudo que um cockpit cognitivo precisa." />
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { i: MessageSquare, t: "Chat multimodal", d: "Texto, documentos, imagens e voz com modos especializados." },
            { i: Sparkles, t: "Artifact studio", d: "Documentos, código, planos e relatórios editáveis com versão." },
            { i: FlaskConical, t: "Pesquisa profunda", d: "Multifonte, com evidências, incertezas e síntese executiva." },
            { i: Bot, t: "Agentes especializados", d: "orbe strategist, dev, research, document, sales, ops e mais." },
            { i: Network, t: "orbeRouter", d: "Roteia tarefas entre OpenAI, Anthropic, Gemini, Qwen, Groq e local." },
            { i: Workflow, t: "Integrações", d: "Drive, GitHub, Notion, Slack, WhatsApp, Supabase e ecossistema orbeOne." },
          ].map(({ i: Icon, t, d }) => (
            <GlassCard key={t}>
              <IconBadge icon={Icon} className="mb-3" />
              <h3 className="font-semibold">{t}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{d}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Ecosystem */}
      <section id="ecossistema" className="mx-auto max-w-7xl px-6 py-20">
        <SectionHeader eyebrow="ecossistema orbeOne" title="orbeAI no centro do ecossistema."
          description="A inteligência, memória e automação fluem entre cada produto da orbeOne." />
        <div className="orbe-glass rounded-2xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {orbeProducts.map((p) => (
              <div key={p.slug} className="orbe-card orbe-card-hover p-4 text-center">
                <div className="mx-auto size-11 rounded-2xl bg-gradient-to-br from-[var(--orbe-blue)] to-[var(--orbe-cyan)] flex items-center justify-center text-white text-xs font-semibold shadow-[var(--shadow-soft)]">
                  {p.name.replace("orbe", "")}
                </div>
                <div className="mt-3 text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 text-pretty">{p.tagline}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="seguranca" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <GlassCard>
            <ShieldCheck className="size-7 text-[var(--orbe-blue)]" />
            <h2 className="mt-3 text-2xl font-semibold">Segurança e memória sob seu controle.</h2>
            <p className="mt-3 text-muted-foreground text-sm">
              A orbeAI usa memória para manter contexto, mas o usuário sempre controla o que é salvo, editado ou apagado.
              Workspaces isolados, papéis claros, auditoria completa e políticas de retenção transparentes.
            </p>
          </GlassCard>
          <div className="grid grid-cols-2 gap-3">
            {["Workspaces isolados", "Papéis e permissões", "Auditoria completa", "Política de memória", "Sem treino com seus dados", "Provedores intercambiáveis"].map((t) => (
              <div key={t} className="orbe-card p-4 text-sm flex items-start gap-2.5">
                <Check className="size-4 text-[var(--success)] mt-0.5 shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agents */}
      <section id="agentes" className="mx-auto max-w-7xl px-6 py-20">
        <SectionHeader eyebrow="agentes especializados" title="Um time cognitivo para cada decisão." />
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {["orbe strategist", "orbe dev", "orbe research", "orbe document", "orbe sales", "orbe ops", "orbe risk", "orbe gov", "orbe zen"].map((n) => (
            <GlassCard key={n}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <IconBadge icon={Bot} size="sm" />
                  <span className="font-medium">{n}</span>
                </div>
                <StatusDot tone="success" pulse={false} />
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="orbe-glass rounded-3xl p-10 text-center">
          <Compass className="mx-auto size-8 text-[var(--orbe-blue)]" />
          <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">Entre no cockpit cognitivo.</h2>
          <p className="mt-3 text-muted-foreground">Comece com dados de demonstração — conecte modelos reais quando quiser.</p>
          <Button size="lg" className="mt-6" asChild>
            <Link to="/login">Abrir orbeAI <ArrowRight className="ml-1 size-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t mt-10">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3"><OrbeMark size={22} /><span>© 2026 orbeOne. Todos os direitos reservados.</span></div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-foreground">Privacidade</a>
            <a href="#" className="hover:text-foreground">Termos</a>
            <a href="#" className="hover:text-foreground">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
