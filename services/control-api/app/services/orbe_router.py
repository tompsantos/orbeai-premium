from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum

from app.core.config import Settings, get_settings
from app.services.provider_registry import ProviderRegistry, build_provider_registry


class RouteKind(StrEnum):
    DETERMINISTIC = "deterministic"
    INTERNAL_QUERY = "internal_query"
    DIRECT_MODEL = "direct_model"
    MEMORY = "memory"
    KNOWLEDGE = "knowledge"
    TOOL = "tool"
    COGNITION = "cognition"
    MISSION = "mission"
    MONITORING = "monitoring"
    COUNCIL = "council"
    BLOCKED = "blocked"
    APPROVAL = "approval"


class ExecutionStrategy(StrEnum):
    DETERMINISTIC = "deterministic"
    DIRECT_PROVIDER = "direct_provider"
    COGNITION = "cognition"
    UNAVAILABLE = "unavailable"


class ReasonCode(StrEnum):
    MANUAL_MODEL = "manual_model"
    MANUAL_MODEL_UNAVAILABLE = "manual_model_unavailable"
    ROUTING_POLICY = "routing_policy"
    SEMANTIC_RESEARCH = "semantic_research"
    SEMANTIC_DOCUMENT = "semantic_document"
    SEMANTIC_CODE = "semantic_code"
    SEMANTIC_RISK = "semantic_risk"
    CONTEXT_MEMORY = "context_memory"
    CONTEXT_KNOWLEDGE = "context_knowledge"
    COMPLEX_REQUEST = "complex_request"
    TOOL_REQUIRED = "tool_required"
    COGNITION_AVAILABLE = "cognition_available"
    COGNITION_UNAVAILABLE = "cognition_unavailable"
    PROVIDER_CONFIGURED = "provider_configured"
    PROVIDER_FALLBACK = "provider_fallback"
    MOCK_ONLY = "mock_only"
    LEGACY_BRIDGE = "legacy_bridge"


@dataclass(frozen=True)
class CapabilityDefinition:
    capability_id: str
    route_kind: RouteKind
    implemented: bool
    execution_strategy: ExecutionStrategy | None
    description: str

    def persisted_payload(self) -> dict[str, object]:
        return {
            "capability_id": self.capability_id,
            "route_kind": self.route_kind.value,
            "implemented": self.implemented,
            "execution_strategy": (
                self.execution_strategy.value if self.execution_strategy is not None else None
            ),
            "description": self.description,
        }


CAPABILITY_REGISTRY: dict[str, CapabilityDefinition] = {
    "direct_text_response": CapabilityDefinition(
        "direct_text_response",
        RouteKind.DIRECT_MODEL,
        True,
        ExecutionStrategy.DIRECT_PROVIDER,
        "resposta textual direta por provider registrado",
    ),
    "external_memory_context": CapabilityDefinition(
        "external_memory_context",
        RouteKind.MEMORY,
        True,
        ExecutionStrategy.DIRECT_PROVIDER,
        "contexto de memória autorizado pelo control-api",
    ),
    "external_knowledge_context": CapabilityDefinition(
        "external_knowledge_context",
        RouteKind.KNOWLEDGE,
        True,
        ExecutionStrategy.DIRECT_PROVIDER,
        "conhecimento persistido selecionado pelo control-api",
    ),
    "cognitive_loop": CapabilityDefinition(
        "cognitive_loop",
        RouteKind.COGNITION,
        True,
        ExecutionStrategy.COGNITION,
        "loop cognitivo interno executado pelo orbe cognition core",
    ),
    "tool_execution": CapabilityDefinition(
        "tool_execution",
        RouteKind.TOOL,
        False,
        ExecutionStrategy.COGNITION,
        "execução de ferramentas autorizadas por política",
    ),
    "durable_mission": CapabilityDefinition(
        "durable_mission", RouteKind.MISSION, False, None, "missão longa e durável"
    ),
    "monitoring_watch": CapabilityDefinition(
        "monitoring_watch",
        RouteKind.MONITORING,
        False,
        None,
        "monitoramento recorrente orientado por condição",
    ),
    "model_council": CapabilityDefinition(
        "model_council",
        RouteKind.COUNCIL,
        False,
        None,
        "conselho e avaliação comparativa de modelos",
    ),
}


@dataclass(frozen=True)
class RouterRequest:
    content: str
    mode: str
    model_preference: str
    routing_mode: str
    memory_context_count: int = 0
    knowledge_context_count: int = 0
    cognition_enabled: bool = True
    real_providers_enabled: bool = True
    workspace_id: str | None = None


@dataclass(frozen=True)
class SemanticClassification:
    intent: str
    domain: str
    complexity: str
    risk: str
    sensitivity: str
    task_hints: tuple[str, ...]
    requires_tools: bool

    def persisted_payload(self) -> dict[str, object]:
        return {
            "intent": self.intent,
            "domain": self.domain,
            "complexity": self.complexity,
            "risk": self.risk,
            "sensitivity": self.sensitivity,
            "task_hints": list(self.task_hints),
            "requires_tools": self.requires_tools,
        }


@dataclass(frozen=True)
class ExecutionPlan:
    strategy: ExecutionStrategy
    route_kind: RouteKind
    primary_provider_slug: str
    provider_chain: tuple[str, ...]
    model_by_provider: dict[str, str]
    capability_ids: tuple[str, ...]
    timeout_seconds: float
    retry_attempts: int
    allow_mock: bool
    implemented: bool

    def persisted_payload(self) -> dict[str, object]:
        return {
            "strategy": self.strategy.value,
            "route_kind": self.route_kind.value,
            "primary_provider_slug": self.primary_provider_slug,
            "provider_chain": list(self.provider_chain),
            "model_by_provider": dict(self.model_by_provider),
            "capability_ids": list(self.capability_ids),
            "timeout_seconds": self.timeout_seconds,
            "retry_attempts": self.retry_attempts,
            "allow_mock": self.allow_mock,
            "implemented": self.implemented,
        }


@dataclass(frozen=True)
class RouterDecision:
    router_version: str
    route_kind: RouteKind
    execution_strategy: ExecutionStrategy
    provider_slug: str
    provider_name: str
    model_name: str
    primary_provider_slug: str
    primary_model_name: str
    reason: str
    reason_codes: tuple[str, ...]
    fallback_chain: list[str]
    routing_mode: str
    estimated_latency_ms: int | None
    estimated_cost_usd: float | None
    quality_tier: str
    task_hints: list[str]
    capability_ids: tuple[str, ...]
    primary_configured: bool
    selected_configured: bool
    is_fallback: bool
    implemented: bool
    classification: SemanticClassification
    execution_plan: ExecutionPlan

    def persisted_payload(self) -> dict[str, object]:
        return {
            "router_version": self.router_version,
            "route_kind": self.route_kind.value,
            "execution_strategy": self.execution_strategy.value,
            "provider_slug": self.provider_slug,
            "provider_name": self.provider_name,
            "model_name": self.model_name,
            "primary_provider_slug": self.primary_provider_slug,
            "primary_model_name": self.primary_model_name,
            "reason": self.reason,
            "reason_codes": list(self.reason_codes),
            "fallback_chain": list(self.fallback_chain),
            "routing_mode": self.routing_mode,
            "estimated_latency_ms": self.estimated_latency_ms,
            "estimated_cost_usd": self.estimated_cost_usd,
            "quality_tier": self.quality_tier,
            "task_hints": list(self.task_hints),
            "capability_ids": list(self.capability_ids),
            "primary_configured": self.primary_configured,
            "selected_configured": self.selected_configured,
            "is_fallback": self.is_fallback,
            "implemented": self.implemented,
            "classification": self.classification.persisted_payload(),
            "execution_plan": self.execution_plan.persisted_payload(),
        }


HINT_PATTERNS = [
    ("código", re.compile(r"\b(c[óo]digo|bug|debug|typescript|python|api|refactor|implement\w+)\b", re.I)),
    ("documento", re.compile(r"\b(pdf|documento|contrato|edital|relat[óo]rio|anexo)\b", re.I)),
    ("pesquisa", re.compile(r"\b(pesquis\w+|fontes|investig\w+|mercado|benchmark)\b", re.I)),
    ("estratégia", re.compile(r"\b(estrat[ée]gia|roadmap|posicionamento|go-to-market)\b", re.I)),
    ("risco", re.compile(r"\b(risco|compliance|lgpd|auditoria|regulat[óo]rio)\b", re.I)),
    ("ops", re.compile(r"\b(workflow|automa\w+|processo|opera\w+|runbook)\b", re.I)),
    ("governo", re.compile(r"\b(licita\w+|edital|termo de refer[êe]ncia|setor p[úu]blico)\b", re.I)),
    ("vendas", re.compile(r"\b(vendas|lead|pipeline|proposta|comercial|prospec\w+)\b", re.I)),
]
TOOL_PATTERN = re.compile(
    r"\b(execut[ae]|rode|abra|edite|crie (?:um )?arquivo|use (?:uma )?ferramenta|"
    r"terminal|github|pull request|commit|deploy|navegador|pesquise na (?:web|internet))\b",
    re.I,
)
MULTI_STEP_PATTERN = re.compile(
    r"\b(primeiro|depois|em seguida|passo a passo|etapa|bloco|implemente e teste|"
    r"analise e corrija|crie e publique)\b",
    re.I,
)
MODEL_TO_PROVIDER = {
    "gpt": "openai",
    "openai": "openai",
    "gemini": "gemini",
    "nvidia": "nvidia",
    "nim": "nvidia",
    "mock": "mock",
}


def detect_task_hints(content: str) -> list[str]:
    return [hint for hint, pattern in HINT_PATTERNS if pattern.search(content)]


def classify_request(request: RouterRequest) -> SemanticClassification:
    hints = tuple(detect_task_hints(request.content))
    requires_tools = bool(TOOL_PATTERN.search(request.content))
    multi_step = bool(MULTI_STEP_PATTERN.search(request.content))
    if requires_tools or len(request.content) > 2_500:
        complexity = "high"
    elif multi_step or len(request.content) > 900 or len(hints) >= 3:
        complexity = "medium"
    else:
        complexity = "low"

    if "pesquisa" in hints:
        intent = "research"
    elif "código" in hints:
        intent = "software"
    elif "documento" in hints or "governo" in hints:
        intent = "document"
    elif "estratégia" in hints:
        intent = "strategy"
    else:
        intent = "conversation"

    domain = next(iter(hints), "general")
    risk = "elevated" if "risco" in hints or "governo" in hints else "normal"
    sensitivity = (
        "sensitive"
        if re.search(r"\b(senha|segredo|token|chave privada|sa[úu]de)\b", request.content, re.I)
        else "normal"
    )
    return SemanticClassification(
        intent=intent,
        domain=domain,
        complexity=complexity,
        risk=risk,
        sensitivity=sensitivity,
        task_hints=hints,
        requires_tools=requires_tools,
    )


def _provider_preference(
    request: RouterRequest,
    classification: SemanticClassification,
) -> tuple[str, ReasonCode, str]:
    model_key = request.model_preference.strip().lower()
    if model_key and model_key != "auto":
        provider = MODEL_TO_PROVIDER.get(model_key)
        if provider is not None:
            return provider, ReasonCode.MANUAL_MODEL, f"preferência manual compatível: {model_key}"
        return (
            "openai",
            ReasonCode.MANUAL_MODEL_UNAVAILABLE,
            f"preferência manual ainda não possui adapter direto no router v1: {model_key}",
        )

    route_mode = request.routing_mode.strip().lower()
    if route_mode in {"menor custo", "custo", "mais rápido", "rapidez", "latência"}:
        return "gemini", ReasonCode.ROUTING_POLICY, f"política operacional: {request.routing_mode}"
    if "pesquisa" in classification.task_hints:
        return "gemini", ReasonCode.SEMANTIC_RESEARCH, "sinal semântico de pesquisa"
    if "documento" in classification.task_hints or "governo" in classification.task_hints:
        return "openai", ReasonCode.SEMANTIC_DOCUMENT, "sinal semântico de documento"
    if "código" in classification.task_hints:
        return "openai", ReasonCode.SEMANTIC_CODE, "sinal semântico de software"
    if "risco" in classification.task_hints:
        return "openai", ReasonCode.SEMANTIC_RISK, "sinal semântico de risco"
    return "openai", ReasonCode.ROUTING_POLICY, "política padrão do router v1"


def _direct_plan(
    *,
    primary_provider: str,
    registry: ProviderRegistry,
    settings: Settings,
    route_kind: RouteKind,
    capability_ids: tuple[str, ...],
) -> ExecutionPlan:
    chain = tuple(registry.execution_chain(primary_provider, include_mock=True))
    return ExecutionPlan(
        strategy=ExecutionStrategy.DIRECT_PROVIDER,
        route_kind=route_kind,
        primary_provider_slug=primary_provider,
        provider_chain=chain,
        model_by_provider={slug: registry.get(slug).model_name for slug in chain},
        capability_ids=capability_ids,
        timeout_seconds=settings.provider_timeout_seconds,
        retry_attempts=settings.provider_retry_attempts,
        allow_mock=True,
        implemented=True,
    )


def _build_decision(
    request: RouterRequest,
    classification: SemanticClassification,
    settings: Settings,
    registry: ProviderRegistry,
) -> RouterDecision:
    primary_provider, provider_reason_code, provider_reason = _provider_preference(
        request, classification
    )
    direct_capabilities = ["direct_text_response"]
    route_kind = RouteKind.DIRECT_MODEL
    reason_codes = [provider_reason_code.value]
    if request.memory_context_count:
        direct_capabilities.append("external_memory_context")
        route_kind = RouteKind.MEMORY
        reason_codes.append(ReasonCode.CONTEXT_MEMORY.value)
    if request.knowledge_context_count:
        direct_capabilities.append("external_knowledge_context")
        route_kind = RouteKind.KNOWLEDGE
        reason_codes.append(ReasonCode.CONTEXT_KNOWLEDGE.value)

    wants_cognition = classification.requires_tools or classification.complexity == "high"
    if wants_cognition and request.cognition_enabled:
        reason_codes.append(
            ReasonCode.TOOL_REQUIRED.value
            if classification.requires_tools
            else ReasonCode.COMPLEX_REQUEST.value
        )
        reason_codes.append(ReasonCode.COGNITION_AVAILABLE.value)
        fallback_plan = _direct_plan(
            primary_provider=primary_provider,
            registry=registry,
            settings=settings,
            route_kind=RouteKind.DIRECT_MODEL,
            capability_ids=tuple(direct_capabilities),
        )
        plan = ExecutionPlan(
            strategy=ExecutionStrategy.COGNITION,
            route_kind=RouteKind.COGNITION,
            primary_provider_slug=primary_provider,
            provider_chain=fallback_plan.provider_chain,
            model_by_provider=fallback_plan.model_by_provider,
            capability_ids=("cognitive_loop", *tuple(direct_capabilities)),
            timeout_seconds=settings.cognition_timeout_seconds,
            retry_attempts=0,
            allow_mock=True,
            implemented=True,
        )
        primary = registry.get(primary_provider)
        return RouterDecision(
            "orbe-router-v1",
            RouteKind.COGNITION,
            ExecutionStrategy.COGNITION,
            "orbe-cognition",
            "orbe cognition core",
            "orbe-cognition-default",
            primary_provider,
            primary.model_name,
            (
                "orbeRouter escolheu execução cognitiva porque a solicitação exige "
                f"coordenação adicional; fallback direto prioriza {primary_provider} por {provider_reason}."
            ),
            tuple(reason_codes),
            list(plan.provider_chain),
            request.routing_mode,
            None,
            None,
            "runtime-selected",
            list(classification.task_hints),
            plan.capability_ids,
            primary.executable,
            True,
            False,
            True,
            classification,
            plan,
        )

    if wants_cognition:
        reason_codes.append(ReasonCode.COGNITION_UNAVAILABLE.value)
    plan = _direct_plan(
        primary_provider=primary_provider,
        registry=registry,
        settings=settings,
        route_kind=route_kind,
        capability_ids=tuple(direct_capabilities),
    )
    selected = next(registry.get(slug) for slug in plan.provider_chain if registry.get(slug).executable)
    primary = registry.get(primary_provider)
    is_fallback = selected.provider_slug != primary_provider
    reason_codes.append(
        ReasonCode.PROVIDER_FALLBACK.value if is_fallback else ReasonCode.PROVIDER_CONFIGURED.value
    )
    if selected.provider_slug == "mock":
        reason_codes.append(ReasonCode.MOCK_ONLY.value)
    reason = f"orbeRouter escolheu {primary_provider} por {provider_reason}."
    if is_fallback:
        reason += (
            f" O provider primário está {primary.state.value}; o plano inicia em "
            f"{selected.provider_slug} como fallback explícito."
        )
    return RouterDecision(
        "orbe-router-v1",
        route_kind,
        ExecutionStrategy.DIRECT_PROVIDER,
        selected.provider_slug,
        selected.provider_name,
        selected.model_name,
        primary_provider,
        primary.model_name,
        reason,
        tuple(reason_codes),
        list(plan.provider_chain),
        request.routing_mode,
        None,
        None,
        "configured" if selected.is_real else "mock",
        list(classification.task_hints),
        plan.capability_ids,
        primary.executable,
        selected.executable,
        is_fallback,
        True,
        classification,
        plan,
    )


def resolve_chat_route(
    content: str,
    mode: str | None,
    model_preference: str | None,
    routing_mode: str | None = "automático",
    *,
    memory_context_count: int = 0,
    knowledge_context_count: int = 0,
    cognition_enabled: bool | None = None,
    real_providers_enabled: bool = True,
    workspace_id: str | None = None,
) -> RouterDecision:
    settings = get_settings()
    request = RouterRequest(
        content=content,
        mode=mode or "padrão",
        model_preference=model_preference or "auto",
        routing_mode=routing_mode or "automático",
        memory_context_count=memory_context_count,
        knowledge_context_count=knowledge_context_count,
        cognition_enabled=(settings.cognition_enabled if cognition_enabled is None else cognition_enabled),
        real_providers_enabled=real_providers_enabled,
        workspace_id=workspace_id,
    )
    registry = build_provider_registry(
        settings,
        real_providers_enabled=real_providers_enabled,
        workspace_id=workspace_id,
    )
    return _build_decision(request, classify_request(request), settings, registry)


def resolve_legacy_chat_route(
    content: str,
    mode: str | None,
    model_preference: str | None,
    routing_mode: str | None = "automático",
    *,
    cognition_enabled: bool | None = None,
    real_providers_enabled: bool = True,
    workspace_id: str | None = None,
) -> RouterDecision:
    decision = resolve_chat_route(
        content=content,
        mode=mode,
        model_preference=model_preference,
        routing_mode=routing_mode,
        cognition_enabled=cognition_enabled,
        real_providers_enabled=real_providers_enabled,
        workspace_id=workspace_id,
    )
    return RouterDecision(
        **{
            **decision.__dict__,
            "router_version": "legacy-bridge",
            "reason": f"ponte de compatibilidade ativa. {decision.reason}",
            "reason_codes": (ReasonCode.LEGACY_BRIDGE.value, *decision.reason_codes),
        }
    )
