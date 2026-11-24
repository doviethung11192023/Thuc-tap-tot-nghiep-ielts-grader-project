"""Dịch vụ xử lý nộp bài chấm chính thức của Chuyên gia (UC-16, SD-07, FR-42..44)."""
from datetime import datetime, timezone
import logging
from typing import Any, Callable, Coroutine

from app.core.domain_errors import DomainError
from app.db.supabase import db
from app.services.expert.expert_tier_evaluation_service import refresh_single_expert_tier
from app.services.expert.penalty_circuit_breaker import record_expert_penalty
from app.services.expert.review_completeness_validator import validate_and_analyze_submission
from app.services.expert.sla_service import TZ_VN, remaining_business_hours
from app.services.learning_profile.common import invalidate_user_profile_cache
from app.services.ai_monitoring.ai_expert_gap_scores import schedule_expert_gap_scores
from app.services.notifications.notification_service import notify_expert_completed

logger = logging.getLogger(__name__)


def _parse_vn(raw: Any) -> datetime | None:
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return dt.replace(tzinfo=TZ_VN) if dt.tzinfo is None else dt.astimezone(TZ_VN)
    except Exception:
        return None


def _load_ai_snapshot(
    attempt_id: str,
    db_fn: Callable[[], Any] | None = None,
) -> tuple[dict[str, Any] | None, list[dict[str, Any]], list[dict[str, Any]]]:
    client = (db_fn or db)()
    ai_res = (
        client.table("evaluations")
        .select("id, overall_band, feedback, status")
        .eq("attempt_id", attempt_id)
        .eq("evaluator_type", "ai")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    ai_eval = ai_res.data[0] if ai_res.data else None
    if not ai_eval:
        return None, [], []
    ai_crit = client.table("criterion_scores").select("criterion_id, task_no, band, comment").eq("evaluation_id", ai_eval["id"]).execute().data or []
    ai_ann = client.table("annotations").select("category, original_text, corrected_text, explanation, essay_id, response_id").eq("evaluation_id", ai_eval["id"]).execute().data or []
    return ai_eval, ai_crit, ai_ann


def _save_annotations(eval_id: str, attempt_id: str, annotations: list[dict[str, Any]], db_fn: Callable[[], Any] | None = None) -> None:
    client = (db_fn or db)()
    client.table("annotations").delete().eq("evaluation_id", eval_id).execute()
    if not annotations:
        return
    formatted = []
    for a in annotations:
        entry = {
            "evaluation_id": eval_id, "attempt_id": attempt_id, "type": a.get("type", "error"),
            "category": a.get("category", "GRA"), "title": a.get("title"),
            "original_text": a.get("original_text", ""), "corrected_text": a.get("corrected_text"),
            "explanation": a.get("explanation", ""), "start_pos": a.get("start_pos"),
            "end_pos": a.get("end_pos"), "essay_id": a.get("essay_id"),
        }
        for opt in ("response_id", "start_ms", "end_ms"):
            if a.get(opt) is not None:
                entry[opt] = a[opt]
        formatted.append(entry)
    try:
        client.table("annotations").insert(formatted).execute()
    except Exception as e:
        logger.error("Lỗi lưu annotations Expert: %s", e)
        essay_only = [{k: v for k, v in it.items() if k not in ("response_id", "start_ms", "end_ms")} for it in formatted if it.get("essay_id")]
        if essay_only:
            try:
                client.table("annotations").insert(essay_only).execute()
            except Exception as inner_e:
                logger.error("Fallback lưu essay annotations thất bại: %s", inner_e)


async def submit_final_review_impl(
    assignment_id: str,
    expert_id: str,
    payload: dict[str, Any],
    start_draft_fn: Callable[[str, str], Coroutine[Any, Any, dict[str, Any]]],
    db_fn: Callable[[], Any] | None = None,
) -> dict[str, Any]:
    client = (db_fn or db)()
    res = client.table("review_assignments").select("*").eq("id", assignment_id).execute()
    if not res.data:
        raise DomainError("Assignment không tồn tại", 404)
    assignment = res.data[0]
    if assignment["expert_id"] != expert_id:
        raise DomainError("Bạn không có quyền nộp bài chấm này", 403)
    if assignment.get("ended_at") is not None:
        raise DomainError("Bài chấm này đã được nộp hoặc kết thúc trước đó", 400)

    now_vn = datetime.now(TZ_VN)
    due_vn = _parse_vn(assignment.get("due_at"))
    if due_vn and now_vn > due_vn:
        client.table("review_assignments").update({
            "ended_at": now_vn.isoformat(),
            "end_reason": "expired",
            "note": f"SYSTEM_EXPIRED_ON_SUBMIT: Nộp sau hạn SLA ({due_vn.strftime('%H:%M %d/%m/%Y')})",
        }).eq("id", assignment_id).is_("ended_at", "null").execute()
        client.table("review_requests").update({"status": "waiting"}).eq("id", assignment["request_id"]).eq("status", "assigned").execute()
        try:
            record_expert_penalty(expert_id, reason="sla_expired", assignment_id=assignment_id, now_vn=now_vn)
        except Exception as exc:
            logger.warning("Failed penalty on 409 submit for %s: %s", expert_id, exc)
        raise DomainError("Bài chấm đã quá hạn SLA và không thể nộp. Hệ thống đã thu hồi để điều phối lại.", 409)

    attempt_id = assignment["attempt_id"]
    att_rows = client.table("attempts").select("skill, learner_id").eq("id", attempt_id).execute().data or []
    attempt_skill = att_rows[0].get("skill") if att_rows else None
    criterion_scores = payload.get("criterion_scores") or []
    annotations = payload.get("annotations") or []
    effective_skill = attempt_skill or (criterion_scores[0].get("skill") if criterion_scores else "writing")
    ai_eval, ai_crit, ai_ann = _load_ai_snapshot(attempt_id, db_fn=db_fn)

    check = validate_and_analyze_submission(
        assignment=assignment, skill=effective_skill, overall_band=payload.get("overall_band"),
        criterion_scores=criterion_scores, annotations=annotations, general_feedback=payload.get("feedback") or "",
        change_reason=payload.get("change_reason") or "", ai_agreement_confirmed=bool(payload.get("ai_agreement_confirmed")),
        study_tip_note=payload.get("study_tip_note"), ai_eval=ai_eval, ai_criteria=ai_crit, ai_annotations=ai_ann, now_vn=now_vn,
    )
    if not check["passed"]:
        cur_rej = int(assignment.get("completeness_reject_count") or 0) + 1
        try:
            client.table("review_assignments").update({"completeness_reject_count": cur_rej}).eq("id", assignment_id).execute()
        except Exception:
            pass
        raise DomainError(check["violations"][0]["message"], 422, extra={"violations": check["violations"]})

    eval_id = assignment.get("evaluation_id") or (await start_draft_fn(assignment_id, expert_id)).get("evaluation_id")
    if not eval_id:
        raise DomainError("Không tìm thấy bản nháp đánh giá của Expert", 400)

    for cs in criterion_scores:
        cs_skill = attempt_skill or cs.get("skill", "writing")
        client.table("criterion_scores").upsert({
            "evaluation_id": eval_id, "criterion_id": cs["criterion_id"],
            "task_no": 0 if cs_skill == "speaking" else int(cs.get("task_no") or 1),
            "skill": cs_skill, "band": cs["band"], "comment": cs.get("comment", ""),
        }, on_conflict="evaluation_id,criterion_id,task_no").execute()

    _save_annotations(eval_id, attempt_id, annotations, db_fn=db_fn)
    client.table("evaluations").update({"is_official": False}).eq("attempt_id", attempt_id).eq("evaluator_type", "ai").execute()

    fb_final = str(payload.get("feedback") or "").strip()
    tip_clean = str(payload.get("study_tip_note") or "").strip()
    if tip_clean and tip_clean not in fb_final:
        fb_final = f"{fb_final}\n\nGợi ý học tập trọng tâm: {tip_clean}".strip()

    client.table("evaluations").update({
        "overall_band": payload.get("overall_band"), "feedback": fb_final, "status": "done",
        "is_official": True, "agrees_with_ai": check["agrees_with_ai"], "submitted_at": now_vn.isoformat(),
    }).eq("id", eval_id).execute()

    assigned_dt = _parse_vn(assignment.get("assigned_at")) or now_vn
    is_early = now_vn >= assigned_dt and remaining_business_hours(assigned_dt, now_vn) <= 24.0
    notes = [f"CHANGE_REASON: {payload['change_reason'].strip()}"] if str(payload.get("change_reason") or "").strip() else []
    if tip_clean:
        notes.append(f"STUDY_TIP: {tip_clean}")

    client.table("review_assignments").update({
        "ended_at": now_vn.isoformat(), "end_reason": "completed",
        "note": " | ".join(notes) if notes else assignment.get("note"),
        "completeness_passed": True, "is_early_sla": is_early, **check["metrics"],
    }).eq("id", assignment_id).execute()

    client.table("review_requests").update({"status": "completed"}).eq("id", assignment["request_id"]).execute()
    client.table("attempts").update({"status": "scored"}).eq("id", attempt_id).execute()

    try:
        is_clean = not check["metrics"]["rubber_stamp_flag"] and int(assignment.get("completeness_reject_count") or 0) == 0
        if is_clean:
            ep = (client.table("expert_profiles").select("consecutive_clean_reviews").eq("user_id", expert_id).limit(1).execute().data or [{}])[0]
            client.table("expert_profiles").update({"consecutive_clean_reviews": int(ep.get("consecutive_clean_reviews") or 0) + 1}).eq("user_id", expert_id).execute()
        refresh_single_expert_tier(expert_id, now_vn.astimezone(timezone.utc))
    except Exception as exc:
        logger.warning("Tier refresh after submit failed for %s: %s", expert_id, exc)

    if att_rows and att_rows[0].get("learner_id"):
        try:
            invalidate_user_profile_cache(att_rows[0]["learner_id"])
        except Exception as exc:
            logger.warning("Invalidate cache failed: %s", exc)

    notify_expert_completed(attempt_id, payload.get("overall_band"))
    schedule_expert_gap_scores(attempt_id)     # gửi Expert − AI lên trace Langfuse, chạy nền, lỗi bỏ qua (FR-057)
    return {"status": "completed", "assignment_id": assignment_id, "evaluation_id": eval_id, "overall_band": payload.get("overall_band"), "is_official": True}
