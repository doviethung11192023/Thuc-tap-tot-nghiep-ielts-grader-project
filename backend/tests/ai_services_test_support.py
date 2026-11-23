"""Đồ dùng chung cho test_ai_services_*: app thật với DB giả, engine giả, key mã hoá thật."""
from typing import Any, Callable

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from app.clients.ai_engine import admin_client as engine_client
from app.core.config import settings
from app.core.security import User, get_current_active_user
from app.main import app
from fake_supabase import FakeSupabase

ADMIN_ID = "aaaaaaaa-0000-0000-0000-000000000001"
SECRET = "engine-secret-for-tests"
ENV_KEY_LAST4 = "ENV4"

EFFECTIVE = {
    "steps": [{"step": "writing_rewrite", "prompts": ["writing/task1/rewrite", "writing/task2/rewrite"],
               "model": {"value": "qwen-flash", "source": "langfuse"},
               "temperature": {"value": 0.2, "source": "langfuse"},
               "max_tokens": {"value": 4000, "source": "langfuse"}}],
    "llm": {"timeout_seconds": {"value": 180, "source": "env"}, "enable_thinking": {"value": False, "source": "env"}},
    "jev": {"model": {"value": "jev-latest", "source": "env"}, "timeout_seconds": {"value": 5, "source": "env"}},
    "env_keys": {"dashscope": {"configured": True, "last4": ENV_KEY_LAST4},
                 "typesafe": {"configured": False, "last4": None}},
    "config_sync": {"source": "core", "last_ok_at": None, "last_error": None},
}


class FakeEngine:
    """Thay _request của client engine: ghi lại mọi lời gọi, trả theo bảng routes hoặc ném lỗi."""

    def __init__(self):
        self.calls: list[dict[str, Any]] = []
        self.routes: dict[tuple[str, str], Any] = {
            ("GET", "/health"): {"status": "healthy"},
            ("GET", "/admin/services/effective-config"): EFFECTIVE,
            ("POST", "/admin/services/test"): {"ok": True, "latency_ms": 120, "error": None},
            ("POST", "/admin/runtime-config/refresh"): {"source": "core", "version": "x", "fetched_at": "t"},
        }

    async def __call__(self, method, path, *, timeout, json=None, params=None):
        self.calls.append({"method": method, "path": path, "timeout": timeout, "json": json, "params": params})
        result = self.routes.get((method, path))
        if isinstance(result, Callable):
            result = result(json, params)
        if isinstance(result, Exception):
            raise result
        if result is None:
            raise engine_client.AiEngineUnavailable("Không kết nối được (ConnectError)")
        return result

    def paths(self) -> list[str]:
        return [c["path"] for c in self.calls]

    def by_path(self, path: str) -> list[dict[str, Any]]:
        return [c for c in self.calls if c["path"] == path]


@pytest.fixture
def fake_db(monkeypatch):
    db = FakeSupabase(
        system_settings=[{"key": "ai_model_prices", "value": {"qwen-flash": {}, "qwen3.7-plus": {}}}],
        profiles=[{"id": ADMIN_ID, "email": "admin@example.com", "role": "admin"}])
    from app.services.admin import staff_accounts
    from app.services.ai_services import ai_allowed_models, ai_runtime_config_store
    from app.api.endpoints.admin.content import core
    for module in (staff_accounts, ai_runtime_config_store, ai_allowed_models, core):
        monkeypatch.setattr(module, "db", lambda: db)
    from app.services.ai_monitoring import model_pricing
    monkeypatch.setattr(model_pricing, "db", lambda: db)
    return db


@pytest.fixture
def fake_engine(monkeypatch):
    engine = FakeEngine()
    monkeypatch.setattr(engine_client, "_request", engine)
    monkeypatch.setattr(settings, "AI_ENGINE_SECRET", SECRET)
    return engine


@pytest.fixture
def encryption_key(monkeypatch):
    key = Fernet.generate_key().decode()
    monkeypatch.setattr(settings, "AI_SECRETS_ENCRYPTION_KEY", key)
    return key


@pytest.fixture
def client(fake_db, fake_engine):
    """Đăng nhập là Admin; test vai trò khác dùng as_role()."""
    app.dependency_overrides[get_current_active_user] = lambda: User(id=ADMIN_ID, role="admin")
    yield TestClient(app)
    app.dependency_overrides.clear()


def as_role(role: str) -> None:
    app.dependency_overrides[get_current_active_user] = lambda: User(id=ADMIN_ID, role=role)


def audit_rows(db: FakeSupabase, action: str | None = None) -> list[dict[str, Any]]:
    rows = db.tables.get("audit_logs", [])
    return [r for r in rows if action is None or r["action"] == action]
