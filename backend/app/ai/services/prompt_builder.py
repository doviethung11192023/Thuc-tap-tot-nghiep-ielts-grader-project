from __future__ import annotations
import json
from dataclasses import dataclass
from itertools import groupby

from schemas.tool_output import (
    ProcessedEssay, GrammarFinding,
    LexicalStatsResult,
)
from schemas.task_type import TaskTypeResult
from services.langfuse.prompt_manager import PromptManager, CompiledPrompt
from utils.essay_formatter import format_annotated_essay, format_indexed_essay


@dataclass
class CriterionPrompts:
    ta: CompiledPrompt
    cc: CompiledPrompt
    lr: CompiledPrompt
    gra: CompiledPrompt


# ── Private helpers (serialize tool outputs to JSON-safe dicts) ───────────────

def _build_lexical_stats(lex: LexicalStatsResult) -> dict:
    """Serialize LR tool findings into a JSON-serializable dict."""
    return {
        "repetition": [
            {"word": r.word, "count": r.count}
            for r in lex.repeated_words[:20]
        ],
        "lexical_density": round(lex.lexical_density, 3),
        "type_token_ratio": round(lex.type_token_ratio, 3),
    }


def _build_grammar(findings: list[GrammarFinding]) -> dict:
    """Serialize GRA tool findings into a JSON-serializable dict."""
    grammar_errors = [f for f in findings if f.error_type == "GRAMMAR"]
    spelling_errors = [f for f in findings if f.error_type == "SPELLING"]
    return {
        "grammar_signal": {
            "total_errors": len(grammar_errors)
        },
        "spelling_signal": {
            "total_errors": len(spelling_errors)
        }
    }


# ── Public API ────────────────────────────────────────────────────────────────

_prompt_manager = PromptManager()


def build_criterion_prompts(
    processed: ProcessedEssay,
    task_type: TaskTypeResult,
    grammar_findings: list[GrammarFinding],
    lex_result: LexicalStatsResult,
) -> CriterionPrompts:
    """
    Build one CompiledPrompt per criterion by assembling variables
    and calling PromptManager.get_agent_prompt().
    """
    annotated_essay = format_annotated_essay(processed)
    indexed_essay = format_indexed_essay(processed)
    shared = {"word_count": processed.word_count}

    return CriterionPrompts(
        ta=_prompt_manager.get_agent_prompt(
            "ta",
            title=processed.title,
            essay=annotated_essay,
            task_type_knowledge=f"# TASK TYPE\n{task_type.task_type}\n\n{task_type.description}",
            **shared,
        ),
        cc=_prompt_manager.get_agent_prompt(
            "cc",
            title=processed.title,
            essay=annotated_essay,
            **shared,
        ),
        lr=_prompt_manager.get_agent_prompt(
            "lr",
            title=processed.title,
            essay=indexed_essay,
            lexical_stats=_build_lexical_stats(lex_result),
            **shared,
        ),
        gra=_prompt_manager.get_agent_prompt(
            "gra",
            title=processed.title,
            essay=indexed_essay,
            grammar=_build_grammar(grammar_findings),
            **shared,
        ),
    )
