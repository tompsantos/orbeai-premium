import { ArrowUp, Image as ImageIcon, Mic, Paperclip, Square, X } from "lucide-react";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/types";

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
}) {
  const canSend = input.trim().length > 0 && !streaming;

  return (
    <div className="shrink-0 border-t border-border/55 bg-white/92 px-3 py-3 backdrop-blur-xl sm:px-5">
      <div className="mx-auto w-full max-w-3xl">
        {pendingAttachment && (
          <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-1 text-xs shadow-sm">
            <Paperclip className="size-3 shrink-0 text-blue-600" />
            <span className="truncate">{pendingAttachment.name}</span>
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

        <div className="flex items-end gap-1.5 rounded-2xl border border-border/80 bg-white p-1.5 shadow-[0_12px_36px_-28px_rgba(15,23,42,0.8)] transition focus-within:border-blue-300 focus-within:shadow-[0_14px_40px_-28px_rgba(37,99,235,0.45)]">
          <div className="flex shrink-0 items-center gap-0.5 pb-0.5">
            <button
              type="button"
              onClick={onAttach}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Anexar arquivo"
              aria-label="Anexar arquivo"
            >
              <Paperclip className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => toast("Envio multimodal entra no próximo bloco de provider")}
              className="hidden size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground sm:flex"
              title="Adicionar imagem"
              aria-label="Adicionar imagem"
            >
              <ImageIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={onVoice}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-blue-50 hover:text-blue-700"
              title="Conversar por voz"
              aria-label="Conversar por voz"
            >
              <Mic className="size-4" />
            </button>
          </div>

          <Textarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSend) onSend();
              }
            }}
            placeholder="Converse com a orbeAI…"
            disabled={streaming}
            className="min-h-10 max-h-32 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-6 placeholder:text-muted-foreground/65 focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          {streaming ? (
            <button
              type="button"
              onClick={onStop}
              disabled={stopping}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted disabled:opacity-50"
              title="Parar"
              aria-label="Parar resposta"
            >
              <Square className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full transition",
                canSend
                  ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                  : "cursor-not-allowed bg-muted text-muted-foreground/55",
              )}
              title="Enviar"
              aria-label="Enviar mensagem"
            >
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>

        <div className="mt-1.5 text-center text-[10px] text-muted-foreground">
          Enter envia · Shift+Enter cria uma nova linha
        </div>
      </div>
    </div>
  );
}
