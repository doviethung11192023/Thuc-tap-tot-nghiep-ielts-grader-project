"""
Synthesis service (Phase E/F) — consolidates the four criterion outputs with the
REWRITE prompt (Task 1 or Task 2 variant) and builds the final frontend JSON.

Output keys are consumed by backend/app/worker/tasks.py and must stay stable:
scores, criteria_analysis, inline_annotations, overall_upgraded_essay,
word_count, task_type.
"""
from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import asdict

from services.langfuse.prompt_manager import PromptManager, WritingTask
from services.llm_client import get_async_llm_client, llm_extra_body, strip_markdown_fence
from schemas.llm_output import AgentCriterionOutput, AllAgentOutputs
from utils.annotation_normalizer import apply_corrections, drop_unsupported_numbers, locate_and_dedupe

logger = logging.getLogger(__name__)

# criteria_analysis key → attribute on AllAgentOutputs
_CRITERIA = {
    "task_response": "ta",
    "coherence_cohesion": "cc",
    "lexical_resource": "lr",
    "grammatical_range_and_accuracy": "gra",
}


def _map_items(items: list) -> list[str]:
    """Flatten agent strength/issue objects into display strings."""
    res = []
    for i in items:
        if isinstance(i, str):
            res.append(i)
        elif isinstance(i, dict):
            val = i.get("issue") or i.get("strength") or i.get("description") or i.get("point")
            if not val and len(i) > 0:
                val = str(list(i.values())[0])
            res.append(str(val) if val else str(i))
        else:
            res.append(str(i))
    return res


def _criterion_block(llm_criteria: dict, key: str, agent: AgentCriterionOutput) -> dict:
    node = llm_criteria.get(key, {}) if isinstance(llm_criteria, dict) else {}
    sub = node.get("sub_criteria", node) if isinstance(node, dict) else {}
    # Frontend renders sub_criteria as Record<string, string>.
    sub = {str(k): v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)
           for k, v in sub.items()} if isinstance(sub, dict) else {}
    return {
        "sub_criteria": sub,
        "feedback": {
            "strengths": _map_items(agent.strengths),
            "areas_to_improve": _map_items(agent.issues),
        },
    }


class SynthesisService:
    def __init__(self, prompt_manager: PromptManager | None = None):
        self.prompt_manager = prompt_manager or PromptManager()
        self.client = get_async_llm_client()

    async def _call_rewrite_llm(self, compiled, max_retries: int) -> dict:
        messages = list(compiled.messages)
        for attempt in range(max_retries + 1):
            raw_content = ""
            try:
                response = await self.client.chat.completions.create(
                    model=compiled.model,
                    messages=messages,
                    temperature=compiled.temperature,
                    max_tokens=compiled.max_tokens,
                    response_format={"type": "json_object"},
                    extra_body=llm_extra_body(),
                )
                raw_content = response.choices[0].message.content or "{}"
                data = json.loads(strip_markdown_fence(raw_content))
                if not isinstance(data, dict):
                    raise ValueError("Rewrite output must be a JSON object")
                return data
            except Exception as e:
                if attempt == max_retries:
                    logger.error("Rewrite Agent failed after %d retries: %s", max_retries, e)
                    raise
                logger.warning("Rewrite retry %d/%d: %s", attempt + 1, max_retries, e)
                if raw_content:
                    messages.append({"role": "assistant", "content": raw_content})
                    messages.append({
                        "role": "user",
                        "content": f"Your previous output failed JSON validation with error: {e}. Return ONLY valid JSON.",
                    })
                else:
                    await asyncio.sleep(2 ** attempt)
        raise RuntimeError("unreachable")

    async def synthesize_and_rewrite(
        self,
        title: str,
        essay_raw: str,
        all_agent_outputs: AllAgentOutputs,
        max_retries: int = 2,
        task: WritingTask = "task2",
        visual_description: str = "",
    ) -> dict:
        feedback = {
            f"{attr}_feedback": json.dumps(asdict(getattr(all_agent_outputs, attr)), ensure_ascii=False)
            for attr in _CRITERIA.values()
        }
        compiled = await asyncio.to_thread(
            self.prompt_manager.get_rewrite_prompt,
            title=title,
            essay=essay_raw,
            task=task,
            visual_description=visual_description,
            **feedback,
        )

        llm_json = await self._call_rewrite_llm(compiled, max_retries)

        # Span resolution can fall back to a CPU-heavy fuzzy search → run off the event loop.
        annotations = await asyncio.to_thread(
            locate_and_dedupe, llm_json.get("inline_annotations", []), essay_raw
        )
        if task == "task1":
            annotations = drop_unsupported_numbers(annotations, visual_description)

        llm_criteria = llm_json.get("criteria_analysis", {})
        return {
            "task_type": task,
            "scores": {
                "overall_band": all_agent_outputs.overall_band,
                **{key: getattr(all_agent_outputs, attr).band for key, attr in _CRITERIA.items()},
            },
            "criteria_analysis": {
                key: _criterion_block(llm_criteria, key, getattr(all_agent_outputs, attr))
                for key, attr in _CRITERIA.items()
            },
            "inline_annotations": annotations,
            "overall_upgraded_essay": apply_corrections(essay_raw, annotations),
            "word_count": len(essay_raw.split()),
        }
