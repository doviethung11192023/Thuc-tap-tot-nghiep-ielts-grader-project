"""
Đọc giá model từ nguồn công khai của nhà cung cấp (đồng bộ giá tự động, spec 008).

Alibaba Model Studio không có API trả giá model, nên đọc trang giá chính thức ở dạng Markdown.
Engine gọi endpoint dashscope-intl → vùng Singapore, phạm vi "International". Lấy bậc giá đầu tiên
(0 < token ≤ 128K/256K/1M): một lượt chấm chỉ vài nghìn token, không bao giờ chạm bậc sau.
Khi trang chính thức đổi cấu trúc và không đọc được, dùng bảng giá cộng đồng của LiteLLM làm dự phòng.

Giá lưu là giá niêm yết (Original). Giảm giá có thời hạn chỉ ghi chú, để ngân sách tính dư chứ không thiếu.
"""
import re
from typing import Any, Optional

import httpx

OFFICIAL_URL = "https://www.alibabacloud.com/help/en/model-studio/model-pricing.md"
LITELLM_URL = "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json"
OFFICIAL_REGION_TAB = "Singapore"           # khớp default_base_url = dashscope-intl.aliyuncs.com của engine
LITELLM_PREFIX = "dashscope/"
FETCH_TIMEOUT_SECONDS = 30

_TAB = re.compile(r'<Tab title="([^"]+)"')
_ROW = re.compile(r"<tr>(.*?)</tr>", re.S)
_CELL = re.compile(r"<td[^>]*>(.*?)</td>", re.S)
_DOLLAR = re.compile(r"\$\s*([0-9]+(?:\.[0-9]+)?)")


def _clean_cell(raw: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw)
    text = re.sub(r"^\s*>.*$", "", text, flags=re.M)     # dòng chú thích "> [Context cache](...)" trong ô
    return re.sub(r"\s+", " ", text).replace("\\$", "$").replace("\\<", "<").strip()


def _discount_note(cell: str) -> Optional[str]:
    match = re.search(r"\(([^)]*off[^)]*)\)", cell, re.I)
    return match.group(1).strip() if match else None


def parse_official_prices(markdown: str, models: set[str],
                          region_tab: str = OFFICIAL_REGION_TAB) -> dict[str, dict[str, Any]]:
    """{model: {input_per_1m, output_per_1m, note}} cho các model tìm thấy trong tab vùng; bỏ qua model không có.

    Dòng đầu tiên của model trong tab vùng là bậc giá thấp nhất; các dòng bậc sau không có tên model nên bị bỏ qua.
    Cột giá là hai ô đầu tiên có ký hiệu $ (vào, ra); ô thứ ba nếu có là giá ra ở chế độ thinking.
    """
    tabs = [(m.start(), m.group(1)) for m in _TAB.finditer(markdown)]
    found: dict[str, dict[str, Any]] = {}
    for row in _ROW.finditer(markdown):
        cells = [_clean_cell(c) for c in _CELL.findall(row.group(1))]
        model = cells[0].split(" ")[0] if cells else ""
        if model not in models or model in found:
            continue
        tab = next((name for start, name in reversed(tabs) if start < row.start()), None)
        if tab != region_tab:
            continue
        priced = [c for c in cells[1:] if _DOLLAR.search(c)]
        if len(priced) < 2:
            continue
        found[model] = {"input_per_1m": float(_DOLLAR.search(priced[0]).group(1)),
                        "output_per_1m": float(_DOLLAR.search(priced[1]).group(1)),
                        "note": _discount_note(priced[0])}
    return found


def parse_litellm_prices(table: dict[str, Any], models: set[str]) -> dict[str, dict[str, Any]]:
    """Giá từ model_prices_and_context_window.json của LiteLLM (USD/token → USD/1M token), bậc đầu nếu có tier."""
    found: dict[str, dict[str, Any]] = {}
    for model in models:
        entry = table.get(LITELLM_PREFIX + model)
        if not isinstance(entry, dict):
            continue
        tiers = entry.get("tiered_pricing")
        base = tiers[0] if isinstance(tiers, list) and tiers and isinstance(tiers[0], dict) else entry
        cost_in, cost_out = base.get("input_cost_per_token"), base.get("output_cost_per_token")
        if isinstance(cost_in, (int, float)) and isinstance(cost_out, (int, float)):
            found[model] = {"input_per_1m": round(cost_in * 1e6, 6), "output_per_1m": round(cost_out * 1e6, 6),
                            "note": None}
    return found


def fetch_provider_prices(models: set[str]) -> tuple[dict[str, dict[str, Any]], dict[str, str], list[str]]:
    """(giá theo model, nguồn theo model, lỗi đọc nguồn). Nguồn chính thức trước, LiteLLM cho model còn thiếu."""
    prices: dict[str, dict[str, Any]] = {}
    sources: dict[str, str] = {}
    errors: list[str] = []
    with httpx.Client(timeout=FETCH_TIMEOUT_SECONDS, follow_redirects=True) as client:
        try:
            response = client.get(OFFICIAL_URL)
            response.raise_for_status()
            for model, price in parse_official_prices(response.text, models).items():
                prices[model], sources[model] = price, "alibaba_official"
        except Exception as e:
            errors.append(f"Trang giá Alibaba: {type(e).__name__}")
        missing = models - set(prices)
        if missing:
            try:
                response = client.get(LITELLM_URL)
                response.raise_for_status()
                for model, price in parse_litellm_prices(response.json(), missing).items():
                    prices[model], sources[model] = price, "litellm"
            except Exception as e:
                errors.append(f"Bảng giá LiteLLM: {type(e).__name__}")
    return prices, sources, errors
