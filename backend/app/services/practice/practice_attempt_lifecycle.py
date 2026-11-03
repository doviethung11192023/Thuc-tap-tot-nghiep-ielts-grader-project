"""
Vòng đời attempt dùng chung cho mọi kỹ năng (ST_attempt, UC-07/08).

- start_attempt: chỉ Learner; đề phải published và cho phép mode; đang có attempt dở
  của đề này thì làm tiếp (UC-08 E3); Mock có deadline do server đặt (FR-10).
- get_owned_attempt: không phải chủ → None (API trả 404, không lộ sự tồn tại).
- lock_for_submit: chỉ lần nộp đầu rời được in_progress (UC-08 E1); nộp muộn hơn
  deadline quá 30 s bị từ chối (BR-07).
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException

from app.db.supabase import db

LATE_GRACE_SECONDS = 30
DEFAULT_MINUTES = {"listening": 30, "reading": 60, "writing": 60, "speaking": 14}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def start_attempt(user_id: str, test: dict[str, Any], mode: str) -> dict[str, Any]:
    if not db().table("learner_profiles").select("user_id").eq("user_id", user_id).execute().data:
        raise HTTPException(status_code=403, detail="Chỉ tài khoản Learner được làm bài (Admin/Expert không làm bài)")
    if test.get("status") != "published":
        raise HTTPException(status_code=400, detail="Bài thi chưa được xuất bản")
    allowed = test.get("allowed_mode") or "both"
    if allowed not in ("both", mode):
        raise HTTPException(status_code=400, detail=f"Bài thi không cho phép chế độ {mode}")

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
            raise HTTPException(status_code=500, detail="Không thể tạo phiên làm bài thi")
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


def lock_for_submit(attempt: dict[str, Any], next_status: str) -> str:
    """in_progress → next_status (+ submitted_at). Trả submitted_at; đã nộp/quá hạn → 409."""
    now = now_utc()
    deadline = attempt.get("deadline_at")
    if deadline and now > datetime.fromisoformat(deadline) + timedelta(seconds=LATE_GRACE_SECONDS):
        raise HTTPException(status_code=409, detail="Đã quá thời gian làm bài")
    locked = db().table("attempts").update({"status": next_status, "submitted_at": now.isoformat()}) \
        .eq("id", attempt["id"]).eq("status", "in_progress").execute()
    if not locked.data:
        raise HTTPException(status_code=409, detail="Bài thi đã được nộp trước đó")
    return now.isoformat()
