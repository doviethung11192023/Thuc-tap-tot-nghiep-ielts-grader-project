"""
AI engine giả cho load test: cùng endpoint, cùng kiểu request, kết quả cố định, trễ cấu hình được.

Worker của Core trỏ AI_ENGINE_URL / AI_ENGINE_SPEAKING_URL vào đây thì không tốn token LLM.
Dạng response bám sát những gì backend đọc (writing_grading_service._store_scores/_store_annotations,
speaking_grading_service._store_responses/_store_scores, run_usage_recorder.done_columns).

Biến môi trường:
  STUB_DELAY_SECONDS    độ trễ mỗi lượt chấm, mặc định 2
  AI_ENGINE_SECRET      secret nội bộ, giống engine thật; trống thì trả 503 (fail closed)
  STUB_ALLOW_NO_SECRET  true để bỏ kiểm secret khi chạy máy local
"""
import asyncio
import os
import secrets
import uuid

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="AI engine stub (load test)")

# Điểm cố định, hợp lệ theo to_half_band của Core (bội số 0.5)
WRITING_BANDS = {"task_response": 6.5, "coherence_cohesion": 6.5, "lexical_resource": 6.0,
                 "grammatical_range_and_accuracy": 6.0, "overall_band": 6.5}
SPEAKING_BANDS = {"fc": 6.5, "lr": 6.0, "gra": 6.0, "pr": 6.0}
STUB_MODEL = "stub-model"


def delay_seconds() -> float:
    try:
        return max(0.0, float(os.getenv("STUB_DELAY_SECONDS", "2")))
    except ValueError:
        return 2.0


def require_engine_secret(x_ai_engine_secret: str | None = Header(default=None)) -> None:
    """Giống ai-engine/api/auth.require_engine_secret."""
    expected = os.getenv("AI_ENGINE_SECRET", "").strip()
    if not expected:
        if os.getenv("STUB_ALLOW_NO_SECRET", "").lower() == "true":
            return
        raise HTTPException(status_code=503, detail="AI_ENGINE_SECRET is not configured")
    if not secrets.compare_digest(x_ai_engine_secret or "", expected):
        raise HTTPException(status_code=403, detail="Forbidden")


# --- Request: bản sao các model của ai-engine/schemas/engine_requests.py (test so khớp với bản thật) ---
class RunContextFields(BaseModel):
    run_id: str | None = Field(default=None, max_length=64)
    attempt_id: str | None = Field(default=None, max_length=64)
    skill: str | None = Field(default=None, max_length=20)
    mode: str | None = Field(default=None, max_length=20)


class GradeRequest(RunContextFields):
    title: str = ""
    essay: str = Field(..., min_length=1, max_length=20_000)
    task_type: str | None = None
    image_url: str | None = None
    answer_key: dict | None = None


class SpeakingAnswerRequest(BaseModel):
    response_id: str
    part: int = Field(..., ge=1, le=3)
    question: str
    audio_url: str
    duration_ms: int | None = None


class UnansweredQuestionRequest(BaseModel):
    part: int = Field(..., ge=1, le=3)
    question: str


class GradeSpeakingRequest(RunContextFields):
    title: str = ""
    answers: list[SpeakingAnswerRequest] = Field(..., min_length=1)
    unanswered: list[UnansweredQuestionRequest] = []


class DraftMaterialRequest(RunContextFields):
    kind: str
    task_type: str = "task2"
    title: str = Field(..., min_length=1, max_length=20_000)
    image_url: str | None = None
    answer_key: dict | None = None


def _normalize_task(value: str | None) -> str:
    value = (value or "").strip().lower().replace(" ", "")
    return "task1" if value in ("task1", "1", "t1", "writingtask1") else "task2"


def _run_info() -> dict:
    """trace_id và usage: phần Core ghi vào grading_runs (stub không tốn token nên usage rỗng)."""
    return {"trace_id": f"stub-{uuid.uuid4().hex[:16]}", "usage": []}


# --- Endpoint -------------------------------------------------------------------------------------
@app.get("/")
def root():
    return {"status": "ok", "message": "IELTS Grader AI stub is running."}


@app.get("/health")
def health():
    return {"status": "healthy", "stub": True}


@app.post("/grade", dependencies=[Depends(require_engine_secret)])
async def grade(req: GradeRequest):
    if not req.essay.strip():
        raise HTTPException(status_code=422, detail="Essay is empty")
    await asyncio.sleep(delay_seconds())
    words = req.essay.split()
    excerpt = " ".join(words[:4])           # có thật trong bài nên Core neo được vị trí ghi chú
    block = {"sub_criteria": {"overall": "Stub assessment."}, "sub_levels": {},
             "feedback": {"strengths": ["Clear position (stub)."],
                          "areas_to_improve": ["Develop ideas further (stub)."]}}
    return {
        "task_type": _normalize_task(req.task_type),
        "scores": dict(WRITING_BANDS),
        "criteria_analysis": {key: dict(block) for key in
                              ("task_response", "coherence_cohesion", "lexical_resource",
                               "grammatical_range_and_accuracy")},
        "inline_annotations": [{
            "type": "error", "category": "GRA", "title": "Stub annotation", "original_text": excerpt,
            "corrected_text": excerpt, "explanation": "Fixed stub feedback.", "position_start": 0,
        }],
        "overall_upgraded_essay": req.essay,
        "word_count": len(words),
        "pipeline": "stub",
        "task_subtype": "stub",
        "model": STUB_MODEL,
        "prompt_versions": {},
        **_run_info(),
    }


@app.post("/grade-speaking", dependencies=[Depends(require_engine_secret)])
async def grade_speaking(req: GradeSpeakingRequest):
    await asyncio.sleep(delay_seconds())
    criteria = {key: {"band": band, "summary": "Stub summary.", "strengths": ["Fluent enough (stub)."],
                      "issues": [], "improvements": []} for key, band in SPEAKING_BANDS.items()}
    return {
        "no_speech": False,
        "responses": [{"response_id": a.response_id, "transcript": "stub transcript", "silent": False,
                       "metrics": {"speech_rate_wpm": 120.0, "pause_ratio": 0.1}} for a in req.answers],
        "criteria": criteria,
        "overall": {"overall_summary": "Stub overall summary (band 6.0)."},
        "model": STUB_MODEL, "stt_model": "stub", "phoneme_model": "stub",
        "prompt_versions": {"fc": 0, "lr": 0, "gra": 0, "pr": 0},
        "speech_seconds": 0.0, "total_seconds": delay_seconds(),
        **_run_info(),
    }


@app.get("/grading-fingerprint", dependencies=[Depends(require_engine_secret)])
async def grading_fingerprint(task_type: str = "task2"):
    return {"fingerprint": f"stub-{_normalize_task(task_type)}"}


@app.post("/draft-material", dependencies=[Depends(require_engine_secret)])
async def draft_material(req: DraftMaterialRequest):
    await asyncio.sleep(delay_seconds())
    return {"kind": req.kind, "content": {"stub": True}, **_run_info()}
