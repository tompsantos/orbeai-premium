import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { artifactService, chatService, memoryService, projectService } from "@/lib/api";
import {
  liveChatService,
  type LiveApprovalChoice,
  type LiveChatEvent,
  type LiveChatResult,
} from "@/lib/api/services/liveChatService";
import type { RouterDecision } from "@/lib/ai/router";
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

import type { LiveApprovalState, LiveToolState } from "./LiveRunPanel";

export function useChatExperience() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [mode, setMode] = useState<ChatMode>("padrão");
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
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
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
      if (chatList.length) setActiveChatId((current) => current || chatList[0].id);
    });
  }, []);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

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
  const filteredChats = chats.filter(
    (chat) => !search || chat.title.toLowerCase().includes(search.toLowerCase()),
  );

  async function newChat() {
    const chat = await chatService.create({ title: "Nova conversa", mode, model });
    setChats(await chatService.list());
    setActiveChatId(chat.id);
    setMessages([]);
    setLastDecision(null);
    setMemoryNotice(null);
    setHistoryOpen(false);
  }

  async function ensureChat(): Promise<string> {
    if (activeChatId) return activeChatId;
    const chat = await chatService.create({ title: "Nova conversa", mode, model });
    setChats(await chatService.list());
    setActiveChatId(chat.id);
    return chat.id;
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
    setMessages(await chatService.messages(chatId));
    setChats(await chatService.list());
  }

  async function runSend(text: string, targetChatId = activeChatId) {
    const chatId = targetChatId;
    if (!chatId || streaming) return;

    const streamingMessageId = `live_asst_${Date.now()}`;
    const controller = new AbortController();
    abortRef.current = controller;

    setStreaming(true);
    setStopping(false);
    setActiveRunId(null);
    setLiveStatus("Organizando contexto e memória…");
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
                  ? "A orbeAI começou a trabalhar…"
                  : "A orbeAI iniciou o turno…",
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
                setLiveStatus("Respondendo…");
              }
              break;
            case "tool.started":
              registerToolStart(event);
              setLiveStatus(`Usando ${event.toolName || "uma ferramenta"}…`);
              break;
            case "tool.completed":
              registerToolComplete(event);
              setLiveStatus(
                event.ok === false
                  ? `${event.toolName || "A ferramenta"} encontrou um obstáculo…`
                  : `${event.toolName || "Ferramenta"} concluída…`,
              );
              break;
            case "fallback.started":
              setFallbackReason(event.reason || "contingência segura ativada");
              setLiveStatus("Mudando para uma rota alternativa…");
              break;
            case "approval.required":
              setLiveApproval({
                title: event.title || "Aprovação necessária",
                description: event.description,
                choices: event.choices?.length ? event.choices : ["once", "deny"],
              });
              setLiveStatus("Aguardando sua aprovação…");
              break;
            case "response.completed":
              if (event.result) {
                await applyLiveResult(chatId, streamingMessageId, event.result);
              }
              setLiveStatus("Resposta concluída");
              break;
            case "response.stopped":
              if (event.result) {
                await applyLiveResult(chatId, streamingMessageId, event.result);
              } else if (!event.partialResponse) {
                setMessages((current) =>
                  current.filter((message) => message.id !== streamingMessageId),
                );
              }
              setLiveStatus("Execução interrompida");
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
    if (!text || streaming) return;

    const chatId = await ensureChat();
    const userMessage: Message = {
      id: `u_${Date.now()}`,
      chatId,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
      attachments: pendingAttachment ? [pendingAttachment] : undefined,
    };

    setMessages((current) => [...current, userMessage]);
    await chatService.appendMessage(chatId, userMessage);
    setInput("");
    setPendingAttachment(null);
    await runSend(text, chatId);
  }

  async function stopStreaming() {
    if (!streaming) return;
    setStopping(true);
    setLiveStatus("Interrompendo com segurança…");

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
      setLiveStatus(choice === "deny" ? "Ação negada, recalculando rota…" : "Ação aprovada…");
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
    toast.success("Memória pendente criada", { description: "Revise na área de Memória" });
  }

  async function onArtifact(message: Message) {
    const artifact = await artifactService.create({
      title: message.content.split("\n").find((line) => line.trim().length) ?? "Artifact do chat",
      kind: "documento",
      content: message.content,
      projectId: project?.id,
    });
    setArtifacts(await artifactService.list());
    toast.success("Item criado na Biblioteca", { description: artifact.title });
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
    if (!activeChatId) return;
    await chatService.togglePin(activeChatId, message.id);
    setMessages(await chatService.messages(activeChatId));
  }

  return {
    chats,
    activeChatId,
    setActiveChatId,
    mode,
    setMode,
    model,
    setModel,
    messages,
    input,
    setInput,
    streaming,
    stopping,
    liveStatus,
    liveTools,
    liveApproval,
    fallbackReason,
    search,
    setSearch,
    pendingAttachment,
    setPendingAttachment,
    lastDecision,
    memoryNotice,
    compareOpen,
    setCompareOpen,
    comparePrompt,
    voiceOpen,
    setVoiceOpen,
    historyOpen,
    setHistoryOpen,
    scrollRef,
    activeChat,
    project,
    chatArtifacts,
    chatMemories,
    filteredChats,
    newChat,
    deleteChat,
    addAttachment,
    send,
    stopStreaming,
    answerApproval,
    onRegenerate,
    onMemory,
    onArtifact,
    onCompare,
    onPin,
  };
}
