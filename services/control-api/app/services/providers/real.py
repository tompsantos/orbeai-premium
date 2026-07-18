from dataclasses import dataclass
from os import getenv
from time import perf_counter

from app.core.config import get_settings
from app.services.provider_credentials import (
    ResolvedProviderCredential,
    provider_definition,
    resolve_provider_credential,
)
from app.services.providers.mock import (
    MOCK_MODEL_NAME,
    MOCK_PROVIDER_NAME,
    estimate_tokens,
    generate_mock_response,
)


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
    knowledge_context: str | None = None,
) -> str:
    context_blocks: list[str] = []

    if memory_context:
        context_blocks.append(
            "Contexto de memória autorizado:\n"
            f"{memory_context}\n"
            "Use essas memórias apenas quando forem relevantes. "
            "Não mencione que recebeu memórias internas, a menos que o usuário pergunte. "
            "Não trate memória como verdade absoluta se a mensagem atual contradisser claramente o contexto."
        )

    if knowledge_context:
        context_blocks.append(
            "Conhecimento persistido selecionado:\n"
            f"{knowledge_context}\n"
            "Use somente os trechos fornecidos. Não afirme ter aberto, lido ou verificado "
            "conteúdo que aparece apenas como referência ou metadado."
        )

    context_block = ""
    if context_blocks:
        context_block = "\n\n" + "\n\n".join(context_blocks) + "\n"

    return (
        "Você é a orbeAI, o sistema operacional cognitivo da orbeOne. "
        "Responda em português do Brasil, com clareza, precisão e foco prático. "
        f"Modo ativo: {mode}. Preferência de modelo: {model_preference}. "
        f"{context_block}\nMensagem do usuário: {content}"
    )


def _environment_price(name: str) -> float:
    raw = getenv(name)
    if not raw:
        return 0.0
    try:
        return float(raw)
    except ValueError:
        return 0.0


def estimate_provider_cost(provider_slug: str, input_tokens: int, output_tokens: int) -> float:
    settings = get_settings()

    if provider_slug == "openai":
        input_price = settings.openai_input_price_per_m_tokens
        output_price = settings.openai_output_price_per_m_tokens
    elif provider_slug == "gemini":
        input_price = settings.gemini_input_price_per_m_tokens
        output_price = settings.gemini_output_price_per_m_tokens
    elif provider_slug == "nvidia":
        input_price = _environment_price("NVIDIA_INPUT_PRICE_PER_M_TOKENS")
        output_price = _environment_price("NVIDIA_OUTPUT_PRICE_PER_M_TOKENS")
    else:
        return 0.0

    input_cost = (input_tokens / 1_000_000) * input_price
    output_cost = (output_tokens / 1_000_000) * output_price
    return round(input_cost + output_cost, 8)


def _resolve_execution_credential(
    provider_slug: str,
    *,
    workspace_id: str | None,
    api_key_override: str | None,
    model_name_override: str | None,
    base_url_override: str | None,
) -> ResolvedProviderCredential:
    definition = provider_definition(provider_slug)
    if api_key_override:
        return ResolvedProviderCredential(
            provider_slug=provider_slug,
            api_key=api_key_override,
            model_name=model_name_override or definition.default_model,
            base_url=base_url_override or definition.base_url,
            source="request_override",
            key_hint="••••",
        )

    credential = resolve_provider_credential(workspace_id, provider_slug)
    if credential is None:
        raise RuntimeError(f"credencial de {provider_slug} não configurada")
    return credential


def run_mock_provider(
    content: str,
    mode: str,
    model_preference: str,
    memory_context: str | None = None,
    knowledge_context: str | None = None,
) -> ProviderExecutionResult:
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
        input_tokens=estimate_tokens(
            content + (memory_context or "") + (knowledge_context or "")
        ),
        output_tokens=result.output_tokens,
        latency_ms=int((perf_counter() - started_at) * 1000),
        estimated_cost_usd=0.0,
    )


def run_openai_provider(
    content: str,
    mode: str,
    model_preference: str,
    memory_context: str | None = None,
    knowledge_context: str | None = None,
    *,
    workspace_id: str | None = None,
    api_key_override: str | None = None,
    model_name_override: str | None = None,
    base_url_override: str | None = None,
) -> ProviderExecutionResult:
    from openai import OpenAI

    settings = get_settings()
    credential = _resolve_execution_credential(
        "openai",
        workspace_id=workspace_id,
        api_key_override=api_key_override,
        model_name_override=model_name_override,
        base_url_override=base_url_override,
    )
    started_at = perf_counter()
    prompt = build_prompt(
        content=content,
        mode=mode,
        model_preference=model_preference,
        memory_context=memory_context,
        knowledge_context=knowledge_context,
    )

    client = OpenAI(
        api_key=credential.api_key,
        timeout=settings.provider_timeout_seconds,
    )
    response = client.responses.create(
        model=credential.model_name,
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
        model_name=credential.model_name,
        input_tokens=final_input_tokens,
        output_tokens=final_output_tokens,
        latency_ms=int((perf_counter() - started_at) * 1000),
        estimated_cost_usd=estimate_provider_cost(
            provider_slug="openai",
            input_tokens=final_input_tokens,
            output_tokens=final_output_tokens,
        ),
    )


def run_gemini_provider(
    content: str,
    mode: str,
    model_preference: str,
    memory_context: str | None = None,
    knowledge_context: str | None = None,
    *,
    workspace_id: str | None = None,
    api_key_override: str | None = None,
    model_name_override: str | None = None,
    base_url_override: str | None = None,
) -> ProviderExecutionResult:
    from google import genai

    settings = get_settings()
    credential = _resolve_execution_credential(
        "gemini",
        workspace_id=workspace_id,
        api_key_override=api_key_override,
        model_name_override=model_name_override,
        base_url_override=base_url_override,
    )
    started_at = perf_counter()
    prompt = build_prompt(
        content=content,
        mode=mode,
        model_preference=model_preference,
        memory_context=memory_context,
        knowledge_context=knowledge_context,
    )

    client = genai.Client(
        api_key=credential.api_key,
        http_options={"timeout": int(settings.provider_timeout_seconds * 1_000)},
    )
    interaction = client.interactions.create(
        model=credential.model_name,
        input=prompt,
    )

    output_text = getattr(interaction, "output_text", None) or str(interaction)
    input_tokens = estimate_tokens(prompt)
    output_tokens = estimate_tokens(output_text)

    return ProviderExecutionResult(
        content=output_text,
        provider_name="gemini",
        model_name=credential.model_name,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        latency_ms=int((perf_counter() - started_at) * 1000),
        estimated_cost_usd=estimate_provider_cost(
            provider_slug="gemini",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        ),
    )


def run_nvidia_provider(
    content: str,
    mode: str,
    model_preference: str,
    memory_context: str | None = None,
    knowledge_context: str | None = None,
    *,
    workspace_id: str | None = None,
    api_key_override: str | None = None,
    model_name_override: str | None = None,
    base_url_override: str | None = None,
) -> ProviderExecutionResult:
    from openai import OpenAI

    settings = get_settings()
    credential = _resolve_execution_credential(
        "nvidia",
        workspace_id=workspace_id,
        api_key_override=api_key_override,
        model_name_override=model_name_override,
        base_url_override=base_url_override,
    )
    started_at = perf_counter()
    prompt = build_prompt(
        content=content,
        mode=mode,
        model_preference=model_preference,
        memory_context=memory_context,
        knowledge_context=knowledge_context,
    )

    client = OpenAI(
        api_key=credential.api_key,
        base_url=credential.base_url,
        timeout=settings.provider_timeout_seconds,
    )
    response = client.chat.completions.create(
        model=credential.model_name,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=2048,
        stream=False,
    )
    message = response.choices[0].message
    output_text = message.content or ""
    usage = getattr(response, "usage", None)
    input_tokens = getattr(usage, "prompt_tokens", None) if usage else None
    output_tokens = getattr(usage, "completion_tokens", None) if usage else None
    final_input_tokens = input_tokens or estimate_tokens(prompt)
    final_output_tokens = output_tokens or estimate_tokens(output_text)

    return ProviderExecutionResult(
        content=output_text,
        provider_name="nvidia",
        model_name=credential.model_name,
        input_tokens=final_input_tokens,
        output_tokens=final_output_tokens,
        latency_ms=int((perf_counter() - started_at) * 1000),
        estimated_cost_usd=estimate_provider_cost(
            provider_slug="nvidia",
            input_tokens=final_input_tokens,
            output_tokens=final_output_tokens,
        ),
    )


def execute_provider(
    provider_slug: str,
    content: str,
    mode: str,
    model_preference: str,
    memory_context: str | None = None,
    knowledge_context: str | None = None,
    *,
    workspace_id: str | None = None,
    api_key_override: str | None = None,
    model_name_override: str | None = None,
    base_url_override: str | None = None,
) -> ProviderExecutionResult:
    kwargs = {
        "content": content,
        "mode": mode,
        "model_preference": model_preference,
        "memory_context": memory_context,
        "knowledge_context": knowledge_context,
        "workspace_id": workspace_id,
        "api_key_override": api_key_override,
        "model_name_override": model_name_override,
        "base_url_override": base_url_override,
    }
    if provider_slug == "openai":
        return run_openai_provider(**kwargs)
    if provider_slug == "gemini":
        return run_gemini_provider(**kwargs)
    if provider_slug == "nvidia":
        return run_nvidia_provider(**kwargs)
    if provider_slug == "mock":
        return run_mock_provider(
            content=content,
            mode=mode,
            model_preference=model_preference,
            memory_context=memory_context,
            knowledge_context=knowledge_context,
        )
    raise ValueError(f"provider sem adapter direto registrado: {provider_slug}")
