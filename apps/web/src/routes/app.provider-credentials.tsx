import { createFileRoute } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";

import { ProviderCredentialsPanel } from "@/components/settings/ProviderCredentialsPanel";
import { GlassCard, SectionHeader } from "@/components/design-system/Primitives";

export const Route = createFileRoute("/app/provider-credentials")({
  head: () => ({ meta: [{ title: "Credenciais de IA · orbeAI" }] }),
  component: ProviderCredentialsPage,
});

function ProviderCredentialsPage() {
  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-6">
      <SectionHeader
        eyebrow="sistema"
        title="Credenciais de IA"
        description="Conecte os providers que o orbeRouter pode usar. Cada chave fica protegida no backend e separada por espaço."
      />

      <GlassCard hoverable={false}>
        <div className="mb-5 flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--orbe-blue)]/10 text-[var(--orbe-blue)]">
            <KeyRound className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">modelos conectados ao router</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              salve e valide OpenAI, Google Gemini e NVIDIA NIM sem copiar nenhuma chave para conversas, logs ou frontend.
            </p>
          </div>
        </div>
        <ProviderCredentialsPanel />
      </GlassCard>
    </div>
  );
}
