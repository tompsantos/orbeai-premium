import { ChevronRight, MessageSquare, Pin, Search, Sparkles } from "lucide-react";

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
    title: "Organizar uma ideia",
    description: "Transforme pensamentos soltos em próximos passos claros.",
    prompt: "Me ajude a organizar o que está na minha cabeça e definir próximos passos.",
  },
];

export function ChatEmptyState({ onSuggestion }: { onSuggestion: (prompt: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
      <div className="relative">
        <div className="absolute inset-0 scale-150 rounded-full bg-blue-400/12 blur-xl" />
        <div className="relative flex size-14 items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-[0_16px_45px_-30px_rgba(37,99,235,0.7)]">
          <OrbeMark size={30} />
        </div>
      </div>

      <h2 className="mt-4 text-xl font-semibold tracking-tight">No que você está pensando?</h2>
      <p className="mt-1.5 max-w-md text-sm leading-5 text-muted-foreground">
        Pode ser uma pergunta, uma ideia, um problema, um plano ou só vontade de conversar.
      </p>

      <div className="mt-5 grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.title}
            type="button"
            onClick={() => onSuggestion(suggestion.prompt)}
            className="group rounded-xl border border-border/70 bg-white/80 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/30"
          >
            <div className="flex items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <suggestion.icon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">{suggestion.title}</span>
                <span className="mt-0.5 block line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                  {suggestion.description}
                </span>
              </span>
              <ChevronRight className="mt-1.5 size-3.5 text-muted-foreground/45 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
