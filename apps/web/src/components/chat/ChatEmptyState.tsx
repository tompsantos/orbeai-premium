import { AudioLines, ChevronRight, MessageSquare, Pin, Search, Sparkles } from "lucide-react";

import { OrbeMark } from "@/components/design-system/OrbeLogo";

const suggestions = [
  {
    icon: MessageSquare,
    title: "Pensar comigo",
    description: "Explore uma ideia sem precisar chegar com tudo pronto.",
    prompt: "Quero pensar em voz alta sobre uma ideia. Me ajude a organizar o raciocínio.",
  },
  {
    icon: Search,
    title: "Pesquisar um tema",
    description: "Investigue um assunto com profundidade e contexto.",
    prompt: "Faça uma pesquisa profunda sobre este tema e organize os principais achados.",
  },
  {
    icon: Sparkles,
    title: "Criar alguma coisa",
    description: "Comece um texto, plano, conceito ou solução.",
    prompt: "Quero criar algo novo. Me conduza pelas primeiras decisões.",
  },
  {
    icon: Pin,
    title: "Organizar minha vida",
    description: "Transforme pensamentos soltos em próximos passos claros.",
    prompt: "Me ajude a organizar o que está na minha cabeça e definir próximos passos.",
  },
];

export function ChatEmptyState({
  onSuggestion,
  onVoice,
}: {
  onSuggestion: (prompt: string) => void;
  onVoice: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
      <div className="relative">
        <div className="absolute inset-0 scale-150 rounded-full bg-blue-400/15 blur-2xl" />
        <div className="relative flex size-20 items-center justify-center rounded-[1.6rem] border border-blue-100 bg-white shadow-[0_20px_60px_-35px_rgba(37,99,235,0.7)]">
          <OrbeMark size={42} />
        </div>
      </div>

      <h2 className="mt-7 text-2xl font-semibold tracking-tight sm:text-3xl">
        No que você está pensando?
      </h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
        Pode ser uma pergunta, uma ideia, um problema, um plano ou só vontade de conversar.
      </p>

      <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.title}
            type="button"
            onClick={() => onSuggestion(suggestion.prompt)}
            className="group rounded-2xl border border-border/70 bg-white/80 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <suggestion.icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{suggestion.title}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {suggestion.description}
                </span>
              </span>
              <ChevronRight className="ml-auto mt-2 size-4 text-muted-foreground/45 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onVoice}
        className="mt-7 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/65 px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100/70"
      >
        <AudioLines className="size-4" />
        Prefiro conversar por voz
      </button>
    </div>
  );
}
