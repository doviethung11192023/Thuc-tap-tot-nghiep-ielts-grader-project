"""Universal AI-Engine Token & Stream Latency Profiler (tái sử dụng cho SSE Tutor và Batch Grading)."""
from math import ceil
from time import perf_counter
from typing import Any, Dict, List, Optional


def estimate_tokens(text: str) -> int:
    """Ước lượng BPE token an toàn (~3.6 UTF-8 bytes/token) khi provider không trả usage."""
    if not text:
        return 0
    return max(1, int(ceil(len(text.encode("utf-8")) / 3.6)))


def _split_system_sections(sys_text: str) -> Dict[str, int]:
    """Tách hệ thống chỉ thị vs ngữ cảnh đề thi vs passage/transcript từ system prompt."""
    ctx_marker = "=== NGỮ CẢNH ĐỀ THI ===" if "=== NGỮ CẢNH ĐỀ THI ===" in sys_text else "=== TEST CONTEXT ==="
    mat_marker = "=== NỘI DUNG BÀI ĐỌC" if "=== NỘI DUNG BÀI ĐỌC" in sys_text else (
        "=== TRANSCRIPT BÀI NGHE" if "=== TRANSCRIPT BÀI NGHE" in sys_text else "=== MATERIAL ==="
    )
    if ctx_marker in sys_text and mat_marker in sys_text:
        p_sys, rest = sys_text.split(ctx_marker, 1)
        p_q, p_mat = rest.split(mat_marker, 1)
        return {
            "system": estimate_tokens(p_sys),
            "questions": estimate_tokens(p_q),
            "passage": estimate_tokens(p_mat),
        }
    return {"system": estimate_tokens(sys_text), "questions": 0, "passage": 0}


def estimate_context_breakdown(messages: List[Dict[str, str]], req: Dict[str, Any]) -> Dict[str, int]:
    """Phân rã Input Tokens theo 5 thành phần ngữ cảnh: system, passage, questions, history, query."""
    sys_parts = _split_system_sections(messages[0]["content"] if messages else "")
    ctx_tok = estimate_tokens(str(req.get("context_text") or "")[:9500])
    passage_tok = sys_parts["passage"] or ctx_tok
    hist_tok = sum(estimate_tokens(m.get("content", "")) for m in messages[1:-1] if m.get("role") in ("user", "assistant"))
    extra_sys_tok = sum(estimate_tokens(m.get("content", "")) for m in messages[1:-1] if m.get("role") == "system")
    query_tok = estimate_tokens(messages[-1].get("content", "")) if messages else 0
    system_tok = sys_parts["system"] + extra_sys_tok
    questions_tok = sys_parts["questions"]
    return {
        "system_tokens": system_tok,
        "passage_tokens": passage_tok,
        "questions_tokens": questions_tok,
        "history_tokens": hist_tok,
        "query_tokens": query_tok,
        "estimated_prompt_tokens": system_tok + passage_tok + questions_tok + hist_tok + query_tok,
    }


def extract_usage_from_chunk(chunk: Any) -> Optional[Dict[str, int]]:
    """Trích xuất token usage chính thức từ OpenAI/Qwen/Groq/Gemini chunk cuối hoặc response."""
    usage = getattr(chunk, "usage", None)
    if not usage:
        return None
    prompt_tok = int(getattr(usage, "prompt_tokens", 0) or 0)
    comp_tok = int(getattr(usage, "completion_tokens", 0) or 0)
    total_tok = int(getattr(usage, "total_tokens", 0) or (prompt_tok + comp_tok))
    if total_tok <= 0 and prompt_tok <= 0 and comp_tok <= 0:
        return None
    details = getattr(usage, "prompt_tokens_details", None)
    cached_tok = int(getattr(details, "cached_tokens", 0) or 0) if details else 0
    return {
        "prompt_tokens": prompt_tok,
        "completion_tokens": comp_tok,
        "total_tokens": total_tok,
        "cached_tokens": cached_tok,
    }


def finalize_stream_telemetry(
    started_at: float,
    ttft_ms: Optional[float],
    provider_usage: Optional[Dict[str, int]],
    emitted_text: str,
    context_breakdown: Dict[str, int],
    finish_reason: str,
    redaction_count: int,
) -> Dict[str, Any]:
    """Tổng hợp toàn bộ tham số Token, TTFT, Elapsed Latency, TPS và Redactions cho event done."""
    elapsed_ms = max(1.0, round((perf_counter() - started_at) * 1000.0, 1))
    resolved_ttft = elapsed_ms if ttft_ms is None else min(elapsed_ms, max(1.0, round(ttft_ms, 1)))
    if provider_usage and provider_usage.get("total_tokens", 0) > 0:
        p_tok = int(provider_usage.get("prompt_tokens", 0))
        c_tok = int(provider_usage.get("completion_tokens", 0))
        t_tok = int(provider_usage.get("total_tokens", p_tok + c_tok))
        cached_tok = int(provider_usage.get("cached_tokens", 0))
        source = "provider_usage"
    else:
        p_tok = int(context_breakdown.get("estimated_prompt_tokens", 0))
        c_tok = estimate_tokens(emitted_text)
        t_tok = p_tok + c_tok
        cached_tok = 0
        source = "estimated"
    gen_sec = max(0.05, (elapsed_ms - resolved_ttft) / 1000.0)
    tps = round(c_tok / gen_sec, 1) if c_tok > 0 else 0.0
    return {
        "elapsed_ms": elapsed_ms,
        "ttft_ms": resolved_ttft,
        "tokens_per_sec": tps,
        "finish_reason": finish_reason or "stop",
        "redaction_count": int(redaction_count),
        "prompt_tokens": p_tok,
        "completion_tokens": c_tok,
        "total_tokens": t_tok,
        "cached_prompt_tokens": cached_tok,
        "token_source": source,
        "context_breakdown": context_breakdown,
    }
