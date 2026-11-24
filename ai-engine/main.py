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
                  detail, trace_id and usage. Routes live in api/ (grading_routes.py, admin_routes.py); this file only wires startup.
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
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# ── Logging — must be configured before any other local imports ───────────────
from settings.logging import setup_logging, get_logger   # noqa: E402
setup_logging()
logger = get_logger(__name__)

from api.admin_routes import router as admin_router  # noqa: E402
from api.grading_routes import (  # noqa: E402,F401  (re-exported for serve.py and tests)
    grade,
    health,
    root,
    router as grading_router,
)
from schemas.engine_requests import (  # noqa: E402,F401  (re-exported for serve.py and tests)
    MAX_ESSAY_CHARS,
    DraftMaterialRequest,
    GradeRequest,
    GradeSpeakingRequest,
)
from services.service_admin.service_health import record_load_failure  # noqa: E402
from settings.config import get_settings  # noqa: E402
from services.writing.grading_pipeline import run_grading_pipeline, warm_up_nlp_tools  # noqa: E402,F401
from services.tutor.router import router as tutor_router  # noqa: E402
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
    if settings.speech_preload_models:
        # Load sequentially to avoid concurrent OpenMP/PyTorch memory spikes on CPU hosts;
        # one failing does not stop the other (the first Speaking test loads a missing one lazily).
        # A failure is recorded so the Admin "Service AI" health page shows it (spec 008).
        logger.info("Loading speech models (Whisper, wav2vec2)...")
        for name, key, loader in (("Whisper", "whisper", load_stt_model), ("wav2vec2", "phoneme", load_phoneme_model)):
            try:
                await asyncio.to_thread(loader)
            except Exception as e:
                logger.warning("%s warm-up failed: %s", name, e, exc_info=True)
                record_load_failure(key, e)
        logger.info("Speech models warm-up finished")
    else:
        logger.info("Skipping speech models warm-up (SPEECH_PRELOAD_MODELS=false; lazy-loads on first Speaking test)")
    yield


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="IELTS Grader API",
    description="End-to-end IELTS Writing Task 1 & Task 2 grader powered by LLM agents.",
    version="1.1.0",
    lifespan=lifespan,
)

app.include_router(admin_router)
app.include_router(grading_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(tutor_router)


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
