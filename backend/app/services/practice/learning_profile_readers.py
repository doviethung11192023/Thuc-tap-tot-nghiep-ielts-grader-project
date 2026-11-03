"""
Nguồn dữ liệu cho learning profile / dashboard (services/learning_profile/*), trả về
đúng hình dạng dict cũ để giữ nguyên logic tính toán:
- attempts: {id, test_id, skill, mode, status, band, raw_score, started_at, submitted_at, tests{id,title,duration_min}}
- tests:    {id, title, skill, duration_min}
- answers kèm dạng câu: {attempt_id, question_id, is_correct, question_type, question_subtype}
Band lấy từ view attempt_results (kết quả chính thức).
"""
from typing import Any

from app.db.supabase import db

def user_attempts(user_id: str) -> list[dict[str, Any]]:
    rows = db().table("attempts").select(
        "id, test_id, skill, mode, status, raw_score, started_at, submitted_at, tests(id, title, duration_minutes)"
    ).eq("learner_id", user_id).neq("status", "abandoned").order("started_at", desc=True).execute().data or []
    bands = {}
    if rows:
        res = db().table("attempt_results").select("attempt_id, band").in_("attempt_id", [r["id"] for r in rows]).execute()
        bands = {b["attempt_id"]: b["band"] for b in res.data or []}
    out = []
    for r in rows:
        t = r.get("tests") or {}
        out.append({**{k: r[k] for k in ("id", "test_id", "skill", "mode", "raw_score", "started_at", "submitted_at")},
                    "status": r["status"],
                    "band": float(bands[r["id"]]) if bands.get(r["id"]) is not None else None,
                    "tests": {"id": t.get("id"), "title": t.get("title"), "duration_min": t.get("duration_minutes")}})
    return out


def published_tests() -> list[dict[str, Any]]:
    rows = db().table("tests").select("id, title, skill, duration_minutes").eq("status", "published").execute().data or []
    return [{"id": r["id"], "title": r["title"], "skill": r["skill"], "duration_min": r.get("duration_minutes")} for r in rows]


def learner_goal_row(user_id: str) -> dict[str, Any]:
    rows = db().table("learner_profiles").select(
        "target_overall, target_listening, target_reading, target_writing, target_speaking, test_date"
    ).eq("user_id", user_id).execute().data
    return rows[0] if rows else {}


def answers_with_types(attempt_ids: list[str]) -> list[dict[str, Any]]:
    if not attempt_ids:
        return []
    rows = db().table("answers").select(
        "attempt_id, question_id, is_correct, questions(question_groups(question_type, subtype))"
    ).in_("attempt_id", attempt_ids).execute().data or []
    out = []
    for r in rows:
        g = ((r.get("questions") or {}).get("question_groups") or {})
        out.append({"attempt_id": r["attempt_id"], "question_id": r["question_id"], "is_correct": r["is_correct"],
                    "question_type": g.get("question_type") or "other", "question_subtype": g.get("subtype") or ""})
    return out
