"""
Phần giám sát của lời gọi AI engine (spec 008): ngữ cảnh lượt chấm gửi kèm request và token cộng qua các lần thử.

Ngữ cảnh đi qua contextvar thay vì tham số để chữ ký call_ai_grade* không đổi (test và script cũ vẫn chạy).
Engine trả `usage` và `trace_id` cả trong body lỗi 500/502; mỗi lần thử HTTP đều tốn token nên phải cộng dồn.
"""
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Iterator, Optional

_run_context: ContextVar[Optional[dict[str, str]]] = ContextVar("ai_engine_run_context", default=None)


@contextmanager
def run_context(run_id: str, attempt_id: Optional[str], skill: str, mode: Optional[str]) -> Iterator[None]:
    """Mọi lời gọi call_ai_grade* trong khối này gửi kèm run_id, attempt_id, skill, mode (engine mở trace theo run_id)."""
    values = {"run_id": run_id, "attempt_id": attempt_id, "skill": skill, "mode": mode}
    token = _run_context.set({k: str(v) for k, v in values.items() if v})
    try:
        yield
    finally:
        _run_context.reset(token)


def current_run_context() -> dict[str, str]:
    return dict(_run_context.get() or {})


def merge_usage(*usages: Optional[list[dict[str, Any]]]) -> list[dict[str, Any]]:
    """Cộng token theo model, giữ thứ tự xuất hiện đầu tiên; bỏ qua dòng sai dạng."""
    totals: dict[str, dict[str, Any]] = {}
    for usage in usages:
        for row in usage or []:
            if not isinstance(row, dict) or not row.get("model"):
                continue
            item = totals.setdefault(row["model"], {"model": row["model"], "input_tokens": 0, "output_tokens": 0})
            item["input_tokens"] += int(row.get("input_tokens") or 0)
            item["output_tokens"] += int(row.get("output_tokens") or 0)
    return list(totals.values())


def absorb_failed_response(response: Any, usage: list[dict[str, Any]],
                           trace_id: Optional[str]) -> tuple[list[dict[str, Any]], Optional[str]]:
    """Lần thử lỗi: lấy usage và trace_id trong body JSON (nếu có) cộng vào số đã có."""
    try:
        body = response.json()
    except Exception:
        return usage, trace_id
    if not isinstance(body, dict):
        return usage, trace_id
    return merge_usage(usage, body.get("usage")), body.get("trace_id") or trace_id


def finish_success(result: dict[str, Any], usage: list[dict[str, Any]], trace_id: Optional[str]) -> dict[str, Any]:
    """Lần thử thành công: gộp usage của các lần lỗi trước đó. Engine cũ không trả usage thì để nguyên."""
    if "usage" in result or usage:
        result["usage"] = merge_usage(usage, result.get("usage"))
    if not result.get("trace_id") and trace_id:
        result["trace_id"] = trace_id
    return result


class AIEngineError(RuntimeError):
    """Lỗi gọi AI engine (cùng thông điệp và kiểu gốc RuntimeError như trước) kèm token đã tốn."""

    def __init__(self, message: str, usage: Optional[list[dict[str, Any]]] = None, trace_id: Optional[str] = None):
        super().__init__(message)
        self.usage = usage or []
        self.trace_id = trace_id
