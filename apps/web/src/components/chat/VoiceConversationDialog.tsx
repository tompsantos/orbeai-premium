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
    () => Array.from({ length: 34 }, (_, index) => 20 + ((index * 17) % 54)),
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/70 p-3 backdrop-blur-xl sm:p-6">
      <div className="relative flex h-full max-h-[860px] w-full max-w-[760px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,#22315b_0%,#111827_42%,#090d18_100%)] text-white shadow-2xl">
        <div className="pointer-events-none absolute -left-32 -top-32 size-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-20 size-96 rounded-full bg-violet-500/20 blur-3xl" />

        <header className="relative flex items-center justify-between px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
              <Sparkles className="size-5 text-blue-300" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">Conversa por voz</div>
              <div className="truncate text-xs text-white/55">
                {conversationTitle || "Nova conversa com a orbeAI"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar conversa por voz"
          >
            <X className="size-5" />
          </button>
        </header>

        <main className="relative flex flex-1 flex-col items-center justify-center px-5 text-center sm:px-10">
          <div className="relative flex size-44 items-center justify-center sm:size-56">
            <div
              className={cn(
                "absolute inset-0 rounded-full bg-blue-500/20 blur-2xl transition duration-700",
                active && "scale-110 bg-violet-500/25",
              )}
            />
            <div
              className={cn(
                "absolute inset-5 rounded-full border border-white/10 bg-white/[0.04] transition duration-700",
                active && "animate-pulse border-blue-300/25",
              )}
            />
            <button
              type="button"
              onClick={toggleMute}
              className={cn(
                "relative flex size-28 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-blue-400 via-blue-600 to-violet-600 shadow-[0_0_80px_rgba(59,130,246,0.45)] transition duration-500 sm:size-36",
                muted && "from-slate-600 via-slate-700 to-slate-800 shadow-none",
              )}
              aria-label={muted ? "Retomar microfone" : "Pausar microfone"}
            >
              {muted ? <MicOff className="size-10" /> : <Mic className="size-11 sm:size-12" />}
            </button>
          </div>

          <div className="mt-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/70">
              <Radio className={cn("size-3.5", active && "text-emerald-300")} />
              {phase === "connecting" ? "Conectando" : "Sessão ao vivo"}
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.title}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/60 sm:text-base">
              {copy.description}
            </p>
          </div>

          <div className="mt-9 flex h-12 items-center justify-center gap-1.5" aria-hidden="true">
            {bars.map((height, index) => (
              <span
                key={index}
                className={cn(
                  "w-1 rounded-full bg-gradient-to-t from-blue-500 to-violet-300 transition-all duration-300",
                  active ? "opacity-90" : "opacity-25",
                )}
                style={{
                  height: `${active ? height : 18}%`,
                  animationDelay: `${index * 35}ms`,
                }}
              />
            ))}
          </div>

          {captionsEnabled && (
            <div className="mt-8 min-h-16 w-full max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/65">
              {transcript || "A transcrição em tempo real aparecerá aqui quando o serviço de voz for conectado."}
            </div>
          )}
        </main>

        <footer className="relative px-5 pb-6 pt-4 sm:px-8 sm:pb-8">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={toggleMute}
              className={cn(
                "flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white",
                muted && "bg-white text-slate-950 hover:bg-white/90",
              )}
              aria-label={muted ? "Ativar microfone" : "Silenciar microfone"}
            >
              {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>
            <button
              type="button"
              onClick={() => setCaptionsEnabled((current) => !current)}
              className={cn(
                "flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white",
                captionsEnabled && "bg-white text-slate-950 hover:bg-white/90",
              )}
              aria-label="Alternar transcrição"
            >
              <Headphones className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setPhase((current) => (current === "speaking" ? "listening" : "speaking"))}
              className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white"
              aria-label="Alternar saída de voz"
            >
              <Volume2 className="size-5" />
            </button>
            <button
              type="button"
              className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white"
              aria-label="Configurações de voz"
            >
              <Settings2 className="size-5" />
            </button>
            <button
              type="button"
              onClick={closeVoice}
              className="ml-2 flex size-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-400"
              aria-label="Encerrar conversa por voz"
            >
              <PhoneOff className="size-6" />
            </button>
          </div>
          <p className="mt-4 text-center text-[11px] text-white/35">
            Interface pronta para streaming de áudio, detecção de fala, transcrição e resposta em tempo real.
          </p>
        </footer>
      </div>
    </div>
  );
}
