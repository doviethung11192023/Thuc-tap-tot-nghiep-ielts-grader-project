import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.db.supabase import supabase
from app.services.dataset_path_resolver import DEFAULT_DATASET_ROOT, resolve_dataset_paths

def _scan_rl_tests(de_bai_dir: Path, existing: set, summary: dict, pending: list, all_tests: list):
    rl_dir = de_bai_dir / "listening_reading" / "445_Recent_Actual_Test"
    if not rl_dir.exists():
        return
    for f in sorted(rl_dir.iterdir()):
        if not f.is_dir():
            continue
        for skill, jname, dur in [("reading", "reading_de_bai.json", 60), ("listening", "listening_de_bai.json", 35)]:
            jpath = f / jname
            if not jpath.exists():
                continue
            summary[skill]["total"] += 1
            try:
                with open(jpath, "r", encoding="utf-8") as jf:
                    d = json.load(jf)
                exam = d.get("data", d)
                title = (exam.get("title") or f"{skill.capitalize()} Actual Test ({f.name})").strip()
            except Exception:
                title = f"{skill.capitalize()} Actual Test ({f.name})"

            is_imp = (title.lower()[:280], skill) in existing
            if is_imp:
                summary[skill]["imported"] += 1
            else:
                summary[skill]["pending"] += 1
                if len(pending) < 15:
                    pending.append({"title": title, "skill": skill, "folder": f.name, "path": str(jpath)})

            all_tests.append({
                "id": f"{skill}_{f.name}",
                "title": title,
                "skill": skill,
                "category": "445_Recent_Actual_Test",
                "folder": f.name,
                "path": str(jpath),
                "is_imported": is_imp,
                "duration_min": dur,
                "difficulty": "medium"
            })

def _scan_subject_tests(de_bai_dir: Path, skill: str, dur: int, existing: set, summary: dict, pending: list, all_tests: list):
    s_dir = de_bai_dir / skill
    if not s_dir.exists():
        return
    for sub in sorted(s_dir.iterdir()):
        if not sub.is_dir():
            continue
        for f in sorted(sub.iterdir()):
            de_bai = f / "de_bai.json"
            if not (f.is_dir() and de_bai.exists()):
                continue
            summary[skill]["total"] += 1
            try:
                with open(de_bai, "r", encoding="utf-8") as jf:
                    data = json.load(jf)
                title = (data.get("title") or f.name.replace("_", " ")).strip()
            except Exception:
                title = f.name.replace("_", " ")

            is_imp = (title.lower()[:280], skill) in existing
            if is_imp:
                summary[skill]["imported"] += 1
            else:
                summary[skill]["pending"] += 1
                if len(pending) < 15:
                    pending.append({"title": title, "skill": skill, "folder": f"{sub.name}/{f.name}", "path": str(de_bai)})

            all_tests.append({
                "id": f"{skill}_{sub.name}_{f.name}",
                "title": title,
                "skill": skill,
                "category": sub.name,
                "folder": f"{sub.name}/{f.name}",
                "path": str(de_bai),
                "is_imported": is_imp,
                "duration_min": dur,
                "difficulty": "medium"
            })

def scan_dataset(root_path: Optional[str] = None) -> Dict[str, Any]:
    _, de_bai_dir, _ = resolve_dataset_paths(root_path)
    existing_set = set()
    try:
        res = supabase.table("tests").select("title, skill").execute()
        for t in res.data or []:
            existing_set.add((t["title"].strip().lower()[:280], t["skill"].strip().lower()))
    except Exception as e:
        print(f"Error fetching existing tests from Supabase: {e}")

    summary = {s: {"total": 0, "imported": 0, "pending": 0} for s in ["reading", "listening", "writing", "speaking"]}
    pending_samples: List[Dict[str, Any]] = []
    all_tests: List[Dict[str, Any]] = []

    _scan_rl_tests(de_bai_dir, existing_set, summary, pending_samples, all_tests)
    _scan_subject_tests(de_bai_dir, "writing", 60, existing_set, summary, pending_samples, all_tests)
    _scan_subject_tests(de_bai_dir, "speaking", 15, existing_set, summary, pending_samples, all_tests)

    return {
        "total_found": sum(s["total"] for s in summary.values()),
        "total_imported": sum(s["imported"] for s in summary.values()),
        "total_pending": sum(s["pending"] for s in summary.values()),
        "by_skill": summary,
        "pending_samples": pending_samples,
        "tests": all_tests
    }
