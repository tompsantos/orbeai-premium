import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Image as ImageIcon,
  MessageSquare,
  Mic,
  Paperclip,
  Pin,
  Search,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { ChatContextPanel } from "@/components/chat/ChatContextPanel";
import { CompareModelsDialog } from "@/components/chat/CompareModelsDialog";
import {
  LiveRunPanel,
  type LiveApprovalState,
  type LiveToolState,
} from "@/components/chat/LiveRunPanel";
import { MessageRenderer } from "@/components/chat/MessageRenderer";
import { MessageToolbar } from "@/components/chat/MessageToolbar";
import { OrbeMark } from "@/components/design-system/OrbeLogo";
import { Pill } from "@/components/design-system/Primitives";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { artifactService, chatService, memoryService, projectService } from "@/lib/api";
import {
  liveChatService,
  type LiveApprovalChoice,
  type LiveChatEvent,
  type LiveChatResult,
} from "@/lib/api/services/liveChatService";
import type { RouterDecision } from "@/lib/ai/router";
import { cn } from "@/lib/utils";
import type {
  Artifact,
  Attachment,
  Chat,
  ChatMode,
  MemoryItem,
  Message,
  ModelKey,
  Project,
} from "@/types";

export const Route = createFileRoute("/app/chat")({
  head: () => ({ meta: [{ title: "Chat · orbeAI" }] }),
  component: ChatPage,
});

const SUGGESTIONS: { icon: typeof Sparkles; title: string; prompt: string }[] = [
  {
    icon: Sparkles,
    title: "Resumir estratégia",
    prompt: "Resuma a estratégia do projeto em 5 pontos acionáveis.",
  },
  {
    icon: Search,
    title: "Investigar tema",
    prompt: "Faça uma pesquisa profunda sobre tendências de IA aplicada.",
  },
  {
    icon: Pin,
    title: "Plano de execução",
    prompt: "Crie um plano de execução com marcos e responsáveis.",
  },
  {
    icon: MessageSquare,
    title: "Rascunhar documento",
    prompt: "Rascunhe um documento executivo a partir do contexto atual.",
  },
];

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
  { key: "auto", label: "automático (orbeRouter)" },
  { key: "gpt", label: "GPT" },
  { key: "claude", label: "Claude" },
  { key: "gemini", label: "Gemini" },
  { key: "qwen", label: "Qwen" },
  { key: "groq", label: "Groq" },
  { key: "local", label: "Local" },
];

function compactChatTitle(title: string, limit = 42): string {
  const clean = title.trim().replace(/\s+/g, " ");
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).trim()}…`;
}

function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [mode, setMode] = useState<ChatMode>("strategist");
  const [model, setModel] = useState<ModelKey>("auto");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [liveTools, setLiveTools] = useState<LiveToolState[]>([]);
  const [liveApproval, setLiveApproval] = useState<LiveApprovalState | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [lastDecision, setLastDecision] = useState<RouterDecision | null>(null);
  const [memoryNotice, setMemoryNotice] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparePrompt, setComparePrompt] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void Promise.all([
      chatService.list(),
      projectService.list(),
      artifactService.list(),
      memoryService.list(),
    ]).then(([chatList, projectList, artifactList, memoryList]) => {
      setChats(chatList);
      setProjects(projectList);
      setArtifacts(artifactList);
      setMemories(memoryList);
      if (chatList.length) setActiveChatId(chatList[0].id);
    });
  }, []);

  useEffect(() => {
    if (!activeChatId) return;
    void chatService.messages(activeChatId).then(setMessages);
    const chat = chats.find((item) => item.id === activeChatId);
    if (chat) {
      setMode(chat.mode);
      setModel(chat.model);
    }
  }, [activeChatId, chats]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streaming, liveStatus, liveTools, liveApproval]);

  const activeChat = chats.find((item) => item.id === activeChatId) ?? null;
  const project = projects.find((item) => item.id === activeChat?.projectId);
  const chatArtifacts = artifacts.filter((item) => item.projectId === activeChat?.projectId);
  const chatMemories = memories.filter(
    (item) => item.projectId === activeChat?.projectId || item.scope === "global",
  );

  async function newChat() {
    const chat = await chatService.create({ title: "Nova conversa", mode, model });
    setChats(await chatService.list());
    setActiveChatId(chat.id);
    setMessages([]);
    setLastDecision(null);
    setMemoryNotice(null);
  }

  async function deleteChat(chatId: string) {
    const ok = window.confirm("Apagar esta conversa? Esta ação não pode ser desfeita.");
    if (!ok) return;

    try {
      await chatService.remove(chatId);
      const nextChats = await chatService.list();
      setChats(nextChats);

      if (activeChatId === chatId) {
        const nextActive = nextChats[0]?.id ?? "";
        setActiveChatId(nextActive);
        setMessages(nextActive ? await chatService.messages(nextActive) : []);
        setLastDecision(null);
      }
      toast.success("Conversa apagada");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível apagar a conversa.";
      toast.error("Erro ao apagar conversa", { description: message });
    }
  }

  function addAttachment() {
    const attachment: Attachment = {
      id: `att_${Date.now()}`,
      name: "exemplo-anexo.pdf",
      kind: "doc",
      sizeKb: 184,
    };
    setPendingAttachment(attachment);
    toast.success("Anexo mock adicionado");
  }

  function updateStreamingMessage(messageId: string, updater: (message: Message) => Message) {
    setMessages((current) =>
      current.map((message) => (message.id === messageId ? updater(message) : message)),
    );
  }

  function registerToolStart(event: LiveChatEvent) {
    const name = event.toolName || "ferramenta";
    setLiveTools((current) => [
      ...current,
      {
        id: `${name}_${Date.now()}_${current.length}`,
        name,
        preview: event.preview,
        status: "running",
      },
    ]);
  }

  function registerToolComplete(event: LiveChatEvent) {
    const name = event.toolName || "ferramenta";
    setLiveTools((current) => {
      const index = [...current]
        .map((tool, position) => ({ tool, position }))
        .reverse()
        .find(({ tool }) => tool.name === name && tool.status === "running")?.position;

      if (index === undefined) {
        return [
          ...current,
          {
            id: `${name}_${Date.now()}_${current.length}`,
            name,
            status: "completed",
            ok: event.ok,
            durationSeconds: event.durationSeconds,
          },
        ];
      }

      return current.map((tool, position) =>
        position === index
          ? {
              ...tool,
              status: "completed",
              ok: event.ok,
              durationSeconds: event.durationSeconds,
            }
          : tool,
      );
    });
  }

  function showMemoryNotice(result: LiveChatResult) {
    if (result.memoryEvents.length === 0) return;
    const firstMemory = result.memoryEvents[0];
    setMemoryNotice(`memória atualizada: ${firstMemory.label}`);
    window.setTimeout(() => setMemoryNotice(null), 5500);
  }

  async function applyLiveResult(chatId: string, messageId: string, result: LiveChatResult) {
    setLastDecision(result.decision);
    showMemoryNotice(result);

    const assistantMessage: Message = result.assistantMessage ?? {
      id: messageId,
      chatId,
      role: "assistant",
      content: result.response.content,
      createdAt: new Date().toISOString(),
      model,
      mode,
      provider: result.response.provider,
      providerName: result.response.provider,
      modelName: result.response.model,
    };

    updateStreamingMessage(messageId, () => assistantMessage);
    await chatService.appendMessage(chatId, assistantMessage);

    const syncedMessages = await chatService.messages(chatId);
    setMessages(syncedMessages);
    setChats(await chatService.list());
  }

  async function runSend(text: string) {
    const chatId = activeChatId;
    if (!chatId || streaming) return;

    const streamingMessageId = `live_asst_${Date.now()}`;
    const controller = new AbortController();
    abortRef.current = controller;

    setStreaming(true);
    setStopping(false);
    setActiveRunId(null);
    setLiveStatus("organizando contexto e memória…");
    setLiveTools([]);
    setLiveApproval(null);
    setFallbackReason(null);
    setMessages((current) => [
      ...current,
      {
        id: streamingMessageId,
        chatId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        model,
        mode,
        provider: "local",
        providerName: "orbe-cognition",
        modelName: "seleção automática",
      },
    ]);

    try {
      await liveChatService.send(
        chatId,
        text,
        { mode, model },
        async (event) => {
          switch (event.type) {
            case "run.started":
              setActiveRunId(event.requestId ?? null);
              setLiveStatus(
                event.runtime === "orbe-cognition"
                  ? "orbe cognition iniciou o turno…"
                  : "orbeAI iniciou o turno…",
              );
              break;
            case "run.status":
              if (event.message) setLiveStatus(event.message);
              break;
            case "response.commentary":
              if (event.content) setLiveStatus(event.content);
              break;
            case "response.delta":
              if (event.delta) {
                updateStreamingMessage(streamingMessageId, (message) => ({
                  ...message,
                  content: message.content + event.delta,
                }));
                setLiveStatus("respondendo ao vivo…");
              }
              break;
            case "tool.started":
              registerToolStart(event);
              setLiveStatus(`usando ${event.toolName || "uma ferramenta"}…`);
              break;
            case "tool.completed":
              registerToolComplete(event);
              setLiveStatus(
                event.ok === false
                  ? `${event.toolName || "ferramenta"} encontrou um obstáculo…`
                  : `${event.toolName || "ferramenta"} concluída…`,
              );
              break;
            case "fallback.started":
              setFallbackReason(event.reason || "contingência segura ativada");
              setLiveStatus("mudando para a rota de contingência…");
              break;
            case "approval.required":
              setLiveApproval({
                title: event.title || "aprovação necessária",
                description: event.description,
                choices: event.choices?.length ? event.choices : ["once", "deny"],
              });
              setLiveStatus("aguardando sua aprovação…");
              break;
            case "response.completed":
              if (event.result) {
                await applyLiveResult(chatId, streamingMessageId, event.result);
              }
              setLiveStatus("resposta concluída");
              break;
            case "response.stopped":
              if (event.result) {
                await applyLiveResult(chatId, streamingMessageId, event.result);
              } else if (!event.partialResponse) {
                setMessages((current) =>
                  current.filter((message) => message.id !== streamingMessageId),
                );
              }
              setLiveStatus("execução interrompida");
              break;
            case "response.failed":
              if (event.result) {
                await applyLiveResult(chatId, streamingMessageId, event.result);
              }
              toast.error("A resposta encontrou um problema", {
                description: event.error || "A orbeAI encerrou o turno com segurança.",
              });
              break;
          }
        },
        controller.signal,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tente novamente.";
      setMessages((current) =>
        current.filter(
          (item) => item.id !== streamingMessageId || item.content.trim().length > 0,
        ),
      );
      toast.error("Chat ao vivo indisponível", { description: message });
    } finally {
      abortRef.current = null;
      setStreaming(false);
      setStopping(false);
      setActiveRunId(null);
      setLiveApproval(null);
      setLiveStatus(null);
      setLiveTools([]);
      setFallbackReason(null);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming || !activeChatId) return;

    const userMessage: Message = {
      id: `u_${Date.now()}`,
      chatId: activeChatId,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
      attachments: pendingAttachment ? [pendingAttachment] : undefined,
    };
    setMessages((current) => [...current, userMessage]);
    await chatService.appendMessage(activeChatId, userMessage);
    setInput("");
    setPendingAttachment(null);
    await runSend(text);
  }

  async function stopStreaming() {
    if (!streaming) return;
    setStopping(true);
    setLiveStatus("interrompendo com segurança…");

    try {
      if (activeRunId?.startsWith("mock_live_")) {
        abortRef.current?.abort();
        return;
      }
      if (activeRunId) {
        await liveChatService.stop(activeRunId);
      } else {
        abortRef.current?.abort();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível parar o turno.";
      toast.error("Falha ao interromper", { description: message });
      setStopping(false);
    }
  }

  async function answerApproval(choice: LiveApprovalChoice) {
    if (!activeRunId) return;
    try {
      await liveChatService.approve(activeRunId, choice);
      setLiveApproval(null);
      setLiveStatus(choice === "deny" ? "ação negada, recalculando rota…" : "ação aprovada…");
    } catch (error) {
      const message = error instanceof Error ? error.message : "A aprovação não foi aplicada.";
      toast.error("Falha na aprovação", { description: message });
    }
  }

  async function onRegenerate(message: Message) {
    if (streaming) return;
    const index = messages.findIndex((item) => item.id === message.id);
    const previousUser = [...messages]
      .slice(0, index)
      .reverse()
      .find((item) => item.role === "user");
    if (!previousUser) {
      toast.error("Sem prompt anterior para regenerar");
      return;
    }
    await runSend(previousUser.content);
    toast.success("Resposta regenerada");
  }

  async function onMemory(message: Message) {
    await memoryService.create({
      label:
        message.content.slice(0, 60).replace(/\n/g, " ").trim() +
        (message.content.length > 60 ? "…" : ""),
      content: message.content,
      scope: project ? "projeto" : "global",
      source: "chat",
      status: "pendente",
      projectId: project?.id,
      reason: "Salvo a partir de resposta do chat",
    });
    setMemories(await memoryService.list());
    toast.success("Memória pendente criada", { description: "Revise em /app/memory" });
  }

  async function onArtifact(message: Message) {
    const artifact = await artifactService.create({
      title: message.content.split("\n").find((line) => line.trim().length) ?? "Artifact do chat",
      kind: "documento",
      content: message.content,
      projectId: project?.id,
    });
    setArtifacts(await artifactService.list());
    toast.success("Artifact criado", { description: artifact.title });
  }

  function onCompare(message: Message) {
    const index = messages.findIndex((item) => item.id === message.id);
    const previousUser = [...messages]
      .slice(0, index)
      .reverse()
      .find((item) => item.role === "user");
    setComparePrompt(previousUser?.content ?? message.content);
    setCompareOpen(true);
  }

  async function onPin(message: Message) {
    await chatService.togglePin(activeChatId, message.id);
    setMessages(await chatService.messages(activeChatId));
  }

  const filteredChats = chats.filter(
    (chat) => !search || chat.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="grid min-h-[620px] grid-cols-1 gap-3 md:h-[calc(100vh-8rem)] md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="orbe-card hidden min-h-0 flex-col p-3 md:flex">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <div className="text-sm font-semibold leading-tight">Conversas</div>
              <div className="text-[11px] text-muted-foreground">{chats.length} no workspace</div>
            </div>
            <Button size="sm" onClick={newChat} className="h-8">
              <Sparkles className="mr-1 size-3.5" /> Nova
            </Button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar conversas…"
              className="w-full rounded-lg border border-transparent bg-muted/50 py-2 pl-8 pr-3 text-sm outline-none transition-colors focus:border-[color-mix(in_oklch,var(--orbe-blue)_30%,transparent)] focus:bg-card"
            />
          </div>
          <ScrollArea className="-mx-1 flex-1 px-1">
            <ul className="space-y-1">
              {filteredChats.map((chat) => {
                const active = activeChatId === chat.id;
                return (
                  <li key={chat.id} className="relative min-w-0">
                    <button
                      onClick={() => setActiveChatId(chat.id)}
                      title={chat.title}
                      className={cn(
                        "w-full min-w-0 overflow-hidden rounded-lg border px-2.5 py-2 pr-11 text-left transition-colors",
                        active
                          ? "orbe-active"
                          : "border-transparent hover:bg-[var(--sidebar-accent)]",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {chat.pinned ? (
                          <Pin className="size-3 shrink-0 fill-[var(--orbe-blue)] text-[var(--orbe-blue)]" />
                        ) : (
                          <MessageSquare
                            className={cn(
                              "size-3 shrink-0",
                              active ? "text-[var(--orbe-blue)]" : "text-muted-foreground",
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            "block min-w-0 max-w-[178px] truncate text-sm",
                            active && "font-medium",
                          )}
                        >
                          {compactChatTitle(chat.title)}
                        </span>
                      </div>
                      <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden pl-5 text-[11px] text-muted-foreground">
                        <span className="min-w-0 truncate">orbe {chat.mode}</span>
                        <span className="shrink-0 text-muted-foreground/40">·</span>
                        <span className="shrink-0">
                          {formatDistanceToNow(new Date(chat.updatedAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void deleteChat(chat.id);
                      }}
                      className="absolute right-1 top-1 h-8 w-8 rounded-lg border border-border/60 bg-card/80 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Apagar conversa"
                      aria-label="Apagar conversa"
                    >
                      <Trash2 className="mx-auto size-3.5" />
                    </button>
                  </li>
                );
              })}
              {filteredChats.length === 0 && (
                <li className="px-3 py-8 text-center text-xs text-muted-foreground">
                  Nenhuma conversa encontrada.
                </li>
              )}
            </ul>
          </ScrollArea>
        </aside>

        <section className="orbe-card flex min-h-0 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b bg-card/40 px-4 py-3">
            <div className="orbe-glass flex size-9 shrink-0 items-center justify-center rounded-xl">
              <OrbeMark size={20} />
            </div>
            <div className="min-w-0">
              <div className="max-w-[200px] truncate text-sm font-semibold md:max-w-[360px]">
                {activeChat ? compactChatTitle(activeChat.title, 64) : "Selecione uma conversa"}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Pill tone="blue">orbe {mode}</Pill>
                {streaming && <Pill tone="muted">ao vivo</Pill>}
                {project && (
                  <Link to="/app/projects/$id" params={{ id: project.id }}>
                    <Pill tone="muted">{project.name}</Pill>
                  </Link>
                )}
              </div>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Select value={mode} onValueChange={(value) => setMode(value as ChatMode)}>
                <SelectTrigger className="h-8 w-[140px] bg-card text-xs">
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
              <Select value={model} onValueChange={(value) => setModel(value as ModelKey)}>
                <SelectTrigger className="h-8 w-[170px] bg-card text-xs">
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
          </div>

          {memoryNotice && (
            <div className="border-b bg-card/30 px-4 py-2">
              <div className="mx-auto max-w-3xl rounded-full border border-[color-mix(in_oklch,var(--orbe-blue)_25%,var(--border))] bg-[color-mix(in_oklch,var(--orbe-blue)_7%,var(--card))] px-3 py-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">memória atualizada</span>
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                <span>{memoryNotice.replace("memória atualizada: ", "")}</span>
              </div>
            </div>
          )}

          <div
            ref={scrollRef}
            className="flex-1 space-y-6 overflow-y-auto px-4 py-6 md:px-10 md:py-8"
          >
            {messages.length === 0 && (
              <div className="animate-orbe-fade flex h-full flex-col items-center justify-center py-12 text-center">
                <div className="orbe-glass flex size-16 items-center justify-center rounded-2xl">
                  <OrbeMark size={36} />
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">
                  Como posso ajudar hoje?
                </h3>
                <p className="mt-2 max-w-md text-pretty text-sm text-muted-foreground">
                  A orbeAI usa o modo{" "}
                  <span className="font-medium text-foreground">orbe {mode}</span> e trabalha
                  com contexto, ferramentas e fallback seguro.
                </p>
                <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion.title}
                      onClick={() => setInput(suggestion.prompt)}
                      className="orbe-card orbe-card-hover flex items-start gap-2.5 p-3 text-left"
                    >
                      <suggestion.icon className="mt-0.5 size-4 shrink-0 text-[var(--orbe-blue)]" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{suggestion.title}</div>
                        <div className="line-clamp-1 text-xs text-muted-foreground">
                          {suggestion.prompt}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <Bubble
                key={message.id}
                message={message}
                onCopy={() => {
                  void navigator.clipboard.writeText(message.content);
                  toast.success("Copiado");
                }}
                onRegenerate={() => onRegenerate(message)}
                onMemory={() => onMemory(message)}
                onArtifact={() => onArtifact(message)}
                onCompare={() => onCompare(message)}
                onPin={() => onPin(message)}
                disabled={streaming}
              />
            ))}

            {streaming && (
              <LiveRunPanel
                status={liveStatus}
                fallbackReason={fallbackReason}
                tools={liveTools}
                approval={liveApproval}
                stopping={stopping}
                onApproval={(choice) => void answerApproval(choice)}
              />
            )}
          </div>

          <div className="border-t bg-card/40 p-3 md:p-4">
            {pendingAttachment && (
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/60 py-1.5 pl-3 pr-2 text-xs">
                <Paperclip className="size-3 text-[var(--orbe-blue)]" />
                {pendingAttachment.name}
                <button
                  onClick={() => setPendingAttachment(null)}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Remover anexo"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
            <div className="orbe-glass flex items-end gap-1.5 rounded-2xl p-2 transition-shadow focus-within:border-[color-mix(in_oklch,var(--orbe-blue)_40%,transparent)] focus-within:shadow-[var(--glow-orbe)]">
              <div className="flex items-center gap-0.5 pb-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  title="Anexar"
                  onClick={addAttachment}
                >
                  <Paperclip className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  title="Imagem"
                  onClick={() => toast("Multimodal entra no próximo bloco de provider")}
                >
                  <ImageIcon className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  title="Voz"
                  onClick={() => toast("Voz entra no próximo bloco de provider")}
                >
                  <Mic className="size-4" />
                </Button>
              </div>
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder="Converse com a orbeAI…"
                disabled={!activeChatId || streaming}
                className="min-h-[44px] max-h-40 flex-1 resize-none border-0 bg-transparent px-1 py-2.5 placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {streaming ? (
                <Button
                  size="icon"
                  variant="outline"
                  className="size-9 shrink-0"
                  onClick={() => void stopStreaming()}
                  disabled={stopping}
                  title="Parar"
                >
                  <Square className="size-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="size-9 shrink-0 rounded-xl"
                  onClick={() => void send()}
                  disabled={!input.trim() || !activeChatId}
                  title="Enviar"
                >
                  <ArrowUp className="size-4" />
                </Button>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1.5 px-2 text-[11px] text-muted-foreground">
              <kbd className="rounded border border-border/70 bg-muted/60 px-1 py-0.5 text-[10px] font-medium">
                Enter
              </kbd>{" "}
              envia
              <span className="text-muted-foreground/40">·</span>
              <kbd className="rounded border border-border/70 bg-muted/60 px-1 py-0.5 text-[10px] font-medium">
                Shift+Enter
              </kbd>{" "}
              nova linha
              <span className="hidden text-muted-foreground/40 sm:inline">·</span>
              <span className="hidden sm:inline">
                streaming real, ferramentas, aprovação e fallback seguro
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-4 pb-4">
        <div className="orbe-hairline" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="orbe-eyebrow">contexto da conversa</div>
            <div className="mt-1.5 max-w-2xl text-pretty text-sm text-muted-foreground">
              Decisão do router, memórias, artifacts e ações relacionadas, sem apertar o chat.
            </div>
          </div>
        </div>
        <ChatContextPanel
          chat={activeChat}
          decision={lastDecision}
          projectName={project?.name}
          projectId={project?.id}
          artifacts={chatArtifacts}
          memories={chatMemories}
          memoryScope={project?.memoryMode ?? "global"}
          layout="grid"
        />
      </section>

      <CompareModelsDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        prompt={comparePrompt}
        models={["auto", "claude", "gpt", "gemini"]}
      />
    </div>
  );
}

function Bubble({
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
    <div
      className={cn(
        "animate-orbe-fade flex items-start gap-3",
        isUser && "justify-end",
      )}
    >
      {!isUser && (
        <OrbeMark size={28} className={cn("mt-1", isEmptyAssistant && "animate-orbe-pulse")} />
      )}
      <div className={cn("max-w-[78%]", isUser && "order-2")}>
        {!isUser &&
          (message.providerName || message.modelName || message.model || message.mode) && (
            <div className="mb-1.5 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
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
              {(message.inputTokens || message.outputTokens) && (
                <>
                  <span>·</span>
                  <span>
                    {message.inputTokens ?? 0}+{message.outputTokens ?? 0} tokens
                  </span>
                </>
              )}
            </div>
          )}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-[var(--orbe-blue)] text-white shadow-[var(--shadow-soft)] whitespace-pre-wrap"
              : "rounded-tl-sm border border-border/70 bg-card shadow-[var(--shadow-xs)]",
          )}
        >
          {isUser ? (
            message.content
          ) : isEmptyAssistant ? (
            <span className="inline-flex items-center gap-1 py-1">
              <span className="size-1.5 animate-orbe-pulse rounded-full bg-[var(--orbe-blue)]" />
              <span className="size-1.5 animate-orbe-pulse rounded-full bg-[var(--orbe-blue)] [animation-delay:180ms]" />
              <span className="size-1.5 animate-orbe-pulse rounded-full bg-[var(--orbe-blue)] [animation-delay:360ms]" />
            </span>
          ) : (
            <MessageRenderer content={message.content} />
          )}
        </div>
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.attachments.map((attachment) => (
              <span
                key={attachment.id}
                className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[11px]"
              >
                <Paperclip className="size-3" /> {attachment.name}
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
        <Avatar className="mt-1 size-7">
          <AvatarFallback className="bg-[var(--orbe-blue)]/15 text-[10px] font-semibold text-[var(--orbe-blue)]">
            OA
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
