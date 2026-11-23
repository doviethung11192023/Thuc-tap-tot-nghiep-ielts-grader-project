"""
Task 1 key-point check against an approved answer key (spec 006 US2).

The LLM only extracts: for each key feature, does the report cover it, and which figures does the
report state for it. Code decides accuracy by comparing those figures with the key. Prep's checklist
asks only "is it mentioned", so a report with wrong figures still scored 18/21 there.
"""
from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field

from schemas.answer_key import AnswerKey
from services.langfuse.prompt_manager import PromptManager
from services.llm_client import strip_markdown_fence
from services.llm_evaluator import call_llm_json

logger = logging.getLogger(__name__)

RELATIVE_TOLERANCE = 0.05   # 5 % of the key value
RANGE_TOLERANCE = 0.05      # or 5 % of the chart's value range (about a quarter gridline)


@dataclass
class KeyPointItem:
    id: str
    statement: str
    covered: bool
    accurate: bool | None                  # None: covered without a checkable figure, or not covered
    expected: list[dict] = field(default_factory=list)
    stated: list[dict] = field(default_factory=list)


@dataclass
class KeyPointCheck:
    items: list[KeyPointItem]

    def to_dict(self) -> dict:
        covered = [i for i in self.items if i.covered]
        return {
            "total": len(self.items),
            "covered": len(covered),
            "accurate": sum(1 for i in covered if i.accurate is not False),
            "items": [asdict(i) for i in self.items],
        }

    def to_prompt_text(self) -> str:
        """Appended to the rewrite's chart block so corrections quote the key's values."""
        wrong = [i for i in self.items if i.accurate is False]
        if not wrong:
            return ""
        lines = ["", "FIGURES THE REPORT GOT WRONG (correct them with the key value):"]
        for i in wrong:
            stated = ", ".join(f"{s['series']} {s['label']}: {s['value']:g}" for s in i.stated if s.get("wrong"))
            expected = ", ".join(f"{e['series']} {e['label']}: {e['value']:g}" for e in i.expected)
            lines.append(f"- [{i.id}] report says {stated}; key says {expected}")
        return "\n".join(lines)


def is_close(stated: float, expected: float, value_range: float) -> bool:
    tolerance = max(abs(expected) * RELATIVE_TOLERANCE, value_range * RANGE_TOLERANCE)
    return abs(stated - expected) <= tolerance + 1e-9


def _stated_figures(raw: object) -> list[dict]:
    figures = []
    for s in raw if isinstance(raw, list) else []:
        value = (s or {}).get("value")
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            continue
        figures.append({"series": str(s.get("series") or ""), "label": str(s.get("label") or ""),
                        "value": float(value)})
    return figures


def judge(key: AnswerKey, extraction: dict) -> KeyPointCheck:
    """Pure: turn the LLM extraction into covered/accurate per key feature."""
    by_id = {str(e.get("id")): e for e in extraction.get("items") or [] if isinstance(e, dict)}
    value_range = key.value_range()
    items = []
    for feature in key.key_features:
        raw = by_id.get(feature.id) or {}
        covered = bool(raw.get("covered"))
        stated = _stated_figures(raw.get("stated")) if covered else []
        checked = []
        for s in stated:
            expected = key.series.get(s["series"], {}).get(s["label"])
            if expected is None:
                continue                      # figure outside the key: not ours to judge
            s["wrong"] = not is_close(s["value"], expected, value_range)
            checked.append(s)
        accurate = (not any(s["wrong"] for s in checked)) if checked else None
        items.append(KeyPointItem(
            id=feature.id, statement=feature.statement, covered=covered, accurate=accurate,
            expected=[{"series": f.series, "label": f.label, "value": f.value} for f in feature.figures],
            stated=stated,
        ))
    return KeyPointCheck(items)


def _key_for_prompt(key: AnswerKey) -> str:
    return json.dumps({
        "unit": key.unit,
        "series": {name: list(points) for name, points in key.series.items()},
        "key_features": [{"id": f.id, "statement": f.statement} for f in key.key_features],
    }, ensure_ascii=False)


def _parse_extraction(raw_text: str) -> dict:
    data = json.loads(strip_markdown_fence(raw_text))
    if not isinstance(data, dict) or not isinstance(data.get("items"), list):
        raise ValueError("keycheck output must be {items: [...]}")
    return data


async def check_key_points(essay: str, key: AnswerKey, prompt_manager: PromptManager) -> KeyPointCheck:
    """One LLM extraction call, then code judgement. Failures propagate: the caller decides."""
    compiled = prompt_manager.get_keycheck_prompt(essay=essay, answer_key=_key_for_prompt(key))
    extraction = await call_llm_json("keycheck", compiled, _parse_extraction, compiled.model)
    return judge(key, extraction)


async def run_key_point_check(essay: str, key: AnswerKey | None, prompt_manager: PromptManager) -> KeyPointCheck | None:
    """No key → no checklist. An extraction failure must not fail the grading: log and drop the checklist."""
    if key is None:
        return None
    try:
        return await check_key_points(essay, key, prompt_manager)
    except Exception as e:
        logger.warning("[Task1] Key-point check failed (%s) — result has no checklist", e)
        return None
