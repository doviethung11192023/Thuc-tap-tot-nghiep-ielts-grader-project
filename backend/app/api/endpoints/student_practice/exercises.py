import time
from fastapi import APIRouter, Depends, Query
from typing import Optional, List, Dict, Any
from app.core.security import get_optional_user, User
from app.services.practice import practice_catalog

router = APIRouter()

_EXERCISES_CACHE: Dict[str, Dict[str, Any]] = {}
_TYPES_SUMMARY_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_TTL_SECONDS = 60

TYPE_DISPLAY_NAMES: Dict[str, str] = {
    "multiple_choice": "Multiple Choice (Trắc nghiệm)",
    "true_false_not_given": "True / False / Not Given",
    "matching": "Matching (Nối thông tin / Map)",
    "completion": "Completion / Điền từ",
    "short_answer": "Short Answer (Câu ngắn)",
    "writing_task1": "Writing Task 1 (Biểu đồ / Map)",
    "writing_task2": "Writing Task 2 (Bài luận 250+ từ)",
    "speaking_part1": "Speaking Part 1 (Phỏng vấn)",
    "speaking_part2": "Speaking Part 2 (Cue Card)",
    "speaking_part3": "Speaking Part 3 (Thảo luận 2 chiều)",
}

@router.get("/question-types-summary")
async def get_question_types_summary(skill: str = Query("reading")):
    """Tổng hợp danh sách các dạng bài kèm số lượng bài tập thực tế trong hệ thống."""
    skill_lower = (skill or "reading").lower()
    now_ts = time.time()
    if skill_lower in _TYPES_SUMMARY_CACHE:
        entry = _TYPES_SUMMARY_CACHE[skill_lower]
        if now_ts - entry["ts"] < _CACHE_TTL_SECONDS:
            return {"meta": {"code": 200, "cached": True}, "data": entry["data"]}

    if skill_lower in ("writing", "speaking"):
        counts: Dict[str, int] = {}
        for it in practice_catalog.task_part_exercises(skill_lower, None):
            counts[it["question_type"]] = counts.get(it["question_type"], 0) + 1
    else:
        counts = practice_catalog.question_type_counts(skill_lower)

    summary_list = []
    for q_type, count in counts.items():
        summary_list.append({
            "key": q_type,
            "name": TYPE_DISPLAY_NAMES.get(q_type, q_type.replace("_", " ").title()),
            "count": count,
            "accuracy": 0,
        })

    summary_list.sort(key=lambda x: x["count"], reverse=True)
    _TYPES_SUMMARY_CACHE[skill_lower] = {"ts": now_ts, "data": summary_list}
    return {"meta": {"code": 200}, "data": summary_list}

@router.get("/exercises")
async def list_practice_exercises(
    skill: str = Query("reading"),
    question_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Danh sách bài tập thực chiến theo dạng bài bóc tách từ các đề thi đã xuất bản."""
    skill_lower = (skill or "reading").lower()
    type_filter = question_type.lower() if question_type and question_type.lower() != "all" else None
    diff_filter = difficulty.lower() if difficulty and difficulty.lower() != "all" else None

    cache_key = f"{skill_lower}_{type_filter or ''}_{diff_filter or ''}_{page}_{limit}"
    now_ts = time.time()
    if cache_key in _EXERCISES_CACHE:
        cached = _EXERCISES_CACHE[cache_key]
        if now_ts - cached["ts"] < _CACHE_TTL_SECONDS:
            return {"meta": {"code": 200, "cached": True}, "data": cached["data"]}

    if skill_lower in ("writing", "speaking"):
        rows = [r for r in practice_catalog.task_part_exercises(skill_lower, diff_filter)
                if not type_filter or r["question_type"] == type_filter]
        total, items = len(rows), rows[(page - 1) * limit: page * limit]
    else:
        items, total = practice_catalog.exercise_groups(skill_lower, type_filter, diff_filter, page, limit)

    formatted_exercises = []
    for it in items:
        group_id = it.get("id")
        q_type = it.get("question_type", "")
        sec = it.get("section") or {}
        test_info = it.get("test") or {}
        q_count = it.get("question_count") or 0

        part_num = sec.get("order_no", 1)
        sec_title = sec.get("title") or f"Part {part_num}"
        test_title = test_info.get("title") or "IELTS Practice"
        type_label = TYPE_DISPLAY_NAMES.get(q_type, q_type.replace("_", " ").title())

        diff_val = test_info.get("difficulty") or "medium"
        diff_vi = "Dễ" if diff_val == "easy" else ("Nâng cao" if diff_val == "hard" else "Trung bình")

        formatted_exercises.append({
            "id": group_id,
            "title": f"{test_title} - {sec_title}: {type_label}",
            "type": type_label,
            "raw_type": q_type,
            "skill": skill_lower.capitalize(),
            "difficulty": diff_vi,
            "question_count": q_count if q_count > 0 else 5,
            "estimated_minutes": max(5, q_count * 2) if q_count > 0 else 10,
            "test_id": test_info.get("id"),
            "section_id": sec.get("id"),
            "part_number": part_num,
            "instructions": it.get("instructions") or ""
        })

    result_data = {
        "items": formatted_exercises,
        "total": total,
        "page": page,
        "limit": limit
    }
    _EXERCISES_CACHE[cache_key] = {"ts": now_ts, "data": result_data}

    return {"meta": {"code": 200}, "data": result_data}
