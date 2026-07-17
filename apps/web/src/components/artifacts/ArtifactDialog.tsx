import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Artifact, ArtifactKind, Project } from "@/types";

const KINDS: ArtifactKind[] = ["documento", "prompt", "código", "relatório", "plano de ação", "tabela", "json", "playbook", "contrato", "landing page", "checklist"];

export function ArtifactDialog({
  open, onOpenChange, projects, initial, onSubmit,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  projects: Project[];
  initial?: Partial<Artifact>;
  onSubmit: (data: { title: string; kind: ArtifactKind; content: string; projectId?: string }) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ArtifactKind>("documento");
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setKind(initial?.kind ?? "documento");
      setContent(initial?.content ?? "");
      setProjectId(initial?.projectId);
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar artifact" : "Novo artifact"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo</label>
              <Select value={kind} onValueChange={(v) => setKind(v as ArtifactKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Projeto</label>
              <Select value={projectId ?? "none"} onValueChange={(v) => setProjectId(v === "none" ? undefined : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— nenhum —</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Textarea placeholder="Conteúdo inicial (markdown)" value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="font-mono text-xs" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!title.trim()}
            onClick={async () => {
              await onSubmit({ title, kind, content, projectId });
              onOpenChange(false);
            }}
          >Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
