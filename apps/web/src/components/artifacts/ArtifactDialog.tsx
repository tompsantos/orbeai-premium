import { useEffect, useState } from "react";
import { FileText, FolderOpen, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Artifact, ArtifactKind, Project } from "@/types";

const KINDS: { value: ArtifactKind; label: string }[] = [
  { value: "documento", label: "Texto ou documento" },
  { value: "plano de ação", label: "Plano" },
  { value: "checklist", label: "Checklist" },
  { value: "relatório", label: "Relatório" },
  { value: "tabela", label: "Tabela" },
  { value: "prompt", label: "Prompt" },
  { value: "código", label: "Código" },
  { value: "json", label: "Dados estruturados" },
  { value: "playbook", label: "Guia passo a passo" },
  { value: "contrato", label: "Contrato" },
  { value: "landing page", label: "Página" },
];

export function ArtifactDialog({
  open,
  onOpenChange,
  projects,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  projects: Project[];
  initial?: Partial<Artifact>;
  onSubmit: (data: {
    title: string;
    kind: ArtifactKind;
    content: string;
    projectId?: string;
  }) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ArtifactKind>("documento");
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setTitle(initial?.title ?? "");
    setKind(initial?.kind ?? "documento");
    setContent(initial?.content ?? "");
    setProjectId(initial?.projectId);
    setSaving(false);
  }, [initial, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle>{initial?.id ? "Editar item" : "Criar na Biblioteca"}</DialogTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Comece com uma ideia simples. Você poderá continuar escrevendo e pedir melhorias à orbeAI depois.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Título</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: roteiro da viagem, plano de estudos, proposta…"
              autoFocus
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                <FileText className="size-3.5 text-muted-foreground" /> Formato
              </label>
              <Select value={kind} onValueChange={(value) => setKind(value as ArtifactKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                <FolderOpen className="size-3.5 text-muted-foreground" /> Projeto, se houver
              </label>
              <Select
                value={projectId ?? "none"}
                onValueChange={(value) => setProjectId(value === "none" ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem projeto</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Conteúdo inicial <span className="font-normal text-muted-foreground">opcional</span>
            </label>
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={7}
              placeholder="Escreva uma ideia, cole um rascunho ou deixe em branco para começar depois…"
              className="resize-none text-sm leading-6"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            disabled={!title.trim() || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSubmit({
                  title: title.trim(),
                  kind,
                  content,
                  projectId,
                });
                onOpenChange(false);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Criando…" : initial?.id ? "Salvar alterações" : "Criar item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
