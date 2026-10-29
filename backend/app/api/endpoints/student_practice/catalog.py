import time
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict, Any
from app.core.security import get_optional_user, User
from app.db.supabase import supabase
from app.services.catalog_formatter import format_collection_cards, DEFAULT_COVER_IMAGES

router = APIRouter()
_CATALOG_CACHE: Dict[str, Dict[str, Any]] = {}
_CATALOG_TTL_SECONDS = 60

@router.get("/tests")
async def list_published_tests(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    skill: Optional[str] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Danh sách bài thi đã xuất bản cho học viên làm bài với RAM Cache tốc độ cao."""
    cache_key = f"{page}_{limit}_{skill or ''}_{difficulty or ''}_{search or ''}"
    now_ts = time.time()
    if cache_key in _CATALOG_CACHE:
        entry = _CATALOG_CACHE[cache_key]
        if now_ts - entry["ts"] < _CATALOG_TTL_SECONDS:
            return {"meta": {"code": 200, "cached": True}, "data": entry["data"]}

    offset = (page - 1) * limit
    query = supabase.table("tests").select(
        "id, title, skill, duration_min, difficulty, allowed_mode, test_set_id, test_sets(id, name), created_at",
        count="exact"
    ).eq("status", "published")

    if skill and skill.lower() != "all":
        query = query.eq("skill", skill.lower())
    if difficulty and difficulty.lower() != "all":
        query = query.eq("difficulty", difficulty.lower())
    if search and search.strip():
        query = query.ilike("title", f"%{search.strip()}%")

    query = query.order("created_at", desc=True)
    res = query.range(offset, offset + limit - 1).execute()

    items = res.data or []
    total = res.count if hasattr(res, 'count') and res.count is not None else len(items)

    result_data = {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit
    }
    _CATALOG_CACHE[cache_key] = {"ts": now_ts, "data": result_data}
    return {
        "meta": {"code": 200},
        "data": result_data
    }

@router.get("/sets")
async def list_exam_collections(current_user: Optional[User] = Depends(get_optional_user)):
    """Danh sách các bộ đề thi IELTS đã xuất bản kèm tiến độ học viên (Batch Optimized)."""
    sets_res = supabase.table("test_sets").select("id, name, created_at").order("created_at", desc=True).execute()
    test_sets = sets_res.data or []

    tests_res = supabase.table("tests").select("id, title, skill, duration_min, status, test_set_id").eq("status", "published").order("created_at").execute()
    all_tests = tests_res.data or []

    completed_test_ids = set()
    if current_user:
        att_res = supabase.table("test_attempts").select("test_id").eq("user_id", current_user.id).eq("status", "scored").execute()
        completed_test_ids = {a["test_id"] for a in (att_res.data or [])}

    collections = format_collection_cards(test_sets, all_tests, completed_test_ids)
    return {"meta": {"code": 200}, "data": collections}

@router.get("/sets/{set_id}")
async def get_exam_collection_detail(set_id: str, current_user: Optional[User] = Depends(get_optional_user)):
    """Chi tiết bộ đề và danh sách các bài test phân rã theo 4 kỹ năng."""
    if set_id == "standalone-tests":
        test_set = {"id": "standalone-tests", "name": "Đề Thi Thực Chiến Độc Lập"}
        t_res = supabase.table("tests").select("id, title, skill, duration_min, status, created_at").is_("test_set_id", "null").eq("status", "published").order("created_at").execute()
    else:
        s_res = supabase.table("test_sets").select("*").eq("id", set_id).execute()
        if not s_res.data:
            # Fallback if set_id is a slug like 'recent-actual-test' or legacy ID
            s_res = supabase.table("test_sets").select("*").order("created_at").limit(1).execute()
        if not s_res.data:
            raise HTTPException(status_code=404, detail="Bộ đề thi không tồn tại")
        test_set = s_res.data[0]
        t_res = supabase.table("tests").select("id, title, skill, duration_min, status, created_at").eq("test_set_id", test_set["id"]).eq("status", "published").order("created_at").execute()

    tests = t_res.data or []

    user_attempts_by_test: Dict[str, List[Dict[str, Any]]] = {}
    if current_user:
        att_res = supabase.table("test_attempts").select("id, test_id, skill, band, started_at, submitted_at, status").eq("user_id", current_user.id).order("started_at", desc=True).execute()
        for a in (att_res.data or []):
            tid = a["test_id"]
            if tid not in user_attempts_by_test:
                user_attempts_by_test[tid] = []
            user_attempts_by_test[tid].append(a)

    test_cards = []
    for idx, t in enumerate(tests):
        tid = t["id"]
        attempts = user_attempts_by_test.get(tid, [])
        scored_attempts = [a for a in attempts if a.get("status") == "scored" and a.get("band") is not None]
        latest_band = scored_attempts[0]["band"] if scored_attempts else None

        status = "not_started"
        if scored_attempts:
            status = "completed"
        elif attempts:
            status = "draft"

        test_cards.append({
            "id": tid,
            "orderNumber": idx + 1,
            "title": t["title"],
            "skills": [
                {
                    "skill": t["skill"].capitalize(),
                    "status": status,
                    "latestBandScore": float(latest_band) if latest_band is not None else None,
                    "hasVirtualRoom": t["skill"] == "speaking",
                    "attempts": [
                        {
                            "id": a["id"],
                            "attemptNumber": len(scored_attempts) - i,
                            "submittedAt": a.get("submitted_at") or a.get("started_at") or "",
                            "bandScore": float(a["band"]) if a.get("band") is not None else 0.0
                        }
                        for i, a in enumerate(scored_attempts)
                    ]
                }
            ]
        })

    completed_count = sum(1 for tc in test_cards if any(s["status"] == "completed" for s in tc["skills"]))

    return {
        "meta": {"code": 200},
        "data": {
            "id": test_set["id"],
            "title": test_set["name"],
            "imageUrl": DEFAULT_COVER_IMAGES[0],
            "testsCount": len(test_cards),
            "completedTestsCount": completed_count,
            "tests": test_cards
        }
    }
