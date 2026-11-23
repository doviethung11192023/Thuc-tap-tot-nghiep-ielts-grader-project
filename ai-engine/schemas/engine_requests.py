"""Request bodies of the engine's grading endpoints."""
from pydantic import BaseModel, Field

MAX_ESSAY_CHARS = 20_000


class RunContextFields(BaseModel):
    """Optional run context from Core (spec 008): ties the request to a grading_runs row for tracing.
    A caller that omits them (old scripts) gets exactly the old behaviour, without a trace."""
    run_id: str | None = Field(default=None, max_length=64)
    attempt_id: str | None = Field(default=None, max_length=64)
    skill: str | None = Field(default=None, max_length=20)       # writing | speaking
    mode: str | None = Field(default=None, max_length=20)        # practice | mock


class GradeRequest(RunContextFields):
    title: str = ""
    essay: str = Field(..., min_length=1, max_length=MAX_ESSAY_CHARS)
    task_type: str | None = None   # "task1" | "task2"; missing → task2 (backward compatible)
    image_url: str | None = None   # Task 1 chart/diagram (R2 public URL or any http(s) URL)
    answer_key: dict | None = None # Task 1 Admin-approved answer key: replaces the vision pass (spec 006)


class DraftMaterialRequest(RunContextFields):
    kind: str                      # "answer_key" | "outline" | "sample"
    task_type: str = "task2"
    title: str = Field(..., min_length=1, max_length=MAX_ESSAY_CHARS)
    image_url: str | None = None
    answer_key: dict | None = None # approved key; required for Task 1 outline/sample


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
    unanswered: list[UnansweredQuestionRequest] = []   # questions with no recording (BR-23)
