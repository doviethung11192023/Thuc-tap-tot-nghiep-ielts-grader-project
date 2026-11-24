from fastapi import APIRouter, Depends, HTTPException, status
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import zoneinfo

from app.schemas.expert import (
    ExpertProfileResponse, 
    ExpertAvailabilityUpdate,
    ExpertAssignmentItem,
    ExpertDeclineRequest,
    ExpertSubmitReviewRequest
)
from app.core.security import require_expert, User
from app.db.supabase import db
from app.services.expert.sla_service import is_within_decline_window, TZ_VN
from app.services.expert.dispatcher import (
    decline_assignment_by_expert,
    start_expert_grading_draft,
    submit_expert_final_review
)
from app.services.expert.expert_draft_service import save_expert_grading_draft
from app.services.storage.r2_storage import r2_storage
from app.services.speaking.speaking_test_content import speaking_part_number
from app.services.writing.writing_test_content import chart_image_url

router = APIRouter()

@router.get("/me", response_model=ExpertProfileResponse)
def get_expert_profile(current_user: User = Depends(require_expert)):
    """
    Lấy thông tin hồ sơ của Expert, trạng thái khả dụng nhận bài, 
    và số lượng bài đang được phân công (UC-14, FR-21).
    """
    user_res = db().table("profiles").select("id, email, full_name, avatar_key, created_at").eq("id", current_user.id).execute()
    if not user_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user_data = {**user_res.data[0], "avatar_url": user_res.data[0].get("avatar_key")}

    profile_res = db().table("expert_profiles").select("*").eq("user_id", current_user.id).execute()
    if not profile_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expert profile not found")
    expert_data = profile_res.data[0]

    count_res = db().table("review_assignments").select("id", count="exact") \
        .eq("expert_id", current_user.id).is_("ended_at", "null").execute()
    active_count = count_res.count if getattr(count_res, "count", None) is not None else len(count_res.data or [])

    return ExpertProfileResponse(
        user_id=user_data["id"],
        email=user_data["email"],
        full_name=user_data.get("full_name"),
        avatar_url=user_data.get("avatar_url"),
        is_available=expert_data.get("is_available", False),
        max_active_reviews=expert_data.get("max_active_reviews", 5),
        bio=expert_data.get("bio"),
        active_reviews_count=active_count,
        created_at=user_data.get("created_at")
    )

@router.patch("/me/availability", response_model=ExpertProfileResponse)
def update_expert_availability(
    update_data: ExpertAvailabilityUpdate,
    current_user: User = Depends(require_expert)
):
    """
    Cập nhật trạng thái khả dụng (is_available: true/false), giới hạn số bài 
    và tiểu sử chuyên môn của Expert (UC-14, FR-21).
    """
    fields_to_update = update_data.dict(exclude_unset=True)
    if not fields_to_update:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    res = db().table("expert_profiles").update(fields_to_update).eq("user_id", current_user.id).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update expert profile")

    return get_expert_profile(current_user=current_user)

@router.get("/assignments", response_model=List[ExpertAssignmentItem])
def list_expert_assignments(
    status_filter: Optional[str] = "active", # 'active', 'completed', 'all'
    current_user: User = Depends(require_expert)
):
    """
    Danh sách các bài chấm được phân công cho Expert (UC-15).
    Sắp xếp theo hạn chót (due_at ASC), cảnh báo khi còn dưới 6 giờ làm việc.
    """
    query = db().table("review_assignments").select("*").eq("expert_id", current_user.id)
    if status_filter == "active":
        query = query.is_("ended_at", "null")
    elif status_filter == "completed":
        query = query.not_.is_("ended_at", "null")
    
    query = query.order("due_at", desc=False)
    res = query.execute()

    rows = res.data or []
    attempt_ids = list({a["attempt_id"] for a in rows if a.get("attempt_id")})
    attempts_map: Dict[str, Dict[str, Any]] = {}
    learners_map: Dict[str, Dict[str, Any]] = {}

    if attempt_ids:
        att_res = (
            db().table("attempts")
            .select("id, skill, mode, test_id, learner_id, tests(title)")
            .in_("id", attempt_ids)
            .execute()
        )
        attempts_map = {att["id"]: att for att in (att_res.data or [])}
        learner_ids = list({att["learner_id"] for att in (att_res.data or []) if att.get("learner_id")})
        if learner_ids:
            prof_res = db().table("profiles").select("id, full_name, email").in_("id", learner_ids).execute()
            learners_map = {p["id"]: p for p in (prof_res.data or [])}

    items = []
    now_vn = datetime.now(TZ_VN)

    for a in rows:
        att = attempts_map.get(a["attempt_id"], {})
        test_info = att.get("tests", {}) if isinstance(att.get("tests"), dict) else {}
        test_title = test_info.get("title", f"Bài thi {att.get('skill', '').title()}")
        learner = learners_map.get(att.get("learner_id") or "", {})

        assigned_at_dt = datetime.fromisoformat(a["assigned_at"])
        due_at_dt = datetime.fromisoformat(a["due_at"])
        if due_at_dt.tzinfo is None:
            due_at_dt = due_at_dt.replace(tzinfo=TZ_VN)
        
        rem_sec = (due_at_dt - now_vn).total_seconds()
        rem_hours = max(0.0, round(rem_sec / 3600.0, 1))

        can_decline = (
            a.get("ended_at") is None and 
            a.get("started_at") is None and 
            is_within_decline_window(assigned_at_dt, 2.0, now_vn)
        )

        items.append(ExpertAssignmentItem(
            id=a["id"],
            request_id=a["request_id"],
            attempt_id=a["attempt_id"],
            expert_id=a["expert_id"],
            skill=att.get("skill", "writing"),
            source=att.get("mode", "mock"),
            test_title=test_title,
            learner_name=learner.get("full_name"),
            learner_email=learner.get("email"),
            assigned_at=a["assigned_at"],
            started_at=a.get("started_at"),
            due_at=a["due_at"],
            ended_at=a.get("ended_at"),
            end_reason=a.get("end_reason"),
            note=a.get("note"),
            evaluation_id=a.get("evaluation_id"),
            can_decline=can_decline,
            remaining_hours=rem_hours
        ))

    return items

@router.post("/assignments/{assignment_id}/decline")
async def decline_assignment(
    assignment_id: str,
    payload: ExpertDeclineRequest,
    current_user: User = Depends(require_expert)
):
    """Từ chối nhận bài trong 2 giờ làm việc đầu tiên kèm lý do (FR-39)."""
    return await decline_assignment_by_expert(assignment_id, current_user.id, payload.note)

@router.post("/assignments/{assignment_id}/start")
async def start_grading(
    assignment_id: str,
    current_user: User = Depends(require_expert)
):
    """Bắt đầu chấm bài: tạo draft evaluation nhân bản từ AI (UC-16)."""
    return await start_expert_grading_draft(assignment_id, current_user.id)

@router.get("/assignments/{assignment_id}/workspace")
async def get_assignment_workspace(
    assignment_id: str,
    current_user: User = Depends(require_expert)
):
    """
    Nạp toàn bộ dữ liệu phòng chấm Split-View trong 1 payload duy nhất:
    - Thông tin đề thi & bài làm học viên (Writing text hoặc Speaking audio).
    - Mục tiêu của học viên (Target bands).
    - Kết quả chấm của AI (Overall band, 4 tiêu chí, chú thích lỗi).
    - Bản nháp hiện tại của Expert (nếu đã lưu).
    """
    # 1. Assignment
    asg_res = db().table("review_assignments").select("*").eq("id", assignment_id).execute()
    if not asg_res.data:
        raise HTTPException(status_code=404, detail="Assignment không tồn tại")
    assignment = asg_res.data[0]
    if assignment["expert_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập bài chấm này")

    attempt_id = assignment["attempt_id"]

    # 2. Attempt + Test Info + Learner Target
    att_res = db().table("attempts") \
        .select("id, learner_id, skill, mode, started_at, submitted_at, test_id, tests(id, title, skill)") \
        .eq("id", attempt_id).execute()
    if not att_res.data:
        raise HTTPException(status_code=404, detail="Attempt không tồn tại")
    attempt = att_res.data[0]

    # Target Band của Learner + Danh mục tiêu chí + Điểm AI chạy song song
    learner_profile_res, all_criteria_res, ai_eval_res = await asyncio.gather(
        asyncio.to_thread(
            lambda: db().table("learner_profiles")
            .select("target_overall, target_writing, target_speaking, test_date")
            .eq("user_id", attempt["learner_id"])
            .execute()
        ),
        asyncio.to_thread(
            lambda: db().table("criteria")
            .select("id, code, name, skill, task_type")
            .eq("skill", attempt["skill"])
            .execute()
        ),
        asyncio.to_thread(
            lambda: db().table("evaluations")
            .select("id, overall_band, feedback, created_at")
            .eq("attempt_id", attempt_id)
            .eq("evaluator_type", "ai")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        ),
    )
    learner_target = learner_profile_res.data[0] if learner_profile_res.data else {}

    # 3. Nội dung bài làm
    skill = attempt["skill"]
    content_data: Dict[str, Any] = {}

    if skill == "writing":
        # Lấy danh sách essays và tasks đúng các section của đề
        essays_res = db().table("essays").select("*").eq("attempt_id", attempt_id).order("updated_at").execute()
        essay_rows = essays_res.data or []
        section_ids = list({e["section_id"] for e in essay_rows if e.get("section_id")})
        tasks_res = db().table("writing_tasks").select("*").in_("section_id", section_ids).execute() if section_ids else None
        tasks_map = {t["section_id"]: t for t in ((tasks_res.data if tasks_res else None) or [])}

        tasks_payload = []
        for essay in essay_rows:
            task_info = tasks_map.get(essay["section_id"], {})
            t_type = task_info.get("task_type", "task2")
            t_no = 1 if t_type == "task1" else 2
            tasks_payload.append({
                "essay_id": essay["id"],
                "section_id": essay["section_id"],
                "task_no": t_no,
                "task_type": t_type,
                "prompt_category": task_info.get("prompt_category"),
                "task_prompt": task_info.get("task_prompt", ""),
                "chart_image_key": chart_image_url(task_info.get("chart_image_key")),
                "chart_image_url": chart_image_url(task_info.get("chart_image_key")),
                "min_words": task_info.get("min_words", 150),
                "content": essay["content"],
                "word_count": essay.get("word_count", 0)
            })
        content_data["tasks"] = sorted(tasks_payload, key=lambda x: x["task_no"])

    elif skill == "speaking":
        # Lấy speaking responses đã confirm theo đúng thứ tự Part 1 → 3
        resp_res = db().table("speaking_responses") \
            .select(
                "id, speaking_question_id, section_id, audio_key, duration_ms, transcript, audio_deleted_at, "
                "speaking_questions(order_no, prompt)"
            ) \
            .eq("attempt_id", attempt_id) \
            .not_.is_("confirmed_at", "null") \
            .execute()

        rows = resp_res.data or []
        section_ids = list({r["section_id"] for r in rows if r.get("section_id")})
        sec_res = db().table("sections").select("id, order_no, title").in_("id", section_ids).execute() if section_ids else None
        sec_map = {s["id"]: s for s in ((sec_res.data if sec_res else None) or [])}

        audio_items = []
        for r in rows:
            q_info = r.get("speaking_questions") if isinstance(r.get("speaking_questions"), dict) else {}
            sec_info = sec_map.get(r.get("section_id"), {})
            part_no = speaking_part_number(sec_info) if sec_info else 1
            audio_key = r.get("audio_key")
            audio_deleted = bool(r.get("audio_deleted_at"))
            signed_url = (
                r2_storage.presign_private_get(audio_key, 3600)
                if audio_key and not audio_deleted and r2_storage.private_bucket_configured
                else None
            )
            audio_items.append({
                "response_id": r["id"],
                "question_id": r["speaking_question_id"],
                "part_number": part_no,
                "order_no": q_info.get("order_no", 1),
                "prompt": q_info.get("prompt", ""),
                "audio_key": signed_url or audio_key,
                "audio_url": signed_url,
                "audio_deleted": audio_deleted,
                "duration_ms": r.get("duration_ms", 0),
                "transcript": r.get("transcript", ""),
            })
        content_data["questions"] = sorted(audio_items, key=lambda x: (x["part_number"], x["order_no"]))

    # 4. Điểm AI (Gợi ý đối chiếu - đã fetch song song ở trên)
    ai_eval = ai_eval_res.data[0] if ai_eval_res.data else None
    ai_criteria: List[Dict[str, Any]] = []
    ai_annotations: List[Dict[str, Any]] = []

    if ai_eval:
        crit_res, ann_res = await asyncio.gather(
            asyncio.to_thread(
                lambda: db().table("criterion_scores")
                .select("criterion_id, task_no, band, comment, criteria(code, name)")
                .eq("evaluation_id", ai_eval["id"])
                .execute()
            ),
            asyncio.to_thread(
                lambda: db().table("annotations").select("*").eq("evaluation_id", ai_eval["id"]).execute()
            ),
        )
        for c in (crit_res.data or []):
            crit_info = c.get("criteria", {}) if isinstance(c.get("criteria"), dict) else {}
            ai_criteria.append({
                "criterion_id": c["criterion_id"],
                "code": crit_info.get("code", ""),
                "name": crit_info.get("name", ""),
                "task_no": c.get("task_no", 1),
                "band": c["band"],
                "comment": c.get("comment", "")
            })
        ai_annotations = ann_res.data or []

    # 5. Tự động tạo bản nháp của Expert nếu chưa có để Expert mở phòng chấm là nộp được ngay
    if not assignment.get("evaluation_id") and assignment.get("ended_at") is None:
        draft_res = await start_expert_grading_draft(assignment_id, current_user.id)
        assignment["evaluation_id"] = draft_res["evaluation_id"]

    expert_eval_res = db().table("evaluations") \
        .select("id, overall_band, feedback, status") \
        .eq("attempt_id", attempt_id) \
        .eq("evaluator_type", "expert") \
        .execute()
    
    expert_eval = expert_eval_res.data[0] if expert_eval_res.data else None
    expert_criteria: List[Dict[str, Any]] = []
    expert_annotations: List[Dict[str, Any]] = []

    if expert_eval:
        e_crit_res, e_ann_res = await asyncio.gather(
            asyncio.to_thread(
                lambda: db().table("criterion_scores")
                .select("criterion_id, task_no, band, comment, criteria(code, name)")
                .eq("evaluation_id", expert_eval["id"])
                .execute()
            ),
            asyncio.to_thread(
                lambda: db().table("annotations").select("*").eq("evaluation_id", expert_eval["id"]).execute()
            ),
        )
        for c in (e_crit_res.data or []):
            crit_info = c.get("criteria", {}) if isinstance(c.get("criteria"), dict) else {}
            expert_criteria.append({
                "criterion_id": c["criterion_id"],
                "code": crit_info.get("code", ""),
                "name": crit_info.get("name", ""),
                "task_no": c.get("task_no", 1),
                "band": c["band"],
                "comment": c.get("comment", "")
            })
        expert_annotations = e_ann_res.data or []

    return {
        "assignment": assignment,
        "attempt": attempt,
        "learner_target": learner_target,
        "content": content_data,
        "criteria_definitions": all_criteria_res.data or [],
        "ai_evaluation": {
            "evaluation": ai_eval,
            "criteria": ai_criteria,
            "annotations": ai_annotations
        },
        "expert_draft": {
            "evaluation": expert_eval,
            "criteria": expert_criteria,
            "annotations": expert_annotations
        }
    }

@router.put("/assignments/{assignment_id}/draft")
async def save_draft_review(
    assignment_id: str,
    payload: ExpertSubmitReviewRequest,
    current_user: User = Depends(require_expert),
):
    """Lưu bản nháp chấm bài (điểm, nhận xét 4 tiêu chí, annotations) mà chưa công bố."""
    return await save_expert_grading_draft(assignment_id, current_user.id, payload.dict())


@router.post("/assignments/{assignment_id}/submit")
async def submit_review(
    assignment_id: str,
    payload: ExpertSubmitReviewRequest,
    current_user: User = Depends(require_expert)
):
    """
    Expert nộp kết quả chấm bài chính thức (UC-16, SD-07, FR-42).
    Nếu lệch band >= 1.0 so với AI, kiểm tra bắt buộc có giải trình.
    """
    return await submit_expert_final_review(assignment_id, current_user.id, payload.dict())
