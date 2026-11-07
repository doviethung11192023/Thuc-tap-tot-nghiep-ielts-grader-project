"""
Read-only Task 2 reference corpus and band-ladder selection.

One essay per band level, so no level outnumbers another. The prompt is picked
before the essay, because a few popular prompts hold dozens of essays. Every pick
and the display order come from a hash of the submission: a repeat run selects the
same ladder, and the last-shown band varies between submissions.
"""
from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from schemas.task_type import UNKNOWN_TASK_TYPE
from settings.config import get_settings
from utils.reference_corpus_cleaning import BAND_LEVELS, essay_key, reference_id

_NEAREST_TYPE = {"Cause_Effect": "Cause_Solution"}


class ReferenceCorpusError(RuntimeError):
    """The corpus is missing or unreadable (HTTP 503: retryable, never a silent fallback)."""


@dataclass(frozen=True)
class Reference:
    id: str
    prompt: str
    essay: str
    band: float
    essay_type: str


@dataclass(frozen=True)
class BandLadder:
    references: tuple[Reference, ...]
    gaps: tuple[float, ...]  # levels not filled from the essay's own type


@lru_cache(maxsize=1)
def load_references(corpus_dir: str | None = None) -> tuple[Reference, ...]:
    path = Path(corpus_dir or get_settings().reference_corpus_dir) / "references.jsonl"
    try:
        with path.open(encoding="utf-8") as handle:
            rows = [json.loads(line) for line in handle]
        references = tuple(
            Reference(r["id"], r["prompt"], r["essay"], float(r["band"]), r["essay_type"])
            for r in rows
        )
    except (OSError, ValueError, KeyError) as error:
        raise ReferenceCorpusError(f"Cannot load {path}: {error}") from error
    if not references:
        raise ReferenceCorpusError(f"{path} is empty")
    return references


def _hash(seed: str, salt: str) -> int:
    return int.from_bytes(hashlib.sha256(f"{seed}:{salt}".encode("utf-8")).digest()[:8], "big")


def _pick(candidates: list[Reference], seed: str, band: float) -> Reference:
    by_prompt: dict[str, list[Reference]] = defaultdict(list)
    for reference in candidates:
        by_prompt[reference.prompt].append(reference)
    prompts = sorted(by_prompt)
    prompt = prompts[_hash(seed, f"prompt-{band}") % len(prompts)]
    essays = sorted(by_prompt[prompt], key=lambda reference: reference.id)
    return essays[_hash(seed, f"essay-{band}") % len(essays)]


def select_ladder(
    essay_type: str, essay: str, references: tuple[Reference, ...] | None = None
) -> BandLadder:
    """Pick the ladder for one submission. "Unknown" draws from every type."""
    corpus = load_references() if references is None else references
    seed = essay_key(essay)
    own_id = reference_id(essay)
    chosen: list[Reference] = []
    gaps: list[float] = []

    for band in BAND_LEVELS:
        level = [r for r in corpus if r.band == band and r.id != own_id]
        own_type = level if essay_type == UNKNOWN_TASK_TYPE else [
            r for r in level if r.essay_type == essay_type
        ]
        nearest = [r for r in level if r.essay_type == _NEAREST_TYPE.get(essay_type)]
        if not own_type:
            gaps.append(band)
        candidates = own_type or nearest
        if candidates:
            chosen.append(_pick(candidates, seed, band))

    chosen.sort(key=lambda reference: _hash(seed, reference.id))
    return BandLadder(tuple(chosen), tuple(gaps))
