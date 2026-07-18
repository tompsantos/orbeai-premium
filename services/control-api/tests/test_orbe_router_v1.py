from app.core.config import Settings
from app.services import orbe_router as router_module
from app.services.orbe_router import (
    CAPABILITY_REGISTRY,
    ExecutionStrategy,
    RouteKind,
    resolve_chat_route,
)
from app.services.provider_gateway import execute_provider_plan
from app.services.provider_registry import build_provider_registry
from app.services.providers.real import ProviderExecutionResult


def _configured_settings() -> Settings:
    return Settings(
        _env_file=None,
        ENABLE_REAL_PROVIDERS=True,
        OPENAI_API_KEY="pytest-openai",
        GEMINI_API_KEY="pytest-gemini",
        OPENAI_MODEL="openai-test-model",
        GEMINI_MODEL="gemini-test-model",
        COGNITION_ENABLED=True,
        PROVIDER_RETRY_ATTEMPTS=0,
    )


def test_router_v1_selects_direct_provider_for_simple_turn(monkeypatch) -> None:
    settings = _configured_settings()
    monkeypatch.setattr(router_module, "get_settings", lambda: settings)

    decision = resolve_chat_route(
        content="me explica de forma simples o que é a orbeAI",
        mode="strategist",
        model_preference="auto",
        cognition_enabled=True,
    )

    assert decision.router_version == "orbe-router-v1"
    assert decision.route_kind is RouteKind.DIRECT_MODEL
    assert decision.execution_strategy is ExecutionStrategy.DIRECT_PROVIDER
    assert decision.provider_slug == "openai"
    assert decision.model_name == "openai-test-model"
    assert decision.estimated_latency_ms is None
    assert decision.estimated_cost_usd is None
    assert decision.execution_plan.provider_chain == ("openai", "gemini", "nvidia", "mock")


def test_router_v1_sends_tool_request_to_cognition(monkeypatch) -> None:
    settings = _configured_settings()
    monkeypatch.setattr(router_module, "get_settings", lambda: settings)

    decision = resolve_chat_route(
        content="abra o github, edite o código, rode os testes e crie um pull request",
        mode="dev",
        model_preference="auto",
        cognition_enabled=True,
    )

    assert decision.route_kind is RouteKind.COGNITION
    assert decision.execution_strategy is ExecutionStrategy.COGNITION
    assert decision.provider_slug == "orbe-cognition"
    assert "tool_required" in decision.reason_codes
    assert "cognitive_loop" in decision.capability_ids


def test_future_capabilities_are_declared_without_fake_execution() -> None:
    assert CAPABILITY_REGISTRY["durable_mission"].implemented is False
    assert CAPABILITY_REGISTRY["monitoring_watch"].implemented is False
    assert CAPABILITY_REGISTRY["model_council"].implemented is False


def test_gateway_retries_chain_and_records_real_fallback(monkeypatch) -> None:
    settings = _configured_settings()
    monkeypatch.setattr(router_module, "get_settings", lambda: settings)
    decision = resolve_chat_route(
        content="responda uma pergunta simples",
        mode="strategist",
        model_preference="auto",
        cognition_enabled=False,
    )
    registry = build_provider_registry(settings)

    calls: list[str] = []

    def fake_execute_provider(**kwargs: object) -> ProviderExecutionResult:
        provider_slug = str(kwargs["provider_slug"])
        calls.append(provider_slug)
        if provider_slug == "openai":
            raise RuntimeError("openai indisponível no teste")
        return ProviderExecutionResult(
            content="resposta real de contingência",
            provider_name=provider_slug,
            model_name=f"{provider_slug}-test-model",
            input_tokens=10,
            output_tokens=6,
            latency_ms=2,
            estimated_cost_usd=0.0,
        )

    monkeypatch.setattr(
        "app.services.provider_gateway.execute_provider",
        fake_execute_provider,
    )

    execution = execute_provider_plan(
        decision.execution_plan,
        content="responda uma pergunta simples",
        mode="strategist",
        model_preference="auto",
        registry=registry,
    )

    assert calls == ["openai", "gemini"]
    assert execution.selected_provider_slug == "gemini"
    assert execution.used_fallback is True
    assert [attempt.status for attempt in execution.attempts] == ["failed", "success"]
