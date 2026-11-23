"""
Dịch vụ Điều phối và Chấm bài của Chuyên gia (Expert Dispatcher & Grading Service).
Tuân thủ BR-11, FR-39..42, UC-15, UC-16, SD-06, SD-07 trong docs/source-of-truth.md.
"""

import logging
from datetime import datetime
import zoneinfo
from typing import Dict, Any, List, Optional
from app.db.supabase import db
from app.services.expert.sla_service import (
    calculate_review_due_at, 
    is_within_decline_window, 
    TZ_VN
)
from app.services.learning_profile.common import invalidate_user_profile_cache
from app.services.notifications.notification_service import notify_expert_assigned, notify_expert_completed
from app.core.domain_errors import DomainError
from app.services.ai_monitoring.ai_expert_gap_scores import schedule_expert_gap_scores

logger = logging.getLogger(__name__)

async def auto_dispatch_pending_requests() -> int:
    """
    Quét danh sách review_requests đang chờ (status='waiting') và gán cho Chuyên gia phù hợp.
    - Ưu tiên Mock Test trước Practice (SD-06).
    - Ưu tiên yêu cầu gửi trước (requested_at ASC).
    - Chuyên gia phải Available (is_available=true) và chưa vượt max_active_reviews.
    - Không gán lại cho Chuyên gia đã từng từ chối (declined) hoặc để quá hạn (expired) chính bài đó (BR-11).
    """
    # 1. Lấy danh sách requests đang waiting, kèm thông tin mode để ưu tiên Mock
    waiting_requests = db().table("review_request_details") \
        .select("request_id, attempt_id, skill, source, requested_at") \
        .eq("status", "waiting") \
        .execute()
    
    if not waiting_requests.data:
        return 0

    # Sắp xếp: Mock lên trước, sau đó theo requested_at
    sorted_requests = sorted(
        waiting_requests.data, 
        key=lambda r: (0 if r.get("source") == "mock" else 1, r.get("requested_at"))
    )

    # 2. Lấy danh sách Chuyên gia đang Available và đếm tải hiện tại (Least-Loaded)
    available_experts = db().table("expert_profiles") \
        .select("user_id, max_active_reviews, is_available") \
        .eq("is_available", True) \
        .execute()

    if not available_experts.data:
        return 0

    open_assignments_res = db().table("review_assignments") \
        .select("expert_id") \
        .is_("ended_at", "null") \
        .execute()
    active_counts: Dict[str, int] = {}
    for row in (open_assignments_res.data or []):
        eid = row.get("expert_id")
        if eid:
            active_counts[eid] = active_counts.get(eid, 0) + 1

    assigned_count = 0
    now_vn = datetime.now(TZ_VN)

    for req in sorted_requests:
        request_id = req["request_id"]
        attempt_id = req["attempt_id"]

        # Lấy danh sách các Expert đã từng phụ trách bài này và bị kết thúc (declined hoặc expired)
        history_res = db().table("review_assignments") \
            .select("expert_id, end_reason") \
            .eq("request_id", request_id) \
            .execute()
        
        excluded_experts = {
            h["expert_id"] for h in (history_res.data or []) 
            if h.get("end_reason") in ("declined", "expired")
        }

        # Chọn Expert còn slot và có tải (active_count) thấp nhất
        candidates = []
        for exp in available_experts.data:
            expert_id = exp["user_id"]
            if expert_id in excluded_experts:
                continue
            max_reviews = max(int(exp.get("max_active_reviews") or 5), 1)
            cur_load = active_counts.get(expert_id, 0)
            if cur_load < max_reviews:
                candidates.append((cur_load, cur_load / max_reviews, expert_id))

        if not candidates:
            continue  # Không còn Expert nào rảnh lúc này

        candidates.sort(key=lambda item: (item[0], item[1], item[2]))
        chosen_expert = candidates[0][2]
        active_counts[chosen_expert] = active_counts.get(chosen_expert, 0) + 1

        # Gán bài cho chosen_expert
        due_at = calculate_review_due_at(now_vn, 48.0)
        
        # 1 Transaction logic: Insert assignment + Update request status
        asgn_res = db().table("review_assignments").insert({
            "request_id": request_id,
            "attempt_id": attempt_id,
            "expert_id": chosen_expert,
            "assigned_at": now_vn.isoformat(),
            "due_at": due_at.isoformat()
        }).execute()

        db().table("review_requests").update({
            "status": "assigned"
        }).eq("id", request_id).execute()

        assigned_id = (asgn_res.data or [{}])[0].get("id")
        notify_expert_assigned(
            assignment_id=assigned_id,
            attempt_id=attempt_id,
            expert_id=chosen_expert,
            reassigned=False,
        )

        assigned_count += 1

    return assigned_count

async def decline_assignment_by_expert(assignment_id: str, expert_id: str, note: str) -> Dict[str, Any]:
    """
    Expert từ chối nhận bài trong 2 giờ làm việc đầu tiên (FR-39).
    - Kiểm tra đúng Expert sở hữu.
    - Kiểm tra trong khung giờ 2h làm việc.
    - Đóng assignment với end_reason='declined' kèm lý do.
    - Đưa request trở lại status='waiting'.
    """
    # Lấy thông tin assignment
    res = db().table("review_assignments").select("*").eq("id", assignment_id).execute()
    if not res.data:
        raise DomainError("Assignment không tồn tại", 404)
    
    assignment = res.data[0]
    if assignment["expert_id"] != expert_id:
        raise DomainError("Bạn không có quyền từ chối bài chấm này", 403)
    
    if assignment.get("ended_at") is not None:
        raise DomainError("Bài chấm này đã kết thúc trước đó", 400)
    
    if assignment.get("started_at") is not None:
        raise DomainError("Bạn đã bấm bắt đầu chấm bài nên không thể từ chối", 400)

    assigned_at = datetime.fromisoformat(assignment["assigned_at"])
    now_vn = datetime.now(TZ_VN)

    if not is_within_decline_window(assigned_at, 2.0, now_vn):
        raise DomainError("Đã quá 2 giờ làm việc kể từ lúc nhận bài, bạn không thể từ chối", 400)

    # Cập nhật kết thúc assignment
    db().table("review_assignments").update({
        "ended_at": now_vn.isoformat(),
        "end_reason": "declined",
        "note": f"EXPERT_DECLINED: {note.strip()}"
    }).eq("id", assignment_id).execute()

    # Trả request về waiting để phân công cho người khác
    db().table("review_requests").update({
        "status": "waiting"
    }).eq("id", assignment["request_id"]).execute()

    return {"status": "declined", "assignment_id": assignment_id}

async def start_expert_grading_draft(assignment_id: str, expert_id: str) -> Dict[str, Any]:
    """
    Bắt đầu chấm bài (UC-16):
    - Đánh dấu started_at trên review_assignments.
    - Tự động nhân bản (clone) kết quả AI thành bản nháp (draft) cho Expert (nếu chưa có).
    - Trả về toàn bộ dữ liệu Workspace (Đề, bài làm, điểm AI, lỗi bôi đen).
    """
    res = db().table("review_assignments").select("*").eq("id", assignment_id).execute()
    if not res.data:
        raise DomainError("Assignment không tồn tại", 404)
    
    assignment = res.data[0]
    if assignment["expert_id"] != expert_id:
        raise DomainError("Bạn không có quyền chấm bài này", 403)
    
    now_vn = datetime.now(TZ_VN)
    attempt_id = assignment["attempt_id"]

    # Đánh dấu started_at nếu chưa có
    if not assignment.get("started_at"):
        db().table("review_assignments").update({
            "started_at": now_vn.isoformat()
        }).eq("id", assignment_id).execute()

    # Kiểm tra xem đã có evaluation của Expert cho bài này chưa
    eval_res = db().table("evaluations") \
        .select("*") \
        .eq("attempt_id", attempt_id) \
        .eq("evaluator_type", "expert") \
        .execute()
    
    expert_eval = eval_res.data[0] if eval_res.data else None

    # Nếu chưa có draft evaluation của Expert, clone từ AI
    if not expert_eval:
        ai_res = db().table("evaluations") \
            .select("*") \
            .eq("attempt_id", attempt_id) \
            .eq("evaluator_type", "ai") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        
        ai_eval = ai_res.data[0] if ai_res.data else None
        overall_band = ai_eval.get("overall_band") if ai_eval else None
        feedback = ai_eval.get("feedback") if ai_eval else ""

        # Lấy skill của attempt
        att_res = db().table("attempts").select("skill").eq("id", attempt_id).execute()
        skill = att_res.data[0]["skill"] if att_res.data else "writing"

        # Tạo bản ghi evaluation draft
        insert_eval = db().table("evaluations").insert({
            "attempt_id": attempt_id,
            "skill": skill,
            "evaluator_type": "expert",
            "status": "draft",
            "overall_band": overall_band,
            "feedback": feedback,
            "is_official": False
        }).execute()
        
        expert_eval = insert_eval.data[0]

        # Gắn evaluation_id vào review_assignments
        db().table("review_assignments").update({
            "evaluation_id": expert_eval["id"],
            "evaluator_type": "expert"
        }).eq("id", assignment_id).execute()

        # Clone criterion_scores từ AI sang Expert nếu có
        if ai_eval:
            crit_res = db().table("criterion_scores") \
                .select("criterion_id, task_no, skill, band, comment") \
                .eq("evaluation_id", ai_eval["id"]) \
                .execute()
            
            if crit_res.data:
                crit_to_insert = [
                    {**c, "evaluation_id": expert_eval["id"]}
                    for c in crit_res.data
                ]
                db().table("criterion_scores").insert(crit_to_insert).execute()

            # Clone annotations từ AI sang Expert nếu có (AI chỉ tạo annotations trên bài viết essay)
            try:
                ann_res = db().table("annotations") \
                    .select("type, category, title, original_text, corrected_text, explanation, start_pos, end_pos, essay_id") \
                    .eq("evaluation_id", ai_eval["id"]) \
                    .execute()
                
                if ann_res.data:
                    ann_to_insert = [
                        {**a, "evaluation_id": expert_eval["id"], "attempt_id": attempt_id}
                        for a in ann_res.data
                    ]
                    db().table("annotations").insert(ann_to_insert).execute()
            except Exception as e:
                logger.warning(f"Không thể clone annotations từ AI: {e}")

    return {"status": "draft_ready", "evaluation_id": expert_eval["id"]}

async def submit_expert_final_review(
    assignment_id: str, 
    expert_id: str, 
    payload: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Expert nộp kết quả chấm chính thức (UC-16, SD-07, FR-42).
    - Cập nhật điểm 4 tiêu chí và Overall Band.
    - Cập nhật danh sách lỗi và sửa lỗi (annotations).
    - Nếu sửa band lệch AI >= 1.0 band -> kiểm tra bắt buộc có giải trình change_reason (FR-42).
    - Hoàn tất assignment (ended_at=now, end_reason='completed').
    - Đặt evaluation của Expert là is_official=true.
    - Chuyển attempt Mock sang scored.
    """
    res = db().table("review_assignments").select("*").eq("id", assignment_id).execute()
    if not res.data:
        raise DomainError("Assignment không tồn tại", 404)
    
    assignment = res.data[0]
    if assignment["expert_id"] != expert_id:
        raise DomainError("Bạn không có quyền nộp bài chấm này", 403)
    
    if assignment.get("ended_at") is not None:
        raise DomainError("Bài chấm này đã được nộp hoặc kết thúc trước đó", 400)

    attempt_id = assignment["attempt_id"]
    eval_id = assignment.get("evaluation_id")
    if not eval_id:
        draft_res = await start_expert_grading_draft(assignment_id, expert_id)
        eval_id = draft_res.get("evaluation_id")
    if not eval_id:
        raise DomainError("Không tìm thấy bản nháp đánh giá của Expert", 400)

    now_vn = datetime.now(TZ_VN)
    overall_band = payload.get("overall_band")
    criterion_scores = payload.get("criterion_scores", [])
    annotations = payload.get("annotations", [])
    general_feedback = payload.get("feedback", "")
    change_reason = payload.get("change_reason", "")

    # Kiểm tra độ lệch với AI (FR-42)
    ai_res = db().table("evaluations") \
        .select("overall_band") \
        .eq("attempt_id", attempt_id) \
        .eq("evaluator_type", "ai") \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    
    ai_band = ai_res.data[0].get("overall_band") if ai_res.data else None
    agrees_with_ai = True
    if ai_band is not None and overall_band is not None:
        deviation = abs(float(overall_band) - float(ai_band))
        if deviation >= 1.0:
            agrees_with_ai = False
            if not change_reason or len(change_reason.strip()) < 5:
                raise DomainError(
                    f"Điểm số của Chuyên gia ({overall_band}) lệch từ 1.0 band trở lên so với AI ({ai_band}). Bắt buộc phải chọn hoặc nhập lý do giải trình.",
                    422
                )

    # 1. Cập nhật criterion_scores và annotations TRƯỚC KHI đánh dấu evaluation là 'done' (tuân thủ BR-08)
    for cs in criterion_scores:
        db().table("criterion_scores").upsert({
            "evaluation_id": eval_id,
            "criterion_id": cs["criterion_id"],
            "task_no": cs.get("task_no", 1),
            "skill": cs.get("skill", "writing"),
            "band": cs["band"],
            "comment": cs.get("comment", "")
        }).execute()

    # Cập nhật annotations (xóa cũ của expert eval, nạp mới)
    db().table("annotations").delete().eq("evaluation_id", eval_id).execute()
    if annotations:
        formatted_annotations = []
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
                "essay_id": a.get("essay_id")
            }
            if a.get("response_id"):
                entry["response_id"] = a.get("response_id")
            if a.get("start_ms") is not None:
                entry["start_ms"] = a.get("start_ms")
            if a.get("end_ms") is not None:
                entry["end_ms"] = a.get("end_ms")
            formatted_annotations.append(entry)
        try:
            db().table("annotations").insert(formatted_annotations).execute()
        except Exception as e:
            logger.error(f"Lỗi khi lưu annotations của Expert: {e}")
            essay_only = [
                {k: v for k, v in item.items() if k not in ("response_id", "start_ms", "end_ms")}
                for item in formatted_annotations if item.get("essay_id")
            ]
            if essay_only:
                try:
                    db().table("annotations").insert(essay_only).execute()
                except Exception as inner_e:
                    logger.error(f"Fallback lưu essay annotations thất bại: {inner_e}")

    # 2. Hạ cờ is_official của bản AI cũ
    db().table("evaluations") \
        .update({"is_official": False}) \
        .eq("attempt_id", attempt_id) \
        .eq("evaluator_type", "ai") \
        .execute()

    # 3. Cập nhật Evaluation của Expert thành chính thức ('done', is_official = True)
    db().table("evaluations").update({
        "overall_band": overall_band,
        "feedback": general_feedback,
        "status": "done",
        "is_official": True,
        "agrees_with_ai": agrees_with_ai,
        "submitted_at": now_vn.isoformat()
    }).eq("id", eval_id).execute()

    # 5. Hoàn tất assignment
    db().table("review_assignments").update({
        "ended_at": now_vn.isoformat(),
        "end_reason": "completed",
        "note": f"CHANGE_REASON: {change_reason}" if change_reason else assignment.get("note")
    }).eq("id", assignment_id).execute()

    # 6. Đóng review_request
    db().table("review_requests").update({
        "status": "completed"
    }).eq("id", assignment["request_id"]).execute()

    # 7. Cập nhật attempt sang scored & làm mới Learning Profile của học viên
    db().table("attempts").update({
        "status": "scored"
    }).eq("id", attempt_id).execute()

    try:
        att_owner = db().table("attempts").select("learner_id").eq("id", attempt_id).execute().data
        if att_owner and att_owner[0].get("learner_id"):
            invalidate_user_profile_cache(att_owner[0]["learner_id"])
    except Exception as e:
        logger.warning(f"Không thể invalidate cache learning profile: {e}")

    notify_expert_completed(attempt_id, overall_band)
    schedule_expert_gap_scores(attempt_id)     # gửi Expert − AI lên trace Langfuse, chạy nền, lỗi bỏ qua (FR-057)

    return {
        "status": "completed",
        "assignment_id": assignment_id,
        "evaluation_id": eval_id,
        "overall_band": overall_band,
        "is_official": True
    }
