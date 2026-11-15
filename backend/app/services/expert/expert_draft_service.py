"""Dịch vụ lưu bản nháp chấm bài của Chuyên gia (Save Draft / Auto-Save)."""
import logging
from datetime import datetime
from typing import Any, Dict

from app.core.domain_errors import DomainError
from app.db.supabase import db
from app.services.expert.dispatcher import start_expert_grading_draft
from app.services.expert.sla_service import TZ_VN

logger = logging.getLogger(__name__)


async def save_expert_grading_draft(
    assignment_id: str,
    expert_id: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """Lưu bản nháp điểm, nhận xét 4 tiêu chí và annotations của Expert mà chưa công bố."""
    res = db().table("review_assignments").select("*").eq("id", assignment_id).execute()
    if not res.data:
        raise DomainError("Assignment không tồn tại", 404)

    assignment = res.data[0]
    if assignment["expert_id"] != expert_id:
        raise DomainError("Bạn không có quyền lưu bài chấm này", 403)
    if assignment.get("ended_at") is not None:
        raise DomainError("Bài chấm này đã kết thúc, không thể sửa bản nháp", 400)

    attempt_id = assignment["attempt_id"]
    eval_id = assignment.get("evaluation_id")
    if not eval_id:
        draft_res = await start_expert_grading_draft(assignment_id, expert_id)
        eval_id = draft_res.get("evaluation_id")
    if not eval_id:
        raise DomainError("Không tìm thấy bản nháp đánh giá của Expert", 400)

    overall_band = payload.get("overall_band")
    criterion_scores = payload.get("criterion_scores") or []
    annotations = payload.get("annotations") or []
    general_feedback = payload.get("feedback", "")

    for cs in criterion_scores:
        db().table("criterion_scores").upsert({
            "evaluation_id": eval_id,
            "criterion_id": cs["criterion_id"],
            "task_no": cs.get("task_no", 1),
            "skill": cs.get("skill", "writing"),
            "band": cs["band"],
            "comment": cs.get("comment", ""),
        }).execute()

    db().table("annotations").delete().eq("evaluation_id", eval_id).execute()
    if annotations:
        formatted = []
        for a in annotations:
            entry = {
                "evaluation_id": eval_id,
                "attempt_id": attempt_id,
                "type": a.get("type", "error"),
                "category": a.get("category", "GRA"),
                "title": a.get("title"),
                "original_text": a.get("original_text", ""),
                "corrected_text": a.get("corrected_text"),
                "explanation": a.get("explanation", ""),
                "start_pos": a.get("start_pos"),
                "end_pos": a.get("end_pos"),
                "essay_id": a.get("essay_id"),
            }
            if a.get("response_id"):
                entry["response_id"] = a.get("response_id")
            if a.get("start_ms") is not None:
                entry["start_ms"] = a.get("start_ms")
            if a.get("end_ms") is not None:
                entry["end_ms"] = a.get("end_ms")
            formatted.append(entry)
        try:
            db().table("annotations").insert(formatted).execute()
        except Exception as e:
            logger.warning(f"Draft annotations insert warning: {e}")

    db().table("evaluations").update({
        "overall_band": overall_band,
        "feedback": general_feedback,
        "status": "draft",
    }).eq("id", eval_id).execute()

    now_vn = datetime.now(TZ_VN)
    return {"status": "saved", "evaluation_id": eval_id, "saved_at": now_vn.isoformat()}
