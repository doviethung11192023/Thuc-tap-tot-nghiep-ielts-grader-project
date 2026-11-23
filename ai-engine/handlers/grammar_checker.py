from __future__ import annotations

import threading
import language_tool_python

from settings.config import DISABLED_GRAMMAR_RULES
from schemas.tool_output import GrammarFinding, ProcessedEssay


# ── Category → error_type mapping ────────────────────────────────────────────

_SPELLING_CATS: frozenset[str] = frozenset({"TYPOS", "MISSPELLING"})
_GRAMMAR_CATS: frozenset[str] = frozenset({
    "GRAMMAR", "AGREEMENT", "VERB_FORM",
    "SYNTAX", "NONSTANDARD_PHRASES", "REDUNDANCY",
})


def _error_type(category: str) -> str:
    if category in _SPELLING_CATS:
        return "SPELLING"
    if category in _GRAMMAR_CATS:
        return "GRAMMAR"
    return "STYLE"


# ── Singleton ─────────────────────────────────────────────────────────────────

_tool: language_tool_python.LanguageTool | None = None
_tool_lock = threading.Lock()
_tool_failed: bool = False


def _get_tool() -> language_tool_python.LanguageTool | None:
    """Return the shared LanguageTool instance, initialising it on first call.
    Falls back gracefully if Java is missing or fails to initialise.
    """
    global _tool, _tool_failed
    if _tool_failed:
        return None
    with _tool_lock:
        if _tool is None and not _tool_failed:
            try:
                _tool = language_tool_python.LanguageTool("en-US")
            except Exception as exc:
                _tool_failed = True
                import logging
                logging.getLogger(__name__).warning(
                    f"LanguageTool could not be initialized (Java missing or error: {exc}). "
                    "Skipping heuristic grammar pre-check; AI LLM evaluator will handle grammar grading directly."
                )
                return None
    return _tool


# ── Match → GrammarFinding ────────────────────────────────────────────────────

def _to_finding(m: language_tool_python.Match) -> GrammarFinding:
    return GrammarFinding(
        span=(m.offset, m.offset + m.error_length),
        error_type=_error_type(m.category),
        rule_id=m.rule_id,
        message=m.message,
        suggestions=list(m.replacements[:3]),
        context=m.context,
        sentence=m.sentence,
    )


# ── Public API ────────────────────────────────────────────────────────────────

def check(processed: ProcessedEssay) -> list[GrammarFinding]:
    tool = _get_tool()
    if tool is None:
        return []
    try:
        matches = tool.check(processed.essay_raw)
        return [
            _to_finding(m)
            for m in matches
            if m.rule_id not in DISABLED_GRAMMAR_RULES
        ]
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(f"Grammar check failed ({exc}), skipping LanguageTool matches.")
        return []
