"""
Nội dung đề Writing (tests → sections → writing_tasks), trả về đúng hình dạng
cũ mà frontend đang dùng (utils/exam-content-mapper.ts → mapToWritingExamData):
sections[i].question_groups[0].questions[0].prompt, question_groups[0].image_key (URL ảnh).
"""
from typing import Any, Optional

from app.services.r2_storage import r2_storage
from app.db.supabase import db

_TASK_NO = {"task1": 1, "task2": 2}

TEST_TREE_SELECT = (
    "id, title, skill, status, duration_minutes, "
    "sections(id, order_no, title, writing_tasks(task_type, prompt_category, task_prompt, "
    "chart_image_key, chart_description, min_words))"
)


def chart_image_url(key: Optional[str]) -> Optional[str]:
    """chart_image_key (key R2 hoặc URL cũ) → URL công khai cho trình duyệt và AI engine."""
    if not key:
        return None
    if key.startswith(("http://", "https://", "data:image/")):
        return key
    url = r2_storage.get_file_url(key)
    return url if url.startswith(("http://", "https://")) else None


def load_writing_test(test_id: str) -> Optional[dict[str, Any]]:
    res = db().table("tests").select(TEST_TREE_SELECT).eq("id", test_id).eq("skill", "writing").execute()
    return res.data[0] if res.data else None


def writing_tasks_of(test: dict[str, Any]) -> list[dict[str, Any]]:
    """[{section_id, task_no, order_no, title, ...writing_task}] sắp theo Task 1 → Task 2."""
    tasks = []
    for sec in test.get("sections") or []:
        wt = sec.get("writing_tasks")
        if isinstance(wt, list):
            wt = wt[0] if wt else None
        if not wt:
            continue
        tasks.append({"section_id": sec["id"], "order_no": sec["order_no"], "title": sec.get("title"),
                      "task_no": _TASK_NO[wt["task_type"]], **wt})
    return sorted(tasks, key=lambda t: t["task_no"])


def load_writing_task_sections(test_id: str) -> dict[int, str]:
    """{task_no: section_id} của đề Writing."""
    test = load_writing_test(test_id)
    return {t["task_no"]: t["section_id"] for t in writing_tasks_of(test)} if test else {}


def to_writing_content(test: dict[str, Any]) -> dict[str, Any]:
    """Hình dạng của format_student_test_content() cũ, không kèm đáp án."""
    sections = []
    for t in writing_tasks_of(test):
        sections.append({
            "id": t["section_id"],
            "order_no": t["order_no"],
            "title": t["title"] or f"Writing Task {t['task_no']}",
            "passage_text": None,
            "audio_key": None,
            "question_groups": [{
                "id": t["section_id"],
                "order_no": 1,
                "question_type": t["task_type"].replace("task", "writing_task"),
                "instructions": None,
                "image_key": chart_image_url(t.get("chart_image_key")),
                "content": {"task_type": t["task_type"], "min_words": t["min_words"],
                            "prompt_category": t.get("prompt_category")},
                "questions": [{"id": t["section_id"], "number": t["task_no"], "prompt": t["task_prompt"],
                               "options": None, "max_words": None}],
            }],
        })
    return {
        "test_id": test["id"],
        "title": test["title"],
        "skill": "writing",
        "duration_min": test.get("duration_minutes") or 60,
        "sections": sections,
    }
