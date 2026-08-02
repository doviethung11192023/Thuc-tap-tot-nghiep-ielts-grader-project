"""
LLM Evaluator service — executes LLM passes and validates JSON output.
"""
from __future__ import annotations
import json
import asyncio
from openai import AsyncOpenAI
import logging

from settings.config import get_settings
from schemas.llm_output import AgentCriterionOutput, AllAgentOutputs
from services.prompt_builder import CriterionPrompts, CompiledPrompt
from services.langfuse.prompt_manager import AgentCriterion

logger = logging.getLogger(__name__)

_REQUIRED_KEYS = {"band", "summary", "strengths", "issues", "improvements"}

def _parse_and_validate(raw_text: str) -> AgentCriterionOutput:
    """json.loads() + check required keys + basic types."""
    # Sometimes LLMs wrap JSON in markdown blocks
    if raw_text.startswith("```json"):
        raw_text = raw_text.split("```json")[1].rsplit("```", 1)[0].strip()
    elif raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1].rsplit("```", 1)[0].strip()

    data = json.loads(raw_text)
    
    if not isinstance(data, dict):
        raise ValueError("JSON must be an object")
        
    missing = _REQUIRED_KEYS - data.keys()
    if missing:
        raise ValueError(f"Missing keys: {missing}")
        
    if not isinstance(data["band"], (int, float)):
        raise ValueError("band must be a number")
        
    if not isinstance(data["strengths"], list):
        data["strengths"] = []
    if not isinstance(data["issues"], list):
        data["issues"] = []
    if not isinstance(data["improvements"], list):
        data["improvements"] = []
        
    return AgentCriterionOutput(
        band=float(data["band"]),
        summary=str(data["summary"]),
        strengths=data["strengths"],
        issues=data["issues"],
        improvements=data["improvements"],
    )

def _get_async_client() -> AsyncOpenAI:
    settings = get_settings()
    # Using Qwen via dashscope as in classifier
    return AsyncOpenAI(
        api_key=settings.qwen_api_key,
        base_url=settings.default_base_url,
    )

async def evaluate_criterion(
    criterion: AgentCriterion,
    compiled_prompt: CompiledPrompt,
    max_retries: int = 2
) -> AgentCriterionOutput:
    """Call LLM for one criterion, validate output, retry if JSON is broken."""
    client = _get_async_client()
    messages = list(compiled_prompt.messages)
    
    for attempt in range(max_retries + 1):
        try:
            response = await client.chat.completions.create(
                model=get_settings().default_llm_model,
                messages=messages,
                temperature=compiled_prompt.temperature,
                max_tokens=compiled_prompt.max_tokens,
                response_format={"type": "json_object"},
            )
            raw_content = response.choices[0].message.content or "{}"
            return _parse_and_validate(raw_content)
        except Exception as e:
            if attempt == max_retries:
                logger.error(f"Failed to evaluate {criterion} after {max_retries} retries. Error: {e}")
                raise
            
            error_msg = f"Your previous output failed JSON validation with error: {e}. Please return ONLY a valid JSON object matching the required schema."
            messages.append({"role": "assistant", "content": response.choices[0].message.content if 'response' in locals() else ""})
            messages.append({"role": "user", "content": error_msg})
            logger.warning(f"Retry {attempt + 1}/{max_retries} for {criterion} due to error: {e}")

async def evaluate_all_criteria(prompts: CriterionPrompts) -> AllAgentOutputs:
    """Run all 4 LLM calls in parallel."""
    ta_out, cc_out, lr_out, gra_out = await asyncio.gather(
        evaluate_criterion("ta", prompts.ta),
        evaluate_criterion("cc", prompts.cc),
        evaluate_criterion("lr", prompts.lr),
        evaluate_criterion("gra", prompts.gra),
    )
    return AllAgentOutputs(ta=ta_out, cc=cc_out, lr=lr_out, gra=gra_out)
