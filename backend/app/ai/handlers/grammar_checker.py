from __future__ import annotations

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


def _get_tool() -> language_tool_python.LanguageTool:
    """Return the shared LanguageTool instance, initialising it on first call."""
    global _tool
    if _tool is None:
        _tool = language_tool_python.LanguageTool("en-US")
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
    matches = _get_tool().check(processed.essay_raw)
    return [
        _to_finding(m)
        for m in matches
        if m.rule_id not in DISABLED_GRAMMAR_RULES
    ]
