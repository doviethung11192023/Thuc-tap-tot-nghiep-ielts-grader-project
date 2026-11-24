"""FastAPI Router cho AI Practice Tutor trên AI Engine (:8001): /tutor/stream, /tutor/ping, /tutor/providers."""
import secrets
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from services.tutor.streaming_service import (
    get_env_provider_status,
    ping_tutor_model,
    stream_tutor_sse,
)
from settings.config import get_settings

router = APIRouter(prefix="/tutor", tags=["AI Practice Tutor"])


def _require_secret(x_ai_engine_secret: str | None = Header(default=None)) -> None:
    expected = get_settings().ai_engine_secret
    if expected and not secrets.compare_digest(x_ai_engine_secret or "", expected):
        raise HTTPException(status_code=403, detail="Forbidden")


class TutorPingRequest(BaseModel):
    provider: str = "qwen"
    model: str = "qwen-flash"
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    enable_thinking: bool = False
    timeout_seconds: int = 15


class TutorStreamRequest(BaseModel):
    skill: str = "reading"
    test_title: str = ""
    section_no: int = 1
    group_label: str = ""
    question_type: str = ""
    instructions: str = ""
    max_words: Optional[int] = None
    context_text: str = ""
    questions: List[Dict[str, Any]] = Field(default_factory=list)
    user_answers: Dict[str, Any] = Field(default_factory=dict)
    history: List[Dict[str, str]] = Field(default_factory=list)
    message: str = Field(..., min_length=1, max_length=1000)
    language: str = "vi"
    hint_tier: int = 1
    unlock_answer: bool = False
    target_question_no: Optional[int] = None
    learner_band: Optional[float] = None
    # Runtime admin config forwarded from Core API (:8000)
    bot_name: str = "MoonBot AI"
    anti_spoiler_mode: str = "strict"
    max_response_words: int = 140
    enable_reading_highlight: bool = True
    custom_system_instructions: str = ""
    primary_provider: str = "qwen"
    primary_model: str = "qwen-flash"
    primary_base_url: Optional[str] = None
    primary_api_key: Optional[str] = None
    enable_thinking: bool = False
    failover_enabled: bool = True
    failover_provider: str = "groq"
    failover_model: str = "llama-3.3-70b-versatile"
    failover_base_url: Optional[str] = None
    failover_api_key: Optional[str] = None
    temperature: float = 0.3
    max_output_tokens: int = 420
    timeout_seconds: int = 30


@router.get("/providers", dependencies=[Depends(_require_secret)])
async def tutor_providers():
    return get_env_provider_status()


@router.post("/ping", dependencies=[Depends(_require_secret)])
async def tutor_ping(req: TutorPingRequest):
    return await ping_tutor_model(req.model_dump())


@router.post("/stream", dependencies=[Depends(_require_secret)])
async def tutor_stream(req: TutorStreamRequest):
    return StreamingResponse(
        stream_tutor_sse(req.model_dump()),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
