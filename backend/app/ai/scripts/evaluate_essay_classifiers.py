"""
Compare essay type classifiers on the Task 2 prompts labelled by Prep in dataset_clean.

"Positive or negative development" prompts accept either Opinion or
Advantages_Disadvantages, because the two readings are both defensible.
Baselines: old code prompt 62/96; `writing/task2/classify` on qwen3.7-plus 86/96.

Usage (from backend/app/ai):  uv run python scripts/evaluate_essay_classifiers.py
"""
from __future__ import annotations

import concurrent.futures
import json
import re
import sys
import time
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services import jev_client  # noqa: E402
from services.prompt_builder import get_prompt_manager  # noqa: E402
from services.task_type_classifier import _classify_with_prompt  # noqa: E402
from utils.essay_type_rules import classify_by_rules  # noqa: E402

DATASET = Path(__file__).resolve().parents[4] / "dataset_clean" / "dap_an_loi_giai_clean" / "writing"
_LABELS = (
    (r"discuss", "Discussion"),
    (r"advantage|positive|negative", "Advantages_Disadvantages"),
    (r"opinion|agree", "Opinion"),
    (r"two.?part|double|direct", "Two_Part_Question"),
    (r"(cause|problem|reason).*(solution|measure)", "Cause_Solution"),
    (r"(cause|reason).*(effect|impact)", "Cause_Effect"),
)


def load_prompts() -> list[dict]:
    rows = []
    for path in sorted(DATASET.glob("*/*/sample_answers.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        match = re.search(r"WT2:\s*(.*)", data["title"])
        questions = [q for part in data["parts"] if "2" in part["title"] for q in part["questions"]]
        if not match or not questions:
            continue
        raw = re.sub(r"\s*\(.*", "", match.group(1)).strip()
        label = next((type_ for pattern, type_ in _LABELS if re.search(pattern, raw, re.I)), None)
        if label:
            text = re.sub(r"You should spend about 40 minutes.*?\.\s*", "", questions[0]["prompt"])
            text = re.sub(r"Give reasons for your answer.*", "", text, flags=re.S)
            text = re.sub(r"^Write about the following topic:\s*_?", "", text.strip())
            rows.append({"source_label": raw, "label": label, "prompt": text.strip()})
    return rows


def is_correct(row: dict, predicted: str | None) -> bool:
    either = re.search("ositive|egative", row["source_label"])
    return predicted == row["label"] or bool(either and predicted in ("Opinion", "Advantages_Disadvantages"))


def _run(name: str, classify, rows: list[dict], workers: int = 8) -> None:
    started = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(workers) as pool:
        predictions = list(pool.map(lambda row: classify(row["prompt"]), rows))
    correct = sum(is_correct(row, p) for row, p in zip(rows, predictions))
    misses = Counter((r["label"], p) for r, p in zip(rows, predictions) if not is_correct(r, p))
    print(f"{name:8s} {correct}/{len(rows)}  {time.perf_counter() - started:5.1f}s  {misses.most_common(4)}")


def main() -> None:
    rows = load_prompts()
    manager = get_prompt_manager()
    options = (manager.get_classify_prompt("x").langfuse_prompt.config or {}).get("options") or {}
    _run("rules", classify_by_rules, rows)
    _run("qwen", lambda prompt: _classify_with_prompt(manager.get_classify_prompt(prompt)), rows)
    if jev_client.is_configured():
        _run("jev", lambda prompt: jev_client.choose_essay_type(prompt, options), rows)
    else:
        print("jev      skipped: TYPESAFE_API_KEY is not set")


if __name__ == "__main__":
    main()
