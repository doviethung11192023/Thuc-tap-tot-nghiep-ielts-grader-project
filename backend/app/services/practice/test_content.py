"""Tìm đề và dựng nội dung làm bài (không kèm đáp án) theo kỹ năng."""
import re
import uuid
from typing import Any, Optional

from app.db.supabase import db


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def resolve_test(test_ref: str, skill: Optional[str] = None) -> Optional[dict[str, Any]]:
    """test_ref là UUID; hoặc slug kiểu "reading-test-3" (URL mẫu cũ ở frontend) → đề published khớp "Test 3"."""
    cols = "id, skill, status, allowed_mode, duration_minutes"
    if _is_uuid(test_ref):
        rows = db().table("tests").select(cols).eq("id", test_ref).execute().data
        if rows:
            return rows[0]
    q = db().table("tests").select(cols).eq("status", "published")
    if skill:
        q = q.eq("skill", skill.lower())
    m = re.search(r"test[-_ ]?(\d+)", str(test_ref).lower())
    if m:
        rows = q.ilike("title", f"%Test {int(m.group(1))}%").limit(1).execute().data
        if rows:
            return rows[0]
    rows = q.order("created_at").limit(1).execute().data if skill else []
    return rows[0] if rows else None


def load_test_content(test_id: str, skill: str) -> Optional[dict[str, Any]]:
    if skill == "writing":
        from app.services.writing.writing_test_content import load_writing_test, to_writing_content
        test = load_writing_test(test_id)
        return to_writing_content(test) if test else None
    if skill in ("reading", "listening"):
        from app.services.listening_reading.lr_test_content import load_lr_test, to_lr_content
        test = load_lr_test(test_id)
        return to_lr_content(test) if test else None
    if skill == "speaking":
        from app.services.speaking.speaking_test_content import load_speaking_test, to_speaking_content
        test = load_speaking_test(test_id)
        return to_speaking_content(test) if test else None
    return None
