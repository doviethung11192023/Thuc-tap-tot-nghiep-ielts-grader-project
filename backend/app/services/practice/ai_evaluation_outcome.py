"""
Kết thúc một evaluation AI, dùng chung cho Writing và Speaking (ST_evaluation, BR-08).

Evaluation AI chính thức nếu attempt chưa có điểm Expert chính thức. Mock chưa có luồng Expert
(BR-15) nên tạm xử lý như hết quota: điểm AI chính thức, attempt scored.
Mỗi thao tác là một function DB để evaluation và attempt đổi trạng thái trong cùng transaction.
"""
from app.db.supabase import db
from app.services.notifications.notification_service import notify_ai_grading_result
import logging

logger = logging.getLogger(__name__)


def _drop_learner_profile_cache(attempt_id: str) -> None:
    try:
        from app.services.learning_profile.common import invalidate_user_profile_cache
        att = db().table("attempts").select("learner_id").eq("id", attempt_id).execute().data
        if att and att[0].get("learner_id"):
            invalidate_user_profile_cache(att[0]["learner_id"])
    except Exception as e:
        logger.warning(f"[CacheDrop] Warning: {e}")


def fail_ai_evaluation(evaluation_id: str, attempt_id: str, attempt_status: str = "grading_failed") -> None:
    """Evaluation failed; attempt grading_failed (Admin chạy lại: UC-24) hoặc no_speech."""
    db().rpc("fail_ai_evaluation", {
        "p_evaluation_id": evaluation_id, "p_attempt_id": attempt_id, "p_attempt_status": attempt_status,
    }).execute()
    _drop_learner_profile_cache(attempt_id)
    notify_ai_grading_result(attempt_id, success=False, attempt_status=attempt_status)


def publish_ai_evaluation(evaluation_id: str, attempt_id: str, band: float) -> None:
    db().rpc("publish_ai_evaluation", {
        "p_evaluation_id": evaluation_id, "p_attempt_id": attempt_id, "p_band": band,
    }).execute()
    # Đảm bảo nếu retry từ grading_failed hoặc status chưa kịp chuyển ở RPC thì vẫn lên scored
    db().table("attempts").update({"status": "scored"}).eq("id", attempt_id).in_(
        "status", ["grading", "grading_failed"]
    ).execute()
    _drop_learner_profile_cache(attempt_id)
    notify_ai_grading_result(attempt_id, success=True, band=band)
