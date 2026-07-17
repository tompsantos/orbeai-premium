from app.main import app


def openapi_paths() -> dict:
    return app.openapi().get("paths", {})


def test_backend_foundation_required_paths_are_registered() -> None:
    paths = openapi_paths()

    required_paths = {
        "/health",
        "/v1/status",
        "/v1/projects",
        "/v1/chats",
        "/v1/chats/{chat_id}",
        "/v1/chats/{chat_id}/messages",
        "/v1/messages/{message_id}",
        "/v1/chat/send",
        "/v1/model-providers",
        "/v1/model-runs",
        "/v1/router/resolve",
        "/v1/artifacts",
        "/v1/artifacts/{artifact_id}",
        "/v1/artifacts/{artifact_id}/versions",
        "/v1/artifacts/{artifact_id}/export",
        "/v1/memories",
        "/v1/audit-logs",
        "/v1/feature-flags",
        "/v1/workspace",
        "/v1/workspace/settings",
    }

    missing = sorted(path for path in required_paths if path not in paths)

    assert missing == []


def test_backend_foundation_required_methods_are_registered() -> None:
    paths = openapi_paths()

    required_methods = {
        "/health": {"get"},
        "/v1/status": {"get"},
        "/v1/projects": {"get", "post"},
        "/v1/chats": {"get", "post"},
        "/v1/chats/{chat_id}": {"get", "patch", "delete"},
        "/v1/chats/{chat_id}/messages": {"get", "post"},
        "/v1/messages/{message_id}": {"get"},
        "/v1/chat/send": {"post"},
        "/v1/model-providers": {"get"},
        "/v1/model-runs": {"get"},
        "/v1/router/resolve": {"post"},
        "/v1/artifacts": {"get", "post"},
        "/v1/artifacts/{artifact_id}": {"get", "patch", "delete"},
        "/v1/artifacts/{artifact_id}/versions": {"post"},
        "/v1/artifacts/{artifact_id}/export": {"get"},
        "/v1/memories": {"get", "post"},
        "/v1/audit-logs": {"get", "post"},
        "/v1/feature-flags": {"get"},
        "/v1/workspace": {"get", "patch"},
        "/v1/workspace/settings": {"patch"},
    }

    failures: list[str] = []

    for path, methods in required_methods.items():
        registered = set(paths.get(path, {}).keys())
        missing = sorted(methods - registered)

        if missing:
            failures.append(f"{path}: missing {missing}; registered {sorted(registered)}")

    assert failures == []


def test_rejected_budget_endpoint_is_not_registered() -> None:
    paths = openapi_paths()

    budget_paths = sorted(path for path in paths if "budget" in path.lower())

    assert budget_paths == []
