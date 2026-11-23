"""Đọc/ghi system_settings.ai_runtime_config và bảng ai_provider_secrets. Mọi truy cập DB của cấu hình AI nằm ở đây."""
from datetime import datetime, timezone
from typing import Any, Optional

from app.db.supabase import db
from app.services.ai_services.ai_step_catalog import RUNTIME_CONFIG_KEY

EMPTY_CONFIG: dict[str, Any] = {"steps": {}, "llm": {}, "jev": {}}


def read_runtime_config() -> dict[str, Any]:
    """{value: {steps, llm, jev}, updated_at, updated_by}; chưa có dòng thì value rỗng."""
    rows = db().table("system_settings").select("*").eq("key", RUNTIME_CONFIG_KEY).execute().data or []
    row = rows[0] if rows else {}
    value = row.get("value") if isinstance(row.get("value"), dict) else {}
    return {"value": {**EMPTY_CONFIG, **{k: v for k, v in value.items() if isinstance(v, dict)}},
            "updated_at": row.get("updated_at"), "updated_by": row.get("updated_by")}


def write_runtime_config(value: dict[str, Any], admin_id: str) -> None:
    db().table("system_settings").upsert({
        "key": RUNTIME_CONFIG_KEY, "value": value, "updated_by": admin_id, "admin_role": "admin",
        "updated_at": datetime.now(timezone.utc).isoformat()}, on_conflict="key").execute()


def read_secret_rows() -> list[dict[str, Any]]:
    return db().table("ai_provider_secrets").select("*").execute().data or []


def read_secret_row(provider: str) -> Optional[dict[str, Any]]:
    rows = db().table("ai_provider_secrets").select("*").eq("provider", provider).execute().data or []
    return rows[0] if rows else None


def upsert_secret(provider: str, ciphertext: str, last4: str, admin_id: str) -> None:
    db().table("ai_provider_secrets").upsert({
        "provider": provider, "ciphertext": ciphertext, "last4": last4, "updated_by": admin_id,
        "admin_role": "admin", "updated_at": datetime.now(timezone.utc).isoformat()},
        on_conflict="provider").execute()


def delete_secret(provider: str) -> None:
    db().table("ai_provider_secrets").delete().eq("provider", provider).execute()


def email_of(user_id: Optional[str]) -> Optional[str]:
    if not user_id:
        return None
    rows = db().table("profiles").select("id, email").eq("id", user_id).execute().data or []
    return rows[0].get("email") if rows else None
