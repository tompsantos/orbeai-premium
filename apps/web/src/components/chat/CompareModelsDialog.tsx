import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pill } from "@/components/design-system/Primitives";
import { MessageRenderer } from "@/components/chat/MessageRenderer";
import { chatService } from "@/lib/api";
import type { ModelKey } from "@/types";
import { Loader2 } from "lucide-react";

interface CompareItem {
  model: ModelKey;
  decision: { provider: string; reason: string; qualityTier: string; estimatedLatencyMs: number };
  response: { content: string; latencyMs: number } | null;
  error: string | null;
}

export function CompareModelsDialog({
  open, onOpenChange, prompt, models,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  prompt: string; models: ModelKey[];
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    if (!open || !prompt) return;
    let cancelled = false;
    setLoading(true);
    setItems([]);
    void chatService.compare(prompt, models).then((res) => {
      if (cancelled) return;
      setItems(res as unknown as CompareItem[]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, prompt, models]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comparar modelos</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground mb-3">
          Prompt: <span className="italic">"{prompt.slice(0, 120)}{prompt.length > 120 ? "…" : ""}"</span>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="size-4 animate-spin" /> orbeRouter executando em paralelo…
          </div>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it) => (
            <div key={it.model} className="orbe-card p-3 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-sm">{it.model}</div>
                <Pill tone="blue">{it.decision.provider}</Pill>
              </div>
              <div className="text-[11px] text-muted-foreground mb-2">
                {it.decision.qualityTier} · ~{it.decision.estimatedLatencyMs}ms · {it.decision.reason}
              </div>
              <div className="flex-1 max-h-[40vh] overflow-y-auto rounded-md bg-muted/30 p-2">
                {it.error
                  ? <div className="text-xs text-destructive">{it.error}</div>
                  : it.response
                    ? <MessageRenderer content={it.response.content} />
                    : <div className="text-xs text-muted-foreground">—</div>}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
