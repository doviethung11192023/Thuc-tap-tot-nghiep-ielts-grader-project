"""
Task 2 reference flow: classify, select a band ladder, grade once, rewrite.

The model judges against the Band Descriptors and graded examples. Tool metrics go
in as information only. Overall band stays in code (AllAgentOutputs.overall_band).
"""
from __future__ import annotations

import asyncio
import json
import logging
import time

from handlers.grammar_checker import check as check_grammar
from handlers.lexical_stats import compute as compute_lexical
from schemas.input import EssayInput
from services.holistic_grader import grade_all_criteria
from services.prompt_builder import build_grade_prompt, get_prompt_manager
from services.reference_corpus import select_ladder
from services.synthesis_service import SynthesisService
from services.task_type_classifier import classify_task_type
from settings.config import get_settings
from utils.preprocessor import preprocess

logger = logging.getLogger(__name__)


async def run_task2_reference_pipeline(title: str, essay: str) -> dict:
    started = time.perf_counter()
    processed = await asyncio.to_thread(preprocess, EssayInput(title=title, essay=essay))
    task_type, grammar_findings, lex_result = await asyncio.gather(
        asyncio.to_thread(classify_task_type, processed.title),
        asyncio.to_thread(check_grammar, processed),
        asyncio.to_thread(compute_lexical, processed),
    )
    ladder = await asyncio.to_thread(select_ladder, task_type.task_type, essay)
    compiled = await asyncio.to_thread(
        build_grade_prompt, processed, task_type.task_type, ladder, grammar_findings, lex_result
    )

    results = await grade_all_criteria(compiled)
    logger.info(
        "[Reference flow] type=%s via %s | TA=%.1f CC=%.1f LR=%.1f GRA=%.1f",
        task_type.task_type, task_type.classifier,
        results.ta.band, results.cc.band, results.lr.band, results.gra.band,
    )

    synthesis = SynthesisService(prompt_manager=get_prompt_manager())
    final_json = await synthesis.synthesize_and_rewrite(
        title=title, essay_raw=essay, all_agent_outputs=results, task="task2"
    )
    final_json.update({
        "pipeline": "reference",
        "task_subtype": task_type.task_type,
        "essay_type": task_type.task_type,
        "classifier": task_type.classifier,
        "references": [{"id": r.id, "band": r.band} for r in ladder.references],
        "reference_gaps": list(ladder.gaps),
        "model": compiled.model,
        "prompt_versions": {"grade": getattr(compiled.langfuse_prompt, "version", None)},
    })
    logger.info(
        "Reference flow completed in %.1fs: overall band %.1f | references %s",
        time.perf_counter() - started,
        final_json["scores"]["overall_band"],
        json.dumps(final_json["references"]),
    )
    return final_json
