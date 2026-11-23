"""
Build the Writing Task 2 reference corpus from chillies/IELTS-writing-task-2-evaluation.

Output goes to data/reference_corpus/ (git-ignored: the repository is public and the
dataset states no licence, so essay text must never be committed):
  references.jsonl    usable as references
  held_out.jsonl      evaluation only, never shown to the grader
  build_report.json   what was removed and how each type and band level is covered

Labels have no stated scorer, so every row carries label_trust="unverified".
Type labels are cached in labels.json, so an interrupted run resumes cheaply.

Usage (from backend/app/ai):  uv run python scripts/build_reference_corpus.py
"""
from __future__ import annotations

import argparse
import concurrent.futures
import csv
import hashlib
import json
import logging
import sys
import urllib.request
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.llm_client import get_sync_llm_client, llm_extra_body, strip_markdown_fence  # noqa: E402
from services.prompt_builder import get_prompt_manager  # noqa: E402
from utils.essay_type_rules import ESSAY_TYPES, classify_by_rules  # noqa: E402
from utils import reference_corpus_cleaning as cleaning  # noqa: E402

logger = logging.getLogger("build_reference_corpus")

SOURCE = "chillies/IELTS-writing-task-2-evaluation"
REVISION = "ce4ab2f4e652ce08582f5488b23e1ebffa222e26"  # pinned so a rebuild gives the same corpus
DEFAULT_OUT = Path(__file__).resolve().parent.parent / "data" / "reference_corpus"


def download_source(raw_dir: Path) -> list[Path]:
    raw_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for name in ("train.csv", "test.csv"):
        path = raw_dir / name
        if not path.exists():
            url = f"https://huggingface.co/datasets/{SOURCE}/resolve/{REVISION}/{name}"
            urllib.request.urlretrieve(url, path)
        paths.append(path)
    return paths


def read_rows(paths: list[Path]) -> tuple[list[dict], int]:
    """All rows, plus how many test rows are exact copies of train rows."""
    csv.field_size_limit(sys.maxsize)
    splits = []
    for path in paths:
        with path.open(encoding="utf-8", newline="") as handle:
            splits.append(list(csv.DictReader(handle)))
    train_essays = {cleaning.essay_key(row["essay"]) for row in splits[0]}
    copies = sum(cleaning.essay_key(row["essay"]) in train_essays for row in splits[1])
    return splits[0] + splits[1], copies


def _prompt_key(prompt: str) -> str:
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:16]


def _classify_with_llm(prompt: str) -> str | None:
    compiled = get_prompt_manager().get_classify_prompt(prompt)
    for attempt in range(3):
        try:
            response = get_sync_llm_client().chat.completions.create(
                model=compiled.model,
                messages=compiled.messages,
                temperature=compiled.temperature,
                max_tokens=compiled.max_tokens,
                response_format={"type": "json_object"},
                extra_body=llm_extra_body(),
            )
            content = response.choices[0].message.content or "{}"
            essay_type = json.loads(strip_markdown_fence(content)).get("task_type")
            return essay_type if essay_type in ESSAY_TYPES else None
        except Exception as error:  # one bad prompt must not stop a long batch
            logger.warning("Classifier attempt %d failed: %s", attempt + 1, error)
    return None


def label_prompts(prompts: set[str], cache_path: Path, workers: int) -> dict[str, str | None]:
    cache: dict[str, str | None] = {}
    if cache_path.exists():
        cache = json.loads(cache_path.read_text(encoding="utf-8"))
    missing = sorted(p for p in prompts if cache.get(_prompt_key(p)) is None)
    logger.info("Labelling %d of %d prompts", len(missing), len(prompts))
    with concurrent.futures.ThreadPoolExecutor(workers) as pool:
        for done, (prompt, label) in enumerate(zip(missing, pool.map(_classify_with_llm, missing)), 1):
            cache[_prompt_key(prompt)] = label
            if done % 200 == 0:
                cache_path.write_text(json.dumps(cache), encoding="utf-8")
                logger.info("Labelled %d/%d", done, len(missing))
    cache_path.write_text(json.dumps(cache), encoding="utf-8")
    return {prompt: cache.get(_prompt_key(prompt)) for prompt in prompts}


def to_record(row: dict, llm_type: str | None) -> dict:
    return {
        "id": cleaning.reference_id(row["essay"]),
        "prompt": row["prompt"],
        "essay": row["essay"],
        "band": row["band"],
        "essay_type": llm_type,
        "types_agree": llm_type == classify_by_rules(row["prompt"]),
        "word_count": row["word_count"],
        "source": SOURCE,
        "source_revision": REVISION,
        "label_trust": "unverified",
    }


def write_jsonl(path: Path, records: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def build(out_dir: Path, workers: int) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    rows, test_copies = read_rows(download_source(out_dir / "raw"))
    kept, removed = cleaning.clean_rows(rows)
    labels = label_prompts({row["prompt"] for row in kept}, out_dir / "labels.json", workers)
    groups = cleaning.group_prompts(labels)

    held_out, train_side = [], []
    for row in kept:
        side = held_out if cleaning.is_held_out(groups[row["prompt"]]) else train_side
        side.append(to_record(row, labels[row["prompt"]]))

    openings = {cleaning.essay_opening(record["essay"]) for record in train_side}
    leak_free = [r for r in held_out if cleaning.essay_opening(r["essay"]) not in openings]
    references = [
        record for record in train_side
        if record["types_agree"] and record["essay_type"] and cleaning.is_reference_candidate(record)
    ]
    write_jsonl(out_dir / "references.jsonl", references)
    write_jsonl(out_dir / "held_out.jsonl", leak_free)

    coverage = Counter((r["essay_type"], r["band"]) for r in references)
    report = {
        "source": SOURCE,
        "revision": REVISION,
        "label_trust": "unverified",
        "rows_in": len(rows),
        "test_rows_copied_from_train": test_copies,
        "removed": dict(removed),
        "rows_after_cleaning": len(kept),
        "prompt_groups": len(set(groups.values())),
        "unlabelled_prompts": sum(label is None for label in labels.values()),
        "held_out": len(leak_free),
        "held_out_dropped_as_near_copies": len(held_out) - len(leak_free),
        "held_out_bands": dict(sorted(Counter(r["band"] for r in leak_free).items())),
        "references": len(references),
        "train_side_rejected_type_disagreement": sum(not r["types_agree"] for r in train_side),
        "coverage": {
            essay_type: {str(band): coverage[(essay_type, band)] for band in cleaning.BAND_LEVELS}
            for essay_type in ESSAY_TYPES
        },
    }
    (out_dir / "build_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()
    print(json.dumps(build(args.out, args.workers), indent=2))


if __name__ == "__main__":
    main()
