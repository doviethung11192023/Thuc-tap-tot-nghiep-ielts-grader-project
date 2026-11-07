"""
Kết thúc một evaluation AI, dùng chung cho Writing và Speaking (ST_evaluation, BR-08).

Evaluation AI chính thức nếu attempt chưa có điểm Expert chính thức. Mock chưa có luồng Expert
(BR-15) nên tạm xử lý như hết quota: điểm AI chính thức, attempt scored.
Mỗi thao tác là một function DB để evaluation và attempt đổi trạng thái trong cùng transaction.
"""
from app.db.supabase import db


def fail_ai_evaluation(evaluation_id: str, attempt_id: str, attempt_status: str = "grading_failed") -> None:
    """Evaluation failed; attempt grading_failed (Admin chạy lại: UC-24) hoặc no_speech."""
    db().rpc("fail_ai_evaluation", {
        "p_evaluation_id": evaluation_id, "p_attempt_id": attempt_id, "p_attempt_status": attempt_status,
    }).execute()


def publish_ai_evaluation(evaluation_id: str, attempt_id: str, band: float) -> None:
    db().rpc("publish_ai_evaluation", {
        "p_evaluation_id": evaluation_id, "p_attempt_id": attempt_id, "p_band": band,
    }).execute()
