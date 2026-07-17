from dataclasses import dataclass
from time import perf_counter

from app.core.config import get_settings
from app.services.providers.mock import MOCK_MODEL_NAME, MOCK_PROVIDER_NAME, estimate_tokens, generate_mock_response


@dataclass(frozen=True)
class ProviderExecutionResult:
    content: str
    provider_name: str
    model_name: str
    input_tokens: int
    output_tokens: int
    latency_ms: int
    estimated_cost_usd: float
    error_message: str | None = None


def build_prompt(
    content: str,
    mode: str,
    model_preference: str,
    memory_context: str | None = None,
) -> str:
    context_block = ""

    if memory_context:
        context_block = (
            "\n\nContexto persistente autorizado:\n"
            f"{memory_context}\n"
            "Use essas memórias apenas quando forem relevantes. "
            "Não mencione que recebeu memórias internas, a menos que o usuário pergunte. "
            "Não trate memória como verdade absoluta se a mensagem atual contradisser claramente o contexto.\n"
        )

    return (
        "Você é a orbeAI, o sistema operacional cognitivo da orbeOne. "
        "Responda em português do Brasil, com clareza, precisão e foco prático. "
        f"Modo ativo: {mode}. Preferência de modelo: {model_preference}. "
        f"{context_block}\nMensagem do usuário: {content}"
    )


def estimate_provider_cost(provider_slug: str, input_tokens: int, output_tokens: int) -> float:
    settings = get_settings()

    if provider_slug == "openai":
        input_cost = (input_tokens / 1_000_000) * settings.openai_input_price_per_m_tokens
        output_cost = (output_tokens / 1_000_000) * settings.openai_output_price_per_m_tokens
        return round(input_cost + output_cost, 8)

    if provider_slug == "gemini":
        input_cost = (input_tokens / 1_000_000) * settings.gemini_input_price_per_m_tokens
        output_cost = (output_tokens / 1_000_000) * settings.gemini_output_price_per_m_tokens
        return round(input_cost + output_cost, 8)

    return 0.0


def run_mock_provider(content: str, mode: str, model_preference: str, memory_context: str | None = None) -> ProviderExecutionResult:
    started_at = perf_counter()

    result = generate_mock_response(
        user_content=content,
        mode=mode,
        model_preference=model_preference,
    )

    return ProviderExecutionResult(
        content=result.content,
        provider_name=MOCK_PROVIDER_NAME,
        model_name=MOCK_MODEL_NAME,
        input_tokens=result.input_tokens,
        output_tokens=result.output_tokens,
        latency_ms=int((perf_counter() - started_at) * 1000),
        estimated_cost_usd=0.0,
    )


def run_openai_provider(content: str, mode: str, model_preference: str, memory_context: str | None = None) -> ProviderExecutionResult:
    from openai import OpenAI

    settings = get_settings()

    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY não configurada.")

    started_at = perf_counter()
    prompt = build_prompt(content=content, mode=mode, model_preference=model_preference, memory_context=memory_context)

    client = OpenAI(api_key=settings.openai_api_key)

    response = client.responses.create(
        model=settings.openai_model,
        input=prompt,
    )

    output_text = getattr(response, "output_text", None) or str(response)

    usage = getattr(response, "usage", None)
    input_tokens = getattr(usage, "input_tokens", None) if usage else None
    output_tokens = getattr(usage, "output_tokens", None) if usage else None

    final_input_tokens = input_tokens or estimate_tokens(prompt)
    final_output_tokens = output_tokens or estimate_tokens(output_text)

    return ProviderExecutionResult(
        content=output_text,
        provider_name="openai",
        model_name=settings.openai_model,
        input_tokens=final_input_tokens,
        output_tokens=final_output_tokens,
        latency_ms=int((perf_counter() - started_at) * 1000),
        estimated_cost_usd=estimate_provider_cost(
            provider_slug="openai",
            input_tokens=final_input_tokens,
            output_tokens=final_output_tokens,
        ),
    )


def run_gemini_provider(content: str, mode: str, model_preference: str, memory_context: str | None = None) -> ProviderExecutionResult:
    from google import genai

    settings = get_settings()

    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY não configurada.")

    started_at = perf_counter()
    prompt = build_prompt(content=content, mode=mode, model_preference=model_preference, memory_context=memory_context)

    client = genai.Client(api_key=settings.gemini_api_key)

    interaction = client.interactions.create(
        model=settings.gemini_model,
        input=prompt,
    )

    output_text = getattr(interaction, "output_text", None) or str(interaction)

    input_tokens = estimate_tokens(prompt)
    output_tokens = estimate_tokens(output_text)

    return ProviderExecutionResult(
        content=output_text,
        provider_name="gemini",
        model_name=settings.gemini_model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        latency_ms=int((perf_counter() - started_at) * 1000),
        estimated_cost_usd=estimate_provider_cost(
            provider_slug="gemini",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        ),
    )


def execute_provider(
    provider_slug: str,
    content: str,
    mode: str,
    model_preference: str,
    memory_context: str | None = None,
) -> ProviderExecutionResult:
    if provider_slug == "openai":
        return run_openai_provider(
            content=content,
            mode=mode,
            model_preference=model_preference,
            memory_context=memory_context,
        )

    if provider_slug == "gemini":
        return run_gemini_provider(
            content=content,
            mode=mode,
            model_preference=model_preference,
            memory_context=memory_context,
        )

    return run_mock_provider(
        content=content,
        mode=mode,
        model_preference=model_preference,
    )
