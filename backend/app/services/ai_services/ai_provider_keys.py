"""API key nhà cung cấp AI trong app (US10): xem trạng thái che, thay, quay về .env.
KHÔNG BAO GIỜ trả hoặc ghi log/audit key đầy đủ hay ciphertext (FR-045); audit chỉ có {last4, source}."""
from typing import Any

from app.core.domain_errors import ConflictError, NotFoundError
from app.services.admin.staff_accounts import write_audit
from app.services.ai_services import ai_runtime_config_store as store
from app.services.ai_services.ai_config_change_flow import refresh_engine_quietly, run_test_call
from app.services.ai_services.ai_runtime_config_service import load_effective_config
from app.services.ai_services.ai_secret_cipher import encrypt_secret, encryption_ready
from app.services.ai_services.ai_service_errors import UnprocessableError
from app.services.ai_services.ai_step_catalog import PROVIDERS


def _check_provider(provider: str) -> str:
    if provider not in PROVIDERS:
        raise NotFoundError(f"Không có nhà cung cấp '{provider}'")
    return PROVIDERS[provider][1]   # loại gọi thử của engine


def _env_key(effective: dict | None, provider: str) -> dict[str, Any]:
    return ((effective or {}).get("env_keys") or {}).get(provider) or {}


async def list_keys() -> list[dict[str, Any]]:
    rows = {r["provider"]: r for r in store.read_secret_rows()}
    effective = await load_effective_config()
    ready = encryption_ready()
    items = []
    for provider, (label, _kind) in PROVIDERS.items():
        row, env = rows.get(provider), _env_key(effective, provider)
        if row:
            source, last4 = "app", row.get("last4")
        elif env.get("configured"):
            source, last4 = "env", env.get("last4")
        else:
            source, last4 = "none", None
        items.append({"provider": provider, "label": label, "configured": source != "none", "last4": last4,
                      "source": source, "updated_at": row.get("updated_at") if row else None,
                      "updated_by_email": store.email_of(row.get("updated_by")) if row else None,
                      "encryption_ready": ready,
                      "env_known": effective is not None})   # False: engine tắt nên chưa biết key .env
    return items


async def replace_key(admin_id: str, provider: str, api_key: str) -> dict[str, Any]:
    kind = _check_provider(provider)
    api_key = (api_key or "").strip()
    if not 8 <= len(api_key) <= 512:
        raise UnprocessableError("API key phải dài từ 8 đến 512 ký tự")
    if not encryption_ready():
        raise ConflictError("Chưa bật mã hoá key: đặt AI_SECRETS_ENCRYPTION_KEY trong .env của Core")
    await run_test_call({"kind": kind, "api_key": api_key, "use_env_key": False}, secrets=[api_key])
    old = store.read_secret_row(provider)
    if old:
        before = {"last4": old.get("last4"), "source": "app"}
    else:
        env = _env_key(await load_effective_config(), provider)
        before = {"last4": env.get("last4"), "source": "env" if env.get("configured") else "none"}
    last4 = api_key[-4:]
    store.upsert_secret(provider, encrypt_secret(api_key), last4, admin_id)
    write_audit(admin_id, "replace_ai_provider_key", "ai_provider_secrets", provider,
                before=before, after={"last4": last4, "source": "app"})
    await refresh_engine_quietly()
    return {"provider": provider, "last4": last4, "source": "app"}


async def revert_to_env_key(admin_id: str, provider: str) -> dict[str, Any]:
    kind = _check_provider(provider)
    old = store.read_secret_row(provider)
    if not old:
        raise NotFoundError("Chưa có key lưu trong app để quay về .env")
    await run_test_call({"kind": kind, "api_key": None, "use_env_key": True})
    env = _env_key(await load_effective_config(), provider)
    store.delete_secret(provider)
    write_audit(admin_id, "revert_ai_provider_key", "ai_provider_secrets", provider,
                before={"last4": old.get("last4"), "source": "app"},
                after={"last4": env.get("last4"), "source": "env"})
    await refresh_engine_quietly()
    return {"provider": provider, "source": "env", "last4": env.get("last4")}
