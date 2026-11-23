"""
Everything a grading request needs around its pipeline call (spec 008 FR-038, R1, R3):
a frozen runtime-config snapshot, a token meter and, when the request carries a run id, a Langfuse trace.
The same object builds the success body (result + trace_id + usage + model) and the error body.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi.responses import JSONResponse

from services.langfuse.prompt_registry import (
    ANSWER_KEY_PROMPT_NAME, GRADE_PROMPT_NAME, OUTLINE_PROMPT_NAME, PROMPT_NAMES, SAMPLE_PROMPT_NAME,
    SPEAKING_PROMPT_NAMES, TASK1_PROMPT_NAMES,
)
from services.langfuse.run_trace import RunContext, RunTrace, run_trace
from services.langfuse.usage_meter import UsageMeter, start_usage_meter, stop_usage_meter
from services.runtime_config.secret_redaction import redact_secrets
from services.runtime_config.request_runtime_config import (
    RequestRuntime, clear_request_runtime, snapshot_for_request,
)
from settings.config import get_settings

# The model of the "main grading step" is the first of these that ran in the request.
_MAIN_STEP_PROMPTS = (GRADE_PROMPT_NAME, TASK1_PROMPT_NAMES["ta"], PROMPT_NAMES["ta"], SPEAKING_PROMPT_NAMES["fc"],
                      ANSWER_KEY_PROMPT_NAME, OUTLINE_PROMPT_NAME, SAMPLE_PROMPT_NAME)


class GradingScope:
    def __init__(self, trace: RunTrace, meter: UsageMeter, runtime: RequestRuntime) -> None:
        self.trace, self.meter, self.runtime = trace, meter, runtime

    def usage(self) -> list[dict]:
        return self.meter.snapshot()

    def main_model(self, fallback: str | None = None) -> str | None:
        """Model of the main grading step after overrides; else the model with most output tokens."""
        for name in _MAIN_STEP_PROMPTS:
            if name in self.runtime.used_models:
                return self.runtime.used_models[name]
        usage = self.usage()
        if usage:
            return max(usage, key=lambda item: item["output_tokens"])["model"]
        return fallback

    def success(self, result: dict) -> dict:
        """Result body plus the run info Core records (contract section 1)."""
        return {**result, "trace_id": self.trace.trace_id, "usage": self.usage(),
                "model": self.main_model(result.get("model"))}

    def failure(self, status_code: int, detail: str) -> JSONResponse:
        """Error body that still carries usage and trace_id, so Core records the tokens of a failed run."""
        settings = get_settings()
        secrets = [*self.runtime.config.secret_values(), settings.ai_engine_secret, settings.resolved_llm_api_key,
                   settings.typesafe_api_key, settings.langfuse_secret_key]
        safe_detail = redact_secrets(detail, secrets)
        self.trace.mark_error(safe_detail)
        return JSONResponse(status_code=status_code, content={
            "detail": safe_detail, "trace_id": self.trace.trace_id, "usage": self.usage()})


@asynccontextmanager
async def grading_scope(context: RunContext | None, name: str) -> AsyncIterator[GradingScope]:
    meter = start_usage_meter()
    try:
        runtime = await snapshot_for_request()
        with run_trace(context, name) as trace:
            yield GradingScope(trace, meter, runtime)
    finally:
        stop_usage_meter()
        clear_request_runtime()
