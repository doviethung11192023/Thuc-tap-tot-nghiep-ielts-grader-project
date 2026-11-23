"""
Bảng giá model AI, ngân sách tháng và cách tính chi phí một lượt chấm (spec 008, R4).

system_settings.ai_model_prices = {"<model>": {"input_per_1m": số|null, "output_per_1m": số|null}} (USD / 1 triệu token).
Khoá của bảng này cũng là danh sách model được phép dùng. Giá null = model được phép nhưng chưa rõ giá.
"""
from typing import Any, Optional

from app.db.supabase import db

PRICES_KEY = "ai_model_prices"
BUDGET_KEY = "ai_monthly_budget_usd"
TRACE_DAYS_KEY = "trace_view_days"
DEFAULT_TRACE_VIEW_DAYS = 30


def read_setting(key: str) -> Any:
    """Giá trị JSON của một khoá system_settings; None khi chưa có dòng."""
    rows = db().table("system_settings").select("value").eq("key", key).execute().data
    return rows[0]["value"] if rows else None


def get_prices() -> dict[str, dict[str, Optional[float]]]:
    """Bảng giá đã chuẩn hoá: mọi model đều có đủ hai khoá, giá sai dạng thành None."""
    raw = read_setting(PRICES_KEY)
    prices: dict[str, dict[str, Optional[float]]] = {}
    for model, entry in (raw.items() if isinstance(raw, dict) else []):
        entry = entry if isinstance(entry, dict) else {}
        prices[model] = {"input_per_1m": _number(entry.get("input_per_1m")),
                         "output_per_1m": _number(entry.get("output_per_1m"))}
    return prices


def allowed_models() -> list[str]:
    """Các model được phép chọn: khoá của ai_model_prices (agent C dùng để kiểm ghi đè)."""
    return sorted(get_prices())


def get_budget() -> Optional[float]:
    """Ngân sách tháng (USD); None khi 0 hoặc để trống = không cảnh báo."""
    budget = _number(read_setting(BUDGET_KEY))
    return budget if budget and budget > 0 else None


def get_trace_view_days() -> int:
    days = _number(read_setting(TRACE_DAYS_KEY))
    return int(days) if days and days > 0 else DEFAULT_TRACE_VIEW_DAYS


def compute_cost(usage: Optional[list[dict[str, Any]]],
                 prices: dict[str, dict[str, Optional[float]]]) -> Optional[float]:
    """Σ (input/1e6 × giá input + output/1e6 × giá output). Model nào thiếu giá → None (chi phí chưa rõ).

    usage rỗng (lượt dùng lại kết quả cũ, không gọi LLM) → 0.0. usage None (engine không báo) → None.
    """
    if usage is None:
        return None
    total = 0.0
    for row in usage:
        price = prices.get(row.get("model") or "")
        if not is_priced(price):
            return None
        total += int(row.get("input_tokens") or 0) / 1e6 * price["input_per_1m"]
        total += int(row.get("output_tokens") or 0) / 1e6 * price["output_per_1m"]
    return round(total, 6)


def is_priced(price: Optional[dict[str, Optional[float]]]) -> bool:
    """Model đã có đủ giá vào và ra."""
    return bool(price) and price.get("input_per_1m") is not None and price.get("output_per_1m") is not None


def _number(value: Any) -> Optional[float]:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)
