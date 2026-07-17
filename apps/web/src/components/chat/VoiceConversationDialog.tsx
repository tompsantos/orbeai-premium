import { useEffect, useMemo, useState } from "react";
import {
  Headphones,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Settings2,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type VoicePhase = "connecting" | "listening" | "thinking" | "speaking" | "paused";

export type VoiceConversationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationTitle?: string;
  onTranscript?: (text: string) => void;
};

const phaseCopy: Record<VoicePhase, { title: string; description: string }> = {
  connecting: {
    title: "Preparando a conversa",
    description: "Conectando voz, contexto e memória com segurança.",
  },
  listening: {
    title: "Estou ouvindo",
    description: "Fale naturalmente. Você pode interromper a qualquer momento.",
  },
  thinking: {
    title: "Pensando",
    description: "Organizando sua fala e preparando a resposta.",
  },
  speaking: {
    title: "Respondendo",
    description: "A orbeAI está falando com você.",
  },
  paused: {
    title: "Microfone pausado",
    description: "Retome quando estiver pronto.",
  },
};

export function VoiceConversationDialog({
  open,
  onOpenChange,
  conversationTitle,
  onTranscript,
}: VoiceConversationDialogProps) {
  const [phase, setPhase] = useState<VoicePhase>("connecting");
  const [muted, setMuted] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    if (!open) return;

    setPhase("connecting");
    setMuted(false);
    setTranscript("");
    const timer = window.setTimeout(() => setPhase("listening"), 650);
    return () => window.clearTimeout(timer);
  }, [open]);

  const copy = phaseCopy[phase];
  const active = phase === "listening" || phase === "speaking" || phase === "thinking";
  const bars = useMemo(
    () => Array.from({ length: 24 }, (_, index) => 18 + ((index * 17) % 48)),
    [],
  );

  if (!open) return null;

  function closeVoice() {
    if (transcript.trim()) onTranscript?.(transcript.trim());
    onOpenChange(false);
  }

  function toggleMute() {
    setMuted((current) => {
      const next = !current;
      setPhase(next ? "paused" : "listening");
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-lg">
      <div className="relative flex h-[min(680px,calc(100dvh-2rem))] w-full max-w-[600px] flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-[radial-gradient(circle_at_top,#22315b_0%,#111827_43%,#090d18_100%)] text-white shadow-2xl">
        <div className="pointer-events-none absolute -left-24 -top-24 size-64 rounded-full bg-blue-500/18 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 size-72 rounded-full bg-violet-500/18 blur-3xl" />

        <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-white/5 px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10">
              <Sparkles className="size-4 text-blue-300" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">Conversa por voz</div>
              <div className="truncate text-[11px] text-white/50">
                {conversationTitle || "Nova conversa com a orbeAI"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/65 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar conversa por voz"
          >
            <X className="size-4" />
          </button>
        </header>

        <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="relative flex size-40 items-center justify-center">
            <div
              className={cn(
                "absolute inset-0 rounded-full bg-blue-500/18 blur-2xl transition duration-700",
                active && "scale-110 bg-violet-500/24",
              )}
            />
            <div
              className={cn(
                "absolute inset-4 rounded-full border border-white/10 bg-white/[0.04] transition duration-700",
                active && "animate-pulse border-blue-300/25",
              )}
            />
            <div
              className={cn(
                "relative flex size-24 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-blue-400 via-blue-600 to-violet-600 shadow-[0_0_65px_rgba(59,130,246,0.38)] transition duration-500",
                muted && "from-slate-600 via-slate-700 to-slate-800 shadow-none",
              )}
            >
              {muted ? <MicOff className="size-8" /> : <Mic className="size-9" />}
            </div>
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] text-white/65">
            <Radio className={cn("size-3", active && "text-emerald-300")} />
            {phase === "connecting" ? "Conectando" : "Sessão ao vivo"}
          </div>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight">{copy.title}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-white/55">{copy.description}</p>

          <div className="mt-5 flex h-8 items-center justify-center gap-1" aria-hidden="true">
            {bars.map((height, index) => (
              <span
                key={index}
                className={cn(
                  "w-0.5 rounded-full bg-gradient-to-t from-blue-500 to-violet-300 transition-all duration-300",
                  active ? "opacity-90" : "opacity-25",
                )}
                style={{ height: `${active ? height : 16}%`, animationDelay: `${index * 35}ms` }}
              />
            ))}
          </div>

          {captionsEnabled && (
            <div className="mt-5 min-h-12 w-full max-w-md rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-5 text-white/55">
              {transcript || "A transcrição aparecerá aqui quando o serviço de voz for conectado."}
            </div>
          )}
        </main>

        <footer className="relative shrink-0 border-t border-white/5 px-5 py-4">
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={toggleMute}
              className={cn(
                "flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white",
                muted && "bg-white text-slate-950 hover:bg-white/90",
              )}
              aria-label={muted ? "Ativar microfone" : "Silenciar microfone"}
            >
              {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => setCaptionsEnabled((current) => !current)}
              className={cn(
                "flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white",
                captionsEnabled && "bg-white text-slate-950 hover:bg-white/90",
              )}
              aria-label="Alternar transcrição"
            >
              <Headphones className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setPhase((current) => (current === "speaking" ? "listening" : "speaking"))}
              className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white"
              aria-label="Alternar saída de voz"
            >
              <Volume2 className="size-4" />
            </button>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white"
              aria-label="Configurações de voz"
            >
              <Settings2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={closeVoice}
              className="ml-1 flex size-11 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-400"
              aria-label="Encerrar conversa por voz"
            >
              <PhoneOff className="size-5" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
