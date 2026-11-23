"""
main.py — FastAPI grading server (IELTS Writing Task 1 + Task 2).

Usage:
    uv run python main.py
    # or: uvicorn main:app --port 8001

Endpoints:
    POST /grade   body: { "title": "...", "essay": "...",
                          "task_type": "task1" | "task2" (optional, default task2),
                          "image_url": "https://..." (optional, Task 1 chart) }
                  → frontend JSON result (scores, criteria_analysis,
                    inline_annotations, overall_upgraded_essay, word_count, task_type)
    POST /draft-material  body: { kind, task_type, title, image_url?, answer_key? } → draft (spec 006)
    GET  /grading-fingerprint?task_type=  → hash of pipeline, models, production prompt versions
    Run context (spec 008): /grade, /grade-speaking and /draft-material also accept optional run_id, attempt_id,
                  skill, mode. They answer with trace_id, usage (tokens per model) and model; error bodies carry
                  detail, trace_id and usage. Admin routes live in admin_routes.py (/admin/*).
    POST /grade-speaking  body: { "title": "...", "answers": [{response_id, part, question, audio_url}],
                                  "unanswered": [{part, question}] (optional) }
                  → transcripts, speech metrics, 4 criteria, feedback. Requires X-AI-Engine-Secret.
    GET  /health
    GET  /

Env (see .env.example): PORT (default 8001), LOG_LEVEL, SERVER_RELOAD (default false),
AI_ENGINE_SECRET (required; same value as the Core API), ALLOW_NO_SECRET (local only, default false).
"""

import asyncio
import os
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# ── Logging — must be configured before any other local imports ───────────────
from settings.logging import setup_logging, get_logger   # noqa: E402
setup_logging()
logger = get_logger(__name__)

from admin_routes import router as admin_router  # noqa: E402
from engine_auth import require_engine_secret  # noqa: E402
from schemas.engine_requests import (  # noqa: E402,F401  (re-exported for serve.py and tests)
    MAX_ESSAY_CHARS,
    DraftMaterialRequest,
    GradeRequest,
    GradeSpeakingRequest,
)
from services.langfuse.grading_scope import grading_scope  # noqa: E402
from services.langfuse.run_trace import RunContext  # noqa: E402
from services.runtime_config.request_runtime_config import snapshot_for_request  # noqa: E402
from services.service_admin.service_health import record_load_failure  # noqa: E402
from settings.config import get_settings  # noqa: E402
from services.grading_pipeline import (  # noqa: E402
    PromptFetchError,
    normalize_task,
    run_grading_pipeline,
    warm_up_nlp_tools,
)
from services.reference_corpus import ReferenceCorpusError  # noqa: E402
from services.grading_fingerprint import grading_fingerprint  # noqa: E402
from services.material_drafter import MaterialRequestError, draft_material  # noqa: E402
from services.prompt_builder import get_prompt_manager  # noqa: E402
from services.speaking.speaking_grading_pipeline import SpeakingAnswerInput, run_speaking_pipeline  # noqa: E402
from services.speaking.speaking_coverage_cap import UnansweredQuestion  # noqa: E402
from services.speaking.phoneme_recognizer import load_model as load_phoneme_model  # noqa: E402
from services.speaking.speech_transcriber import load_model as load_stt_model  # noqa: E402

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if not settings.ai_engine_secret.strip():
        if settings.allow_no_secret:
            logger.warning("AI_ENGINE_SECRET empty and ALLOW_NO_SECRET=true: grading endpoints are open (local only)")
        else:
            logger.error("AI_ENGINE_SECRET is not set: /grade, /grade-speaking, /draft-material will return 503")
    try:
        logger.info("Warming up LanguageTool + spaCy...")
        await asyncio.to_thread(warm_up_nlp_tools)
        logger.info("NLP tools ready")
    except Exception as e:  # first request will retry the lazy initialisation
        logger.warning("NLP warm-up failed: %s", e, exc_info=True)
    # about 10 s otherwise paid by the first Speaking test after each restart; the two models load side by
    # side, and one failing does not stop the other (the first Speaking test loads a missing one lazily)
    logger.info("Loading speech models (Whisper, wav2vec2)...")
    outcomes = await asyncio.gather(asyncio.to_thread(load_stt_model), asyncio.to_thread(load_phoneme_model),
                                    return_exceptions=True)
    for name, key, outcome in zip(("Whisper", "wav2vec2"), ("whisper", "phoneme"), outcomes):
        if isinstance(outcome, Exception):
            logger.warning("%s warm-up failed: %s", name, outcome, exc_info=outcome)
            record_load_failure(key, outcome)
    logger.info("Speech models warm-up finished")
    yield


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="IELTS Grader API",
    description="End-to-end IELTS Writing Task 1 & Task 2 grader powered by LLM agents.",
    version="1.1.0",
    lifespan=lifespan,
)

app.include_router(admin_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "message": "IELTS Grader API is running."}


@app.get("/health")
def health():
    return {"status": "healthy"}


def _run_context(req, task_no: int | None = None) -> RunContext:
    return RunContext(req.run_id, req.attempt_id, req.skill, req.mode, task_no)


@app.post("/grade", dependencies=[Depends(require_engine_secret)])
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


@app.post("/draft-material", dependencies=[Depends(require_engine_secret)])
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


@app.get("/grading-fingerprint", dependencies=[Depends(require_engine_secret)])
async def grading_fingerprint_endpoint(task_type: str = "task2"):
    """Hash of pipeline, models and production prompt versions; the Core API keys its cache on it."""
    try:
        await snapshot_for_request()     # Admin step overrides are part of the fingerprint
        return {"fingerprint": await asyncio.to_thread(
            grading_fingerprint, normalize_task(task_type), get_prompt_manager())}
    except PromptFetchError as e:
        raise HTTPException(status_code=502, detail=f"Prompt configuration error: {e}")


@app.post("/grade-speaking", dependencies=[Depends(require_engine_secret)])
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


def run_server():
    settings = get_settings()
    port = int(os.getenv("PORT", 8001))

    logger.info("=" * 60)
    logger.info("  IELTS Grader API — local: http://localhost:%d (POST /grade, /docs)", port)
    logger.info("=" * 60)

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=settings.server_reload,
        log_level="info",
    )


if __name__ == "__main__":
    run_server()
