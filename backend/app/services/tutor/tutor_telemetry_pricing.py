"""Bảng đơn giá FinOps tham chiếu ($/1M tokens) và schema bucket thống kê LLM theo ngày."""
from typing import Any, Dict, Tuple

# Đơn giá FinOps ($ USD / 1M tokens) - khớp theo tiền tố model, mở rộng dễ dàng cho mọi provider
MODEL_PRICING_PER_1M: Tuple[Tuple[str, float, float], ...] = (
    ("qwen-flash", 0.05, 0.20),
    ("qwen-turbo", 0.05, 0.20),
    ("qwen-plus", 0.40, 1.20),
    ("qwen", 0.15, 0.60),
    ("llama-3.3-70b", 0.59, 0.79),
    ("llama", 0.20, 0.40),
    ("gemini-2.5-flash", 0.15, 0.60),
    ("gemini", 0.15, 0.60),
    ("gpt-4o-mini", 0.15, 0.60),
    ("gpt-4o", 2.50, 10.00),
    ("deepseek", 0.14, 0.28),
)


def compute_llm_cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    low = (model or "").lower()
    in_price, out_price = 0.15, 0.60
    for prefix, ip, op in MODEL_PRICING_PER_1M:
        if prefix in low:
            in_price, out_price = ip, op
            break
    return round((prompt_tokens * in_price + completion_tokens * out_price) / 1_000_000.0, 6)


def new_telemetry_daily_bucket() -> Dict[str, Any]:
    return {
        "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0,
        "cached_prompt_tokens": 0, "cached_tokens_saved": 0,
        "cost_usd": 0.0, "cost_saved_usd": 0.0,
        "stream_turns": 0, "ttft_ms_sum": 0.0, "latency_ms_sum": 0.0, "tps_sum": 0.0, "max_latency_ms": 0.0,
        "redactions_count": 0, "redacted_turns": 0, "truncated_turns": 0, "thumbs_up": 0, "thumbs_down": 0,
        "skill_tokens": {"reading": 0, "listening": 0},
        "tier_turns": {"tier1": 0, "tier2": 0, "tier3": 0, "unlock": 0},
        "context_tokens": {"system": 0, "passage": 0, "questions": 0, "history": 0, "query": 0},
        "models": {},
    }
