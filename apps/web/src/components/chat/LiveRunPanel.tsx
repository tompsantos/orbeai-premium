import {
  AlertTriangle,
  CheckCircle2,
  CircleStop,
  LoaderCircle,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LiveApprovalChoice } from "@/lib/api/services/liveChatService";

export interface LiveToolState {
  id: string;
  name: string;
  preview?: string | null;
  status: "running" | "completed";
  ok?: boolean;
  durationSeconds?: number;
}

export interface LiveApprovalState {
  title: string;
  description?: string;
  choices: LiveApprovalChoice[];
}

export function LiveRunPanel({
  status,
  fallbackReason,
  tools,
  approval,
  stopping,
  onApproval,
}: {
  status: string | null;
  fallbackReason: string | null;
  tools: LiveToolState[];
  approval: LiveApprovalState | null;
  stopping?: boolean;
  onApproval: (choice: LiveApprovalChoice) => void;
}) {
  return (
    <div className="ml-10 max-w-[78%] space-y-2 animate-orbe-fade">
      <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-xs text-muted-foreground shadow-[var(--shadow-xs)]">
        {stopping ? (
          <CircleStop className="size-3.5 text-amber-500" />
        ) : (
          <LoaderCircle className="size-3.5 animate-spin text-[var(--orbe-blue)]" />
        )}
        <span>{stopping ? "interrompendo com segurança…" : status || "orbeAI está pensando…"}</span>
      </div>

      {fallbackReason && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
          <div>
            <div className="font-medium text-foreground">contingência ativada</div>
            <div className="mt-0.5">{fallbackReason}</div>
          </div>
        </div>
      )}

      {tools.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className={cn(
                "inline-flex max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-xs",
                tool.status === "running"
                  ? "border-[color-mix(in_oklch,var(--orbe-blue)_25%,var(--border))] bg-[color-mix(in_oklch,var(--orbe-blue)_6%,var(--card))]"
                  : tool.ok === false
                    ? "border-destructive/25 bg-destructive/5"
                    : "border-emerald-500/25 bg-emerald-500/5",
              )}
            >
              {tool.status === "running" ? (
                <Wrench className="size-3.5 animate-orbe-pulse text-[var(--orbe-blue)]" />
              ) : (
                <CheckCircle2
                  className={cn(
                    "size-3.5",
                    tool.ok === false ? "text-destructive" : "text-emerald-500",
                  )}
                />
              )}
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{tool.name}</div>
                {tool.preview && (
                  <div className="mt-0.5 max-w-[360px] truncate text-muted-foreground">
                    {tool.preview}
                  </div>
                )}
              </div>
              {tool.durationSeconds !== undefined && tool.status === "completed" && (
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {tool.durationSeconds.toFixed(1)}s
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {approval && (
        <div className="rounded-2xl border border-[color-mix(in_oklch,var(--orbe-blue)_35%,var(--border))] bg-card p-3 shadow-[var(--shadow-soft)]">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--orbe-blue)]" />
            <div className="min-w-0">
              <div className="text-sm font-semibold">{approval.title}</div>
              {approval.description && (
                <div className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                  {approval.description}
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {approval.choices.includes("once") && (
              <Button size="sm" className="h-8" onClick={() => onApproval("once")}>
                aprovar uma vez
              </Button>
            )}
            {approval.choices.includes("session") && (
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => onApproval("session")}
              >
                nesta sessão
              </Button>
            )}
            {approval.choices.includes("deny") && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-destructive hover:text-destructive"
                onClick={() => onApproval("deny")}
              >
                negar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
