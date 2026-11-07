"""
Chart describer — vision pass for IELTS Writing Task 1.

Downloads the task image (R2 public URL or any http(s) URL), sends it to the
vision model with the Langfuse `writing/task1/chart` prompt, and returns a structured
description of the visual. The text-only criterion agents then grade the essay
against this description.

Failures never abort grading: the pipeline falls back to the prompt text only
(`ChartDescription.available = False`).
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import re
from dataclasses import dataclass, field

import httpx

from settings.config import get_settings
from services.llm_client import get_async_llm_client, llm_extra_body, strip_markdown_fence
from services.langfuse.prompt_manager import PromptManager
from services.task1_type_knowledge import TASK1_TYPES, normalize_task1_type

logger = logging.getLogger(__name__)

_IMAGE_TIMEOUT_SECONDS = 20.0
_ALLOWED_IMAGE_TYPES = ("image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif")
_CLASSIFY_TIMEOUT_SECONDS = 10.0

# Keyword fallback when no image can be analysed.
# Specific chart words first; checked as whole words.
_TYPE_KEYWORDS = [
    ("table", ("table",)),
    ("pie_chart", ("pie",)),
    ("line_graph", ("line graph", "line chart")),
    ("bar_chart", ("bar chart", "bar graph", "column chart")),
    ("map", ("map", "maps", "plan of", "village", "town centre", "island")),
    ("process", ("process", "stages", "cycle", "is produced", "are produced", "manufactured")),
]


@dataclass
class ChartDescription:
    available: bool
    chart_type: str = "mixed"
    overview: str = ""
    key_features: list[str] = field(default_factory=list)
    data_points: list[str] = field(default_factory=list)
    # Elements the vision model could not read reliably → graders must not penalise them
    uncertain: list[str] = field(default_factory=list)

    def to_prompt_text(self) -> str:
        """Plain-text block injected into the Task 1 prompts as `visual_description`."""
        if not self.available:
            return (
                "No image could be analysed for this task. Judge Task Achievement from the "
                "task prompt only and do NOT penalise data accuracy that cannot be verified."
            )
        lines = [f"Visual type: {self.chart_type}", f"Overview: {self.overview}"]
        if self.key_features:
            lines.append("Key features:")
            lines += [f"- {item}" for item in self.key_features]
        if self.data_points:
            lines.append("Data points:")
            lines += [f"- {item}" for item in self.data_points]
        if self.uncertain:
            lines.append("Uncertain (could not be read reliably — do NOT penalise the candidate on these):")
            lines += [f"- {item}" for item in self.uncertain]
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "available": self.available,
            "chart_type": self.chart_type,
            "overview": self.overview,
            "key_features": self.key_features,
            "data_points": self.data_points,
            "uncertain": self.uncertain,
        }


def guess_type_from_prompt(title: str) -> str:
    lowered = (title or "").lower()
    for chart_type, keywords in _TYPE_KEYWORDS:
        if any(re.search(rf"\b{re.escape(k)}\b", lowered) for k in keywords):
            return chart_type
    return "mixed"


async def _image_to_data_url(image_url: str) -> str:
    """Return a base64 data URL (vision APIs cannot always fetch third-party/R2 URLs)."""
    if image_url.startswith("data:image/"):
        return image_url

    max_bytes = get_settings().max_image_bytes
    async with httpx.AsyncClient(timeout=_IMAGE_TIMEOUT_SECONDS, follow_redirects=True) as client:
        async with client.stream("GET", image_url) as response:
            response.raise_for_status()
            content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
            if content_type not in _ALLOWED_IMAGE_TYPES:
                raise ValueError(f"Unsupported image content-type: {content_type or 'unknown'}")
            chunks: list[bytes] = []
            total = 0
            async for chunk in response.aiter_bytes():
                total += len(chunk)
                if total > max_bytes:
                    raise ValueError(f"Image larger than {max_bytes} bytes")
                chunks.append(chunk)

    encoded = base64.b64encode(b"".join(chunks)).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


def _as_str_list(value) -> list[str]:
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str) and value.strip():
        return [part.strip() for part in re.split(r"\n+", value) if part.strip()]
    return []


def _parse_description(raw_text: str) -> ChartDescription:
    data = json.loads(strip_markdown_fence(raw_text))
    if not isinstance(data, dict):
        raise ValueError("Vision output must be a JSON object")
    return ChartDescription(
        available=True,
        chart_type=normalize_task1_type(data.get("chart_type")),
        overview=str(data.get("overview", "")).strip(),
        key_features=_as_str_list(data.get("key_features")),
        data_points=_as_str_list(data.get("data_points")),
        uncertain=_as_str_list(data.get("uncertain")),
    )


def _with_image(messages: list[dict], data_url: str, fallback_text: str) -> list[dict]:
    """Attach the image to the last user message of a compiled chat prompt."""
    result = [dict(m) for m in messages]
    last_user = next((m for m in reversed(result) if m.get("role") == "user"), None)
    image_message = {
        "role": "user",
        "content": [
            {"type": "image_url", "image_url": {"url": data_url}},
            {"type": "text", "text": last_user["content"] if last_user else fallback_text},
        ],
    }
    if last_user:
        result[result.index(last_user)] = image_message
    else:
        result.append(image_message)
    return result


async def classify_visual(data_url: str, prompt_manager: PromptManager) -> str | None:
    """Visual type from a light vision model; None keeps the type from the description."""
    try:
        compiled = await asyncio.to_thread(prompt_manager.get_visual_classify_prompt)
        response = await asyncio.wait_for(
            get_async_llm_client().chat.completions.create(
                model=compiled.model,
                messages=_with_image(compiled.messages, data_url, "Classify this visual."),
                temperature=compiled.temperature,
                max_tokens=compiled.max_tokens,
                response_format={"type": "json_object"},
                extra_body=llm_extra_body(),
            ),
            _CLASSIFY_TIMEOUT_SECONDS,
        )
        visual_type = json.loads(strip_markdown_fence(response.choices[0].message.content or "{}")).get("type")
    except Exception as e:
        logger.warning("[Task1] Visual classifier failed: %s", e)
        return None
    return visual_type if visual_type in TASK1_TYPES else None


async def _describe(title: str, data_url: str, prompt_manager: PromptManager) -> ChartDescription:
    compiled = await asyncio.to_thread(prompt_manager.get_chart_prompt, title)
    response = await get_async_llm_client().chat.completions.create(
        model=compiled.model,
        messages=_with_image(compiled.messages, data_url, f"Task prompt:\n{title}"),
        temperature=compiled.temperature,
        max_tokens=compiled.max_tokens,
        response_format={"type": "json_object"},
        extra_body=llm_extra_body(),
    )
    return _parse_description(response.choices[0].message.content or "{}")


async def describe_chart(
    title: str,
    image_url: str | None,
    prompt_manager: PromptManager,
) -> ChartDescription:
    """Run the vision pass; returns an unavailable description on any failure."""
    fallback = ChartDescription(available=False, chart_type=guess_type_from_prompt(title))
    if not image_url:
        logger.warning("[Task1] No image_url provided — grading from prompt text only")
        return fallback

    try:
        data_url = await _image_to_data_url(image_url)
        description, visual_type = await asyncio.gather(
            _describe(title, data_url, prompt_manager),
            classify_visual(data_url, prompt_manager),
        )
        if visual_type:
            description.chart_type = visual_type
        logger.info("[Task1] Vision pass OK — visual type: %s", description.chart_type)
        return description
    except Exception as e:
        logger.warning("[Task1] Vision pass failed (%s) — grading from prompt text only", e)
        return fallback
