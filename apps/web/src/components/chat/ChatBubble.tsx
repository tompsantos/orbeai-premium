import { Paperclip } from "lucide-react";

import { OrbeMark } from "@/components/design-system/OrbeLogo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

import { MessageRenderer } from "./MessageRenderer";
import { MessageToolbar } from "./MessageToolbar";

export function ChatBubble({
  message,
  onCopy,
  onRegenerate,
  onMemory,
  onArtifact,
  onCompare,
  onPin,
  disabled,
}: {
  message: Message;
  onCopy: () => void;
  onRegenerate: () => void;
  onMemory: () => void;
  onArtifact: () => void;
  onCompare: () => void;
  onPin: () => void;
  disabled?: boolean;
}) {
  const isUser = message.role === "user";
  const isEmptyAssistant = !isUser && message.content.length === 0;

  return (
    <div className={cn("animate-orbe-fade flex items-start gap-2.5", isUser && "justify-end")}>
      {!isUser && (
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
          <OrbeMark size={18} className={cn(isEmptyAssistant && "animate-orbe-pulse")} />
        </div>
      )}

      <div className={cn("min-w-0 max-w-[88%] sm:max-w-[82%]", isUser && "order-2")}>
        {!isUser &&
          (message.providerName || message.modelName || message.model || message.mode) && (
            <div className="mb-1 flex flex-wrap items-center gap-1 text-[9px] font-medium uppercase tracking-[0.11em] text-muted-foreground">
              {message.providerName && <span>{message.providerName}</span>}
              {message.modelName && (
                <>
                  <span>·</span>
                  <span>{message.modelName}</span>
                </>
              )}
              {!message.modelName && message.model && (
                <>
                  <span>·</span>
                  <span>{message.model}</span>
                </>
              )}
              {message.mode && (
                <>
                  <span>·</span>
                  <span>orbe {message.mode}</span>
                </>
              )}
            </div>
          )}

        <div
          className={cn(
            "text-sm leading-6",
            isUser
              ? "whitespace-pre-wrap rounded-2xl rounded-tr-md bg-slate-950 px-4 py-2.5 text-white shadow-sm"
              : "rounded-2xl rounded-tl-md border border-border/70 bg-white px-4 py-3 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.5)]",
          )}
        >
          {isUser ? (
            message.content
          ) : isEmptyAssistant ? (
            <span className="inline-flex items-center gap-1.5 py-0.5">
              <span className="size-1.5 animate-orbe-pulse rounded-full bg-blue-500" />
              <span className="size-1.5 animate-orbe-pulse rounded-full bg-blue-500 [animation-delay:180ms]" />
              <span className="size-1.5 animate-orbe-pulse rounded-full bg-blue-500 [animation-delay:360ms]" />
            </span>
          ) : (
            <MessageRenderer content={message.content} />
          )}
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className={cn("mt-1.5 flex flex-wrap gap-1", isUser && "justify-end")}>
            {message.attachments.map((attachment) => (
              <span
                key={attachment.id}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-white px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                <Paperclip className="size-2.5" /> {attachment.name}
              </span>
            ))}
          </div>
        )}

        {!isUser && !isEmptyAssistant && (
          <MessageToolbar
            onCopy={onCopy}
            onRegenerate={onRegenerate}
            onMemory={onMemory}
            onArtifact={onArtifact}
            onCompare={onCompare}
            onPin={onPin}
            pinned={message.pinned}
            disabled={disabled}
          />
        )}
      </div>

      {isUser && (
        <Avatar className="mt-0.5 size-7 shrink-0">
          <AvatarFallback className="bg-blue-100 text-[9px] font-semibold text-blue-700">
            TO
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
