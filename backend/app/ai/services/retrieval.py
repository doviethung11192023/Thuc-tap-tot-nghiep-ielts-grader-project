"""
Retrieval service — looks up a title record from the static titles database.

The JSON database is loaded once on first call and cached for the lifetime of
the process. Lookup is case-insensitive with whitespace normalisation.
"""

from __future__ import annotations

import json
from functools import lru_cache

from settings.config import TITLES_DB_PATH
from schemas.retrieval import TitleRecord


# ── Helpers ───────────────────────────────────────────────────────────────────

def _normalise(text: str) -> str:
    return " ".join(text.lower().split())


@lru_cache(maxsize=1)
def _load_db() -> dict[str, TitleRecord]:
    """Load titles_db.json once and index by normalised title."""
    with open(TITLES_DB_PATH, encoding="utf-8") as f:
        entries = json.load(f)
    return {
        _normalise(e["title"]): TitleRecord(
            title=e["title"],
            task_type=e["task_type"],
            argument_list=e.get("argument_list", []),
        )
        for e in entries
    }


# ── Public API ────────────────────────────────────────────────────────────────

def get_title_record(title: str) -> TitleRecord | None:
    """
    Look up a title in the static DB.

    Returns None if the title is not found (callers should fall back to
    the Task Type Classifier in that case).
    """
    return _load_db().get(_normalise(title))
