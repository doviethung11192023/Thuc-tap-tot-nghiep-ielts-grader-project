"""
One Langfuse trace per grading run (spec 008 R1).

The trace id is `create_trace_id(seed=run_id)`, so the HTTP retries Core makes for one run all land in the same
trace. Attempt id is the Langfuse session. Nothing that identifies the Learner (user id, name, email) is sent.
Any Langfuse problem turns the whole thing into a no-op: grading never fails because tracing did.
"""
from __future__ import annotations

import logging
import sys
from contextlib import ExitStack, contextmanager
from dataclasses import dataclass
from typing import Any, Iterator

from services.langfuse.client import get_langfuse_client
from services.runtime_config.secret_redaction import redact_secrets

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RunContext:
    """Optional fields of a grading request that tie it to one grading_runs row."""
    run_id: str | None = None
    attempt_id: str | None = None
    skill: str | None = None
    mode: str | None = None
    task_no: int | None = None

    def metadata(self) -> dict[str, str]:
        values = {"run_id": self.run_id, "attempt_id": self.attempt_id, "skill": self.skill,
                  "mode": self.mode, "task_no": self.task_no}
        return {key: str(value)[:200] for key, value in values.items() if value is not None}


class RunTrace:
    """Handle yielded to the caller: `trace_id` is None when no trace was opened."""

    def __init__(self) -> None:
        self.trace_id: str | None = None
        self._span: Any = None

    def mark_error(self, message: str) -> None:
        """Show the run as failed in Langfuse (no-op without a trace)."""
        if self._span is None:
            return
        try:
            self._span.update(level="ERROR", status_message=redact_secrets(message)[:300])
        except Exception as error:
            logger.warning("Langfuse trace update failed: %s", error)


def _safe_close(stack: ExitStack, exc_info: tuple) -> None:
    try:
        stack.__exit__(*exc_info)
    except Exception as error:      # closing a span must not change the result of the request
        logger.warning("Langfuse trace close failed: %s", error)


@contextmanager
def run_trace(context: RunContext | None, name: str) -> Iterator[RunTrace]:
    """Open the run trace around a grading request; a request without run_id gets no trace."""
    handle = RunTrace()
    stack = ExitStack()
    if context and context.run_id:
        try:
            from langfuse import propagate_attributes   # imported here so a broken SDK only disables tracing

            client = get_langfuse_client()
            trace_id = client.create_trace_id(seed=context.run_id)
            handle._span = stack.enter_context(client.start_as_current_observation(
                trace_context={"trace_id": trace_id}, name=name, as_type="span", metadata=context.metadata()))
            stack.enter_context(propagate_attributes(
                session_id=context.attempt_id[:200] if context.attempt_id else None,
                metadata=context.metadata(), trace_name=name))
            handle.trace_id = trace_id
        except Exception as error:
            logger.warning("Langfuse trace not opened (%s): grading continues without it", error)
            _safe_close(stack, (None, None, None))
            stack, handle = ExitStack(), RunTrace()
    try:
        yield handle
    except BaseException:
        _safe_close(stack, sys.exc_info())
        raise
    else:
        _safe_close(stack, (None, None, None))
