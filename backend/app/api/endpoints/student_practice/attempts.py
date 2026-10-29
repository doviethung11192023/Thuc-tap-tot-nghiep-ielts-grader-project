import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from app.core.security import get_optional_user, User
from app.db.supabase import supabase
from app.services.test_tree_formatter import format_anti_cheat_sections, format_student_test_content

router = APIRouter()

class StartAttemptRequest(BaseModel):
    test_id: str
    mode: str = "practice"  # "practice" | "mock"
    skill: Optional[str] = None

def _is_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False

def _resolve_user_id(current_user: Optional[User]) -> str:
    if current_user and current_user.id:
        return str(current_user.id)
    u_res = supabase.table("users").select("id").limit(1).execute()
    if u_res.data:
        return str(u_res.data[0]["id"])
    raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để làm bài thi")

@router.post("/attempts/start", status_code=status.HTTP_201_CREATED)
async def start_test_attempt(req: StartAttemptRequest, current_user: Optional[User] = Depends(get_optional_user)):
    """Khởi tạo phiên làm bài thi mới cho học viên."""
    t_res = None
    if _is_uuid(req.test_id):
        t_res = supabase.table("tests").select("id, skill, duration_min, status").eq("id", req.test_id).execute()

    if not t_res or not t_res.data:
        m = re.search(r'test[-_ ]?(\d+)', req.test_id.lower())
        q = supabase.table("tests").select("id, skill, duration_min, status")
        if m:
            num = int(m.group(1))
            q = q.ilike("title", f"%Test {num}%")
        if req.skill:
            q = q.eq("skill", req.skill.lower())
        t_res = q.eq("status", "published").limit(1).execute()

    if not t_res or not t_res.data:
        q = supabase.table("tests").select("id, skill, duration_min, status").eq("status", "published")
        if req.skill:
            q = q.eq("skill", req.skill.lower())
        t_res = q.order("created_at").limit(1).execute()

    if not t_res or not t_res.data:
        raise HTTPException(status_code=404, detail="Bài thi không tồn tại")
    test_info = t_res.data[0]
    if test_info.get("status") != "published":
        raise HTTPException(status_code=400, detail="Bài thi chưa được xuất bản")

    user_id = _resolve_user_id(current_user)
    now_utc = datetime.now(timezone.utc)
    duration_min = test_info.get("duration_min") or (60 if test_info["skill"] in ("reading", "writing") else 35)
    deadline_at = (now_utc + timedelta(minutes=duration_min)).isoformat() if req.mode == "mock" else None

    payload = {
        "user_id": user_id,
        "test_id": test_info["id"],
        "skill": test_info["skill"],
        "mode": req.mode if req.mode in ("practice", "mock") else "practice",
        "status": "in_progress",
        "started_at": now_utc.isoformat(),
        "deadline_at": deadline_at
    }
    res = supabase.table("test_attempts").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Không thể tạo phiên làm bài thi")
    attempt = res.data[0]

    return {
        "meta": {"code": 201, "message": "Bắt đầu bài thi thành công"},
        "data": {
            "attempt_id": attempt["id"],
            "test_id": attempt["test_id"],
            "skill": attempt["skill"],
            "mode": attempt["mode"],
            "started_at": attempt["started_at"],
            "deadline_at": attempt.get("deadline_at"),
            "duration_min": duration_min
        }
    }

@router.get("/attempts/{attempt_id}/content")
async def get_attempt_exam_content(attempt_id: str, current_user: Optional[User] = Depends(get_optional_user)):
    """Lấy nội dung đề thi đã lọc bỏ đáp án đúng (Anti-Cheat Content Delivery Single Query)."""
    att_res = supabase.table("test_attempts").select("""
        id, user_id, test_id, skill, mode, started_at, deadline_at,
        tests(
            id, title, skill, duration_min, origin,
            test_sections(
                id, order_no, title, passage_text, audio_key,
                question_groups(
                    id, order_no, question_type, instructions, image_key, content,
                    questions(
                        id, number, prompt, options, max_words, prompt_audio_key, prep_time_sec, answer_time_sec
                    )
                )
            )
        )
    """).eq("id", attempt_id).single().execute()
    if not att_res.data:
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")
    attempt = att_res.data
    if current_user and str(attempt["user_id"]) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập phiên làm bài này")

    test_info = attempt.get("tests") or {}
    sections = format_anti_cheat_sections(test_info.get("test_sections", []))

    return {
        "meta": {"code": 200},
        "data": {
            "attempt_id": attempt["id"],
            "test_id": test_info.get("id"),
            "title": test_info.get("title"),
            "skill": test_info.get("skill") or attempt.get("skill"),
            "mode": attempt["mode"],
            "duration_min": test_info.get("duration_min") or 60,
            "started_at": attempt["started_at"],
            "deadline_at": attempt.get("deadline_at"),
            "sections": sections
        }
    }

_TEST_CONTENT_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_TTL_SECONDS = 900  # 15 phút lưu cache đề thi tĩnh

@router.get("/tests/{test_id}/content")
async def get_test_exam_content_direct(test_id: str, skill: Optional[str] = None, current_user: Optional[User] = Depends(get_optional_user)):
    """Lấy nội dung đề thi trực tiếp theo test_id với RAM Cache tăng tốc tức thì."""
    now_ts = datetime.now(timezone.utc).timestamp()
    cache_key = f"{test_id}_{skill or 'all'}"
    if cache_key in _TEST_CONTENT_CACHE:
        cached = _TEST_CONTENT_CACHE[cache_key]
        if now_ts - cached["cached_at"] < _CACHE_TTL_SECONDS:
            return {"meta": {"code": 200, "cached": True}, "data": cached["data"]}

    test_res = None
    if _is_uuid(test_id):
        test_res = supabase.table("tests").select("""
            id, title, skill, duration_min, origin, status,
            test_sections(
                id, order_no, title, passage_text, audio_key,
                question_groups(
                    id, order_no, question_type, instructions, image_key, content,
                    questions(
                        id, number, prompt, options, max_words, prompt_audio_key, prep_time_sec, answer_time_sec
                    )
                )
            )
        """).eq("id", test_id).execute()

    if not test_res or not test_res.data:
        m = re.search(r'test[-_ ]?(\d+)', test_id.lower())
        q = supabase.table("tests").select("id")
        if m:
            num = int(m.group(1))
            q = q.ilike("title", f"%Test {num}%")
        if skill:
            q = q.eq("skill", skill.lower())
        fb = q.eq("status", "published").limit(1).execute()

        if not fb.data and skill:
            fb = supabase.table("tests").select("id").eq("skill", skill.lower()).eq("status", "published").order("created_at").limit(1).execute()

        if fb.data:
            test_res = supabase.table("tests").select("""
                id, title, skill, duration_min, origin, status,
                test_sections(
                    id, order_no, title, passage_text, audio_key,
                    question_groups(
                        id, order_no, question_type, instructions, image_key, content,
                        questions(
                            id, number, prompt, options, max_words, prompt_audio_key, prep_time_sec, answer_time_sec
                        )
                    )
                )
            """).eq("id", fb.data[0]["id"]).execute()
    if not test_res or not test_res.data:
        raise HTTPException(status_code=404, detail="Bài thi không tồn tại")
    
    formatted = format_student_test_content(test_res.data[0])
    _TEST_CONTENT_CACHE[cache_key] = {"cached_at": now_ts, "data": formatted}
    return {"meta": {"code": 200}, "data": formatted}
