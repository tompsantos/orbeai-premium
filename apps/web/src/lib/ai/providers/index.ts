import type { ChatMode, ModelKey, ProviderSlug } from "@/types";

export interface AIRequest {
  prompt: string;
  history?: { role: "user" | "assistant"; content: string }[];
  mode?: ChatMode;
  model?: ModelKey;
}

export interface AIResponse {
  content: string;
  provider: ProviderSlug;
  model: string;
  latencyMs: number;
}

export interface BaseAIProvider {
  slug: ProviderSlug;
  isConfigured(): boolean;
  complete(req: AIRequest): Promise<AIResponse>;
}

// Real providers are placeholders — they MUST NOT call real APIs unless env vars exist.
function placeholder(slug: ProviderSlug, model: string): BaseAIProvider {
  return {
    slug,
    isConfigured: () => false,
    async complete() {
      throw new Error(`Provider ${slug} (${model}) ainda não configurado. Defina a variável de ambiente correspondente.`);
    },
  };
}

export const OpenAIProvider = placeholder("openai", "gpt-5.2");
export const AnthropicProvider = placeholder("anthropic", "claude-sonnet-4.5");
export const GeminiProvider = placeholder("gemini", "gemini-3-pro");
export const QwenProvider = placeholder("qwen", "qwen3-max");
export const GroqProvider = placeholder("groq", "llama-3.3-70b");
export const LocalProvider = placeholder("local", "llama-cpp");

const sampleParagraphs = [
  "Boa pergunta. Aqui está uma análise direta, sem hype.",
  "Vou estruturar em três pontos para você decidir com clareza.",
  "Considerando memória, contexto do projeto e o modo selecionado, sigo com a recomendação abaixo.",
];

export const MockProvider: BaseAIProvider = {
  slug: "mock",
  isConfigured: () => true,
  async complete(req) {
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    const lead = sampleParagraphs[Math.floor(Math.random() * sampleParagraphs.length)];
    const modeLine = req.mode ? `*Modo:* **orbe ${req.mode}**` : "";
    return {
      provider: "mock",
      model: "orbe-mock-1",
      latencyMs: 720,
      content:
`${lead}

${modeLine}

**Resumo**
- Contexto recebido com clareza.
- Próximo passo recomendado abaixo.

**Recomendação**
1. Salvar este insight como memória do projeto.
2. Transformar em artifact de **plano de ação**.
3. Acionar **orbe research** para validar com fontes externas.

> orbeAI conecta memória controlável, roteamento inteligente e o ecossistema orbeOne.`,
    };
  },
};

export const providersBySlug: Record<ProviderSlug, BaseAIProvider> = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  gemini: GeminiProvider,
  qwen: QwenProvider,
  groq: GroqProvider,
  local: LocalProvider,
  mock: MockProvider,
};
