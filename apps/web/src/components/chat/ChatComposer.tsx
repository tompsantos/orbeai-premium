import { ArrowUp, Image as ImageIcon, Mic, Paperclip, Square, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Attachment, ChatMode, ModelKey } from "@/types";

const MODEL_LABELS: Record<ModelKey, string> = {
  auto: "Automático · orbeRouter",
  gpt: "GPT",
  claude: "Claude",
  gemini: "Gemini",
  qwen: "Qwen",
  groq: "Groq",
  local: "Local",
};

export function ChatComposer({
  input,
  onInputChange,
  onSend,
  onAttach,
  onVoice,
  pendingAttachment,
  onRemoveAttachment,
  streaming,
  stopping,
  onStop,
  mode,
  model,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onAttach: () => void;
  onVoice: () => void;
  pendingAttachment: Attachment | null;
  onRemoveAttachment: () => void;
  streaming: boolean;
  stopping: boolean;
  onStop: () => void;
  mode: ChatMode;
  model: ModelKey;
}) {
  return (
    <div className="bg-gradient-to-t from-white via-white/95 to-transparent px-3 pb-3 pt-3 sm:px-6 sm:pb-5">
      <div className="mx-auto w-full max-w-4xl">
        {pendingAttachment && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-1.5 text-xs shadow-sm">
            <Paperclip className="size-3 text-blue-600" />
            {pendingAttachment.name}
            <button
              type="button"
              onClick={onRemoveAttachment}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Remover anexo"
            >
              <X className="size-3" />
            </button>
          </div>
        )}

        <div className="rounded-[1.35rem] border border-border/80 bg-white p-2 shadow-[0_20px_65px_-38px_rgba(15,23,42,0.75)] transition focus-within:border-blue-300 focus-within:shadow-[0_20px_65px_-35px_rgba(37,99,235,0.38)]">
          <Textarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="Converse com a orbeAI…"
            disabled={streaming}
            className="min-h-[54px] max-h-44 resize-none border-0 bg-transparent px-3 py-3 text-[15px] placeholder:text-muted-foreground/65 focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          <div className="flex items-center gap-1.5 px-1 pb-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-xl text-muted-foreground hover:text-foreground"
              title="Anexar arquivo"
              onClick={onAttach}
            >
              <Paperclip className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-xl text-muted-foreground hover:text-foreground"
              title="Adicionar imagem"
              onClick={() => toast("Envio multimodal entra no próximo bloco de provider")}
            >
              <ImageIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-xl text-muted-foreground hover:bg-blue-50 hover:text-blue-700"
              title="Conversar por voz"
              onClick={onVoice}
            >
              <Mic className="size-4" />
            </Button>

            <div className="ml-1 hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
              <span>orbe {mode}</span>
              <span className="text-muted-foreground/35">·</span>
              <span>{MODEL_LABELS[model]}</span>
            </div>

            <div className="ml-auto">
              {streaming ? (
                <Button
                  size="icon"
                  variant="outline"
                  className="size-10 rounded-xl"
                  onClick={onStop}
                  disabled={stopping}
                  title="Parar"
                >
                  <Square className="size-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="size-10 rounded-xl bg-slate-950 text-white hover:bg-slate-800"
                  onClick={onSend}
                  disabled={!input.trim()}
                  title="Enviar"
                >
                  <ArrowUp className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center text-[10px] text-muted-foreground sm:text-[11px]">
          A orbeAI pode cometer erros. Revise informações importantes.
        </div>
      </div>
    </div>
  );
}
