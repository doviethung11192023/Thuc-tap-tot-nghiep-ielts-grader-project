"""Chọn bộ dựng nội dung đề v2 theo kỹ năng; Speaking chưa chuyển sang v2 → None (dùng public)."""
from typing import Any, Optional

V2_SKILLS = ("writing", "reading", "listening")


def load_v2_test_content(test_id: str, skill: str) -> Optional[dict[str, Any]]:
    if skill == "writing":
        from app.services.v2_writing.writing_test_content import load_writing_test, to_legacy_content
        test = load_writing_test(test_id)
        return to_legacy_content(test) if test else None
    if skill in ("reading", "listening"):
        from app.services.v2_listening_reading.lr_test_content import load_lr_test, to_legacy_lr_content
        test = load_lr_test(test_id)
        return to_legacy_lr_content(test) if test else None
    return None
