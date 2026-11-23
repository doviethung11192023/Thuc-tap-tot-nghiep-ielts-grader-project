"""Xem và sửa bảng giá model, ngân sách tháng (US4, FR-016, FR-035). Không gọi thử nhà cung cấp."""
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.domain_errors import DomainError, InvalidRequestError
from app.db.supabase import db
from app.services.admin.staff_accounts import write_audit
from app.services.ai_monitoring import model_price_sync, model_pricing

RUNTIME_CONFIG_KEY = "ai_runtime_config"
PRICE_FIELDS = ("input_per_1m", "output_per_1m")


class PricingConflictError(DomainError):
    """Bỏ model đang được bước AI ghi đè sử dụng (422)."""
    status_code = 422


def models_in_use() -> list[dict[str, Any]]:
    """Model mà Admin đang ghi đè cho từng bước: [{model, steps: [khoá bước]}]."""
    config = model_pricing.read_setting(RUNTIME_CONFIG_KEY)
    steps = config.get("steps") if isinstance(config, dict) else None
    by_model: dict[str, list[str]] = {}
    for step, override in (steps.items() if isinstance(steps, dict) else []):
        model = override.get("model") if isinstance(override, dict) else None
        if model:
            by_model.setdefault(model, []).append(step)
    return [{"model": model, "steps": sorted(names)} for model, names in sorted(by_model.items())]


def get_pricing() -> dict[str, Any]:
    return {"prices": model_pricing.get_prices(), "budget_usd": model_pricing.get_budget(),
            "models_in_use": models_in_use(), "sync": model_price_sync.get_sync_status()}


def _clean_prices(prices: Any) -> dict[str, dict[str, Optional[float]]]:
    if not isinstance(prices, dict) or not prices:
        raise InvalidRequestError("Bảng giá cần ít nhất một model")
    cleaned: dict[str, dict[str, Optional[float]]] = {}
    for model, entry in prices.items():
        name = model.strip() if isinstance(model, str) else ""
        if not name or len(name) > 100:
            raise InvalidRequestError("Tên model không hợp lệ")
        entry = entry if isinstance(entry, dict) else {}
        cleaned[name] = {field: _price(entry.get(field), name, field) for field in PRICE_FIELDS}
    return cleaned


def _price(value: Any, model: str, field: str) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value < 0:
        raise InvalidRequestError(f"Giá {field} của {model} phải là số không âm hoặc để trống")
    return float(value)


def _save_setting(key: str, value: Any, admin_id: str) -> None:
    db().table("system_settings").upsert({
        "key": key, "value": value, "updated_by": admin_id, "admin_role": "admin",
        "updated_at": datetime.now(timezone.utc).isoformat()}).execute()


def _update_prices(admin_id: str, prices: Any) -> None:
    new = _clean_prices(prices)
    blocked = [item for item in models_in_use() if item["model"] not in new]
    if blocked:
        detail = "; ".join(f"{b['model']} (bước {', '.join(b['steps'])})" for b in blocked)
        raise PricingConflictError(f"Không bỏ được model đang được bước AI sử dụng: {detail}")
    old = model_pricing.get_prices()
    if new == old:      # form gửi lại cả bảng giá dù chỉ sửa ngân sách: không ghi, không audit
        return
    _save_setting(model_pricing.PRICES_KEY, new, admin_id)
    write_audit(admin_id, "update_ai_model_prices", "system_settings", model_pricing.PRICES_KEY,
                before={"prices": old}, after={"prices": new})


def _check_budget(budget: Any) -> None:
    if budget is not None and (isinstance(budget, bool) or not isinstance(budget, (int, float)) or budget < 0):
        raise InvalidRequestError("Ngân sách phải là số không âm hoặc để trống")


def _update_budget(admin_id: str, budget: Any) -> None:
    old = model_pricing.get_budget()
    if old == (float(budget) if budget else None):   # ngân sách không đổi: không ghi, không audit
        return
    # system_settings.value không nhận NULL: 0 nghĩa là tắt cảnh báo ngân sách
    _save_setting(model_pricing.BUDGET_KEY, float(budget) if budget else 0, admin_id)
    write_audit(admin_id, "update_ai_budget", "system_settings", model_pricing.BUDGET_KEY,
                before={"budget_usd": old}, after={"budget_usd": float(budget) if budget else None})


def update_pricing(admin_id: str, prices: Any = None, budget_usd: Any = None, *,
                   has_prices: bool = False, has_budget: bool = False) -> dict[str, Any]:
    """has_*: trường có mặt trong body (budget_usd = null là "tắt ngân sách", khác với không gửi)."""
    if has_budget:
        _check_budget(budget_usd)  # kiểm cả hai trước khi ghi, để lỗi không để lại nửa thay đổi
    if has_prices:
        _update_prices(admin_id, prices)
    if has_budget:
        _update_budget(admin_id, budget_usd)
    return get_pricing()
