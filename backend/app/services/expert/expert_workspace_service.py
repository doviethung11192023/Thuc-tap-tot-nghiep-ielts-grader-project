"""Nạp dữ liệu phòng chấm Split-View của Expert trong một payload duy nhất.

Gồm: đề thi và bài làm của học viên (Writing text hoặc Speaking audio), mục tiêu band của học viên,
kết quả chấm của AI (overall, 4 tiêu chí, chú thích lỗi) và bản nháp hiện tại của Expert.
Các truy vấn độc lập chạy song song bằng to_thread để không chặn event loop.
"""
import asyncio
from typing import Any

from app.core.domain_errors import ForbiddenError, NotFoundError
from app.db.supabase import db
from app.services.expert.dispatcher import start_expert_grading_draft
from app.services.expert.expert_policy_config import get_completeness_rules
from app.services.speaking.speaking_test_content import speaking_part_number
from app.services.storage.r2_storage import r2_storage
from app.services.writing.writing_test_content import chart_image_url


def _load_assignment_and_attempt(assignment_id: str, expert_id: str) -> tuple[dict, dict]:
    """Đọc assignment (kiểm quyền sở hữu) và attempt kèm thông tin đề."""
    asg_res = db().table("review_assignments").select("*").eq("id", assignment_id).execute()
    if not asg_res.data:
        raise NotFoundError("Assignment không tồn tại")
    assignment = asg_res.data[0]
    if assignment["expert_id"] != expert_id:
        raise ForbiddenError("Bạn không có quyền truy cập bài chấm này")

    att_res = db().table("attempts") \
        .select("id, learner_id, skill, mode, started_at, submitted_at, test_id, tests(id, title, skill)") \
        .eq("id", assignment["attempt_id"]).execute()
    if not att_res.data:
        raise NotFoundError("Attempt không tồn tại")
    return assignment, att_res.data[0]


def _writing_tasks_payload(attempt_id: str) -> list[dict[str, Any]]:
    """Bài Writing: mỗi essay ghép với task của đúng section trong đề, sắp theo Task 1 → Task 2."""
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
            "word_count": essay.get("word_count", 0),
        })
    return sorted(tasks_payload, key=lambda x: x["task_no"])


def _speaking_questions_payload(attempt_id: str) -> list[dict[str, Any]]:
    """Bài Speaking: các response đã xác nhận, theo thứ tự Part 1 → 3, audio ký URL tạm 1 giờ."""
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
    return sorted(audio_items, key=lambda x: (x["part_number"], x["order_no"]))


def _build_content(attempt: dict) -> dict[str, Any]:
    """Nội dung bài làm theo kỹ năng; kỹ năng khác Writing/Speaking trả dict rỗng như cũ."""
    content_data: dict[str, Any] = {}
    if attempt["skill"] == "writing":
        content_data["tasks"] = _writing_tasks_payload(attempt["id"])
    elif attempt["skill"] == "speaking":
        content_data["questions"] = _speaking_questions_payload(attempt["id"])
    return content_data


async def _load_evaluation_detail(evaluation: dict | None) -> tuple[list[dict], list[dict]]:
    """Điểm 4 tiêu chí và chú thích của một evaluation (hai truy vấn chạy song song)."""
    if not evaluation:
        return [], []
    crit_res, ann_res = await asyncio.gather(
        asyncio.to_thread(
            lambda: db().table("criterion_scores")
            .select("criterion_id, task_no, band, comment, criteria(code, name)")
            .eq("evaluation_id", evaluation["id"])
            .execute()
        ),
        asyncio.to_thread(
            lambda: db().table("annotations").select("*").eq("evaluation_id", evaluation["id"]).execute()
        ),
    )
    criteria: list[dict[str, Any]] = []
    for c in (crit_res.data or []):
        crit_info = c.get("criteria", {}) if isinstance(c.get("criteria"), dict) else {}
        criteria.append({
            "criterion_id": c["criterion_id"],
            "code": crit_info.get("code", ""),
            "name": crit_info.get("name", ""),
            "task_no": c.get("task_no", 1),
            "band": c["band"],
            "comment": c.get("comment", ""),
        })
    return criteria, ann_res.data or []


async def build_assignment_workspace(assignment_id: str, expert_id: str) -> dict[str, Any]:
    assignment, attempt = await asyncio.to_thread(_load_assignment_and_attempt, assignment_id, expert_id)
    attempt_id = assignment["attempt_id"]

    # Target band của learner + danh mục tiêu chí + điểm AI: ba truy vấn độc lập chạy song song
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
            .select("id, overall_band, feedback, status, created_at")
            .eq("attempt_id", attempt_id)
            .eq("evaluator_type", "ai")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        ),
    )
    learner_target = learner_profile_res.data[0] if learner_profile_res.data else {}
    content_data = await asyncio.to_thread(_build_content, attempt)

    # Điểm AI (gợi ý đối chiếu)
    ai_eval = ai_eval_res.data[0] if ai_eval_res.data else None
    ai_criteria, ai_annotations = await _load_evaluation_detail(ai_eval)

    # Tự tạo bản nháp của Expert nếu chưa có để mở phòng chấm là nộp được ngay
    if not assignment.get("evaluation_id") and assignment.get("ended_at") is None:
        draft_res = await start_expert_grading_draft(assignment_id, expert_id)
        assignment["evaluation_id"] = draft_res["evaluation_id"]

    expert_eval_res = await asyncio.to_thread(
        lambda: db().table("evaluations")
        .select("id, overall_band, feedback, status")
        .eq("attempt_id", attempt_id)
        .eq("evaluator_type", "expert")
        .execute()
    )
    expert_eval = expert_eval_res.data[0] if expert_eval_res.data else None
    expert_criteria, expert_annotations = await _load_evaluation_detail(expert_eval)

    return {
        "assignment": assignment,
        "attempt": attempt,
        "learner_target": learner_target,
        "content": content_data,
        "criteria_definitions": all_criteria_res.data or [],
        "completeness_rules": get_completeness_rules(),
        "ai_evaluation": {
            "evaluation": ai_eval,
            "criteria": ai_criteria,
            "annotations": ai_annotations,
        },
        "expert_draft": {
            "evaluation": expert_eval,
            "criteria": expert_criteria,
            "annotations": expert_annotations,
        },
    }
