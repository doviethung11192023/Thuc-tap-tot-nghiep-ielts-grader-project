"""
Lịch sử làm bài của Learner (UC-11) — GET/DELETE /student/history.

Band lấy từ view attempt_results (luôn là kết quả chính thức). "Xoá" chỉ áp dụng cho bài
chưa nộp: chuyển sang abandoned (Learner huỷ, ST_attempt) và ẩn khỏi lịch sử; bài đã nộp
không xoá được vì kết quả chấm phải truy vết được (ADR-12/13).
"""
from typing import Any, Optional

from fastapi import HTTPException

from app.db.supabase import db

def list_history(user_id: str, page: int, limit: int, skill: Optional[str], status: Optional[str]) -> dict[str, Any]:
    q = db().table("attempts").select(
        "id, test_id, skill, mode, status, raw_score, question_count, started_at, submitted_at, "
        "tests(title, duration_minutes)", count="exact"
    ).eq("learner_id", user_id).neq("status", "abandoned")
    if status and status.lower() in ("scored", "in_progress"):
        q = q.eq("status", status.lower())
    if skill and skill.lower() != "all":
        q = q.eq("skill", skill.lower())
    offset = (page - 1) * limit
    res = q.order("started_at", desc=True).range(offset, offset + limit - 1).execute()
    attempts = res.data or []

    bands = {}
    if attempts:
        rows = db().table("attempt_results").select("attempt_id, band, preliminary_band") \
            .in_("attempt_id", [a["id"] for a in attempts]).execute().data or []
        bands = {r["attempt_id"]: r for r in rows}

    items = []
    for a in attempts:
        test = a.get("tests") or {}
        band = (bands.get(a["id"]) or {}).get("band")
        items.append({
            "id": a["id"], "test_id": a["test_id"],
            "title": test.get("title") or f"IELTS {a['skill'].capitalize()} Practice",
            "skill": a["skill"].capitalize(), "mode": a["mode"],
            "status": a["status"],
            "band": float(band) if band is not None else 0.0,
            "raw_score": a.get("raw_score"), "total_questions": a.get("question_count"),
            "submitted_at": a.get("submitted_at") or a.get("started_at"),
            "duration_min": test.get("duration_minutes") or 60,
        })
    total = res.count if getattr(res, "count", None) is not None else len(items)
    return {"items": items, "total": total, "page": page, "limit": limit}


def abandon_attempt(user_id: str, attempt_id: str) -> None:
    rows = db().table("attempts").select("id, status").eq("id", attempt_id).eq("learner_id", user_id).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")
    if rows[0]["status"] not in ("in_progress", "abandoned"):
        raise HTTPException(status_code=409, detail="Bài đã nộp không xoá được (kết quả chấm cần được lưu lại)")
    db().table("attempts").update({"status": "abandoned"}).eq("id", attempt_id).eq("status", "in_progress").execute()
