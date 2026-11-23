"""
Sub-indicator levels per criterion (spec 006 US5).

The rewrite call rates each sub-criterion it already comments on. Code keeps those levels consistent
with the criterion band: none may sit more than two levels above the band's own level. At Prep a
TA of 5.0 still showed "Excellent" sub-indicators; that contradiction is what the clamp prevents.
For Task 1 with an approved key, data accuracy comes from the key-point check, not the model.
"""
from __future__ import annotations

LEVELS = ("needs_work", "fair", "good", "very_good", "excellent")
MAX_ABOVE_BAND = 2
DATA_ACCURACY = "data_accuracy_and_support"


def band_level(band: float) -> int:
    """Index in LEVELS a band maps to: ≤4 needs_work, 5 fair, 6 good, 7 very_good, ≥8 excellent."""
    return max(0, min(len(LEVELS) - 1, int(band) - 4))


def _index(level: object) -> int | None:
    value = str(level or "").strip().lower().replace(" ", "_").replace("-", "_")
    return LEVELS.index(value) if value in LEVELS else None


def clamp_levels(raw: object, band: float) -> dict[str, str]:
    """Drop unknown levels; cap each at band level + MAX_ABOVE_BAND."""
    if not isinstance(raw, dict):
        return {}
    cap = min(len(LEVELS) - 1, band_level(band) + MAX_ABOVE_BAND)
    out = {}
    for name, level in raw.items():
        idx = _index(level)
        if idx is not None:
            out[str(name)] = LEVELS[min(idx, cap)]
    return out


# Minimum share of covered key points with correct figures for each level, from the top down.
ACCURACY_THRESHOLDS = ((1.0, "excellent"), (0.85, "very_good"), (0.7, "good"), (0.5, "fair"))


def accuracy_level(key_check: dict) -> str:
    """Share of covered key points whose figures are right → level. 3 of 7 right is 'needs_work'."""
    covered = key_check.get("covered") or 0
    if not covered:
        return LEVELS[0]
    share = (key_check.get("accurate") or 0) / covered
    return next((level for minimum, level in ACCURACY_THRESHOLDS if share >= minimum - 1e-9), LEVELS[0])


def task_sub_levels(raw: object, band: float, key_check: dict | None = None) -> dict[str, str]:
    """Levels for the TA/TR criterion; the data-accuracy entry follows the key check when present."""
    levels = clamp_levels(raw, band)
    if key_check:
        levels[DATA_ACCURACY] = accuracy_level(key_check)
    return levels
