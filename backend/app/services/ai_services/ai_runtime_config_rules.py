"""Kiểm giá trị cấu hình chạy theo khoảng FR-036 và danh sách model cho phép (FR-035)."""
from typing import Any, Iterable

from app.services.ai_services.ai_service_errors import UnprocessableError
from app.services.ai_services.ai_step_catalog import RANGES

# Trường được phép đặt theo nhóm
GROUP_FIELDS: dict[str, tuple[str, ...]] = {
    "steps": ("model", "temperature", "max_tokens"),
    "llm": ("timeout_seconds", "enable_thinking"),
    "jev": ("model", "timeout_seconds"),
}


def _in_range(range_key: str, value: Any) -> None:
    low, high, label = RANGES[range_key]
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not low <= value <= high:
        raise UnprocessableError(f"{label} phải nằm trong khoảng {low:g} đến {high:g}")


def validate_changes(group: str, changes: dict[str, Any], allowed_models: Iterable[str]) -> None:
    """changes chỉ gồm trường client gửi; null = bỏ ghi đè nên không cần kiểm."""
    if not changes:
        raise UnprocessableError("Không có trường nào để lưu")
    for field, value in changes.items():
        if value is None:
            continue
        if field == "model":
            if not isinstance(value, str) or not value.strip() or len(value) > 100:
                raise UnprocessableError("Tên model không hợp lệ")
            allowed = sorted(allowed_models)
            # Model Jev đến từ nhà cung cấp khác nên không ràng buộc bởi bảng giá
            if group == "steps" and value not in allowed:
                raise UnprocessableError(f"Model '{value}' không nằm trong danh sách cho phép: {', '.join(allowed)}")
        elif field == "temperature":
            _in_range("temperature", value)
        elif field == "max_tokens":
            if isinstance(value, float) and not value.is_integer():
                raise UnprocessableError("max_tokens phải là số nguyên")
            _in_range("max_tokens", value)
        elif field == "timeout_seconds":
            _in_range(f"{group}.timeout_seconds", value)
        elif field == "enable_thinking" and not isinstance(value, bool):
            raise UnprocessableError("enable_thinking phải là true hoặc false")
