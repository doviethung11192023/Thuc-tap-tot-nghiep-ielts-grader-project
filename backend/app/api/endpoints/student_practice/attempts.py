"""Bắt đầu bài làm và tải nội dung đề (không kèm đáp án — ràng buộc 8) — UC-07/08/09/10."""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.security import User, get_optional_user
from app.core.student_content_cache import get_or_load
from app.services.practice.attempt_saved_work import load_saved_work, save_work
from app.services.practice.mock_attempt_draw import mock_summary, start_random_mock
from app.services.practice.practice_attempt_lifecycle import get_owned_attempt, start_attempt
from app.services.practice.test_content import load_test_content, resolve_test
from app.services.writing.writing_task_materials import with_practice_outlines
from app.services.speaking.speaking_upload_service import confirmed_answers

router = APIRouter()

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
    # Làm tiếp bài dở (kể cả trên máy khác): trả bài đã lưu trên server (FR-11)
    if not data.get("closed"):
        data["saved_work"] = load_saved_work({"id": data["attempt_id"], "skill": data["skill"]})
    return {"meta": {"code": 201, "message": "Bắt đầu bài thi thành công"}, "data": data}


class StartMockRequest(BaseModel):
    skill: str


@router.post("/mock/start", status_code=status.HTTP_201_CREATED)
async def start_mock(req: StartMockRequest, current_user: Optional[User] = Depends(get_optional_user)):
    """Bài Mock mới: hệ thống chọn ngẫu nhiên một đề Learner chưa làm (UC-08). Hết đề → 409."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để làm bài thi")
    data = start_random_mock(str(current_user.id), (req.skill or "").lower())
    return {"meta": {"code": 201, "message": "Bắt đầu bài thi thử"}, "data": data}


@router.get("/mock/summary")
async def get_mock_summary(current_user: Optional[User] = Depends(get_optional_user)):
    """Số đề Mock còn lại và bài Mock đang dở theo từng kỹ năng."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập")
    return {"meta": {"code": 200}, "data": mock_summary(str(current_user.id))}


class SaveWorkRequest(BaseModel):
    answers: Optional[Dict[str, Any]] = None      # L/R: số câu hoặc question_id -> câu trả lời
    task1_text: Optional[str] = None              # Writing; None = không đổi task đó
    task2_text: Optional[str] = None


@router.put("/attempts/{attempt_id}/work")
async def save_attempt_work(attempt_id: str, req: SaveWorkRequest,
                            current_user: Optional[User] = Depends(get_optional_user)):
    """Tự lưu bài lên server (FR-11, NFR-03). Đã nộp hoặc quá deadline + 30 s → 409."""
    attempt = get_owned_attempt(attempt_id, current_user.id if current_user else None)
    if not current_user or not attempt:
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")
    saved_at = save_work(attempt, req.answers, req.task1_text, req.task2_text)
    return {"meta": {"code": 200}, "data": {"saved_at": saved_at}}


@router.get("/attempts/{attempt_id}/content")
async def get_attempt_exam_content(attempt_id: str, current_user: Optional[User] = Depends(get_optional_user)):
    """Nội dung đề của một attempt; chỉ chủ bài (hoặc Admin) xem được."""
    is_admin = bool(current_user and current_user.role == "admin")
    attempt = get_owned_attempt(attempt_id, current_user.id if current_user else None, is_admin)
    if not attempt:
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")
    content = load_test_content(attempt["test_id"], attempt["skill"]) or {"sections": []}
    if attempt["skill"] == "writing" and attempt["mode"] == "practice":
        content = with_practice_outlines(content)          # dàn ý gợi ý, Mock không có (spec 006)
    extra = {"confirmed_answers": confirmed_answers(attempt["id"])} if attempt["skill"] == "speaking" else {}
    return {"meta": {"code": 200}, "data": {
        **content, **extra, "attempt_id": attempt["id"], "mode": attempt["mode"],
        "started_at": attempt["started_at"], "deadline_at": attempt.get("deadline_at")}}


def _load_published_content(test_id: str, skill: Optional[str]) -> Optional[dict]:
    test = resolve_test(test_id, skill)
    if not test or test.get("status") != "published" or test.get("allowed_mode") == "mock":
        return None
    content = load_test_content(test["id"], test["skill"]) or None
    return with_practice_outlines(content) if content and test["skill"] == "writing" else content


@router.get("/tests/{test_id}/content")
async def get_test_exam_content_direct(test_id: str, request: Request, skill: Optional[str] = None,
                                       current_user: Optional[User] = Depends(get_optional_user)):
    """Nội dung đề Practice theo test_id (hoặc slug), có cache Redis. Đề Mock chỉ xem qua attempt
    (/attempts/{id}/content) để không ai đọc trước đề thi thử."""
    test = resolve_test(test_id, skill)
    if not test or test.get("allowed_mode") == "mock":
        raise HTTPException(status_code=404, detail="Bài thi không tồn tại")
    content, cached = await get_or_load(
        request.app.state.redis, "test-content", f"{test_id}_{skill or 'all'}", _CACHE_TTL_SECONDS,
        lambda: _load_published_content(test_id, skill))
    if not content:
        raise HTTPException(status_code=404, detail="Bài thi không tồn tại")
    return {"meta": {"code": 200, "cached": True} if cached else {"code": 200}, "data": content}
