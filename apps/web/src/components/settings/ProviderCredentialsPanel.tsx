import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, PlugZap, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  providerCredentialService,
  type ProviderCredentialSlug,
  type ProviderCredentialStatus,
} from "@/lib/api/services/providerCredentialService";
import { cn } from "@/lib/utils";

const PROVIDERS: Array<{
  slug: ProviderCredentialSlug;
  name: string;
  description: string;
  keyPlaceholder: string;
}> = [
  {
    slug: "openai",
    name: "OpenAI",
    description: "Modelos GPT usados diretamente pelo orbeRouter.",
    keyPlaceholder: "cole sua chave da OpenAI",
  },
  {
    slug: "gemini",
    name: "Google Gemini",
    description: "Modelos Gemini para conversa, pesquisa e rotas eficientes.",
    keyPlaceholder: "cole sua chave do Google AI Studio",
  },
  {
    slug: "nvidia",
    name: "NVIDIA NIM",
    description: "Modelos hospedados no catálogo build.nvidia.com por API compatível.",
    keyPlaceholder: "cole sua chave da NVIDIA",
  },
];

type DraftMap = Record<ProviderCredentialSlug, { apiKey: string; modelName: string }>;

function emptyDrafts(): DraftMap {
  return {
    openai: { apiKey: "", modelName: "gpt-5.5" },
    gemini: { apiKey: "", modelName: "gemini-3.5-flash" },
    nvidia: { apiKey: "", modelName: "nvidia/nemotron-3-super-120b-a12b" },
  };
}

function statusLabel(status?: ProviderCredentialStatus): string {
  if (!status?.configured) return "não configurada";
  if (status.lastTestStatus === "success") return "conexão validada";
  if (status.lastTestStatus === "failed") return "teste falhou";
  return "salva, aguardando teste";
}

function sourceLabel(source?: ProviderCredentialStatus["source"]): string {
  if (source === "workspace_vault") return "cofre deste espaço";
  if (source === "environment") return "ambiente do servidor";
  return "sem credencial";
}

export function ProviderCredentialsPanel() {
  const [statuses, setStatuses] = useState<ProviderCredentialStatus[]>([]);
  const [drafts, setDrafts] = useState<DraftMap>(emptyDrafts);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const statusBySlug = useMemo(
    () => new Map(statuses.map((status) => [status.providerSlug, status])),
    [statuses],
  );

  async function refresh() {
    const next = await providerCredentialService.list();
    setStatuses(next);
    setDrafts((current) => {
      const updated = { ...current };
      for (const status of next) {
        updated[status.providerSlug] = {
          ...updated[status.providerSlug],
          modelName: status.modelName,
        };
      }
      return updated;
    });
  }

  useEffect(() => {
    void refresh()
      .catch((error) => {
        toast.error("Não foi possível carregar as credenciais", {
          description: error instanceof Error ? error.message : "Tente novamente.",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  function updateDraft(
    providerSlug: ProviderCredentialSlug,
    field: "apiKey" | "modelName",
    value: string,
  ) {
    setDrafts((current) => ({
      ...current,
      [providerSlug]: { ...current[providerSlug], [field]: value },
    }));
  }

  async function saveAndTest(providerSlug: ProviderCredentialSlug) {
    const draft = drafts[providerSlug];
    if (!draft.apiKey.trim()) {
      toast.error("Cole a chave antes de salvar");
      return;
    }

    setBusy(`${providerSlug}:save`);
    try {
      await providerCredentialService.save(
        providerSlug,
        draft.apiKey.trim(),
        draft.modelName.trim(),
      );
      updateDraft(providerSlug, "apiKey", "");
      const test = await providerCredentialService.test(providerSlug);
      await refresh();
      if (test.success) {
        toast.success(`${statusBySlug.get(providerSlug)?.displayName ?? providerSlug} conectada`, {
          description: `${test.modelName ?? draft.modelName} respondeu em ${test.latencyMs ?? 0} ms.`,
        });
      } else {
        toast.warning("A chave foi salva, mas o teste falhou", {
          description: test.message,
        });
      }
    } catch (error) {
      toast.error("Não foi possível salvar e testar", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function test(providerSlug: ProviderCredentialSlug) {
    setBusy(`${providerSlug}:test`);
    try {
      const result = await providerCredentialService.test(providerSlug);
      await refresh();
      if (result.success) {
        toast.success("Conexão validada", {
          description: `${result.modelName ?? providerSlug} respondeu em ${result.latencyMs ?? 0} ms.`,
        });
      } else {
        toast.error("O provider recusou o teste", { description: result.message });
      }
    } catch (error) {
      toast.error("Não foi possível testar", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function remove(providerSlug: ProviderCredentialSlug) {
    if (!window.confirm("Remover esta credencial do cofre deste espaço?")) return;
    setBusy(`${providerSlug}:remove`);
    try {
      await providerCredentialService.remove(providerSlug);
      await refresh();
      toast.success("Credencial removida");
    } catch (error) {
      toast.error("Não foi possível remover", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border/70 p-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> preparando o cofre de modelos…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-4 text-sm text-emerald-900">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
          <div>
            <div className="font-medium">as chaves ficam no backend, criptografadas</div>
            <p className="mt-1 text-xs leading-5 text-emerald-800/80">
              depois do salvamento, o navegador recebe somente o estado da conexão e os quatro
              últimos caracteres. a chave completa nunca é devolvida pela api.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const status = statusBySlug.get(provider.slug);
          const draft = drafts[provider.slug];
          const isBusy = busy?.startsWith(`${provider.slug}:`) ?? false;
          const isHealthy = status?.lastTestStatus === "success";
          const isFailed = status?.lastTestStatus === "failed";

          return (
            <section
              key={provider.slug}
              className="flex min-w-0 flex-col rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--orbe-blue)]/10 text-[var(--orbe-blue)]">
                    <KeyRound className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-semibold">{provider.name}</h4>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {provider.description}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium",
                    isHealthy && "bg-emerald-100 text-emerald-700",
                    isFailed && "bg-red-100 text-red-700",
                    !isHealthy && !isFailed && status?.configured && "bg-blue-100 text-blue-700",
                    !status?.configured && "bg-muted text-muted-foreground",
                  )}
                >
                  {isHealthy ? (
                    <CheckCircle2 className="size-3" />
                  ) : isFailed ? (
                    <XCircle className="size-3" />
                  ) : null}
                  {statusLabel(status)}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <label className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">chave da api</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={draft.apiKey}
                    onChange={(event) => updateDraft(provider.slug, "apiKey", event.target.value)}
                    placeholder={status?.configured ? status.keyHint ?? "chave já salva" : provider.keyPlaceholder}
                    disabled={isBusy}
                  />
                </label>

                <label className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">modelo padrão</Label>
                  <Input
                    value={draft.modelName}
                    onChange={(event) => updateDraft(provider.slug, "modelName", event.target.value)}
                    disabled={isBusy}
                  />
                </label>
              </div>

              <div className="mt-4 rounded-xl bg-muted/35 p-3 text-[11px] leading-5 text-muted-foreground">
                <div>origem: {sourceLabel(status?.source)}</div>
                {status?.keyHint && <div>identificação: {status.keyHint}</div>}
                {status?.baseUrl && <div className="truncate">endpoint: {status.baseUrl}</div>}
                {typeof status?.lastTestLatencyMs === "number" && (
                  <div>último teste: {status.lastTestLatencyMs} ms</div>
                )}
              </div>

              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <Button
                  size="sm"
                  onClick={() => void saveAndTest(provider.slug)}
                  disabled={isBusy || !draft.apiKey.trim()}
                >
                  {busy === `${provider.slug}:save` ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <PlugZap className="mr-1.5 size-3.5" />
                  )}
                  salvar e testar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void test(provider.slug)}
                  disabled={isBusy || !status?.configured}
                >
                  testar
                </Button>
                {status?.source === "workspace_vault" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => void remove(provider.slug)}
                    disabled={isBusy}
                    aria-label={`Remover credencial ${provider.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
