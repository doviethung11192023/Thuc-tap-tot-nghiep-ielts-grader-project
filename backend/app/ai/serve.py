"""
serve.py — FastAPI grading server with ngrok tunnel.

Usage:
    uv run python serve.py

The server exposes:
    POST /grade   — accepts { "title": "...", "essay": "..." }
                    runs the full grading pipeline,
                    returns the frontend JSON result.

Ngrok will print the public URL on startup.
Set NGROK_AUTH_TOKEN in .env to use a persistent/authenticated tunnel.
Set NGROK_STATIC_DOMAIN in .env to use a fixed static domain.
Set LOG_LEVEL in .env to override logging verbosity (default: DEBUG).
"""

import dataclasses
import os
import traceback

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

# ── Logging — must be configured before any other local imports ───────────────
from logs import setup_logging, get_logger   # noqa: E402
setup_logging()
logger = get_logger(__name__)

# ── Pipeline imports ──────────────────────────────────────────────────────────
from schemas.input import EssayInput
from utils.preprocessor import preprocess
from services.task_type_classifier import classify_task_type
from handlers.grammar_checker import check as check_grammar
from handlers.lexical_stats import compute as compute_lexical
from services.prompt_builder import build_criterion_prompts
from services.llm_evaluator import evaluate_all_criteria
from services.synthesis_service import SynthesisService

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="IELTS Grader API",
    description="End-to-end IELTS Writing Task 2 grader powered by LLM agents.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response schemas ────────────────────────────────────────────────
class GradeRequest(BaseModel):
    title: str
    essay: str


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "message": "IELTS Grader API is running."}


@app.get("/health")
def health():
    return {"status": "healthy"}


# ── Main grading endpoint ─────────────────────────────────────────────────────
@app.post("/grade")
async def grade(req: GradeRequest):
    """
    Run the full grading pipeline on the submitted essay.

    Body:
        title  (str): The IELTS task prompt.
        essay  (str): The student's essay text.

    Returns:
        dict: Full frontend JSON with scores, inline_annotations,
              criteria_analysis, overall_upgraded_essay, word_count.
    """
    try:
        logger.info("=" * 50)
        logger.info("Grading pipeline started")
        logger.debug("Request — title: %.50s... | essay: %d chars", req.title, len(req.essay))

        # Phase A: Preprocess
        logger.info("[Phase A] Preprocessing essay...")
        essay_input = EssayInput(title=req.title, essay=req.essay)
        processed_input = preprocess(essay_input)
        logger.info("[Phase A] ✓ Preprocessing complete")

        # Phase B: NLP tools
        logger.info("[Phase B] Running NLP tools...")
        task_type_result = classify_task_type(processed_input.title)
        logger.debug("[Phase B] Task type → %s", task_type_result.task_type)

        grammar_findings = check_grammar(processed_input)
        logger.debug("[Phase B] Grammar issues found: %d", len(grammar_findings))

        lex_result = compute_lexical(processed_input)
        logger.info("[Phase B] ✓ NLP tools complete")

        # Phase C: Build prompts
        logger.info("[Phase C] Building criterion prompts via Langfuse...")
        try:
            prompts = build_criterion_prompts(
                processed=processed_input,
                task_type=task_type_result,
                grammar_findings=grammar_findings,
                lex_result=lex_result,
            )
            logger.info("[Phase C] ✓ Built %d criterion prompts", len(dataclasses.fields(prompts)))
        except Exception as e:
            logger.error("[Phase C] Langfuse prompt fetch failed: %s", e, exc_info=True)
            raise HTTPException(
                status_code=502,
                detail=f"Langfuse error — could not fetch prompts: {e}",
            )

        # Phase D: LLM evaluation
        logger.info("[Phase D] Running parallel LLM evaluation (TA / CC / LR / GRA)...")
        results = await evaluate_all_criteria(prompts)
        logger.info(
            "[Phase D] ✓ LLM evaluation complete — TA=%.1f CC=%.1f LR=%.1f GRA=%.1f",
            results.ta.band, results.cc.band, results.lr.band, results.gra.band,
        )

        # Phase E & F: Synthesis & Rewriting
        logger.info("[Phase E/F] Synthesis & essay rewriting...")
        synthesis_service = SynthesisService()
        final_json = await synthesis_service.synthesize_and_rewrite(
            title=req.title,
            essay_raw=req.essay,
            all_agent_outputs=results,
        )
        logger.info(
            "[Phase E/F] ✓ Synthesis complete — overall band: %.1f | annotations: %d",
            final_json["scores"]["overall_band"],
            len(final_json.get("inline_annotations", [])),
        )

        logger.info("Grading pipeline completed successfully")
        logger.info("=" * 50)
        return final_json

    except HTTPException:
        raise
    except Exception as e:
        logger.critical("Pipeline failed with unexpected error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Startup: launch ngrok tunnel ──────────────────────────────────────────────
def start_ngrok(port: int) -> str | None:
    """Start a pyngrok tunnel and return the public URL.

    Uses NGROK_STATIC_DOMAIN from .env as the fixed domain (if set),
    otherwise falls back to a random ephemeral domain.
    """
    try:
        from pyngrok import ngrok, conf

        auth_token = os.getenv("NGROK_AUTH_TOKEN", "").strip()
        if auth_token:
            conf.get_default().auth_token = auth_token
            logger.info("[ngrok] Authenticated token configured.")
        else:
            logger.warning("[ngrok] No NGROK_AUTH_TOKEN — using free (unauthenticated) tunnel.")

        static_domain = os.getenv("NGROK_STATIC_DOMAIN", "").strip()
        options: dict = {"bind_tls": True}
        if static_domain:
            options["hostname"] = static_domain
            logger.info("[ngrok] Using static domain: %s", static_domain)
        else:
            logger.info("[ngrok] No NGROK_STATIC_DOMAIN — using ephemeral domain.")

        tunnel = ngrok.connect(port, "http", **options)
        public_url = tunnel.public_url
        return public_url

    except ImportError:
        logger.error("[ngrok] pyngrok not installed. Run: uv add pyngrok")
        return None
    except Exception as e:
        logger.error("[ngrok] Failed to start tunnel: %s", e, exc_info=True)
        return None


if __name__ == "__main__":
    PORT = int(os.getenv("PORT", 8000))

    logger.info("=" * 60)
    logger.info("  🎓 IELTS Grader API — Starting up")
    logger.info("=" * 60)

    public_url = start_ngrok(PORT)
    if public_url:
        logger.info("  ✅ ngrok public URL : %s", public_url)
        logger.info("  📡 POST endpoint    : %s/grade", public_url)
        logger.info("  📖 Docs             : %s/docs", public_url)
    else:
        logger.warning("  ⚠️  Running locally only at: http://localhost:%d", PORT)

    logger.info("  🔌 Local port       : http://localhost:%d", PORT)
    logger.info("=" * 60)

    uvicorn.run(
        "serve:app",
        host="0.0.0.0",
        port=PORT,
        reload=True,
        log_level="info",
    )
