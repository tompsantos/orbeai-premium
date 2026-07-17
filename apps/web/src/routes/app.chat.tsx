import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pill } from "@/components/design-system/Primitives";
import { chatService, memoryService, artifactService, projectService } from "@/lib/api";
import { cn } from "@/lib/utils";
import { OrbeMark } from "@/components/design-system/OrbeLogo";
import { MessageRenderer } from "@/components/chat/MessageRenderer";
import { MessageToolbar } from "@/components/chat/MessageToolbar";
import { ChatContextPanel } from "@/components/chat/ChatContextPanel";
import { CompareModelsDialog } from "@/components/chat/CompareModelsDialog";
import type { Artifact, Attachment, Chat, ChatMode, MemoryItem, Message, ModelKey, Project } from "@/types";
import type { RouterDecision } from "@/lib/ai/router";
import {
  ArrowUp, Image as ImageIcon, MessageSquare, Mic, Paperclip, Pin, Trash2,
  Search, Sparkles, Square, X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/app/chat")({
  head: () => ({ meta: [{ title: "Chat · orbeAI" }] }),
  component: ChatPage,
});

const SUGGESTIONS: { icon: typeof Sparkles; title: string; prompt: string }[] = [
  { icon: Sparkles, title: "Resumir estratégia", prompt: "Resuma a estratégia do projeto em 5 pontos acionáveis." },
  { icon: Search, title: "Investigar tema", prompt: "Faça uma pesquisa profunda sobre tendências de IA aplicada." },
  { icon: Pin, title: "Plano de execução", prompt: "Crie um plano de execução com marcos e responsáveis." },
  { icon: MessageSquare, title: "Rascunhar documento", prompt: "Rascunhe um documento executivo a partir do contexto atual." },
];

const MODES: ChatMode[] = ["padrão", "strategist", "dev", "research", "document", "creative", "ops", "mentor", "safe"];
const MODELS: { key: ModelKey; label: string }[] = [
  { key: "auto", label: "automático (orbeRouter)" },
  { key: "gpt", label: "GPT" }, { key: "claude", label: "Claude" }, { key: "gemini", label: "Gemini" },
  { key: "qwen", label: "Qwen" }, { key: "groq", label: "Groq" }, { key: "local", label: "Local" },
];


function compactChatTitle(title: string, limit = 42): string {
  const clean = title.trim().replace(/\s+/g, " ");

  if (clean.length <= limit) return clean;

  return `${clean.slice(0, limit - 1).trim()}…`;
}

function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [mode, setMode] = useState<ChatMode>("strategist");
  const [model, setModel] = useState<ModelKey>("auto");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
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

  useEffect(() => {
    void Promise.all([chatService.list(), projectService.list(), artifactService.list(), memoryService.list()])
      .then(([cs, ps, as, ms]) => {
        setChats(cs);
        setProjects(ps);
        setArtifacts(as);
        setMemories(ms);
        if (cs.length) setActiveChatId(cs[0].id);
      });
  }, []);

  useEffect(() => {
    if (!activeChatId) return;
    void chatService.messages(activeChatId).then(setMessages);
    const chat = chats.find((c) => c.id === activeChatId);
    if (chat) { setMode(chat.mode); setModel(chat.model); }
  }, [activeChatId, chats]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const project = projects.find((p) => p.id === activeChat?.projectId);
  const chatArtifacts = artifacts.filter((a) => a.projectId === activeChat?.projectId);
  const chatMemories = memories.filter((m) => m.projectId === activeChat?.projectId || m.scope === "global");

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
      const message = error instanceof Error ? error.message : "Não foi possível apagar a conversa.";
      toast.error("Erro ao apagar conversa", { description: message });
    }
  }

  function addAttachment() {
    const a: Attachment = { id: `att_${Date.now()}`, name: "exemplo-anexo.pdf", kind: "doc", sizeKb: 184 };
    setPendingAttachment(a);
    toast.success("Anexo mock adicionado");
  }

  async function runSend(text: string) {
    if (!activeChatId) return;
    setStreaming(true);
    try {
      const { response, decision, assistantMessage, memoryEvents } = await chatService.send(activeChatId, text, { mode, model });
      setLastDecision(decision);

      if (memoryEvents.length > 0) {
        const firstMemory = memoryEvents[0];
        setMemoryNotice(`memória atualizada: ${firstMemory.label}`);
        window.setTimeout(() => setMemoryNotice(null), 5500);
      }

      const asst: Message = assistantMessage ?? {
        id: `a_${Date.now()}`,
        chatId: activeChatId,
        role: "assistant",
        content: response.content,
        createdAt: new Date().toISOString(),
        model,
        mode,
        provider: response.provider,
        providerName: response.provider,
        modelName: response.model,
      };

      setMessages((m) => [...m, asst]);
      await chatService.appendMessage(activeChatId, asst);

      const syncedMessages = await chatService.messages(activeChatId);
      setMessages(syncedMessages);
      setChats(await chatService.list());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Tente outro modelo.";
      toast.error("Provedor indisponível", { description: msg });
    } finally {
      setStreaming(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming || !activeChatId) return;
    const userMsg: Message = {
      id: `u_${Date.now()}`, chatId: activeChatId, role: "user", content: text,
      createdAt: new Date().toISOString(),
      attachments: pendingAttachment ? [pendingAttachment] : undefined,
    };
    setMessages((m) => [...m, userMsg]);
    await chatService.appendMessage(activeChatId, userMsg);
    setInput(""); setPendingAttachment(null);
    await runSend(text);
  }

  async function onRegenerate(msg: Message) {
    if (streaming) return;
    const idx = messages.findIndex((m) => m.id === msg.id);
    const prevUser = [...messages].slice(0, idx).reverse().find((m) => m.role === "user");
    if (!prevUser) { toast.error("Sem prompt anterior para regenerar"); return; }
    await runSend(prevUser.content);
    toast.success("Resposta regenerada");
  }

  async function onMemory(msg: Message) {
    await memoryService.create({
      label: msg.content.slice(0, 60).replace(/\n/g, " ").trim() + (msg.content.length > 60 ? "…" : ""),
      content: msg.content,
      scope: project ? "projeto" : "global",
      source: "chat",
      status: "pendente",
      projectId: project?.id,
      reason: "Salvo a partir de resposta do chat",
    });
    setMemories(await memoryService.list());
    toast.success("Memória pendente criada", { description: "Revise em /app/memory" });
  }

  async function onArtifact(msg: Message) {
    const a = await artifactService.create({
      title: msg.content.split("\n").find((l) => l.trim().length) ?? "Artifact do chat",
      kind: "documento",
      content: msg.content,
      projectId: project?.id,
    });
    setArtifacts(await artifactService.list());
    toast.success("Artifact criado", { description: a.title });
  }

  function onCompare(msg: Message) {
    const idx = messages.findIndex((m) => m.id === msg.id);
    const prevUser = [...messages].slice(0, idx).reverse().find((m) => m.role === "user");
    setComparePrompt(prevUser?.content ?? msg.content);
    setCompareOpen(true);
  }

  async function onPin(msg: Message) {
    await chatService.togglePin(activeChatId, msg.id);
    setMessages(await chatService.messages(activeChatId));
  }

  const filteredChats = chats.filter((c) => !search || c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] gap-3 min-h-[620px] md:h-[calc(100vh-8rem)]">
        {/* Conversation list */}
        <aside className="orbe-card p-3 hidden md:flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <div className="text-sm font-semibold leading-tight">Conversas</div>
              <div className="text-[11px] text-muted-foreground">{chats.length} no workspace</div>
            </div>
            <Button size="sm" onClick={newChat} className="h-8"><Sparkles className="size-3.5 mr-1" /> Nova</Button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conversas…"
              className="w-full bg-muted/50 border border-transparent rounded-lg pl-8 pr-3 py-2 text-sm outline-none transition-colors focus:bg-card focus:border-[color-mix(in_oklch,var(--orbe-blue)_30%,transparent)]" />
          </div>
          <ScrollArea className="flex-1 -mx-1 px-1">
            <ul className="space-y-1">
              {filteredChats.map((c) => {
                const active = activeChatId === c.id;
                return (
                <li key={c.id} className="relative min-w-0">
                  <button onClick={() => setActiveChatId(c.id)} title={c.title}
                    className={cn("min-w-0 w-full overflow-hidden text-left rounded-lg border px-2.5 py-2 pr-11 transition-colors",
                      active
                        ? "orbe-active"
                        : "border-transparent hover:bg-[var(--sidebar-accent)]")}>
                    <div className="flex items-center gap-2 min-w-0">
                      {c.pinned
                        ? <Pin className="size-3 shrink-0 text-[var(--orbe-blue)] fill-[var(--orbe-blue)]" />
                        : <MessageSquare className={cn("size-3 shrink-0", active ? "text-[var(--orbe-blue)]" : "text-muted-foreground")} />}
                      <span className={cn("block min-w-0 max-w-[178px] truncate text-sm", active ? "font-medium" : "")}>{compactChatTitle(c.title)}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 pl-5 min-w-0 overflow-hidden">
                      <span className="min-w-0 truncate">orbe {c.mode}</span>
                      <span className="shrink-0 text-muted-foreground/40">·</span>
                      <span className="shrink-0">{formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true, locale: ptBR })}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void deleteChat(c.id);
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

        {/* Conversation area */}
        <section className="orbe-card flex flex-col min-h-0 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b bg-card/40 px-4 py-3">
            <div className="flex items-center justify-center size-9 rounded-xl orbe-glass shrink-0">
              <OrbeMark size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate max-w-[200px] md:max-w-[360px]">{activeChat ? compactChatTitle(activeChat.title, 64) : "Selecione uma conversa"}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Pill tone="blue">orbe {mode}</Pill>
                {project && (
                  <Link to="/app/projects/$id" params={{ id: project.id }}>
                    <Pill tone="muted">{project.name}</Pill>
                  </Link>
                )}
              </div>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Select value={mode} onValueChange={(v) => setMode(v as ChatMode)}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>orbe {m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={model} onValueChange={(v) => setModel(v as ModelKey)}>
                <SelectTrigger className="h-8 w-[170px] text-xs bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>{MODELS.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent>
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

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-8 space-y-6">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 animate-orbe-fade">
                <div className="size-16 rounded-2xl orbe-glass flex items-center justify-center">
                  <OrbeMark size={36} />
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">Como posso ajudar hoje?</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md text-pretty">
                  A orbeAI usa o modo <span className="font-medium text-foreground">orbe {mode}</span> e roteia automaticamente para o melhor modelo.
                </p>
                <div className="mt-6 grid sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.title}
                      onClick={() => setInput(s.prompt)}
                      className="orbe-card orbe-card-hover p-3 text-left flex items-start gap-2.5"
                    >
                      <s.icon className="size-4 text-[var(--orbe-blue)] mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{s.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{s.prompt}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <Bubble key={m.id} message={m}
                onCopy={() => { navigator.clipboard.writeText(m.content); toast.success("Copiado"); }}
                onRegenerate={() => onRegenerate(m)}
                onMemory={() => onMemory(m)}
                onArtifact={() => onArtifact(m)}
                onCompare={() => onCompare(m)}
                onPin={() => onPin(m)}
                disabled={streaming}
              />
            ))}
            {streaming && (
              <div className="flex items-start gap-3 animate-orbe-fade">
                <OrbeMark size={28} className="mt-1 animate-orbe-pulse" />
                <div className="orbe-glass rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-muted-foreground inline-flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="size-1.5 rounded-full bg-[var(--orbe-blue)] animate-orbe-pulse" />
                    <span className="size-1.5 rounded-full bg-[var(--orbe-blue)] animate-orbe-pulse [animation-delay:200ms]" />
                    <span className="size-1.5 rounded-full bg-[var(--orbe-blue)] animate-orbe-pulse [animation-delay:400ms]" />
                  </span>
                  <span>orbeAI está pensando…</span>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t bg-card/40 p-3 md:p-4">
            {pendingAttachment && (
              <div className="mb-2 inline-flex items-center gap-2 text-xs bg-muted/60 border border-border/60 rounded-full pl-3 pr-2 py-1.5">
                <Paperclip className="size-3 text-[var(--orbe-blue)]" /> {pendingAttachment.name}
                <button onClick={() => setPendingAttachment(null)} className="rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted" aria-label="Remover anexo">
                  <X className="size-3" />
                </button>
              </div>
            )}
            <div className="orbe-glass rounded-2xl p-2 flex items-end gap-1.5 transition-shadow focus-within:shadow-[var(--glow-orbe)] focus-within:border-[color-mix(in_oklch,var(--orbe-blue)_40%,transparent)]">
              <div className="flex items-center gap-0.5 pb-0.5">
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" title="Anexar" onClick={addAttachment}><Paperclip className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" title="Imagem" onClick={() => toast("Multimodal disponível ao plugar provider real")}><ImageIcon className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" title="Voz" onClick={() => toast("Voz disponível ao plugar provider real")}><Mic className="size-4" /></Button>
              </div>
              <Textarea value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Converse com a orbeAI…"
                disabled={!activeChatId}
                className="flex-1 border-0 bg-transparent resize-none min-h-[44px] max-h-40 px-1 py-2.5 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70" />
              {streaming ? (
                <Button size="icon" variant="outline" className="size-9 shrink-0" onClick={() => setStreaming(false)} title="Parar"><Square className="size-4" /></Button>
              ) : (
                <Button size="icon" className="size-9 shrink-0 rounded-xl" onClick={send} disabled={!input.trim() || !activeChatId} title="Enviar"><ArrowUp className="size-4" /></Button>
              )}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground px-2 flex items-center gap-1.5">
              <kbd className="rounded border border-border/70 bg-muted/60 px-1 py-0.5 text-[10px] font-medium">Enter</kbd> envia
              <span className="text-muted-foreground/40">·</span>
              <kbd className="rounded border border-border/70 bg-muted/60 px-1 py-0.5 text-[10px] font-medium">Shift+Enter</kbd> nova linha
              <span className="text-muted-foreground/40 hidden sm:inline">·</span>
              <span className="hidden sm:inline">orbeRouter com modelos inteligentes e fallback seguro</span>
            </div>
          </div>
        </section>
      </div>

      {/* Context cards below chat */}
      <section className="space-y-4 pb-4">
        <div className="orbe-hairline" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="orbe-eyebrow">contexto da conversa</div>
            <div className="text-sm text-muted-foreground mt-1.5 max-w-2xl text-pretty">Decisão do router, memórias, artifacts e ações relacionadas — sem apertar o chat.</div>
          </div>
        </div>
        <ChatContextPanel chat={activeChat} decision={lastDecision}
          projectName={project?.name} projectId={project?.id}
          artifacts={chatArtifacts} memories={chatMemories}
          memoryScope={project?.memoryMode ?? "global"}
          layout="grid" />
      </section>

      <CompareModelsDialog open={compareOpen} onOpenChange={setCompareOpen}
        prompt={comparePrompt} models={["auto", "claude", "gpt", "gemini"]} />
    </div>
  );
}

function Bubble({
  message, onCopy, onRegenerate, onMemory, onArtifact, onCompare, onPin, disabled,
}: {
  message: Message;
  onCopy: () => void; onRegenerate: () => void; onMemory: () => void;
  onArtifact: () => void; onCompare: () => void; onPin: () => void;
  disabled?: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex items-start gap-3 animate-orbe-fade", isUser && "justify-end")}>
      {!isUser && <OrbeMark size={28} className="mt-1" />}
      <div className={cn("max-w-[78%]", isUser && "order-2")}>
        {!isUser && (message.providerName || message.modelName || message.model || message.mode) && (
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex flex-wrap gap-1.5">
            {message.providerName && <span>{message.providerName}</span>}
            {message.modelName && <><span>·</span><span>{message.modelName}</span></>}
            {!message.modelName && message.model && <><span>·</span><span>{message.model}</span></>}
            {message.mode && <><span>·</span><span>orbe {message.mode}</span></>}
            {(message.inputTokens || message.outputTokens) && (
              <><span>·</span><span>{message.inputTokens ?? 0}+{message.outputTokens ?? 0} tokens</span></>
            )}
          </div>
        )}
        <div className={cn("rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-[var(--orbe-blue)] text-white rounded-tr-sm whitespace-pre-wrap shadow-[var(--shadow-soft)]"
            : "rounded-tl-sm bg-card border border-border/70 shadow-[var(--shadow-xs)]")}>
          {isUser ? message.content : <MessageRenderer content={message.content} />}
        </div>
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1.5 flex gap-1 flex-wrap">
            {message.attachments.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1 text-[11px] bg-muted/40 rounded-full px-2 py-0.5">
                <Paperclip className="size-3" /> {a.name}
              </span>
            ))}
          </div>
        )}
        {!isUser && (
          <MessageToolbar
            onCopy={onCopy} onRegenerate={onRegenerate} onMemory={onMemory}
            onArtifact={onArtifact} onCompare={onCompare} onPin={onPin}
            pinned={message.pinned} disabled={disabled}
          />
        )}
      </div>
      {isUser && <Avatar className="size-7 mt-1"><AvatarFallback className="text-[10px] font-semibold bg-[var(--orbe-blue)]/15 text-[var(--orbe-blue)]">OA</AvatarFallback></Avatar>}
    </div>
  );
}
