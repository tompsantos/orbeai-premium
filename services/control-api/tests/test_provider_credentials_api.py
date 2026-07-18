from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import WorkspaceSettings
from app.services.orbe_router import ExecutionStrategy, resolve_chat_route
from app.services.provider_credentials import resolve_provider_credential
from app.services.providers.real import ProviderExecutionResult


def test_provider_credential_is_encrypted_and_never_returned(client) -> None:
    raw_key = "test-openai-key-with-secret-tail-4821"

    response = client.put(
        "/v1/provider-credentials/openai",
        json={"api_key": raw_key, "model_name": "openai-test-model"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["configured"] is True
    assert payload["source"] == "workspace_vault"
    assert payload["key_hint"] == "••••4821"
    assert raw_key not in response.text
    assert "ciphertext" not in response.text

    listing = client.get("/v1/provider-credentials")
    assert listing.status_code == 200
    assert raw_key not in listing.text
    assert "ciphertext" not in listing.text

    workspace = client.get("/v1/workspace")
    assert workspace.status_code == 200
    assert raw_key not in workspace.text
    assert "provider_credentials" not in workspace.text
    assert "ciphertext" not in workspace.text

    with SessionLocal() as db:
        settings = db.scalar(select(WorkspaceSettings))
        assert settings is not None
        stored = settings.meta["provider_credentials"]["openai"]
        assert stored["ciphertext"] != raw_key
        resolved = resolve_provider_credential(settings.workspace_id, "openai", db=db)
        assert resolved is not None
        assert resolved.api_key == raw_key
        assert resolved.model_name == "openai-test-model"


def test_workspace_settings_cannot_overwrite_reserved_provider_vault(client) -> None:
    save = client.put(
        "/v1/provider-credentials/gemini",
        json={"api_key": "test-gemini-secret-9927", "model_name": "gemini-test-model"},
    )
    assert save.status_code == 200

    response = client.patch(
        "/v1/workspace/settings",
        json={"meta": {"provider_credentials": {}}},
    )
    assert response.status_code == 400

    listing = client.get("/v1/provider-credentials").json()
    gemini = next(item for item in listing if item["provider_slug"] == "gemini")
    assert gemini["configured"] is True
    assert gemini["key_hint"] == "••••9927"


def test_provider_test_uses_saved_credential_without_exposing_it(client, monkeypatch) -> None:
    save = client.put(
        "/v1/provider-credentials/nvidia",
        json={
            "api_key": "test-nvidia-secret-7714",
            "model_name": "nvidia/test-model",
        },
    )
    assert save.status_code == 200

    captured: dict[str, object] = {}

    def fake_execute_provider(**kwargs: object) -> ProviderExecutionResult:
        captured.update(kwargs)
        return ProviderExecutionResult(
            content="conexão ok",
            provider_name="nvidia",
            model_name="nvidia/test-model",
            input_tokens=5,
            output_tokens=2,
            latency_ms=12,
            estimated_cost_usd=0.0,
        )

    monkeypatch.setattr(
        "app.routers.provider_credentials.execute_provider",
        fake_execute_provider,
    )

    response = client.post("/v1/provider-credentials/nvidia/test")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["latency_ms"] == 12
    assert payload["provider"]["last_test_status"] == "success"
    assert captured["api_key_override"] == "test-nvidia-secret-7714"
    assert "test-nvidia-secret-7714" not in response.text


def test_router_can_select_nvidia_from_workspace_vault(client) -> None:
    save = client.put(
        "/v1/provider-credentials/nvidia",
        json={
            "api_key": "test-nvidia-secret-3318",
            "model_name": "nvidia/router-test-model",
        },
    )
    assert save.status_code == 200

    workspace_id = client.get("/v1/workspace").json()["id"]
    decision = resolve_chat_route(
        content="responda uma pergunta simples",
        mode="padrão",
        model_preference="nvidia",
        cognition_enabled=False,
        real_providers_enabled=True,
        workspace_id=workspace_id,
    )

    assert decision.execution_strategy is ExecutionStrategy.DIRECT_PROVIDER
    assert decision.provider_slug == "nvidia"
    assert decision.primary_provider_slug == "nvidia"
    assert decision.model_name == "nvidia/router-test-model"
    assert decision.primary_configured is True
    assert decision.execution_plan.provider_chain[0] == "nvidia"
