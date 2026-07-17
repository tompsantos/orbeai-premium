import { Clock3, MessageCirclePlus, MessageSquare, Pin, Search, Sparkles, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Chat } from "@/types";

function compactChatTitle(title: string, limit = 42): string {
  const clean = title.trim().replace(/\s+/g, " ");
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).trim()}…`;
}

export function ChatHistoryPanel({
  open,
  chats,
  activeChatId,
  search,
  onSearchChange,
  onSelect,
  onNew,
  onDelete,
  onClose,
}: {
  open: boolean;
  chats: Chat[];
  activeChatId: string;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (chatId: string) => void;
  onNew: () => void;
  onDelete: (chatId: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="absolute inset-0 z-30 bg-slate-950/30 backdrop-blur-sm xl:hidden"
          onClick={onClose}
          aria-label="Fechar histórico"
        />
      )}

      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-40 flex w-[290px] min-h-0 flex-col border-r border-border/60 bg-card p-4 transition-transform xl:static xl:z-auto xl:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Conversas</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {chats.length} {chats.length === 1 ? "conversa" : "conversas"}
            </div>
          </div>
          <Button size="sm" onClick={onNew} className="h-9 rounded-xl">
            <MessageCirclePlus className="mr-1.5 size-4" />
            Nova
          </Button>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar conversas"
            className="w-full rounded-xl border border-border/70 bg-muted/35 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-300 focus:bg-background"
          />
        </div>

        <ScrollArea className="-mx-2 mt-3 flex-1 px-2">
          <ul className="space-y-1.5 py-1">
            {chats.map((chat) => {
              const active = activeChatId === chat.id;
              return (
                <li key={chat.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(chat.id)}
                    title={chat.title}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 pr-10 text-left transition",
                      active
                        ? "border-blue-200/80 bg-blue-50/70 shadow-sm"
                        : "border-transparent hover:bg-muted/55",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          active
                            ? "bg-blue-100 text-blue-600"
                            : "bg-muted/70 text-muted-foreground",
                        )}
                      >
                        {chat.pinned ? (
                          <Pin className="size-3.5 fill-current" />
                        ) : (
                          <MessageSquare className="size-3.5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm",
                            active ? "font-semibold text-foreground" : "font-medium",
                          )}
                        >
                          {compactChatTitle(chat.title)}
                        </span>
                        <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Clock3 className="size-3" />
                          {formatDistanceToNow(new Date(chat.updatedAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(chat.id);
                    }}
                    className="absolute right-2 top-3 flex size-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    title="Apagar conversa"
                    aria-label="Apagar conversa"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              );
            })}
            {chats.length === 0 && (
              <li className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
                Nenhuma conversa encontrada.
              </li>
            )}
          </ul>
        </ScrollArea>

        <div className="mt-3 rounded-2xl border border-border/60 bg-muted/25 p-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Sparkles className="size-3.5 text-[var(--orbe-blue)]" />
            Contexto inteligente
          </div>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            Memória, projeto e modelo acompanham a conversa sem poluir a tela.
          </p>
        </div>
      </aside>
    </>
  );
}
