import { Clock3, MessageCirclePlus, MessageSquare, Pin, Search, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import type { Chat } from "@/types";

function compactChatTitle(title: string, limit = 34): string {
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
          className="absolute inset-0 z-30 bg-slate-950/25 backdrop-blur-[1px] xl:hidden"
          onClick={onClose}
          aria-label="Fechar histórico"
        />
      )}

      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-40 flex w-[248px] min-h-0 flex-col border-r border-border/60 bg-card p-3 transition-transform xl:static xl:z-auto xl:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-9 items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Conversas</div>
            <div className="text-[11px] text-muted-foreground">
              {chats.length} {chats.length === 1 ? "conversa" : "conversas"}
            </div>
          </div>
          <button
            type="button"
            onClick={onNew}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <MessageCirclePlus className="size-3.5" />
            Nova
          </button>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar conversas"
            className="h-9 w-full rounded-lg border border-border/70 bg-muted/30 pl-8 pr-3 text-xs outline-none transition focus:border-blue-300 focus:bg-background"
          />
        </div>

        <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
          <ul className="space-y-1 py-0.5">
            {chats.map((chat) => {
              const active = activeChatId === chat.id;
              return (
                <li key={chat.id} className="group relative min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelect(chat.id)}
                    title={chat.title}
                    className={cn(
                      "w-full min-w-0 rounded-lg border px-2.5 py-2 pr-8 text-left transition",
                      active
                        ? "border-blue-200/80 bg-blue-50/75 shadow-sm"
                        : "border-transparent hover:bg-muted/50",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg",
                          active
                            ? "bg-blue-100 text-blue-600"
                            : "bg-muted/65 text-muted-foreground",
                        )}
                      >
                        {chat.pinned ? (
                          <Pin className="size-3 fill-current" />
                        ) : (
                          <MessageSquare className="size-3" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-xs",
                            active ? "font-semibold text-foreground" : "font-medium",
                          )}
                        >
                          {compactChatTitle(chat.title)}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock3 className="size-2.5" />
                          <span className="truncate">
                            {formatDistanceToNow(new Date(chat.updatedAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
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
                    className="absolute right-1 top-1.5 flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    title="Apagar conversa"
                    aria-label="Apagar conversa"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </li>
              );
            })}
            {chats.length === 0 && (
              <li className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Nenhuma conversa encontrada.
              </li>
            )}
          </ul>
        </div>
      </aside>
    </>
  );
}
