"""
Pulls the Admin runtime config from the Core API and caches it (spec 008 R10).

- GET {CORE_API_URL}/api/v1/internal/ai-engine/runtime-config with X-AI-Engine-Secret, timeout 3 s.
- Cache 60 s. A failed fetch keeps the last good config and is retried after RETRY_AFTER_SECONDS,
  so a Core outage costs at most one 3 s wait per retry window, not one per request.
- Never fetched OK yet: an empty config, which means every value comes from .env.
"""
from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timezone
from typing import Callable

import httpx

from services.runtime_config.runtime_config_model import EMPTY_CONFIG, RuntimeConfig
from services.runtime_config.secret_redaction import redact_secrets
from settings.config import get_settings

logger = logging.getLogger(__name__)

CORE_PATH = "/api/v1/internal/ai-engine/runtime-config"
FETCH_TIMEOUT_SECONDS = 3.0
TTL_SECONDS = 60.0
RETRY_AFTER_SECONDS = 15.0

Fetcher = Callable[[], dict]


def fetch_from_core() -> dict:
    """One GET to Core; raises on any HTTP or network problem."""
    settings = get_settings()
    response = httpx.get(
        settings.core_api_url.rstrip("/") + CORE_PATH,
        headers={"X-AI-Engine-Secret": settings.ai_engine_secret.strip()},
        timeout=FETCH_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError("runtime-config response is not a JSON object")
    return payload


class RuntimeConfigClient:
    def __init__(self, fetcher: Fetcher = fetch_from_core, clock: Callable[[], float] = time.monotonic) -> None:
        self._fetcher = fetcher
        self._clock = clock
        self._lock = threading.Lock()
        self._config: RuntimeConfig = EMPTY_CONFIG
        self._has_good = False
        self._next_fetch_at = 0.0          # monotonic time before which the cache is trusted
        self._last_ok_at: datetime | None = None
        self._last_error: str | None = None

    # ── reading ──────────────────────────────────────────────────────────────
    def peek(self) -> RuntimeConfig:
        """Cached config without any network call (never blocks)."""
        return self._config

    def get(self) -> RuntimeConfig:
        """Cached config; refetches when the cache is older than the TTL. Blocking: call from a thread."""
        if self._clock() < self._next_fetch_at:
            return self._config
        with self._lock:
            if self._clock() >= self._next_fetch_at:     # another thread may have refreshed meanwhile
                self._fetch()
        return self._config

    def refresh(self) -> dict:
        """Drop the cache and fetch now. Returns the sync status plus fetched_at; never raises."""
        with self._lock:
            self._fetch()
        return {**self.status(), "fetched_at": datetime.now(timezone.utc).isoformat()}

    def status(self) -> dict:
        return {
            "source": "core" if self._has_good else "env",
            "version": self._config.version if self._has_good else None,
            "last_ok_at": self._last_ok_at.isoformat() if self._last_ok_at else None,
            "last_error": self._last_error,
        }

    # ── fetching ─────────────────────────────────────────────────────────────
    def _fetch(self) -> None:
        now = self._clock()
        try:
            config = RuntimeConfig.model_validate(self._fetcher())
        except Exception as error:      # network, HTTP status, bad JSON or bad shape: keep the last good one
            known = [get_settings().ai_engine_secret, *self._config.secret_values()]
            self._last_error = redact_secrets(f"{type(error).__name__}: {error}", known)[:300]
            self._next_fetch_at = now + RETRY_AFTER_SECONDS
            logger.warning("Runtime config fetch failed (%s): %s",
                           "using last good config" if self._has_good else "using .env", self._last_error)
            return
        self._config, self._has_good = config, True
        self._last_ok_at, self._last_error = datetime.now(timezone.utc), None
        self._next_fetch_at = now + TTL_SECONDS


_client: RuntimeConfigClient = RuntimeConfigClient()


def get_runtime_config_client() -> RuntimeConfigClient:
    return _client


def set_runtime_config_client(client: RuntimeConfigClient) -> None:
    """For tests and scripts: swap the process-wide client."""
    global _client
    _client = client
