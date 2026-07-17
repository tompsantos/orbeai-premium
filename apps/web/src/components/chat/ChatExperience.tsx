import { Link } from "@tanstack/react-router";
import { AudioLines, ChevronRight, Menu, Mic, MoreHorizontal, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { OrbeMark } from "@/components/design-system/OrbeLogo";
import { Pill } from "@/components/design-system/Primitives";
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

const MODELS: { key: ModelKey; label: string }[] = [
  { key: "auto", label: "Automático · orbeRouter" },
  { key: "gpt", label: "GPT" },
  { key: "claude", label: "Claude" },
  { key: "gemini", label: "Gemini" },
  { key: "qwen", label: "Qwen" },
  { key: "groq", label: "Groq" },
  { key: "local", label: "Local" },
];

function compactChatTitle(title: string, limit = 70): string {
  const clean = title.trim().replace(/\s+/g, " ");
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).trim()}…`;
}

export function ChatExperience() {
  const chat = useChatExperience();

  return (
    <div className="mx-auto w-full max-w-[1480px] pb-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Chat</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Converse, crie, pesquise ou simplesmente pense em voz alta.
          </p>
        </div>
        <button
          type="button"
          onClick={() => chat.setVoiceOpen(true)}
          className="hidden items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/70 px-4 py-2 text-sm font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100/70 sm:inline-flex"
        >
          <AudioLines className="size-4" />
          Conversar por voz
        </button>
      </div>

      <div className="relative grid min-h-[680px] overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-[0_28px_80px_-55px_rgba(15,23,42,0.65)] md:h-[calc(100vh-10rem)] xl:grid-cols-[290px_minmax(0,1fr)]">
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

        <section className="flex min-h-0 min-w-0 flex-col bg-[linear-gradient(180deg,rgba(248,250,252,0.72),rgba(255,255,255,0.96))]">
          <header className="flex min-h-16 items-center gap-3 border-b border-border/60 bg-card/75 px-3 py-3 backdrop-blur-xl sm:px-5">
            <button
              type="button"
              onClick={() => chat.setHistoryOpen(true)}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background text-muted-foreground xl:hidden"
              aria-label="Abrir histórico"
            >
              <Menu className="size-4" />
            </button>

            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 shadow-sm">
              <OrbeMark size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold sm:text-base">
                {chat.activeChat ? compactChatTitle(chat.activeChat.title) : "Nova conversa"}
              </div>
              <div className="mt-1 flex items-center gap-1.5 overflow-hidden">
                <Pill tone="blue">orbe {chat.mode}</Pill>
                {chat.streaming && <Pill tone="muted">Ao vivo</Pill>}
                {chat.project && (
                  <Link to="/app/projects/$id" params={{ id: chat.project.id }}>
                    <Pill tone="muted">{chat.project.name}</Pill>
                  </Link>
                )}
              </div>
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <Select value={chat.mode} onValueChange={(value) => chat.setMode(value as ChatMode)}>
                <SelectTrigger className="h-9 w-[138px] rounded-xl bg-background text-xs">
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
              <Select value={chat.model} onValueChange={(value) => chat.setModel(value as ModelKey)}>
                <SelectTrigger className="h-9 w-[172px] rounded-xl bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((item) => (
                    <SelectItem key={item.key} value={item.key}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              type="button"
              onClick={() => chat.setVoiceOpen(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm transition hover:bg-slate-800 sm:w-auto sm:gap-2 sm:px-4"
              title="Conversar por voz"
            >
              <Mic className="size-4" />
              <span className="hidden text-sm font-medium sm:inline">Voz</span>
            </button>

            <button
              type="button"
              className="hidden size-9 items-center justify-center rounded-xl border border-border/70 bg-background text-muted-foreground transition hover:text-foreground sm:flex"
              aria-label="Mais opções"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </header>

          {chat.memoryNotice && (
            <div className="border-b border-border/50 bg-blue-50/55 px-4 py-2">
              <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 text-xs text-blue-700">
                <Sparkles className="size-3.5" />
                <span className="font-medium">Memória atualizada</span>
                <span className="text-blue-300">·</span>
                <span className="truncate">
                  {chat.memoryNotice.replace("memória atualizada: ", "")}
                </span>
              </div>
            </div>
          )}

          <div ref={chat.scrollRef} className="flex-1 overflow-y-auto px-3 py-5 sm:px-6 sm:py-7">
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col">
              {chat.messages.length === 0 ? (
                <ChatEmptyState
                  onSuggestion={chat.setInput}
                  onVoice={() => chat.setVoiceOpen(true)}
                />
              ) : (
                <div className="space-y-8 py-2">
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
            mode={chat.mode}
            model={chat.model}
          />
        </section>
      </div>

      <details className="mt-4 rounded-2xl border border-border/70 bg-card">
        <summary className="cursor-pointer list-none px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Contexto da conversa</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Memórias, biblioteca, projeto e decisão do orbeRouter.
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </summary>
        <div className="border-t border-border/60 p-4 sm:p-5">
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
      </details>

      <CompareModelsDialog
        open={chat.compareOpen}
        onOpenChange={chat.setCompareOpen}
        prompt={chat.comparePrompt}
        models={["auto", "claude", "gpt", "gemini"]}
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
