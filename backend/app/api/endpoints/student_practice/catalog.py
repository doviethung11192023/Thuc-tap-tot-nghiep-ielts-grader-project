import time
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict, Any
from app.core.security import get_optional_user, User
from app.services.practice import practice_catalog
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

    result_data = practice_catalog.list_tests(page, limit, skill, difficulty, search)
    _CATALOG_CACHE[cache_key] = {"ts": now_ts, "data": result_data}
    return {
        "meta": {"code": 200},
        "data": result_data
    }

@router.get("/sets")
async def list_exam_collections(current_user: Optional[User] = Depends(get_optional_user)):
    """Danh sách các bộ đề thi IELTS đã xuất bản kèm tiến độ học viên (Batch Optimized)."""
    test_sets, all_tests, completed_test_ids = practice_catalog.collections_source(current_user.id if current_user else None)
    collections = format_collection_cards(test_sets, all_tests, completed_test_ids)
    return {"meta": {"code": 200}, "data": collections}

@router.get("/sets/{set_id}")
async def get_exam_collection_detail(set_id: str, current_user: Optional[User] = Depends(get_optional_user)):
    """Chi tiết bộ đề và danh sách các bài test phân rã theo 4 kỹ năng."""
    source = practice_catalog.collection_detail_source(set_id, current_user.id if current_user else None)
    if source is None:
        raise HTTPException(status_code=404, detail="Bộ đề thi không tồn tại")
    test_set, tests, attempts = source
    user_attempts_by_test: Dict[str, List[Dict[str, Any]]] = {}
    for a in attempts:
        user_attempts_by_test.setdefault(a["test_id"], []).append(a)

    test_cards = []
    for idx, t in enumerate(tests):
        tid = t["id"]
        attempts = user_attempts_by_test.get(tid, [])
        scored_attempts = [a for a in attempts if a.get("status") == "scored" and a.get("band") is not None]
        all_bands = [float(a["band"]) for a in scored_attempts if a.get("band") is not None]
        highest_band = max(all_bands) if all_bands else None
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
                    "highestBandScore": float(highest_band) if highest_band is not None else None,
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
