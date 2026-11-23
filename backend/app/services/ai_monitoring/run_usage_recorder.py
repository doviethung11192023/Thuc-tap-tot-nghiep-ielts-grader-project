"""
Ghi trace id, token, chi phí và model vào grading_runs khi một lượt chấm kết thúc, cả done lẫn failed (spec 008).

Hàm ở đây chỉ dựng các cột cần cập nhật; service chấm của từng kỹ năng gộp vào lệnh update trạng thái.
Lỗi đọc bảng giá không được làm hỏng lượt chấm: chi phí để NULL (chưa rõ).
"""
from typing import Any, Optional

from app.services.ai_monitoring import model_pricing


def _cost(usage: list[dict[str, Any]]) -> Optional[float]:
    if not usage:
        return 0.0          # không gọi LLM (dùng lại kết quả cũ): khỏi đọc bảng giá
    try:
        return model_pricing.compute_cost(usage, model_pricing.get_prices())
    except Exception as e:
        print(f"⚠️ [Usage] không tính được chi phí: {e}")
        return None


def _main_model(usage: list[dict[str, Any]]) -> Optional[str]:
    """Nhiều model trong một lượt → model tốn token nhất (bước chấm chính); danh sách đủ nằm ở output.usage."""
    if not usage:
        return None
    return max(usage, key=lambda r: int(r.get("input_tokens") or 0) + int(r.get("output_tokens") or 0))["model"]


def usage_columns(usage: Optional[list[dict[str, Any]]], trace_id: Optional[str]) -> dict[str, Any]:
    """Cột usage của grading_runs. usage None (engine cũ không báo) → chỉ trace_id, không đoán số."""
    columns: dict[str, Any] = {"trace_id": trace_id} if trace_id else {}
    if usage is None:
        return columns
    columns.update(input_tokens=sum(int(r.get("input_tokens") or 0) for r in usage),
                   output_tokens=sum(int(r.get("output_tokens") or 0) for r in usage),
                   cost_usd=_cost(usage))
    return columns


def done_columns(ai: dict[str, Any]) -> dict[str, Any]:
    """Lượt thành công: kết quả engine có `usage`, `trace_id`. Kết quả dùng lại từ lượt cũ không tốn token."""
    if ai.get("cached_from_run_id"):
        return usage_columns([], None)
    return usage_columns(ai.get("usage"), ai.get("trace_id"))


def failed_columns(error: BaseException, result: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """Lượt lỗi: AIEngineError mang usage và trace của các lần thử.

    Lỗi sau khi engine đã trả kết quả (thiếu điểm, lưu DB lỗi) không mang usage, nhưng token đã tốn:
    lấy từ `result` (kết quả engine) để không bỏ sót chi phí.
    """
    if result is not None and result.get("usage") is not None:
        usage, trace_id = result["usage"], result.get("trace_id")
    else:
        usage, trace_id = getattr(error, "usage", None), getattr(error, "trace_id", None)
    columns = usage_columns(usage, trace_id)
    if usage:
        columns["model"] = _main_model(usage)
        columns["output"] = {"usage": usage}       # danh sách model đầy đủ cho trang chi tiết lượt chấm
    return columns
