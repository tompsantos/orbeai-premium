from __future__ import annotations

import threading
from dataclasses import dataclass, field


@dataclass
class LiveRunOwner:
    request_id: str
    workspace_id: str
    user_id: str
    chat_id: str
    stop_requested: threading.Event = field(default_factory=threading.Event)


_RUNS: dict[str, LiveRunOwner] = {}
_LOCK = threading.RLock()


def register_live_run(owner: LiveRunOwner) -> None:
    with _LOCK:
        _RUNS[owner.request_id] = owner


def get_owned_live_run(request_id: str, workspace_id: str, user_id: str) -> LiveRunOwner | None:
    with _LOCK:
        owner = _RUNS.get(request_id)
        if owner is None:
            return None
        if owner.workspace_id != workspace_id or owner.user_id != user_id:
            return None
        return owner


def request_live_run_stop(request_id: str, workspace_id: str, user_id: str) -> bool:
    owner = get_owned_live_run(request_id, workspace_id, user_id)
    if owner is None:
        return False
    owner.stop_requested.set()
    return True


def live_run_stop_requested(request_id: str) -> bool:
    with _LOCK:
        owner = _RUNS.get(request_id)
        return bool(owner and owner.stop_requested.is_set())


def unregister_live_run(request_id: str) -> None:
    with _LOCK:
        _RUNS.pop(request_id, None)
