"""Danh sách model cho phép = khoá của system_settings.ai_model_prices (FR-035).
Dùng allowed_models() của giám sát chi phí (agent B); chưa có file đó thì đọc thẳng system_settings."""
from app.db.supabase import db


def _read_price_keys() -> list[str]:
    rows = db().table("system_settings").select("*").eq("key", "ai_model_prices").execute().data or []
    value = rows[0].get("value") if rows else None
    return sorted(value) if isinstance(value, dict) else []


def get_allowed_models() -> list[str]:
    try:
        from app.services.ai_monitoring.model_pricing import allowed_models
    except ImportError:   # stub tạm đến khi model_pricing có mặt
        return _read_price_keys()
    return list(allowed_models())
