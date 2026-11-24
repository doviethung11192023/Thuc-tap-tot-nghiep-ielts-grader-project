"""Endpoints Trợ lý AI Luyện tập (Listening & Reading Practice Only) trên Core API (:8000)."""
import re
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.security import User, get_current_user
from app.services.tutor.tutor_config_store import extract_public_ui_config, get_tutor_config_cached
from app.services.tutor.tutor_context_builder import (
    build_server_context_payload,
    list_public_question_groups,
    verify_practice_attempt,
)
from app.services.tutor.tutor_quota_and_stats import (
    acquire_stream_lock,
    consume_quota,
    get_quota_status,
    release_stream_lock,
)
from app.services.tutor.tutor_session_store import (
    clear_session,
    load_session_messages,
    make_chip_cache_key,
    set_message_feedback,
)
from app.services.tutor.tutor_stream_proxy import proxy_tutor_sse
from app.services.tutor.tutor_telemetry_store import record_llm_feedback_telemetry

router = APIRouter()


class TutorStreamBody(BaseModel):
    attempt_id: str
    section_no: int = 1
    question_group_id: Optional[str] = None
    target_question_no: Optional[int] = None
    message: str = Field(..., min_length=1, max_length=1200)
    language: str = "vi"
    hint_tier: int = Field(default=1, ge=1, le=3)
    unlock_answer: bool = False
    is_quick_chip: bool = False
    user_answers: Dict[str, Any] = Field(default_factory=dict)


class TutorFeedbackBody(BaseModel):
    attempt_id: str
    message_id: str
    rating: str = Field(..., pattern="^(up|down)$")


@router.get("/tutor/session/{attempt_id}")
async def get_tutor_session(attempt_id: str, request: Request, current_user: User = Depends(get_current_user)):
    cfg = get_tutor_config_cached()
    attempt = verify_practice_attempt(attempt_id, str(current_user.id), cfg)
    redis = getattr(request.app.state, "redis", None)
    quota = await get_quota_status(redis, str(current_user.id), int(cfg["hourly_quota"]))
    messages = await load_session_messages(redis, str(current_user.id), attempt_id)
    title, groups = list_public_question_groups(attempt["test_id"])
    return {
        "meta": {"code": 200, "message": "OK"},
        "data": {
            "attempt_id": attempt_id,
            "skill": attempt["skill"],
            "test_title": title,
            "config": extract_public_ui_config(cfg, attempt["skill"]),
            "quota": quota,
            "question_groups": groups,
            "messages": messages,
        },
    }


@router.post("/tutor/stream")
async def stream_tutor_chat(body: TutorStreamBody, request: Request, current_user: User = Depends(get_current_user)):
    cfg = get_tutor_config_cached()
    uid = str(current_user.id)
    attempt = verify_practice_attempt(body.attempt_id, uid, cfg)
    msg_clean = body.message.strip()
    if len(msg_clean) > int(cfg["max_input_chars"]):
        raise HTTPException(status_code=400, detail=f"Câu hỏi tối đa {cfg['max_input_chars']} ký tự")

    redis = getattr(request.app.state, "redis", None)
    history_raw = await load_session_messages(redis, uid, body.attempt_id)
    ctx = build_server_context_payload(attempt, uid, body.section_no, body.question_group_id, bool(cfg["enable_band_adaptive_tone"]))
    if body.target_question_no is not None:
        valid_q_nums = {int(q.get("number") or 0) for q in ctx["questions"]}
        if int(body.target_question_no) not in valid_q_nums:
            raise HTTPException(status_code=400, detail="Số câu hỏi không thuộc nhóm câu hỏi hiện tại")

    if body.unlock_answer:
        if not cfg.get("allow_answer_unlock"):
            raise HTTPException(status_code=403, detail="Quản trị viên đã tắt tính năng mở khóa đáp án")
        if body.target_question_no is None:
            raise HTTPException(status_code=400, detail="Vui lòng chọn đúng số câu hỏi cần mở khóa đáp án")
        min_req = int(cfg.get("min_attempts_before_unlock", 1))
        scoped_turns = sum(1 for m in history_raw if m.get("role") == "user" and m.get("target_question_no") in (body.target_question_no, None))
        draft_val = str(body.user_answers.get(str(body.target_question_no), "")).strip()
        has_valid_draft = bool(re.search(r"[A-Za-z0-9]", draft_val))
        effective_tries = scoped_turns + (1 if has_valid_draft else 0)
        if min_req > 0 and effective_tries < min_req:
            raise HTTPException(status_code=400, detail=f"Hãy thử hỏi gợi ý hoặc điền nháp ít nhất {min_req} lần trước khi mở khóa đáp án nhé")

    if not await acquire_stream_lock(redis, uid):
        raise HTTPException(status_code=429, detail="Trợ lý AI đang trả lời câu trước của bạn, vui lòng đợi vài giây")
    allowed, quota = await consume_quota(redis, uid, int(cfg["hourly_quota"]))
    if not allowed:
        await release_stream_lock(redis, uid)
        raise HTTPException(status_code=429, detail=f"Bạn đã dùng hết {cfg['hourly_quota']} lượt hỏi AI trong giờ này")

    lang = "en" if body.language == "en" else "vi"
    allowed_chips = set(
        (cfg.get("quick_chips_reading_vi") or [])
        + (cfg.get("quick_chips_reading_en") or [])
        + (cfg.get("quick_chips_listening_vi") or [])
        + (cfg.get("quick_chips_listening_en") or [])
    )
    verified_chip = body.is_quick_chip and (msg_clean in allowed_chips)
    can_cache = verified_chip and not body.unlock_answer and not body.user_answers and int(cfg["quick_chip_cache_ttl_sec"]) > 0
    cache_key = (
        make_chip_cache_key(
            attempt["test_id"], ctx["group_id"], lang, msg_clean, cfg["anti_spoiler_mode"],
            cfg["primary_model"], body.target_question_no, body.hint_tier,
        )
        if can_cache
        else ""
    )

    return StreamingResponse(
        proxy_tutor_sse(redis, uid, attempt, cfg, ctx, history_raw, body, msg_clean, lang, quota, cache_key),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.delete("/tutor/session/{attempt_id}")
async def reset_tutor_session(attempt_id: str, request: Request, current_user: User = Depends(get_current_user)):
    verify_practice_attempt(attempt_id, str(current_user.id), get_tutor_config_cached())
    await clear_session(getattr(request.app.state, "redis", None), str(current_user.id), attempt_id)
    return {"meta": {"code": 200, "message": "Đã tạo phiên hội thoại mới"}, "data": {"cleared": True}}


@router.post("/tutor/feedback")
async def submit_tutor_feedback(body: TutorFeedbackBody, request: Request, current_user: User = Depends(get_current_user)):
    verify_practice_attempt(body.attempt_id, str(current_user.id), get_tutor_config_cached())
    redis = getattr(request.app.state, "redis", None)
    updated = await set_message_feedback(redis, str(current_user.id), body.attempt_id, body.message_id, body.rating)
    await record_llm_feedback_telemetry(redis, message_id=body.message_id, rating=body.rating, namespace="tutor")
    return {"meta": {"code": 200, "message": "Cảm ơn đánh giá của bạn"}, "data": {"updated": updated}}
