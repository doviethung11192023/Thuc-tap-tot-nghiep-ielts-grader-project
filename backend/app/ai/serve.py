"""
serve.py — FastAPI grading server with ngrok tunnel.

Usage:
    uv run python serve.py

The server exposes:
    POST /grade   — accepts { "title": "...", "essay": "..." }
                    runs the full grading pipeline,
                    returns the frontend JSON result.

Ngrok will print the public URL to stdout on startup.
Set NGROK_AUTH_TOKEN in .env to use a persistent/authenticated tunnel.
"""

import os

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

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
        # Phase A: Preprocess
        input = EssayInput(title=req.title, essay=req.essay)
        processed_input = preprocess(input)

        # Phase B: NLP tools
        task_type_result = classify_task_type(processed_input.title)
        grammar_findings = check_grammar(processed_input)
        lex_result = compute_lexical(processed_input)

        # Phase C: Build prompts
        try:
            prompts = build_criterion_prompts(
                processed=processed_input,
                task_type=task_type_result,
                grammar_findings=grammar_findings,
                lex_result=lex_result,
            )
        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"Langfuse error — could not fetch prompts: {e}",
            )

        # Phase D: LLM evaluation
        results = await evaluate_all_criteria(prompts)

        # Phase E & F: Synthesis & Rewriting
        synthesis_service = SynthesisService()
        final_json = await synthesis_service.synthesize_and_rewrite(
            title=req.title,
            essay_raw=req.essay,
            all_agent_outputs=results,
        )

        return final_json

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Startup: launch ngrok tunnel ──────────────────────────────────────────────
def start_ngrok(port: int) -> str | None:
    """Start a pyngrok tunnel and return the public URL."""
    try:
        from pyngrok import ngrok, conf

        auth_token = os.getenv("NGROK_AUTH_TOKEN", "").strip()
        if auth_token:
            conf.get_default().auth_token = auth_token
            print(f"[ngrok] Using authenticated token.")
        else:
            print("[ngrok] No NGROK_AUTH_TOKEN found — using free (unauthenticated) tunnel.")

        tunnel = ngrok.connect(port, "http")
        public_url = tunnel.public_url
        return public_url
    except ImportError:
        print("[ngrok] pyngrok not installed. Run: uv add pyngrok")
        return None
    except Exception as e:
        print(f"[ngrok] Failed to start tunnel: {e}")
        return None


if __name__ == "__main__":
    PORT = int(os.getenv("PORT", 8000))

    print("=" * 60)
    print("  🎓 IELTS Grader API — Starting up")
    print("=" * 60)

    # Railway injects RAILWAY_ENVIRONMENT — skip ngrok when deployed
    is_railway = bool(os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PUBLIC_DOMAIN"))

    if is_railway:
        railway_domain = os.getenv("RAILWAY_PUBLIC_DOMAIN", "")
        public_url = f"https://{railway_domain}" if railway_domain else "(see Railway dashboard)"
        print(f"\n  🚂 Running on Railway")
        print(f"  ✅ Public URL    : {public_url}")
        print(f"  📡 POST endpoint : {public_url}/grade")
        print(f"  📖 Docs          : {public_url}/docs")
    else:
        public_url = start_ngrok(PORT)
        if public_url:
            print(f"\n  ✅ ngrok public URL : {public_url}")
            print(f"  📡 POST endpoint    : {public_url}/grade")
            print(f"  📖 Docs             : {public_url}/docs")
        else:
            print(f"\n  ⚠️  Running locally only at: http://localhost:{PORT}")

    print(f"  🔌 Local port       : http://localhost:{PORT}")
    print("=" * 60 + "\n")

    uvicorn.run(
        "serve:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,
        log_level="info",
    )
