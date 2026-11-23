from __future__ import annotations
import json
from dataclasses import dataclass
from itertools import groupby

from schemas.tool_output import (
    ProcessedEssay, GrammarFinding,
    LexicalStatsResult,
)
from schemas.task_type import TaskTypeResult
from functools import lru_cache
from typing import TYPE_CHECKING

from services.langfuse.prompt_manager import PromptManager, CompiledPrompt, WritingTask
from utils.essay_formatter import format_annotated_essay, format_indexed_essay


if TYPE_CHECKING:
    from services.reference_corpus import BandLadder


@dataclass
class CriterionPrompts:
    ta: CompiledPrompt
    cc: CompiledPrompt
    lr: CompiledPrompt
    gra: CompiledPrompt

    def items(self) -> list[tuple[str, CompiledPrompt]]:
        return [("ta", self.ta), ("cc", self.cc), ("lr", self.lr), ("gra", self.gra)]

    def model_label(self) -> str:
        """Model text for grading_runs.model: one name, or "ta=a; cc,lr,gra=b" when criteria differ."""
        groups: dict[str, list[str]] = {}
        for name, compiled in self.items():
            groups.setdefault(compiled.model, []).append(name)
        if len(groups) == 1:
            return next(iter(groups))
        return "; ".join(f"{','.join(names)}={model}" for model, names in groups.items())

    def prompt_versions(self) -> dict[str, int | None]:
        """Langfuse version per criterion; the model of each call is in that version's config."""
        return {name: getattr(compiled.langfuse_prompt, "version", None) for name, compiled in self.items()}


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


# Prepended to the title for the shared CC / LR / GRA prompts (written for Task 2)
# so the examiners apply Task 1 conventions.
TASK1_CONTEXT_HEADER = (
    "[IELTS ACADEMIC WRITING TASK 1 — a report describing visual information. "
    "Minimum 150 words. An overview replaces the conclusion; no opinion is expected. "
    "Apply the band descriptors in the context of a Task 1 report.]"
)

MIN_WORDS: dict[str, int] = {"task1": 150, "task2": 250}


@lru_cache(maxsize=1)
def get_prompt_manager() -> PromptManager:
    """Created lazily so importing this module never touches Langfuse."""
    return PromptManager()


def task1_title(title: str) -> str:
    return f"{TASK1_CONTEXT_HEADER}\n\n{title}".strip()


# ── Public API ────────────────────────────────────────────────────────────────

def build_criterion_prompts(
    processed: ProcessedEssay,
    task_type: TaskTypeResult,
    grammar_findings: list[GrammarFinding],
    lex_result: LexicalStatsResult,
    task: WritingTask = "task2",
    visual_description: str = "",
) -> CriterionPrompts:
    """
    Build one CompiledPrompt per criterion by assembling variables
    and calling PromptManager.get_agent_prompt().

    Task 1: TA uses the dedicated `TA_TASK1` prompt (+ visual description);
    CC / LR / GRA reuse the Task 2 prompts with a Task 1 context header.
    """
    pm = get_prompt_manager()
    annotated_essay = format_annotated_essay(processed)
    indexed_essay = format_indexed_essay(processed)
    shared = {"word_count": processed.word_count, "task": task}
    title = task1_title(processed.title) if task == "task1" else processed.title

    ta_extra = {"visual_description": visual_description} if task == "task1" else {}

    return CriterionPrompts(
        ta=pm.get_agent_prompt(
            "ta",
            title=processed.title,
            essay=annotated_essay,
            task_type_knowledge=f"# TASK TYPE\n{task_type.task_type}\n\n{task_type.description}",
            **ta_extra,
            **shared,
        ),
        cc=pm.get_agent_prompt(
            "cc",
            title=title,
            essay=annotated_essay,
            **shared,
        ),
        lr=pm.get_agent_prompt(
            "lr",
            title=title,
            essay=indexed_essay,
            lexical_stats=_build_lexical_stats(lex_result),
            **shared,
        ),
        gra=pm.get_agent_prompt(
            "gra",
            title=title,
            essay=indexed_essay,
            grammar=_build_grammar(grammar_findings),
            **shared,
        ),
    )


def _as_data(text: str) -> str:
    """Stop an essay from closing the tag that marks it as material, not instructions."""
    return text.replace("<", "(").replace(">", ")")


def format_references(ladder: "BandLadder") -> str:
    if not ladder.references:
        return "(none available)"
    return "\n\n".join(
        f'<example band="{reference.band:.1f}">\n'
        f"Question: {_as_data(reference.prompt)}\n\n{_as_data(reference.essay)}\n</example>"
        for reference in ladder.references
    )


def build_grade_prompt(
    processed: ProcessedEssay,
    essay_type: str,
    ladder: "BandLadder",
    grammar_findings: list[GrammarFinding],
    lex_result: LexicalStatsResult,
) -> CompiledPrompt:
    """One prompt for all four Task 2 criteria; tool metrics are information only."""
    signals = {"grammar": _build_grammar(grammar_findings), "lexical": _build_lexical_stats(lex_result)}
    return get_prompt_manager().get_grade_prompt(
        essay_type=essay_type,
        references=format_references(ladder),
        title=processed.title,
        word_count=processed.word_count,
        text_signals=json.dumps(signals),
        essay=_as_data(format_annotated_essay(processed)),
    )
