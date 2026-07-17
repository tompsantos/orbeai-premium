import { Button } from "@/components/ui/button";
import { Copy, Pin, RefreshCw, Save, Wand2, GitCompare } from "lucide-react";

export function MessageToolbar({
  onCopy, onRegenerate, onMemory, onArtifact, onCompare, onPin, pinned, disabled,
}: {
  onCopy: () => void; onRegenerate: () => void; onMemory: () => void;
  onArtifact: () => void; onCompare: () => void; onPin: () => void;
  pinned?: boolean; disabled?: boolean;
}) {
  const cls = "h-7 px-2 text-xs text-muted-foreground hover:text-foreground";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-0.5 transition-opacity">
      <Button size="sm" variant="ghost" className={cls} onClick={onCopy} disabled={disabled}>
        <Copy className="size-3 mr-1" /> Copiar
      </Button>
      <Button size="sm" variant="ghost" className={cls} onClick={onRegenerate} disabled={disabled}>
        <RefreshCw className="size-3 mr-1" /> Regenerar
      </Button>
      <Button size="sm" variant="ghost" className={cls} onClick={onMemory} disabled={disabled}>
        <Save className="size-3 mr-1" /> Memória
      </Button>
      <Button size="sm" variant="ghost" className={cls} onClick={onArtifact} disabled={disabled}>
        <Wand2 className="size-3 mr-1" /> Artifact
      </Button>
      <Button size="sm" variant="ghost" className={cls} onClick={onCompare} disabled={disabled}>
        <GitCompare className="size-3 mr-1" /> Comparar
      </Button>
      <Button size="sm" variant="ghost" className={cls} onClick={onPin} disabled={disabled}>
        <Pin className={`size-3 mr-1 ${pinned ? "text-[var(--orbe-blue)] fill-[var(--orbe-blue)]" : ""}`} /> {pinned ? "Fixado" : "Fixar"}
      </Button>
    </div>
  );
}
