"""
Catalog và bài tập theo dạng câu (UC-07/08, BR-18: Learner chỉ thấy đề published).

Trả về đúng hình dạng mà catalog.py / exercises.py cũ dựng từ public, để giữ nguyên phần
định dạng card. test_sets là bộ đề Mock (đúng 4 đề L/R/W/S, FR-36).
"""
from typing import Any, Optional

from app.db.supabase import db
from app.services.speaking.speaking_test_content import speaking_part_number


def _test_row(t: dict[str, Any]) -> dict[str, Any]:
    return {**{k: t.get(k) for k in ("id", "title", "skill", "difficulty", "allowed_mode", "test_set_id", "status", "created_at")},
            "duration_min": t.get("duration_minutes")}


def list_tests(page: int, limit: int, skill: Optional[str], difficulty: Optional[str], search: Optional[str]) -> dict[str, Any]:
    q = db().table("tests").select(
        "id, title, skill, duration_minutes, difficulty, allowed_mode, test_set_id, test_sets(id, name), created_at",
        count="exact").eq("status", "published").neq("allowed_mode", "mock")     # đề Mock không lộ ra danh mục
    if skill and skill.lower() != "all":
        q = q.eq("skill", skill.lower())
    if difficulty and difficulty.lower() != "all":
        q = q.eq("difficulty", difficulty.lower())
    if search and search.strip():
        q = q.ilike("title", f"%{search.strip()}%")
    offset = (page - 1) * limit
    res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    items = [{**_test_row(t), "test_sets": t.get("test_sets")} for t in res.data or []]
    total = res.count if getattr(res, "count", None) is not None else len(items)
    return {"items": items, "total": total, "page": page, "limit": limit}


def collections_source(user_id: Optional[str]) -> tuple[list, list, set]:
    """(test_sets, tests published, id đề đã có bài scored) cho format_collection_cards()."""
    sets = db().table("test_sets").select("id, name, created_at").eq("status", "published") \
        .order("name").execute().data or []
    tests = [_test_row(t) for t in db().table("tests").select(
        "id, title, skill, duration_minutes, status, test_set_id, created_at").eq("status", "published")
        .order("created_at").execute().data or []]
    done = set()
    if user_id:
        done = {a["test_id"] for a in db().table("attempts").select("test_id").eq("learner_id", user_id)
                .eq("status", "scored").execute().data or []}
    return sets, tests, done


def collection_detail_source(set_id: str, user_id: Optional[str]) -> Optional[tuple[dict, list, list]]:
    """(test_set, tests, attempts của user có band) hoặc None nếu bộ đề không tồn tại."""
    if set_id == "standalone-tests":
        test_set = {"id": "standalone-tests", "name": "Đề Thi Thực Chiến Độc Lập"}
        q = db().table("tests").select("id, title, skill, duration_minutes, status, created_at").is_("test_set_id", "null")
    else:
        rows = db().table("test_sets").select("id, name").eq("id", set_id).eq("status", "published").execute().data
        if not rows:
            return None
        test_set = rows[0]
        q = db().table("tests").select("id, title, skill, duration_minutes, status, created_at").eq("test_set_id", set_id)
    tests = [_test_row(t) for t in q.eq("status", "published").order("created_at").execute().data or []]
    attempts = []
    if user_id and tests:
        rows = db().table("attempts").select("id, test_id, skill, started_at, submitted_at, status") \
            .eq("learner_id", user_id).in_("test_id", [t["id"] for t in tests]).neq("status", "abandoned") \
            .order("started_at", desc=True).execute().data or []
        bands = {b["attempt_id"]: b["band"] for b in db().table("attempt_results").select("attempt_id, band")
                 .in_("attempt_id", [r["id"] for r in rows]).execute().data or []} if rows else {}
        attempts = [{**r, "band": bands.get(r["id"])} for r in rows]
    return test_set, tests, attempts


def exercise_groups(skill: str, q_type: Optional[str], difficulty: Optional[str], page: int, limit: int) -> tuple[list, int]:
    """Nhóm câu L/R của đề published, dạng phẳng: {id, question_type, instructions, order_no, section, test, question_count}."""
    q = db().table("question_groups").select(
        "id, question_type, subtype, instructions, order_no, questions(id), "
        "lr_sections!inner(sections!inner(id, order_no, title, tests!inner(id, title, skill, difficulty, status)))",
        count="exact").eq("lr_sections.sections.tests.status", "published").eq("lr_sections.sections.tests.skill", skill) \
        .neq("lr_sections.sections.tests.allowed_mode", "mock")
    if q_type:
        q = q.eq("question_type", q_type)
    if difficulty:
        q = q.eq("lr_sections.sections.tests.difficulty", difficulty)
    offset = (page - 1) * limit
    res = q.order("order_no").range(offset, offset + limit - 1).execute()
    out = []
    for g in res.data or []:
        sec = (g.get("lr_sections") or {}).get("sections") or {}
        out.append({"id": g["id"], "question_type": g["question_type"], "instructions": g.get("instructions"),
                    "order_no": g["order_no"], "question_count": len(g.get("questions") or []),
                    "section": {k: sec.get(k) for k in ("id", "order_no", "title")}, "test": sec.get("tests") or {}})
    return out, (res.count if getattr(res, "count", None) is not None else len(out))


def question_type_counts(skill: str) -> dict[str, int]:
    rows = db().table("question_groups").select(
        "question_type, lr_sections!inner(sections!inner(tests!inner(skill, status)))"
    ).eq("lr_sections.sections.tests.status", "published").eq("lr_sections.sections.tests.skill", skill) \
        .neq("lr_sections.sections.tests.allowed_mode", "mock").execute().data or []
    counts: dict[str, int] = {}
    for r in rows:
        counts[r["question_type"]] = counts.get(r["question_type"], 0) + 1
    return counts


def task_part_exercises(skill: str, difficulty: Optional[str]) -> list[dict[str, Any]]:
    """Writing: mỗi task là 1 bài tập (writing_task1/2); Speaking: mỗi part (speaking_part1..3)."""
    q = db().table("sections").select(
        "id, order_no, title, writing_tasks(task_type), speaking_parts(topic, speaking_questions(id)), "
        "tests!inner(id, title, skill, difficulty, status)"
    ).eq("tests.status", "published").eq("tests.skill", skill).neq("tests.allowed_mode", "mock")
    if difficulty:
        q = q.eq("tests.difficulty", difficulty)
    out = []
    for s in q.order("order_no").execute().data or []:
        wt, sp = s.get("writing_tasks"), s.get("speaking_parts")
        wt = (wt[0] if isinstance(wt, list) and wt else wt) or {}
        sp = (sp[0] if isinstance(sp, list) and sp else sp) or {}
        q_type = f"writing_{wt['task_type']}" if wt else f"speaking_part{speaking_part_number(s)}"
        out.append({"id": s["id"], "question_type": q_type, "instructions": sp.get("topic"), "order_no": s["order_no"],
                    "question_count": len(sp.get("speaking_questions") or []) or 1,
                    "section": {k: s.get(k) for k in ("id", "order_no", "title")}, "test": s.get("tests") or {}})
    return out
