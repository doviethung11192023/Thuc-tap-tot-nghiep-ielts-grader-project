"""
Đồng bộ bảng giá model với giá công khai của nhà cung cấp: cron mỗi ngày và nút "Cập nhật giá" của Admin.

- Chỉ cập nhật model đã có trong bảng giá (khoá của bảng = danh sách model được phép, không tự thêm/bớt).
- Giá đổi → lưu bảng giá mới và ghi audit (actor system khi cron, admin khi bấm nút), kèm giá cũ để tra lại.
- Model không tìm thấy ở nguồn nào → giữ giá đang có. Đọc nguồn lỗi hoàn toàn → không ghi gì vào bảng giá.
- Chi phí đã chốt vào grading_runs.cost_usd lúc chấm, nên giá mới chỉ áp cho lượt chấm sau đó.
Kết quả lần kiểm gần nhất lưu ở system_settings.ai_model_price_sync để tab Chi phí hiện.
"""
from datetime import datetime, timezone
from typing import Any, Optional

from app.db.supabase import db
from app.services.admin.staff_accounts import write_audit
from app.services.ai_monitoring import model_pricing
from app.services.ai_monitoring.model_price_sources import fetch_provider_prices

SYNC_STATUS_KEY = "ai_model_price_sync"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _save(key: str, value: Any, admin_id: Optional[str]) -> None:
    """Cron ghi với updated_by NULL (hệ thống); CHECK bắt updated_by và admin_role cùng NULL hoặc cùng có."""
    db().table("system_settings").upsert({
        "key": key, "value": value, "updated_at": _now(),
        "updated_by": admin_id, "admin_role": "admin" if admin_id else None}, on_conflict="key").execute()


def get_sync_status() -> Optional[dict[str, Any]]:
    status = model_pricing.read_setting(SYNC_STATUS_KEY)
    return status if isinstance(status, dict) else None


def _same(old: dict[str, Optional[float]], new: dict[str, Any]) -> bool:
    return old.get("input_per_1m") == new["input_per_1m"] and old.get("output_per_1m") == new["output_per_1m"]


def sync_model_prices(admin_id: Optional[str] = None) -> dict[str, Any]:
    """Kiểm giá mọi model trong bảng giá với nguồn nhà cung cấp; trả trạng thái lần kiểm này."""
    current = model_pricing.get_prices()
    fetched, sources, errors = fetch_provider_prices(set(current))
    checked_at = _now()
    previous_status = get_sync_status() or {}
    models: dict[str, dict[str, Any]] = {}
    updated = dict(current)
    for model, old in current.items():
        price = fetched.get(model)
        if price is None:
            models[model] = {"status": "not_found", "source": None, "note": None}
            continue
        changed = not _same(old, price)
        models[model] = {"status": "updated" if changed else "unchanged", "source": sources[model],
                         "note": price.get("note"), **({"previous": old} if changed else {})}
        if changed:
            updated[model] = {"input_per_1m": price["input_per_1m"], "output_per_1m": price["output_per_1m"]}

    changed_models = [m for m, r in models.items() if r["status"] == "updated"]
    if changed_models:
        _save(model_pricing.PRICES_KEY, updated, admin_id)
        write_audit(admin_id, "sync_ai_model_prices", "system_settings", model_pricing.PRICES_KEY,
                    before={"prices": {m: current[m] for m in changed_models}},
                    after={"prices": {m: updated[m] for m in changed_models},
                           "sources": {m: sources[m] for m in changed_models}})
    status = {"checked_at": checked_at, "errors": errors, "models": models,
              "last_change_at": checked_at if changed_models else previous_status.get("last_change_at")}
    _save(SYNC_STATUS_KEY, status, admin_id)
    return status
