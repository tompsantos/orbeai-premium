import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrbeProductSlug, Project } from "@/types";

const PRODUCTS: OrbeProductSlug[] = ["orbeAI","orbeRadar","orbeRisk","orbeAuto","orbeVault","orbeGov","orbeCorp","orbeZen","orbeX","orbeScience"];

export function ProjectDialog({
  open, onOpenChange, initial, onSubmit,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  initial?: Partial<Project>;
  onSubmit: (data: Partial<Project> & { name: string }) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Project["status"]>("rascunho");
  const [product, setProduct] = useState<OrbeProductSlug | undefined>(undefined);
  const [memoryMode, setMemoryMode] = useState<Project["memoryMode"]>("isolada");
  const [brief, setBrief] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setStatus(initial?.status ?? "rascunho");
      setProduct(initial?.product);
      setMemoryMode(initial?.memoryMode ?? "isolada");
      setBrief(initial?.brief ?? "");
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar projeto" : "Novo projeto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nome do projeto" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as Project["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">rascunho</SelectItem>
                  <SelectItem value="ativo">ativo</SelectItem>
                  <SelectItem value="pausado">pausado</SelectItem>
                  <SelectItem value="concluído">concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Produto</label>
              <Select value={product ?? "none"} onValueChange={(v) => setProduct(v === "none" ? undefined : (v as OrbeProductSlug))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— nenhum —</SelectItem>
                  {PRODUCTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Modo de memória</label>
            <Select value={memoryMode} onValueChange={(v) => setMemoryMode(v as Project["memoryMode"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="isolada">isolada</SelectItem>
                <SelectItem value="compartilhada">compartilhada</SelectItem>
                <SelectItem value="somente leitura">somente leitura</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea placeholder="Brief (opcional)" value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!name.trim()}
            onClick={async () => {
              await onSubmit({ name, description, status, product, memoryMode, brief: brief || undefined });
              onOpenChange(false);
            }}
          >Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
