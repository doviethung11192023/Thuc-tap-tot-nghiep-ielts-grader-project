"""
Bắt đầu bài Mock bằng đề do hệ thống chọn ngẫu nhiên (UC-08, FR-10; migration 20261109120000).

Learner chỉ chọn kỹ năng. DB (start_mock_attempt) chọn một đề trong bộ đề Mock mà Learner chưa từng làm,
kể cả bỏ dở; đang có bài Mock dở của kỹ năng đó thì trả lại bài đó. Hết đề chưa làm thì từ chối, không
lặp đề cũ, để band Mock luôn là lần gặp đề đầu tiên (BR-12).
"""
from typing import Any

from app.core.domain_errors import ConflictError, ForbiddenError, InvalidRequestError
from app.db.supabase import db
from app.services.practice.attempt_saved_work import load_saved_work
from app.services.practice.practice_attempt_lifecycle import now_utc

SKILLS = ("listening", "reading", "writing", "speaking")


def start_random_mock(user_id: str, skill: str) -> dict[str, Any]:
    if skill not in SKILLS:
        raise InvalidRequestError("Kỹ năng không hợp lệ")
    if not db().table("learner_profiles").select("user_id").eq("user_id", user_id).execute().data:
        raise ForbiddenError("Chỉ tài khoản Learner được làm bài (Admin/Expert không làm bài)")
    try:
        attempt = db().rpc("start_mock_attempt", {"p_learner_id": user_id, "p_skill": skill}).execute().data
    except Exception as e:
        if "mock_pool_exhausted" in str(e):
            raise ConflictError("Bạn đã làm hết đề thi thử của kỹ năng này. Đề mới sẽ được bổ sung sau.")
        raise
    return {
        "attempt_id": attempt["id"], "test_id": attempt["test_id"], "skill": attempt["skill"],
        "mode": "mock", "started_at": attempt["started_at"], "deadline_at": attempt["deadline_at"],
        "resumed": attempt["resumed"], "server_time": now_utc().isoformat(),
        "saved_work": load_saved_work(attempt) if attempt["resumed"] else {},
    }


def mock_summary(user_id: str) -> list[dict[str, Any]]:
    """Mỗi kỹ năng: tổng số đề Mock, số đề Learner chưa làm, bài Mock đang dở (nếu có)."""
    rows = db().rpc("mock_pool_summary", {"p_learner_id": user_id}).execute().data or []
    order = {s: i for i, s in enumerate(SKILLS)}
    return sorted(rows, key=lambda r: order.get(r["skill"], 9))
