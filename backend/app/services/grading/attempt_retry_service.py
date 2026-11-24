"""Tạo lại job chấm AI cho một attempt Writing/Speaking bị lỗi hoặc kẹt (học viên chủ bài hoặc Admin bấm).

Chỉ làm phần DB đồng bộ (kiểm bài có nội dung, gọi RPC tạo job, đặt attempt về grading);
đẩy job vào hàng đợi arq là việc async của route.
"""
from app.core.domain_errors import InvalidRequestError
from app.db.supabase import db


def create_retry_job(attempt_id: str, skill: str) -> dict:
    """Trả về kết quả RPC create_ai_grading_job (evaluation_id, runs). Bài trống thì từ chối."""
    task_nos = None
    if skill == "writing":
        essays = db().table("essays").select("id, word_count, content, writing_tasks(task_type)") \
            .eq("attempt_id", attempt_id).execute().data or []
        non_empty = [e for e in essays if (e.get("word_count") or 0) > 0 or (e.get("content") or "").strip()]
        if not non_empty:
            raise InvalidRequestError("Bài viết trống, không thể chấm lại")
        task_nos = sorted({1 if (e.get("writing_tasks") or {}).get("task_type") == "task1" else 2 for e in non_empty})
    else:
        confirmed = db().table("speaking_responses").select("id") \
            .eq("attempt_id", attempt_id).not_.is_("confirmed_at", "null").limit(1).execute().data or []
        if not confirmed:
            raise InvalidRequestError("Bài nói chưa có câu trả lời nào được lưu, không thể chấm lại")

    res = db().rpc("create_ai_grading_job", {
        "p_attempt_id": attempt_id,
        "p_skill": skill,
        "p_task_nos": task_nos,
    }).execute()

    job = res.data or {}
    db().table("attempts").update({"status": "grading"}).eq("id", attempt_id).execute()
    return job
