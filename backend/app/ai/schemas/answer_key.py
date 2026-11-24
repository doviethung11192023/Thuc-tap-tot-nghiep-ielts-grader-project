"""
Task 1 answer key (spec 006): figures of the chart, overview points and key features.

An Admin approves the key before grading uses it, so it is ground truth for TA, the key-point
check and the rewrite. Shape is documented in specs/006-writing-prep-parity/data-model.md.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

MAX_KEY_FEATURES = 12


@dataclass
class KeyFigure:
    series: str
    label: str
    value: float


@dataclass
class KeyFeature:
    id: str
    statement: str
    figures: list[KeyFigure] = field(default_factory=list)


@dataclass
class AnswerKey:
    visual_type: str
    unit: str
    series: dict[str, dict[str, float]]          # series name → {label → value}
    overview: list[str]
    key_features: list[KeyFeature]
    notes: str = ""

    def value_range(self) -> float:
        values = [v for points in self.series.values() for v in points.values()]
        return (max(values) - min(values)) if values else 0.0

    def to_prompt_text(self) -> str:
        """Chart block for TA and rewrite prompts; the header tells the model the data is verified."""
        lines = ["VERIFIED ANSWER KEY (checked by an examiner; every figure below is correct)",
                 f"Visual type: {self.visual_type}"]
        if self.unit:
            lines.append(f"Unit: {self.unit}")
        for name, points in self.series.items():
            lines.append(f"- {name}: " + ", ".join(f"{label}: {_fmt(v)}" for label, v in points.items()))
        if self.overview:
            lines.append("Overview:")
            lines += [f"- {o}" for o in self.overview]
        lines.append("Key features:")
        lines += [f"- [{f.id}] {f.statement}" for f in self.key_features]
        if self.notes:
            lines.append(f"Notes: {self.notes}")
        return "\n".join(lines)


def _fmt(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else f"{value:g}"


def _number(value: object, where: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{where}: value must be a number")
    return float(value)


def _parse_series(raw: object) -> dict[str, dict[str, float]]:
    if not isinstance(raw, list):
        raise ValueError("series must be a list")
    series: dict[str, dict[str, float]] = {}
    for item in raw:
        name = str((item or {}).get("name") or "").strip()
        if not name:
            raise ValueError("every series needs a name")
        points = {}
        for p in item.get("points") or []:
            label = str((p or {}).get("label") or "").strip()
            if not label:
                raise ValueError(f"series '{name}': every point needs a label")
            points[label] = _number(p.get("value"), f"series '{name}' {label}")
        series[name] = points
    return series


def _parse_features(raw: object, series: dict[str, dict[str, float]]) -> list[KeyFeature]:
    if not isinstance(raw, list) or not 1 <= len(raw) <= MAX_KEY_FEATURES:
        raise ValueError(f"key_features must list 1-{MAX_KEY_FEATURES} items")
    features, seen = [], set()
    for i, item in enumerate(raw, 1):
        fid = str((item or {}).get("id") or f"f{i}").strip()
        statement = str(item.get("statement") or "").strip()
        if not statement or fid in seen:
            raise ValueError(f"key feature '{fid}' needs a unique id and a statement")
        seen.add(fid)
        figures = []
        for fig in item.get("figures") or []:
            name, label = str(fig.get("series") or "").strip(), str(fig.get("label") or "").strip()
            if name not in series or label not in series[name]:
                raise ValueError(f"key feature '{fid}' cites unknown point {name} {label}")
            figures.append(KeyFigure(name, label, series[name][label]))
        features.append(KeyFeature(fid, statement, figures))
    return features


def parse_answer_key(data: object) -> AnswerKey:
    """Validate a stored or drafted key; raises ValueError with a message the Admin can act on."""
    if not isinstance(data, dict):
        raise ValueError("answer key must be an object")
    series = _parse_series(data.get("series") or [])
    overview = [str(o).strip() for o in data.get("overview") or [] if str(o).strip()]
    return AnswerKey(
        visual_type=str(data.get("visual_type") or "mixed"),
        unit=str(data.get("unit") or ""),
        series=series,
        overview=overview,
        key_features=_parse_features(data.get("key_features"), series),
        notes=str(data.get("notes") or ""),
    )


def parse_key_or_none(answer_key: dict | None) -> AnswerKey | None:
    """Grading-time read: an invalid stored key falls back to reading the image instead of failing."""
    if not answer_key:
        return None
    try:
        return parse_answer_key(answer_key)
    except ValueError as e:
        logger.warning("[Task1] Stored answer key invalid (%s) — reading the image instead", e)
        return None
