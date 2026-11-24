"""Universal Multi-Namespace LLM Telemetry, Token Accounting & FinOps Store (tái sử dụng cho Tutor, Writing, Speaking)."""
import asyncio
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.services.tutor.tutor_telemetry_pricing import (
    MODEL_PRICING_PER_1M,
    compute_llm_cost_usd,
    new_telemetry_daily_bucket,
)

__all__ = [
    "MODEL_PRICING_PER_1M",
    "compute_llm_cost_usd",
    "get_llm_telemetry_report",
    "record_llm_feedback_telemetry",
    "record_llm_turn_telemetry",
]

VN_TZ = timezone(timedelta(hours=7))
TTL_14_DAYS = 14 * 86400
MAX_RECENT_TRACES = 40

_io_lock = asyncio.Lock()
_mem_daily: Dict[str, Dict[str, Any]] = {}
_mem_traces: Dict[str, List[Dict[str, Any]]] = {}


def _today_vn() -> str:
    return datetime.now(VN_TZ).strftime("%Y-%m-%d")


def _is_redis_usable(rc: Any) -> bool:
    return rc is not None and type(rc).__name__ != "NullRedisCache"


async def _load_json(rc: Any, key: str, default: Any, mem_store: Dict[str, Any]) -> Any:
    if _is_redis_usable(rc):
        try:
            raw = await rc.get(key)
            if raw:
                return json.loads(raw.decode("utf-8") if isinstance(raw, bytes) else str(raw))
        except Exception:
            pass
    val = mem_store.get(key)
    return json.loads(json.dumps(val)) if val is not None else default


async def _save_json(rc: Any, key: str, val: Any, mem_store: Dict[str, Any]) -> None:
    mem_store[key] = val
    if _is_redis_usable(rc):
        try:
            await rc.setex(key, TTL_14_DAYS, json.dumps(val, ensure_ascii=False))
        except Exception:
            pass


async def record_llm_turn_telemetry(rc: Any, *, namespace: str = "tutor", data: Dict[str, Any]) -> None:
    """Ghi nhận 1 lượt gọi AI (SSE stream hoặc cache hit) vào bộ đếm ngày & ring-buffer 40 trace gần nhất."""
    day = _today_vn()
    d_key, t_key = f"llm:telemetry:{namespace}:{day}", f"llm:traces:{namespace}:recent"
    cached = bool(data.get("cached"))
    provider, model = str(data.get("provider") or "qwen"), str(data.get("model") or "qwen-flash")
    p_tok, c_tok = int(data.get("prompt_tokens") or 0), int(data.get("completion_tokens") or 0)
    t_tok = int(data.get("total_tokens") or (p_tok + c_tok))
    saved_tok = int(data.get("cached_tokens_saved") or 0)
    cost = 0.0 if cached else compute_llm_cost_usd(model, p_tok, c_tok)
    saved_cost = compute_llm_cost_usd(model, int(saved_tok * 0.78), int(saved_tok * 0.22)) if saved_tok > 0 else 0.0

    async with _io_lock:
        b = {**new_telemetry_daily_bucket(), **await _load_json(rc, d_key, new_telemetry_daily_bucket(), _mem_daily)}
        tier_k = "unlock" if data.get("unlocked") else f"tier{min(3, max(1, int(data.get('hint_tier') or 1)))}"
        b["tier_turns"][tier_k] = int(b["tier_turns"].get(tier_k, 0)) + 1
        if cached:
            b["cached_tokens_saved"] += saved_tok
            b["cost_saved_usd"] = round(float(b["cost_saved_usd"]) + saved_cost, 6)
        else:
            b["prompt_tokens"] += p_tok
            b["completion_tokens"] += c_tok
            b["total_tokens"] += t_tok
            b["cached_prompt_tokens"] += int(data.get("cached_prompt_tokens") or 0)
            b["cost_usd"] = round(float(b["cost_usd"]) + cost, 6)
            b["stream_turns"] += 1
            lat, ttft, tps = float(data.get("elapsed_ms") or 0), float(data.get("ttft_ms") or 0), float(data.get("tokens_per_sec") or 0)
            b["latency_ms_sum"] += lat
            b["ttft_ms_sum"] += ttft
            b["tps_sum"] += tps
            b["max_latency_ms"] = max(float(b["max_latency_ms"]), lat)
            rcnt = int(data.get("redaction_count") or (1 if data.get("redacted") else 0))
            if rcnt > 0:
                b["redactions_count"] += rcnt
                b["redacted_turns"] += 1
            if str(data.get("finish_reason") or "") == "length":
                b["truncated_turns"] += 1
            sk = str(data.get("skill") or "reading").lower()
            if sk in b["skill_tokens"]:
                b["skill_tokens"][sk] += t_tok
            cbd = data.get("context_breakdown") or {}
            for k in ("system", "passage", "questions", "history", "query"):
                b["context_tokens"][k] += int(cbd.get(f"{k}_tokens") or 0)
            mkey = f"{provider}:{model}"
            m = b["models"].get(mkey, {"provider_model": mkey, "turns": 0, "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0, "cost_usd": 0.0})
            m["turns"] += 1
            m["prompt_tokens"] += p_tok
            m["completion_tokens"] += c_tok
            m["total_tokens"] += t_tok
            m["cost_usd"] = round(float(m["cost_usd"]) + cost, 6)
            b["models"][mkey] = m
        await _save_json(rc, d_key, b, _mem_daily)

        traces: List[Dict[str, Any]] = await _load_json(rc, t_key, [], _mem_traces)
        traces.insert(0, {
            "trace_id": str(uuid.uuid4())[:10], "message_id": str(data.get("message_id") or ""),
            "timestamp": datetime.now(VN_TZ).isoformat(), "namespace": namespace,
            "skill": str(data.get("skill") or ""), "test_id": str(data.get("test_id") or ""),
            "test_title": str(data.get("test_title") or "")[:60], "section_no": data.get("section_no"),
            "target_question_no": data.get("target_question_no"), "hint_tier": int(data.get("hint_tier") or 1),
            "unlocked": bool(data.get("unlocked")), "cached": cached, "provider": provider, "model": model,
            "failover_used": bool(data.get("failover_used")), "prompt_tokens": p_tok, "completion_tokens": c_tok,
            "total_tokens": t_tok, "cached_tokens_saved": saved_tok, "token_source": "cache" if cached else str(data.get("token_source") or "estimated"),
            "cost_usd": cost, "ttft_ms": round(float(data.get("ttft_ms") or 0), 1), "elapsed_ms": round(float(data.get("elapsed_ms") or 0), 1),
            "tokens_per_sec": round(float(data.get("tokens_per_sec") or 0), 1), "finish_reason": str(data.get("finish_reason") or "stop"),
            "redacted": bool(data.get("redacted")), "redaction_count": int(data.get("redaction_count") or 0),
            "question_preview": str(data.get("question_preview") or "")[:100], "answer_preview": str(data.get("answer_preview") or "")[:160],
            "feedback": None,
        })
        await _save_json(rc, t_key, traces[:MAX_RECENT_TRACES], _mem_traces)


async def record_llm_feedback_telemetry(rc: Any, *, message_id: str, rating: str, namespace: str = "tutor") -> None:
    """Cập nhật tỷ lệ hài lòng CSAT (Thumbs Up/Down) theo ngày và gắn trực tiếp vào Trace gần nhất."""
    day = _today_vn()
    d_key, t_key = f"llm:telemetry:{namespace}:{day}", f"llm:traces:{namespace}:recent"
    async with _io_lock:
        b = {**new_telemetry_daily_bucket(), **await _load_json(rc, d_key, new_telemetry_daily_bucket(), _mem_daily)}
        traces: List[Dict[str, Any]] = await _load_json(rc, t_key, [], _mem_traces)
        prev_rating: Optional[str] = None
        for tr in traces:
            if tr.get("message_id") == message_id:
                prev_rating = tr.get("feedback")
                tr["feedback"] = rating
                break
        if prev_rating != rating:
            if prev_rating in ("up", "down"):
                k_old = "thumbs_up" if prev_rating == "up" else "thumbs_down"
                b[k_old] = max(0, int(b[k_old]) - 1)
            k_new = "thumbs_up" if rating == "up" else "thumbs_down"
            b[k_new] = int(b[k_new]) + 1
            await _save_json(rc, d_key, b, _mem_daily)
        await _save_json(rc, t_key, traces, _mem_traces)


async def get_llm_telemetry_report(rc: Any, namespace: str = "tutor") -> Dict[str, Any]:
    day = _today_vn()
    b = {**new_telemetry_daily_bucket(), **await _load_json(rc, f"llm:telemetry:{namespace}:{day}", new_telemetry_daily_bucket(), _mem_daily)}
    traces: List[Dict[str, Any]] = await _load_json(rc, f"llm:traces:{namespace}:recent", [], _mem_traces)
    st = max(1, int(b["stream_turns"])) if b["stream_turns"] > 0 else 0
    ctx_tot = max(1, sum(int(v) for v in b["context_tokens"].values()))
    fb_tot = int(b["thumbs_up"]) + int(b["thumbs_down"])
    return {
        "namespace": namespace,
        "prompt_tokens_today": int(b["prompt_tokens"]),
        "completion_tokens_today": int(b["completion_tokens"]),
        "total_tokens_today": int(b["total_tokens"]),
        "cached_prompt_tokens_today": int(b["cached_prompt_tokens"]),
        "cached_tokens_saved_today": int(b["cached_tokens_saved"]),
        "avg_tokens_per_turn": round(b["total_tokens"] / st, 1) if st else 0.0,
        "estimated_cost_usd_today": round(float(b["cost_usd"]), 6),
        "cost_saved_usd_today": round(float(b["cost_saved_usd"]), 6),
        "avg_ttft_ms": round(b["ttft_ms_sum"] / st, 1) if st else 0.0,
        "avg_latency_ms": round(b["latency_ms_sum"] / st, 1) if st else 0.0,
        "max_latency_ms": round(float(b["max_latency_ms"]), 1),
        "avg_tokens_per_sec": round(b["tps_sum"] / st, 1) if st else 0.0,
        "stream_turns_today": int(b["stream_turns"]),
        "redactions_today": int(b["redactions_count"]),
        "redacted_turns_today": int(b["redacted_turns"]),
        "truncated_turns_today": int(b["truncated_turns"]),
        "thumbs_up_today": int(b["thumbs_up"]),
        "thumbs_down_today": int(b["thumbs_down"]),
        "csat_pct": round((b["thumbs_up"] / fb_tot) * 100.0, 1) if fb_tot > 0 else None,
        "skill_tokens": b["skill_tokens"],
        "tier_turns": b["tier_turns"],
        "context_share_pct": {k: round((int(v) / ctx_tot) * 100.0, 1) if sum(int(x) for x in b["context_tokens"].values()) > 0 else 0.0 for k, v in b["context_tokens"].items()},
        "models_breakdown": sorted(b["models"].values(), key=lambda x: -int(x.get("total_tokens", 0))),
        "recent_traces": traces[:30],
    }
