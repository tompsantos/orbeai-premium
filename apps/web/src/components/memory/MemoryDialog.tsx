import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MemoryItem } from "@/types";

export function MemoryDialog({
  open, onOpenChange, initial, onSubmit,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  initial?: Partial<MemoryItem> & { reason?: string };
  onSubmit: (data: { label: string; content: string; scope: MemoryItem["scope"]; status: MemoryItem["status"]; reason?: string }) => void | Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState<MemoryItem["scope"]>("projeto");
  const [status, setStatus] = useState<MemoryItem["status"]>("ativa");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setLabel(initial?.label ?? "");
      setContent(initial?.content ?? "");
      setScope(initial?.scope ?? "projeto");
      setStatus(initial?.status ?? "ativa");
      setReason(initial?.reason ?? "");
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.label ? "Editar memória" : "Nova memória"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Rótulo</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Tom de voz" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Conteúdo</label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="O que a orbeAI deve lembrar." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Escopo</label>
              <Select value={scope} onValueChange={(v) => setScope(v as MemoryItem["scope"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">global</SelectItem>
                  <SelectItem value="projeto">projeto</SelectItem>
                  <SelectItem value="sensível">sensível</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as MemoryItem["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">ativa</SelectItem>
                  <SelectItem value="pendente">pendente</SelectItem>
                  <SelectItem value="arquivada">arquivada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Motivo (opcional)</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: salvo a partir do chat" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!label.trim() || !content.trim()}
            onClick={async () => {
              await onSubmit({ label, content, scope, status, reason: reason || undefined });
              onOpenChange(false);
            }}
          >Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
