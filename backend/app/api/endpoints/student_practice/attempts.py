"""Bắt đầu bài làm và tải nội dung đề (không kèm đáp án — ràng buộc 8) — UC-07/08/09/10."""
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import User, get_optional_user
from app.services.practice.practice_attempt_lifecycle import get_owned_attempt, start_attempt
from app.services.practice.test_content import load_test_content, resolve_test

router = APIRouter()

_TEST_CONTENT_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_TTL_SECONDS = 900  # đề đã publish không đổi (BR-10) nên cache 15 phút


class StartAttemptRequest(BaseModel):
    test_id: str
    mode: str = "practice"  # "practice" | "mock"
    skill: Optional[str] = None


@router.post("/attempts/start", status_code=status.HTTP_201_CREATED)
async def start_test_attempt(req: StartAttemptRequest, current_user: Optional[User] = Depends(get_optional_user)):
    """Tạo attempt mới (hoặc làm tiếp attempt dở của đề này). Chỉ Learner đã đăng nhập."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để làm bài thi")
    test = resolve_test(req.test_id, req.skill)
    if not test:
        raise HTTPException(status_code=404, detail="Bài thi không tồn tại")
    mode = req.mode if req.mode in ("practice", "mock") else "practice"
    data = start_attempt(str(current_user.id), test, mode)
    return {"meta": {"code": 201, "message": "Bắt đầu bài thi thành công"}, "data": data}


@router.get("/attempts/{attempt_id}/content")
async def get_attempt_exam_content(attempt_id: str, current_user: Optional[User] = Depends(get_optional_user)):
    """Nội dung đề của một attempt; chỉ chủ bài (hoặc Admin) xem được."""
    is_admin = bool(current_user and current_user.role == "admin")
    attempt = get_owned_attempt(attempt_id, current_user.id if current_user else None, is_admin)
    if not attempt:
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")
    content = load_test_content(attempt["test_id"], attempt["skill"]) or {"sections": []}
    return {"meta": {"code": 200}, "data": {
        **content, "attempt_id": attempt["id"], "mode": attempt["mode"],
        "started_at": attempt["started_at"], "deadline_at": attempt.get("deadline_at")}}


@router.get("/tests/{test_id}/content")
async def get_test_exam_content_direct(test_id: str, skill: Optional[str] = None,
                                       current_user: Optional[User] = Depends(get_optional_user)):
    """Nội dung đề theo test_id (hoặc slug), có cache RAM."""
    now_ts = datetime.now(timezone.utc).timestamp()
    cache_key = f"{test_id}_{skill or 'all'}"
    cached = _TEST_CONTENT_CACHE.get(cache_key)
    if cached and now_ts - cached["cached_at"] < _CACHE_TTL_SECONDS:
        return {"meta": {"code": 200, "cached": True}, "data": cached["data"]}

    test = resolve_test(test_id, skill)
    if not test or test.get("status") != "published":
        raise HTTPException(status_code=404, detail="Bài thi không tồn tại")
    content = load_test_content(test["id"], test["skill"])
    if not content:
        raise HTTPException(status_code=404, detail="Bài thi không tồn tại")
    _TEST_CONTENT_CACHE[cache_key] = {"cached_at": now_ts, "data": content}
    return {"meta": {"code": 200}, "data": content}
