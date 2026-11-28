"""Test đóng gói / deploy: concurrency worker đọc từ env, và chặn /api/v1/internal/* khi đi qua Cloudflare."""
import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.internal_path_guard import BlockInternalFromInternetMiddleware
from app.worker.tasks import read_concurrency

ENV = "TEST_WORKER_CONCURRENCY"


def test_concurrency_uses_default_when_unset(monkeypatch):
    monkeypatch.delenv(ENV, raising=False)
    assert read_concurrency(ENV, 4) == 4


@pytest.mark.parametrize("raw,expected", [("8", 8), (" 2 ", 2), ("1", 1)])
def test_concurrency_reads_valid_value(monkeypatch, raw, expected):
    monkeypatch.setenv(ENV, raw)
    assert read_concurrency(ENV, 4) == expected


@pytest.mark.parametrize("raw", ["0", "-3", "abc", "2.5"])
def test_concurrency_invalid_falls_back_with_warning(monkeypatch, caplog, raw):
    monkeypatch.setenv(ENV, raw)
    with caplog.at_level(logging.WARNING, logger="app.worker.tasks"):
        assert read_concurrency(ENV, 1) == 1
    assert ENV in caplog.text


def test_concurrency_blank_uses_default(monkeypatch):
    monkeypatch.setenv(ENV, "  ")
    assert read_concurrency(ENV, 4) == 4


def _client() -> TestClient:
    app = FastAPI()
    app.add_middleware(BlockInternalFromInternetMiddleware)

    @app.get("/api/v1/internal/config")
    async def internal():
        return {"ok": True}

    @app.get("/api/v1/internalish")
    async def lookalike():
        return {"ok": True}

    @app.get("/api/v1/public")
    async def public():
        return {"ok": True}

    return TestClient(app)


def test_internal_path_blocked_when_via_cloudflare(caplog):
    with caplog.at_level(logging.WARNING, logger="app.core.internal_path_guard"):
        res = _client().get("/api/v1/internal/config", headers={"CF-Connecting-IP": "203.0.113.9"})
    assert res.status_code == 404
    assert res.json() == {"detail": "Not Found"}
    assert "/api/v1/internal/config" in caplog.text


def test_internal_path_allowed_without_cloudflare_header():
    res = _client().get("/api/v1/internal/config")
    assert res.status_code == 200


def test_other_paths_unaffected_by_cloudflare_header():
    client = _client()
    headers = {"CF-Connecting-IP": "203.0.113.9"}
    assert client.get("/api/v1/public", headers=headers).status_code == 200
    assert client.get("/api/v1/internalish", headers=headers).status_code == 200
