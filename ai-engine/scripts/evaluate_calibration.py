"""
Grade the calibration set (data/calibration/samples.jsonl) with the live pipeline and compare
with the examiner band. Run after import_calibration_samples.py.

Transcripts are AI-made until a teacher flips reviewed=true; --reviewed-only uses just those.
The vision model tends to fix spelling while transcribing, so unreviewed LR/GRA results lean high.

Usage (from ai-engine):  uv run python scripts/evaluate_calibration.py [--reviewed-only]
"""
from __future__ import annotations

import argparse
import asyncio
import base64
import json
import logging
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.grading_pipeline import run_grading_pipeline  # noqa: E402

DATA = Path(__file__).resolve().parent.parent / "data" / "calibration"


def image_url(row: dict) -> str | None:
    if not row.get("image"):
        return None
    return "data:image/png;base64," + base64.b64encode((DATA / row["image"]).read_bytes()).decode("ascii")


async def grade(row: dict, semaphore: asyncio.Semaphore) -> dict:
    async with semaphore:
        task = "task1" if row["task"] == 1 else "task2"
        result = await run_grading_pipeline(row["prompt"], row["essay"], task, image_url(row))
    scores = result["scores"]
    return {"id": row["id"], "task": row["task"], "label": row["band"], "ai": scores["overall_band"],
            "ta": scores["task_response"], "cc": scores["coherence_cohesion"],
            "lr": scores["lexical_resource"], "gra": scores["grammatical_range_and_accuracy"]}


async def main(reviewed_only: bool) -> None:
    rows = [json.loads(line) for line in (DATA / "samples.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    if reviewed_only:
        rows = [r for r in rows if r.get("reviewed")]
    semaphore = asyncio.Semaphore(3)
    results = await asyncio.gather(*(grade(r, semaphore) for r in rows))
    print(f"{'id':22} {'examiner':>8} {'AI':>5} {'diff':>6}   TA/TR  CC   LR  GRA")
    for r in sorted(results, key=lambda r: (r["task"], r["label"])):
        print(f"{r['id']:22} {r['label']:8.1f} {r['ai']:5.1f} {r['ai'] - r['label']:+6.1f}   "
              f"{r['ta']:4.1f} {r['cc']:4.1f} {r['lr']:4.1f} {r['gra']:4.1f}")
    for name, group in (("Task 1", [r for r in results if r["task"] == 1]), ("Task 2", [r for r in results if r["task"] == 2]),
                        ("All", results)):
        if group:
            diffs = [r["ai"] - r["label"] for r in group]
            print(f"{name}: n={len(group)} bias {statistics.mean(diffs):+.2f} MAE {statistics.mean(map(abs, diffs)):.2f} "
                  f"within 0.5: {sum(abs(d) <= 0.5 for d in diffs)}/{len(diffs)}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING)
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("--reviewed-only", action="store_true")
    asyncio.run(main(parser.parse_args().reviewed_only))
