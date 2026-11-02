"""
Grading pipeline orchestration for IELTS Writing Task 1 and Task 2.

Phases:
  A  preprocess (sentences / paragraphs / word count)
  B  NLP tools — Task 2: task-type classifier; Task 1: vision chart describer;
     both: LanguageTool grammar + spaCy lexical stats
  C  Langfuse criterion prompts
  D  four criterion agents in parallel (TA/CC/LR/GRA)
  E/F synthesis, inline annotations, upgraded essay

Every synchronous / blocking step runs in a worker thread so concurrent
requests (e.g. Task 1 and Task 2 of one attempt) do not block each other.
"""
from __future__ import annotations

import asyncio
import logging
import time

from schemas.input import EssayInput
from schemas.task_type import TaskTypeResult
from services.chart_describer import describe_chart
from services.langfuse.prompt_manager import PromptFetchError, WritingTask
from services.llm_evaluator import evaluate_all_criteria
from services.prompt_builder import build_criterion_prompts, get_prompt_manager
from services.synthesis_service import SynthesisService
from services.task1_type_knowledge import get_task1_type
from services.task_type_classifier import classify_task_type
from handlers.grammar_checker import check as check_grammar
from handlers.lexical_stats import compute as compute_lexical
from utils.preprocessor import preprocess

logger = logging.getLogger(__name__)


__all__ = ["PromptFetchError", "normalize_task", "run_grading_pipeline", "warm_up_nlp_tools"]


def normalize_task(task_type: str | None) -> WritingTask:
    """Anything other than an explicit Task 1 is graded as Task 2 (backward compatible)."""
    value = (task_type or "").strip().lower().replace(" ", "").replace("_", "")
    return "task1" if value in ("task1", "1", "t1", "writingtask1") else "task2"


def warm_up_nlp_tools() -> None:
    """Load LanguageTool (Java server) and spaCy once at startup instead of on the first request."""
    sample = preprocess(EssayInput(title="warm up", essay="This is a short warm up sentence."))
    check_grammar(sample)
    compute_lexical(sample)


async def run_grading_pipeline(
    title: str,
    essay: str,
    task_type: str | None = None,
    image_url: str | None = None,
) -> dict:
    task = normalize_task(task_type)
    started = time.perf_counter()
    logger.info("Grading pipeline started — %s | essay: %d chars", task, len(essay))

    # Phase A
    processed = await asyncio.to_thread(preprocess, EssayInput(title=title, essay=essay))

    # Phase B — task-type knowledge (+ vision for Task 1) in parallel with the NLP tools
    visual = None
    if task == "task1":
        visual_job = describe_chart(title, image_url, get_prompt_manager())
        visual, grammar_findings, lex_result = await asyncio.gather(
            visual_job,
            asyncio.to_thread(check_grammar, processed),
            asyncio.to_thread(compute_lexical, processed),
        )
        task_type_result: TaskTypeResult = get_task1_type(visual.chart_type)
    else:
        task_type_result, grammar_findings, lex_result = await asyncio.gather(
            asyncio.to_thread(classify_task_type, processed.title),
            asyncio.to_thread(check_grammar, processed),
            asyncio.to_thread(compute_lexical, processed),
        )
    logger.info(
        "[Phase B] ✓ type=%s | grammar issues=%d", task_type_result.task_type, len(grammar_findings)
    )

    visual_text = visual.to_prompt_text() if visual else ""

    # Phase C (raises PromptFetchError when Langfuse is unavailable)
    prompts = await asyncio.to_thread(
        build_criterion_prompts,
        processed=processed,
        task_type=task_type_result,
        grammar_findings=grammar_findings,
        lex_result=lex_result,
        task=task,
        visual_description=visual_text,
    )

    # Phase D
    results = await evaluate_all_criteria(prompts)
    logger.info(
        "[Phase D] ✓ TA=%.1f CC=%.1f LR=%.1f GRA=%.1f",
        results.ta.band, results.cc.band, results.lr.band, results.gra.band,
    )

    # Phase E/F
    synthesis = SynthesisService(prompt_manager=get_prompt_manager())
    final_json = await synthesis.synthesize_and_rewrite(
        title=title, essay_raw=essay, all_agent_outputs=results, task=task,
        visual_description=visual_text,
    )

    final_json["task_subtype"] = task_type_result.task_type
    if visual is not None:
        final_json["visual_analysis"] = visual.to_dict()

    logger.info(
        "Grading pipeline completed in %.1fs — overall band %.1f | annotations %d",
        time.perf_counter() - started,
        final_json["scores"]["overall_band"],
        len(final_json["inline_annotations"]),
    )
    return final_json
