"""
serve.py — Backward-compatible entrypoint.
Delegates to main.py (the primary FastAPI entrypoint).
"""

from main import (
    GradeRequest,
    MAX_ESSAY_CHARS,
    app,
    grade,
    health,
    lifespan,
    root,
    run_server,
    start_ngrok,
    warm_up_nlp_tools,
    run_grading_pipeline,
)

if __name__ == "__main__":
    run_server()
