import { useEffect, useState } from "react";
import { Globe2, Folder, LockKeyhole } from "lucide-react";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MemoryItem } from "@/types";

const SCOPES: Array<{
  value: MemoryItem["scope"];
  title: string;
  description: string;
  icon: typeof Globe2;
}> = [
  {
    value: "global",
    title: "Em qualquer conversa",
    description: "Use quando isso ajuda a orbeAI a te conhecer melhor no dia a dia.",
    icon: Globe2,
  },
  {
    value: "projeto",
    title: "Só neste projeto",
    description: "Use apenas quando essa informação pertence a um assunto específico.",
    icon: Folder,
  },
  {
    value: "sensível",
    title: "Guardar como sensível",
    description: "Marque informações pessoais que precisam de cuidado extra.",
    icon: LockKeyhole,
  },
];

export function MemoryDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  initial?: Partial<MemoryItem> & { reason?: string };
  onSubmit: (data: {
    label: string;
    content: string;
    scope: MemoryItem["scope"];
    status: MemoryItem["status"];
    reason?: string;
  }) => void | Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState<MemoryItem["scope"]>("global");

  useEffect(() => {
    if (!open) return;
    setLabel(initial?.label ?? "");
    setContent(initial?.content ?? "");
    setScope(initial?.scope ?? "global");
  }, [initial, open]);

  const editing = Boolean(initial?.label);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <DialogTitle>{editing ? "Editar lembrança" : "O que a orbeAI deve lembrar?"}</DialogTitle>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Escreva de um jeito simples. Você poderá mudar ou apagar isso quando quiser.
          </p>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div>
            <label htmlFor="memory-label" className="text-sm font-medium">
              Um nome curto
            </label>
            <Input
              id="memory-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ex.: Como gosto de receber respostas"
              className="mt-2 rounded-xl"
            />
          </div>

          <div>
            <label htmlFor="memory-content" className="text-sm font-medium">
              O que deve ser lembrado
            </label>
            <Textarea
              id="memory-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={5}
              placeholder="Ex.: Prefiro explicações diretas, com exemplos práticos e sem linguagem muito técnica."
              className="mt-2 resize-none rounded-xl leading-6"
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Onde usar essa lembrança?</legend>
            <div className="mt-2 grid gap-2">
              {SCOPES.map((option) => {
                const Icon = option.icon;
                const selected = scope === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setScope(option.value)}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-3 text-left transition",
                      selected
                        ? "border-blue-300 bg-blue-50/70 shadow-sm"
                        : "border-border/70 hover:border-blue-200 hover:bg-muted/30",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl",
                        selected ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{option.title}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <DialogFooter className="border-t border-border/60 px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!label.trim() || !content.trim()}
            onClick={async () => {
              await onSubmit({
                label: label.trim(),
                content: content.trim(),
                scope,
                status: initial?.status ?? "ativa",
                reason: initial?.reason,
              });
              onOpenChange(false);
            }}
          >
            {editing ? "Salvar mudanças" : "Lembrar disso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
