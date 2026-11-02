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
    GET  /health
    GET  /

Env (see .env.example): PORT (default 8001), LOG_LEVEL, ENABLE_NGROK (default false),
NGROK_AUTH_TOKEN, NGROK_STATIC_DOMAIN, SERVER_RELOAD (default false).
"""

import asyncio
import os
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

# ── Logging — must be configured before any other local imports ───────────────
from settings.logging import setup_logging, get_logger   # noqa: E402
setup_logging()
logger = get_logger(__name__)

from settings.config import get_settings  # noqa: E402
from services.grading_pipeline import (  # noqa: E402
    PromptFetchError,
    run_grading_pipeline,
    warm_up_nlp_tools,
)

MAX_ESSAY_CHARS = 20_000


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        logger.info("Warming up LanguageTool + spaCy...")
        await asyncio.to_thread(warm_up_nlp_tools)
        logger.info("NLP tools ready")
    except Exception as e:  # first request will retry the lazy initialisation
        logger.warning("NLP warm-up failed: %s", e, exc_info=True)
    yield


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="IELTS Grader API",
    description="End-to-end IELTS Writing Task 1 & Task 2 grader powered by LLM agents.",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request schema ────────────────────────────────────────────────────────────
class GradeRequest(BaseModel):
    title: str = ""
    essay: str = Field(..., min_length=1, max_length=MAX_ESSAY_CHARS)
    task_type: str | None = None   # "task1" | "task2"; missing → task2 (backward compatible)
    image_url: str | None = None   # Task 1 chart/diagram (R2 public URL or any http(s) URL)


@app.get("/")
def root():
    return {"status": "ok", "message": "IELTS Grader API is running."}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/grade")
async def grade(req: GradeRequest):
    """Run the full grading pipeline on the submitted essay."""
    if not req.essay.strip():
        raise HTTPException(status_code=422, detail="Essay is empty")
    try:
        return await run_grading_pipeline(
            title=req.title,
            essay=req.essay,
            task_type=req.task_type,
            image_url=req.image_url,
        )
    except PromptFetchError as e:
        logger.error("Langfuse prompt missing: %s", e)
        raise HTTPException(status_code=502, detail=f"Prompt configuration error: {e}")
    except Exception as e:
        logger.error("Grading failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Ngrok Tunnel Helper ───────────────────────────────────────────────────────
def start_ngrok(port: int) -> str | None:
    settings = get_settings()
    token = settings.ngrok_auth_token or os.getenv("NGROK_AUTH_TOKEN")
    domain = settings.ngrok_static_domain or os.getenv("NGROK_STATIC_DOMAIN")

    if not token:
        logger.warning("[ngrok] NGROK_AUTH_TOKEN not set — skipping ngrok tunnel")
        return None

    try:
        from pyngrok import conf, ngrok

        conf.get_default().auth_token = token
        kwargs = {"domain": domain} if domain else {}
        tunnel = ngrok.connect(port, "http", **kwargs)
        public_url = tunnel.public_url
        logger.info("[ngrok] Tunnel active: %s -> http://localhost:%d", public_url, port)
        return public_url
    except ImportError:
        logger.error("[ngrok] pyngrok not installed. Run: uv add pyngrok")
    except Exception as e:
        logger.error("[ngrok] Failed to start tunnel: %s", e, exc_info=True)
    return None


def run_server():
    settings = get_settings()
    port = int(os.getenv("PORT", 8001))

    logger.info("=" * 60)
    logger.info("  IELTS Grader API — local: http://localhost:%d (POST /grade, /docs)", port)
    if settings.enable_ngrok:
        public_url = start_ngrok(port)
        if public_url:
            logger.info("  ngrok public URL: %s/grade", public_url)
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
