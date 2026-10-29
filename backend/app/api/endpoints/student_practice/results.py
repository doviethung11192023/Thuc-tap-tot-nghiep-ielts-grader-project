import json
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List, Dict, Any
from app.core.security import get_optional_user, User
from app.db.supabase import supabase

router = APIRouter()

@router.get("/attempts/{attempt_id}/summary")
async def get_attempt_summary(attempt_id: str, current_user: Optional[User] = Depends(get_optional_user)):
    """Lấy kết quả tóm tắt sau khi nộp bài: Band score, số câu đúng, dạng bài."""
    att_res = supabase.table("test_attempts").select("*, tests(id, title, skill, duration_min)").eq("id", attempt_id).execute()
    if not att_res.data:
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")
    attempt = att_res.data[0]
    test_info = attempt.get("tests") or {}

    ans_res = supabase.table("attempt_answers").select("is_correct, questions(question_groups(question_type))").eq("attempt_id", attempt_id).execute()
    answers = ans_res.data or []

    type_stats: Dict[str, Dict[str, int]] = {}
    for a in answers:
        q_data = a.get("questions") or {}
        g_data = q_data.get("question_groups") or {}
        q_type = g_data.get("question_type") or "other"
        if q_type not in type_stats:
            type_stats[q_type] = {"total": 0, "correct": 0}
        type_stats[q_type]["total"] += 1
        if a.get("is_correct"):
            type_stats[q_type]["correct"] += 1

    formats_result = [
        {
            "code": k,
            "name": k.replace("_", " ").capitalize(),
            "total_questions": v["total"],
            "correct_answers": v["correct"],
            "correct_rate": round((v["correct"] / max(1, v["total"])) * 100, 1),
            "incorrect_rate": round(100 - (v["correct"] / max(1, v["total"])) * 100, 1)
        }
        for k, v in type_stats.items()
    ]

    return {
        "meta": {"code": 200},
        "data": {
            "attempt_id": attempt["id"],
            "test_id": attempt["test_id"],
            "title": test_info.get("title") or "IELTS Practice Test",
            "skill": attempt["skill"],
            "mode": attempt["mode"],
            "status": attempt["status"],
            "overall_band": float(attempt.get("band") or 0.0),
            "correct_count": attempt.get("raw_score") or 0,
            "total_questions": len(answers),
            "submitted_at": attempt.get("submitted_at") or attempt.get("started_at"),
            "task_formats_result": formats_result
        }
    }

@router.get("/attempts/{attempt_id}/detail")
async def get_attempt_detail_with_explanations(attempt_id: str, current_user: Optional[User] = Depends(get_optional_user)):
    """Mở khóa đáp án đúng, lời giải 4 bước và dẫn chứng sau khi đã nộp bài."""
    att_res = supabase.table("test_attempts").select("*, tests(id, title, skill)").eq("id", attempt_id).execute()
    if not att_res.data:
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")
    attempt = att_res.data[0]
    test_info = attempt.get("tests") or {}
    skill = attempt["skill"]

    # Lấy câu trả lời của học viên
    ans_map: Dict[str, Any] = {}
    u_ans_res = supabase.table("attempt_answers").select("*").eq("attempt_id", attempt_id).execute()
    for ua in (u_ans_res.data or []):
        ans_map[ua["question_id"]] = ua

    # Lấy toàn bộ sections, groups, questions và answer keys trong 1 single nested query (5x faster)
    sec_res = (
        supabase.table("test_sections")
        .select("*, question_groups(*, questions(*, question_answer_keys(*)))")
        .eq("test_id", attempt["test_id"])
        .order("order_no")
        .execute()
    )
    raw_sections = sec_res.data or []
    has_attempt_answers = len(ans_map) > 0

    sections = []
    for sec in raw_sections:
        groups = sec.get("question_groups") or []
        groups.sort(key=lambda g: g.get("order_no") or 0)
        sec_has_practiced_q = False

        for grp in groups:
            q_list = grp.get("questions") or []
            q_list.sort(key=lambda q: q.get("number") or 0)

            for q in q_list:
                if q["id"] in ans_map:
                    sec_has_practiced_q = True
                ak = q.get("question_answer_keys")
                if isinstance(ak, list) and ak:
                    ak_obj = ak[0]
                elif isinstance(ak, dict):
                    ak_obj = ak
                else:
                    ak_obj = {}

                user_ans_record = ans_map.get(q["id"]) or {}
                q["user_answer"] = user_ans_record.get("answer") or ""
                q["is_correct"] = user_ans_record.get("is_correct", False)
                accepted = ak_obj.get("accepted_answers", [])
                q["correct_answer"] = accepted[0] if accepted else ""
                q["explanation_4_steps"] = ak_obj.get("explanation") or ""
                q["evidence_text"] = ak_obj.get("evidence") or ""
            grp["questions"] = q_list

        # Sắp xếp các nhóm câu hỏi trong section theo số thứ tự câu hỏi tăng dần
        groups.sort(
            key=lambda g: min(
                [q["number"] for q in g.get("questions", []) if q.get("number") is not None]
                or [g.get("order_no") or 0]
            )
        )
        sec["question_groups"] = groups

        # Nếu bài làm chỉ nộp các phần lẻ, chỉ hiển thị kết quả các section được làm
        if not has_attempt_answers or sec_has_practiced_q:
            sections.append(sec)

    return {
        "meta": {"code": 200},
        "data": {
            "attempt_id": attempt["id"],
            "test_id": attempt["test_id"],
            "title": test_info.get("title") or "IELTS Practice Test",
            "skill": skill,
            "overall_band": float(attempt.get("band") or 0.0),
            "correct_count": attempt.get("raw_score") or 0,
            "submitted_at": attempt.get("submitted_at"),
            "sections": sections
        }
    }
