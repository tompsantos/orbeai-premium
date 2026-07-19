import { FormEvent, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

import { OrbeMark, OrbeWordmark } from "@/components/design-system/OrbeLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/auth/authService";
import { getStoredAuthUser } from "@/lib/auth/session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar · orbeAI" },
      {
        name: "description",
        content: "Acesse o cockpit cognitivo da orbeAI.",
      },
    ],
  }),
  component: LoginRoute,
});

function LoginRoute() {
  const navigate = useNavigate();
  const storedUser = getStoredAuthUser();

  const [email, setEmail] = useState(storedUser?.email ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({ email, password });
      await navigate({ to: "/app" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "não foi possível autenticar.";

      if (message.toLowerCase().includes("invalid")) {
        setError("email ou senha inválidos.");
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[var(--orbe-blue)]/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" aria-label="orbeAI">
          <OrbeWordmark />
        </Link>

        <Button variant="ghost" asChild>
          <Link to="/">voltar</Link>
        </Button>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-[var(--orbe-blue)]" />
            orbeOne · acesso protegido
          </div>

          <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-tight">
            acesso seguro para o cockpit cognitivo.
          </h1>

          <p className="mt-5 max-w-xl text-muted-foreground leading-relaxed">
            A orbeAI usa usuário, sessão real, token opaco e workspace autenticado. Novos acessos são provisionados de forma controlada pela administração.
          </p>

          <div className="mt-8 grid max-w-xl gap-3">
            {[
              "token opaco com hash no backend",
              "workspace resolvido pela membership",
              "cadastro público desabilitado",
            ].map((item) => (
              <div key={item} className="orbe-card flex items-center gap-3 p-4">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--orbe-blue)]/10 text-[var(--orbe-blue)]">
                  <ShieldCheck className="size-4" />
                </div>
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="orbe-glass rounded-3xl p-2 shadow-[var(--shadow-soft)]">
            <div className="rounded-[1.35rem] border bg-card/95 p-6 md:p-8">
              <div className="mb-7 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-[var(--orbe-blue)]/10 text-[var(--orbe-blue)]">
                    <OrbeMark size={24} />
                  </div>

                  <h2 className="text-2xl font-semibold tracking-tight">entrar na orbeAI</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    continue para o cockpit cognitivo da orbeOne.
                  </p>
                </div>

                <div className="rounded-full border border-border/70 bg-background/70 p-2 text-muted-foreground">
                  <LockKeyhole className="size-4" />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium">
                    email
                  </label>
                  <Input
                    id="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    type="email"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium">
                    senha
                  </label>
                  <Input
                    id="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    type="password"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "entrando..." : "entrar"}
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              </form>

              <p className="mt-5 text-center text-xs text-muted-foreground">
                acesso restrito a contas previamente provisionadas.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
