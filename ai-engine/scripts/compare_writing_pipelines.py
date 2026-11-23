"""
Compare the legacy and reference Task 2 flows on held-out essays.

Each flow grades the same stratified sample, with bands spread evenly so the common
levels do not hide errors at the extremes. Results are appended to a JSONL file in
data/reference_corpus/, so an interrupted run resumes without repeating calls.

Labels have no stated scorer: MAE here measures distance from those labels, not
from an examiner.

Usage (from backend/app/ai):
  uv run python scripts/compare_writing_pipelines.py --essays 120
  uv run python scripts/compare_writing_pipelines.py --essays 20 --pipelines reference --run-name thinking-off
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import statistics
import sys
import time
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.grading_pipeline import run_grading_pipeline  # noqa: E402

CORPUS = Path(__file__).resolve().parent.parent / "data" / "reference_corpus"


def stratified_sample(rows: list[dict], total: int) -> list[dict]:
    """Take from each band in turn. Rows are ordered by id, so the sample is repeatable."""
    by_band: dict[float, list[dict]] = defaultdict(list)
    for row in sorted(rows, key=lambda r: r["id"]):
        by_band[row["band"]].append(row)
    sample: list[dict] = []
    index = 0
    while len(sample) < total and any(index < len(group) for group in by_band.values()):
        for band in sorted(by_band):
            if index < len(by_band[band]) and len(sample) < total:
                sample.append(by_band[band][index])
        index += 1
    return sample


def p90(values: list[float]) -> float:
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int(0.9 * len(ordered)))]


def summarise(results: list[dict]) -> dict:
    if not results:
        return {"essays": 0}
    errors = [abs(r["predicted"] - r["label"]) for r in results]
    predicted = [r["predicted"] for r in results]
    labels = [r["label"] for r in results]
    spread = statistics.pstdev(predicted) / statistics.pstdev(labels) if statistics.pstdev(labels) else 0
    return {
        "essays": len(results),
        "mae": round(statistics.mean(errors), 3),
        "within_0_5": round(sum(e <= 0.5 for e in errors) / len(errors), 3),
        "mean_bias": round(statistics.mean(p - l for p, l in zip(predicted, labels)), 3),
        "spread_vs_labels": round(spread, 3),
        "p90_seconds": round(p90([r["seconds"] for r in results]), 1),
    }


async def grade_one(row: dict, pipeline: str, gate: asyncio.Semaphore) -> dict | None:
    async with gate:
        started = time.perf_counter()
        try:
            output = await run_grading_pipeline(row["prompt"], row["essay"], "task2", pipeline=pipeline)
        except Exception as error:  # one failure must not lose a long run
            logging.error("%s failed on %s: %s", pipeline, row["id"], error)
            return None
        return {
            "id": row["id"],
            "pipeline": pipeline,
            "label": row["band"],
            "predicted": output["scores"]["overall_band"],
            "seconds": round(time.perf_counter() - started, 1),
            "essay_type": output.get("task_subtype"),
        }


async def run(args: argparse.Namespace) -> dict:
    rows = [json.loads(line) for line in (CORPUS / "held_out.jsonl").open(encoding="utf-8")]
    sample = stratified_sample(rows, args.essays)
    wanted = {row["id"] for row in sample}
    path = CORPUS / f"comparison-{args.run_name}.jsonl"
    done = [json.loads(line) for line in path.open(encoding="utf-8")] if path.exists() else []
    gate = asyncio.Semaphore(args.concurrency)

    for pipeline in args.pipelines:
        seen = {r["id"] for r in done if r["pipeline"] == pipeline}
        jobs = [grade_one(row, pipeline, gate) for row in sample if row["id"] not in seen]
        with path.open("a", encoding="utf-8") as handle:
            for job in asyncio.as_completed(jobs):
                result = await job
                if result:
                    done.append(result)
                    handle.write(json.dumps(result) + "\n")
                    handle.flush()

    report = {
        "note": "Labels are unverified: their scorer is not stated.",
        "sample": len(sample),
        "pipelines": {
            pipeline: summarise([r for r in done if r["pipeline"] == pipeline and r["id"] in wanted])
            for pipeline in args.pipelines
        },
    }
    report_path = CORPUS / f"comparison-{args.run_name}.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> None:
    logging.basicConfig(level=logging.WARNING)
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("--essays", type=int, default=120)
    parser.add_argument("--pipelines", nargs="+", default=["legacy", "reference"])
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--run-name", default="default")
    print(json.dumps(asyncio.run(run(parser.parse_args())), indent=2))


if __name__ == "__main__":
    main()
