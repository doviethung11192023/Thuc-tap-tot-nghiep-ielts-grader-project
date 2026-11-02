"""
IELTS band helpers.

- normalize_band: clamp an LLM-produced criterion band to [0, 9] in 0.5 steps.
- round_overall_band: IELTS rounding of an average to the nearest half band
  (x.25 → x.5, x.75 → x+1).
"""
from __future__ import annotations

import math

MIN_BAND = 0.0
MAX_BAND = 9.0


def round_overall_band(value: float) -> float:
    """Round to the nearest 0.5; exact quarters round up (official IELTS rule)."""
    return math.floor(value * 2 + 0.5) / 2


def normalize_band(value: float) -> float:
    """Clamp to [0, 9] and snap to the nearest half band."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return MIN_BAND
    if math.isnan(number):
        return MIN_BAND
    number = min(max(number, MIN_BAND), MAX_BAND)
    return round_overall_band(number)
