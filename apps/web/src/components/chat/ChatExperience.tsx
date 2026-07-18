import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, PanelRight, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { OrbeMark } from "@/components/design-system/OrbeLogo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChatMode, ModelKey } from "@/types";

import { ChatBubble } from "./ChatBubble";
import { ChatComposer } from "./ChatComposer";
import { ChatContextPanel } from "./ChatContextPanel";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatHistoryPanel } from "./ChatHistoryPanel";
import { CompareModelsDialog } from "./CompareModelsDialog";
import { LiveRunPanel } from "./LiveRunPanel";
import { useChatExperience } from "./useChatExperience";
import { VoiceConversationDialog } from "./VoiceConversationDialog";

const MODES: ChatMode[] = [
  "padrão",
  "strategist",
  "dev",
  "research",
  "document",
  "creative",
  "ops",
  "mentor",
  "safe",
];

const PROVIDER_OPTIONS: Array<{ value: ModelKey; label: string }> = [
  { value: "auto", label: "automático" },
  { value: "gpt", label: "openai" },
  { value: "gemini", label: "gemini" },
  { value: "nvidia", label: "nvidia" },
];

function compactChatTitle(title: string, limit = 58): string {
  const clean = title.trim().replace(/\s+/g, " ");
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).trim()}…`;
}

export function ChatExperience() {
  const chat = useChatExperience();
  const [contextOpen, setContextOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <div className="relative grid h-[calc(100dvh-7.4rem)] min-h-[540px] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_24px_70px_-50px_rgba(15,23,42,0.65)] xl:grid-cols-[248px_minmax(0,1fr)]">
        <ChatHistoryPanel
          open={chat.historyOpen}
          chats={chat.filteredChats}
          activeChatId={chat.activeChatId}
          search={chat.search}
          onSearchChange={chat.setSearch}
          onSelect={(chatId) => {
            chat.setActiveChatId(chatId);
            chat.setHistoryOpen(false);
          }}
          onNew={() => void chat.newChat()}
          onDelete={(chatId) => void chat.deleteChat(chatId)}
          onClose={() => chat.setHistoryOpen(false)}
        />

        <section className="flex min-h-0 min-w-0 flex-col bg-[linear-gradient(180deg,rgba(248,250,252,0.62),rgba(255,255,255,0.98))]">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-card/90 px-3 backdrop-blur-xl sm:px-4">
            <button
              type="button"
              onClick={() => chat.setHistoryOpen(true)}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground xl:hidden"
              aria-label="Abrir histórico"
            >
              <Menu className="size-4" />
            </button>

            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
              <OrbeMark size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {chat.activeChat ? compactChatTitle(chat.activeChat.title) : "Nova conversa"}
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                <span>orbe {chat.mode}</span>
                <span className="text-muted-foreground/35">·</span>
                <span>{PROVIDER_OPTIONS.find((item) => item.value === chat.model)?.label ?? chat.model}</span>
                {chat.project && (
                  <>
                    <span className="text-muted-foreground/35">·</span>
                    <Link
                      to="/app/projects/$id"
                      params={{ id: chat.project.id }}
                      className="truncate hover:text-foreground"
                    >
                      {chat.project.name}
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <Select value={chat.model} onValueChange={(value) => chat.setModel(value as ModelKey)}>
                <SelectTrigger className="h-8 w-[112px] rounded-lg bg-background px-2 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={chat.mode} onValueChange={(value) => chat.setMode(value as ChatMode)}>
                <SelectTrigger className="h-8 w-[116px] rounded-lg bg-background px-2 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((item) => (
                    <SelectItem key={item} value={item}>
                      orbe {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              type="button"
              onClick={() => setContextOpen(true)}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground transition hover:text-foreground"
              aria-label="Abrir contexto da conversa"
              title="Contexto da conversa"
            >
              <PanelRight className="size-4" />
            </button>
          </header>

          {chat.memoryNotice && (
            <div className="shrink-0 border-b border-border/50 bg-blue-50/55 px-4 py-1.5">
              <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 text-[11px] text-blue-700">
                <Sparkles className="size-3" />
                <span className="font-medium">Memória atualizada</span>
                <span className="text-blue-300">·</span>
                <span className="truncate">
                  {chat.memoryNotice.replace("memória atualizada: ", "")}
                </span>
              </div>
            </div>
          )}

          <div ref={chat.scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
              {chat.messages.length === 0 ? (
                <ChatEmptyState onSuggestion={chat.setInput} />
              ) : (
                <div className="space-y-5 py-1">
                  {chat.messages.map((message) => (
                    <ChatBubble
                      key={message.id}
                      message={message}
                      onCopy={() => {
                        void navigator.clipboard.writeText(message.content);
                        toast.success("Copiado");
                      }}
                      onRegenerate={() => void chat.onRegenerate(message)}
                      onMemory={() => void chat.onMemory(message)}
                      onArtifact={() => void chat.onArtifact(message)}
                      onCompare={() => chat.onCompare(message)}
                      onPin={() => void chat.onPin(message)}
                      disabled={chat.streaming}
                    />
                  ))}

                  {chat.streaming && (
                    <LiveRunPanel
                      status={chat.liveStatus}
                      fallbackReason={chat.fallbackReason}
                      tools={chat.liveTools}
                      approval={chat.liveApproval}
                      stopping={chat.stopping}
                      onApproval={(choice) => void chat.answerApproval(choice)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          <ChatComposer
            input={chat.input}
            onInputChange={chat.setInput}
            onSend={() => void chat.send()}
            onAttach={chat.addAttachment}
            onVoice={() => chat.setVoiceOpen(true)}
            pendingAttachment={chat.pendingAttachment}
            onRemoveAttachment={() => chat.setPendingAttachment(null)}
            streaming={chat.streaming}
            stopping={chat.stopping}
            onStop={() => void chat.stopStreaming()}
          />
        </section>

        {contextOpen && (
          <>
            <button
              type="button"
              className="absolute inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px]"
              onClick={() => setContextOpen(false)}
              aria-label="Fechar contexto"
            />
            <aside className="absolute inset-y-0 right-0 z-50 flex w-full max-w-[380px] flex-col border-l border-border/70 bg-card shadow-2xl">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-4">
                <div>
                  <div className="text-sm font-semibold">Contexto da conversa</div>
                  <div className="text-[11px] text-muted-foreground">Memórias, projeto e roteamento</div>
                </div>
                <button
                  type="button"
                  onClick={() => setContextOpen(false)}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Fechar contexto"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <ChatContextPanel
                  chat={chat.activeChat}
                  decision={chat.lastDecision}
                  projectName={chat.project?.name}
                  projectId={chat.project?.id}
                  artifacts={chat.chatArtifacts}
                  memories={chat.chatMemories}
                  memoryScope={chat.project?.memoryMode ?? "global"}
                  layout="grid"
                />
              </div>
            </aside>
          </>
        )}
      </div>

      <CompareModelsDialog
        open={chat.compareOpen}
        onOpenChange={chat.setCompareOpen}
        prompt={chat.comparePrompt}
        models={["auto", "gpt", "gemini", "nvidia"]}
      />

      <VoiceConversationDialog
        open={chat.voiceOpen}
        onOpenChange={chat.setVoiceOpen}
        conversationTitle={chat.activeChat?.title}
        onTranscript={chat.setInput}
      />
    </div>
  );
}
