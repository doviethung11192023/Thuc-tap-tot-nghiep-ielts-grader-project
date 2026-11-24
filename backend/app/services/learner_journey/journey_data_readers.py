"""
Mọi lượt đọc Supabase cho lộ trình học (spec 005). Chỉ đọc, không bảng mới (ADR-23).
Danh mục đề cache 5 phút (đề đã publish không đổi nội dung, BR-10); độ khó câu cache 10 phút theo câu.
Chỉ trả số liệu gộp của Learner khác (lượt đúng / lượt trả lời mỗi câu), không lộ dữ liệu cá nhân (FR-021).
"""
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, Optional

from app.db.supabase import db

from .journey_constants import LR_SKILLS, SCORED
from .question_ability_elo_model import question_difficulty

PAGE = 1000          # PostgREST trả tối đa 1000 dòng mỗi lượt
ID_CHUNK = 150       # số id mỗi bộ lọc in_ (giữ URL ngắn)
CATALOG_TTL, DIFFICULTY_TTL = 300, 600

_catalog_cache: dict[str, Any] = {}
_difficulty_cache: dict[str, tuple[float, float]] = {}   # question_id → (b, hết hạn)


def _one(value: Any) -> dict:
    """Quan hệ 1-1 PostgREST có lúc trả list, có lúc trả dict."""
    if isinstance(value, list):
        return value[0] if value else {}
    return value or {}


def _paged(build: Callable[[], Any]) -> list[dict]:
    rows, start = [], 0
    while True:
        batch = build().range(start, start + PAGE - 1).execute().data or []
        rows.extend(batch)
        if len(batch) < PAGE:
            return rows
        start += PAGE


def _chunks(ids: list[str], size: int = ID_CHUNK):
    for i in range(0, len(ids), size):
        yield ids[i:i + size]


def goal_row(user_id: str) -> Optional[dict[str, Any]]:
    rows = db().table("learner_profiles").select(
        "target_overall, target_listening, target_reading, target_writing, target_speaking, test_date"
    ).eq("user_id", user_id).execute().data
    return rows[0] if rows else None


def learner_attempts(user_id: str) -> list[dict[str, Any]]:
    """Bài làm của Learner, band = kết quả chính thức (view attempt_results)."""
    rows = _paged(lambda: db().table("attempt_results").select(
        "attempt_id, test_id, skill, mode, status, submitted_at, band").eq("learner_id", user_id).order("started_at"))
    return [{"id": r["attempt_id"], "test_id": r["test_id"], "skill": r["skill"], "mode": r["mode"],
             "status": r["status"], "submitted_at": r.get("submitted_at"),
             "band": float(r["band"]) if r.get("band") is not None else None} for r in rows]


def published_catalog() -> list[dict[str, Any]]:
    """Đề đã publish kèm phần đề, dạng câu từng câu (L/R) và dạng đề (Writing)."""
    hit = _catalog_cache.get("catalog")
    if hit and hit[1] > time.time():
        return hit[0]
    rows = db().table("tests").select(
        "id, title, skill, allowed_mode, created_at, sections(order_no, writing_tasks(task_type, prompt_category), "
        "lr_sections(question_groups(question_type, questions(id))))"
    ).eq("status", "published").order("created_at").execute().data or []
    catalog = []
    for t in rows:
        sections = []
        for s in sorted(t.get("sections") or [], key=lambda s: s["order_no"]):
            wt = _one(s.get("writing_tasks"))
            groups = _one(s.get("lr_sections")).get("question_groups") or []
            questions = [(q["id"], g["question_type"]) for g in groups for q in (g.get("questions") or [])]
            sections.append({"order_no": s["order_no"], "task_type": wt.get("task_type"),
                             "prompt_category": wt.get("prompt_category"), "questions": questions})
        catalog.append({"id": t["id"], "title": t["title"], "skill": t["skill"],
                        "allowed_mode": t["allowed_mode"], "sections": sections})
    _catalog_cache["catalog"] = (catalog, time.time() + CATALOG_TTL)
    return catalog


def lr_answers(attempts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Câu trả lời trong các bài L/R đã chấm, theo thời gian nộp rồi số câu; bỏ trống = sai."""
    scored = {a["id"]: a for a in attempts if a["skill"] in LR_SKILLS and a["status"] == SCORED}
    rows: list[dict] = []
    for ids in _chunks(list(scored), 20):
        rows += _paged(lambda ids=ids: db().table("answers").select(
            "attempt_id, question_id, is_correct, questions(number, question_groups(question_type))"
        ).in_("attempt_id", ids).order("attempt_id").order("question_id"))
    out = []
    for r in rows:
        q = _one(r.get("questions"))
        a = scored[r["attempt_id"]]
        out.append({"skill": a["skill"], "question_type": _one(q.get("question_groups")).get("question_type") or "other",
                    "question_id": r["question_id"], "is_correct": r.get("is_correct") is True,
                    "_order": (str(a.get("submitted_at") or ""), q.get("number") or 0)})
    out.sort(key=lambda x: x["_order"])
    for x in out:
        x.pop("_order")
    return out


def difficulties(question_ids: set[str]) -> dict[str, float]:
    """Độ khó câu từ lượt trả lời đã chấm của mọi Learner; cache 10 phút theo câu."""
    now = time.time()
    out = {q: hit[0] for q in question_ids if (hit := _difficulty_cache.get(q)) and hit[1] > now}
    missing = [q for q in question_ids if q not in out]
    stats = {q: [0, 0] for q in missing}

    def fetch(ids: list[str]) -> list[dict]:
        return _paged(lambda: db().table("answers").select("question_id, is_correct")
                      .in_("question_id", ids).not_.is_("is_correct", "null").order("attempt_id"))

    with ThreadPoolExecutor(max_workers=4) as pool:     # các cụm id độc lập, chạy song song
        for batch in pool.map(fetch, list(_chunks(missing))):
            for r in batch:
                s = stats[r["question_id"]]
                s[0] += 1 if r["is_correct"] else 0
                s[1] += 1
    for q, (correct, total) in stats.items():
        b = question_difficulty(correct, total)
        _difficulty_cache[q] = (b, now + DIFFICULTY_TTL)
        out[q] = b
    return out


def official_criterion_rows(attempts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Điểm tiêu chí chính thức của bài W/S đã chấm: {skill, attempt_id, submitted_at, code, task_no, band, comment}."""
    scored = {a["id"]: a for a in attempts if a["skill"] in ("writing", "speaking") and a["status"] == SCORED}
    rows: list[dict] = []
    for ids in _chunks(list(scored)):
        rows += db().table("evaluations").select(
            "attempt_id, criterion_scores(task_no, band, comment, criteria(code))"
        ).in_("attempt_id", ids).eq("is_official", True).execute().data or []
    out = []
    for ev in rows:
        a = scored[ev["attempt_id"]]
        for cs in ev.get("criterion_scores") or []:
            out.append({"skill": a["skill"], "attempt_id": a["id"], "test_id": a["test_id"],
                        "submitted_at": a.get("submitted_at"), "code": _one(cs.get("criteria")).get("code"),
                        "task_no": cs["task_no"], "band": float(cs["band"]), "comment": cs.get("comment")})
    return out


def writing_task_rows(criterion_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Band từng task Writing (TB tiêu chí của task) kèm dạng đề của task đó."""
    by_task: dict[tuple[str, int], list[dict]] = {}
    for r in criterion_rows:
        if r["skill"] == "writing":
            by_task.setdefault((r["attempt_id"], r["task_no"]), []).append(r)
    test_ids = sorted({items[0]["test_id"] for items in by_task.values()})
    categories: dict[tuple[str, str], Optional[str]] = {}
    for ids in _chunks(test_ids):
        for s in db().table("sections").select("test_id, writing_tasks(task_type, prompt_category)") \
                .in_("test_id", ids).eq("skill", "writing").execute().data or []:
            wt = _one(s.get("writing_tasks"))
            if wt.get("task_type"):
                categories[(s["test_id"], wt["task_type"])] = wt.get("prompt_category")
    out = []
    for (attempt_id, task_no), items in by_task.items():
        task_type = f"task{task_no}"
        out.append({"attempt_id": attempt_id, "task_type": task_type,
                    "prompt_category": categories.get((items[0]["test_id"], task_type)),
                    "band": sum(i["band"] for i in items) / len(items)})
    return out


def mock_pool(user_id: str) -> dict[str, dict[str, Any]]:
    rows = db().rpc("mock_pool_summary", {"p_learner_id": user_id}).execute().data or []
    return {r["skill"]: r for r in rows}
