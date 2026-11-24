"""Route chấm điểm của AI engine (Writing, Speaking, draft material, fingerprint, health).

Tách khỏi main.py để main chỉ lo khởi động; tên handler giữ nguyên để operationId OpenAPI không đổi.
Test mock các hàm pipeline ngay trong module này (vd. `grading_routes.run_grading_pipeline`).
"""

import asyncio

from fastapi import APIRouter, Depends, HTTPException

from api.auth import require_engine_secret
from schemas.engine_requests import DraftMaterialRequest, GradeRequest, GradeSpeakingRequest
from services.langfuse.grading_scope import grading_scope
from services.langfuse.run_trace import RunContext
from services.llm.prompt_builder import get_prompt_manager
from services.runtime_config.request_runtime_config import snapshot_for_request
from services.speaking.speaking_coverage_cap import UnansweredQuestion
from services.speaking.speaking_grading_pipeline import SpeakingAnswerInput, run_speaking_pipeline
from services.writing.grading_fingerprint import grading_fingerprint
from services.writing.grading_pipeline import PromptFetchError, normalize_task, run_grading_pipeline
from services.writing.material_drafter import MaterialRequestError, draft_material
from services.writing.reference_corpus import ReferenceCorpusError
from settings.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("/")
def root():
    return {"status": "ok", "message": "IELTS Grader API is running."}


@router.get("/health")
def health():
    return {"status": "healthy"}


def _run_context(req, task_no: int | None = None) -> RunContext:
    return RunContext(req.run_id, req.attempt_id, req.skill, req.mode, task_no)


@router.post("/grade", dependencies=[Depends(require_engine_secret)])
async def grade(req: GradeRequest):
    """Run the full grading pipeline on the submitted essay."""
    if not req.essay.strip():
        raise HTTPException(status_code=422, detail="Essay is empty")
    task_no = 1 if normalize_task(req.task_type) == "task1" else 2
    async with grading_scope(_run_context(req, task_no), "writing-grade") as scope:
        try:
            result = await run_grading_pipeline(
                title=req.title,
                essay=req.essay,
                task_type=req.task_type,
                image_url=req.image_url,
                answer_key=req.answer_key,
            )
            return scope.success(result)
        except PromptFetchError as e:
            logger.error("Langfuse prompt missing: %s", e)
            return scope.failure(502, f"Prompt configuration error: {e}")
        except ReferenceCorpusError as e:
            logger.error("Reference corpus unavailable: %s", e)
            return scope.failure(503, str(e))
        except Exception as e:
            logger.error("Grading failed: %s", e, exc_info=True)
            return scope.failure(500, str(e))


@router.post("/draft-material", dependencies=[Depends(require_engine_secret)])
async def draft_material_endpoint(req: DraftMaterialRequest):
    """AI draft of per-task material; the Core API stores it as a draft for Admin approval (ADR-30)."""
    async with grading_scope(_run_context(req), "writing-draft-material") as scope:
        try:
            content = await draft_material(req.kind, normalize_task(req.task_type), req.title, req.image_url,
                                           req.answer_key, get_prompt_manager())
            return scope.success({"kind": req.kind, "content": content})
        except MaterialRequestError as e:
            return scope.failure(422, str(e))
        except PromptFetchError as e:
            return scope.failure(502, f"Prompt configuration error: {e}")
        except Exception as e:
            logger.error("Material draft failed: %s", e, exc_info=True)
            return scope.failure(500, str(e))


@router.get("/grading-fingerprint", dependencies=[Depends(require_engine_secret)])
async def grading_fingerprint_endpoint(task_type: str = "task2"):
    """Hash of pipeline, models and production prompt versions; the Core API keys its cache on it."""
    try:
        await snapshot_for_request()     # Admin step overrides are part of the fingerprint
        return {"fingerprint": await asyncio.to_thread(
            grading_fingerprint, normalize_task(task_type), get_prompt_manager())}
    except PromptFetchError as e:
        raise HTTPException(status_code=502, detail=f"Prompt configuration error: {e}")


@router.post("/grade-speaking", dependencies=[Depends(require_engine_secret)])
async def grade_speaking(req: GradeSpeakingRequest):
    """Speech layers, then LLM. Slow, so the Core API calls this from a background task."""
    async with grading_scope(_run_context(req), "speaking-grade") as scope:
        try:
            result = await run_speaking_pipeline(
                req.title, [SpeakingAnswerInput(**a.model_dump()) for a in req.answers],
                [UnansweredQuestion(q.part, q.question) for q in req.unanswered])
            return scope.success(result)
        except PromptFetchError as e:
            logger.error("Langfuse prompt missing: %s", e)
            return scope.failure(502, f"Prompt configuration error: {e}")
        except Exception as e:
            logger.error("Speaking grading failed: %s", e, exc_info=True)
            return scope.failure(500, str(e))
