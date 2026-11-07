"""
Vòng đời attempt dùng chung cho mọi kỹ năng (ST_attempt, UC-07/08).

- start_attempt: chỉ Learner; đề phải published và cho phép mode; đang có attempt dở
  của đề này thì làm tiếp (UC-08 E3); Mock có deadline do server đặt (FR-10).
- get_owned_attempt: không phải chủ → None (API trả 404, không lộ sự tồn tại).
- ensure_can_submit, require_submitted: chỉ lần nộp đầu rời được in_progress (UC-08 E1); nộp muộn hơn
  deadline quá 30 s bị từ chối (BR-07).
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from app.core.domain_errors import AuthenticationRequiredError, ConflictError, ForbiddenError, InternalFailureError, InvalidRequestError, NotFoundError

from app.db.supabase import db

LATE_GRACE_SECONDS = 30
DEFAULT_MINUTES = {"listening": 30, "reading": 60, "writing": 60, "speaking": 14}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def start_attempt(user_id: str, test: dict[str, Any], mode: str) -> dict[str, Any]:
    if not db().table("learner_profiles").select("user_id").eq("user_id", user_id).execute().data:
        raise ForbiddenError("Chỉ tài khoản Learner được làm bài (Admin/Expert không làm bài)")
    if test.get("status") != "published":
        raise InvalidRequestError("Bài thi chưa được xuất bản")
    allowed = test.get("allowed_mode") or "both"
    if allowed not in ("both", mode):
        raise InvalidRequestError(f"Bài thi không cho phép chế độ {mode}")

    duration = test.get("duration_minutes") or DEFAULT_MINUTES.get(test["skill"], 60)
    open_res = db().table("attempts").select("*").eq("learner_id", user_id).eq("test_id", test["id"]) \
        .eq("status", "in_progress").limit(1).execute()
    if open_res.data:
        attempt = open_res.data[0]
    else:
        start = now_utc()
        res = db().table("attempts").insert({
            "learner_id": user_id, "test_id": test["id"], "skill": test["skill"], "mode": mode,
            "status": "in_progress", "started_at": start.isoformat(),
            "deadline_at": (start + timedelta(minutes=duration)).isoformat() if mode == "mock" else None,
        }).execute()
        if not res.data:
            raise InternalFailureError("Không thể tạo phiên làm bài thi")
        attempt = res.data[0]
    return {
        "attempt_id": attempt["id"], "test_id": attempt["test_id"], "skill": attempt["skill"],
        "mode": attempt["mode"], "started_at": attempt["started_at"],
        "deadline_at": attempt.get("deadline_at"), "duration_min": duration,
        "server_time": now_utc().isoformat(),   # để client quy hạn deadline_at về đồng hồ của mình
    }


def get_owned_attempt(attempt_id: str, user_id: Optional[str], is_admin: bool = False) -> Optional[dict[str, Any]]:
    res = db().table("attempts").select("*").eq("id", attempt_id).execute()
    if not res.data:
        return None
    attempt = res.data[0]
    if not is_admin and str(attempt["learner_id"]) != str(user_id):
        return None
    return attempt


def require_owned_attempt(attempt_id: str, user: Any, skill: str) -> dict[str, Any]:
    """Attempt của chính Learner đang đăng nhập, đúng kỹ năng; không phải chủ thì 404."""
    if not user:
        raise AuthenticationRequiredError("Vui lòng đăng nhập để nộp bài")
    attempt = get_owned_attempt(attempt_id, user.id)
    if not attempt or attempt["skill"] != skill:
        raise NotFoundError("Phiên làm bài không tồn tại")
    return attempt


def past_deadline(attempt: dict[str, Any]) -> bool:
    """Đã quá deadline + 30 s ân hạn (BR-07)."""
    deadline = attempt.get("deadline_at")
    return bool(deadline) and now_utc() > datetime.fromisoformat(deadline) + timedelta(seconds=LATE_GRACE_SECONDS)


def ensure_can_submit(attempt: dict[str, Any]) -> None:
    """Nộp muộn hơn deadline + ân hạn → 409. Khoá attempt nằm trong function submit_* của DB."""
    if past_deadline(attempt):
        raise ConflictError("Đã quá thời gian làm bài")


def require_submitted(result: Optional[dict[str, Any]]) -> dict[str, Any]:
    """Function submit_* trả NULL khi attempt không còn in_progress (UC-08 E1: chỉ lần nộp đầu có hiệu lực)."""
    if result is None:
        raise ConflictError("Bài thi đã được nộp trước đó")
    return result
