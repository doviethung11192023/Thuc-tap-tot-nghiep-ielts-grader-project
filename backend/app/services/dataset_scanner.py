import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.db.supabase import supabase

DEFAULT_DATASET_ROOT = r"C:\Users\Admin\Downloads\prep_crawled_dataset\prep_crawled_dataset"

def scan_dataset(root_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Quét toàn bộ kho dataset crawled và đối chiếu với CSDL Supabase.
    Trả về số lượng bài đã nạp và bài còn tồn đọng (pending) cho 4 kỹ năng.
    """
    root = Path(root_path or DEFAULT_DATASET_ROOT)
    
    # 1. Lấy danh sách đề thi hiện có trong CSDL Supabase
    existing_tests_set = set()
    try:
        res = supabase.table("tests").select("title, skill").execute()
        for t in res.data or []:
            norm_key = (t["title"].strip().lower()[:280], t["skill"].strip().lower())
            existing_tests_set.add(norm_key)
    except Exception as e:
        print(f"Error fetching existing tests from Supabase: {e}")

    summary = {
        "reading": {"total": 0, "imported": 0, "pending": 0},
        "listening": {"total": 0, "imported": 0, "pending": 0},
        "writing": {"total": 0, "imported": 0, "pending": 0},
        "speaking": {"total": 0, "imported": 0, "pending": 0},
    }
    pending_samples: List[Dict[str, Any]] = []
    all_tests: List[Dict[str, Any]] = []

    # 2. Quét Reading & Listening
    rl_dir = root / "de_bai" / "listening_reading" / "445_Recent_Actual_Test"
    if rl_dir.exists():
        for f in sorted(rl_dir.iterdir()):
            if not f.is_dir():
                continue
            
            # Reading
            r_json = f / "reading_de_bai.json"
            if r_json.exists():
                summary["reading"]["total"] += 1
                try:
                    with open(r_json, "r", encoding="utf-8") as jf:
                        r_data = json.load(jf)
                    exam = r_data.get("data", r_data)
                    title = (exam.get("title") or f"Reading Actual Test ({f.name})").strip()
                except Exception:
                    title = f"Reading Actual Test ({f.name})"
                
                norm_key = (title.lower()[:280], "reading")
                is_imp = norm_key in existing_tests_set
                if is_imp:
                    summary["reading"]["imported"] += 1
                else:
                    summary["reading"]["pending"] += 1
                    if len(pending_samples) < 15:
                        pending_samples.append({
                            "title": title,
                            "skill": "reading",
                            "folder": f.name,
                            "path": str(r_json)
                        })

                all_tests.append({
                    "id": f"reading_{f.name}",
                    "title": title,
                    "skill": "reading",
                    "category": "445_Recent_Actual_Test",
                    "folder": f.name,
                    "path": str(r_json),
                    "is_imported": is_imp,
                    "duration_min": 60
                })

            # Listening
            l_json = f / "listening_de_bai.json"
            if l_json.exists():
                summary["listening"]["total"] += 1
                try:
                    with open(l_json, "r", encoding="utf-8") as jf:
                        l_data = json.load(jf)
                    exam = l_data.get("data", l_data)
                    title = (exam.get("title") or f"Listening Actual Test ({f.name})").strip()
                except Exception:
                    title = f"Listening Actual Test ({f.name})"
                
                norm_key = (title.lower()[:280], "listening")
                is_imp = norm_key in existing_tests_set
                if is_imp:
                    summary["listening"]["imported"] += 1
                else:
                    summary["listening"]["pending"] += 1
                    if len(pending_samples) < 15:
                        pending_samples.append({
                            "title": title,
                            "skill": "listening",
                            "folder": f.name,
                            "path": str(l_json)
                        })

                all_tests.append({
                    "id": f"listening_{f.name}",
                    "title": title,
                    "skill": "listening",
                    "category": "445_Recent_Actual_Test",
                    "folder": f.name,
                    "path": str(l_json),
                    "is_imported": is_imp,
                    "duration_min": 35
                })

    # 3. Quét Writing
    w_dir = root / "de_bai" / "writing"
    if w_dir.exists():
        for sub in sorted(w_dir.iterdir()):
            if not sub.is_dir():
                continue
            for f in sorted(sub.iterdir()):
                de_bai_file = f / "de_bai.json"
                if f.is_dir() and de_bai_file.exists():
                    summary["writing"]["total"] += 1
                    try:
                        with open(de_bai_file, "r", encoding="utf-8") as jf:
                            w_data = json.load(jf)
                        title = (w_data.get("title") or f.name.replace("_", " ")).strip()
                    except Exception:
                        title = f.name.replace("_", " ")

                    norm_key = (title.lower()[:280], "writing")
                    is_imp = norm_key in existing_tests_set
                    if is_imp:
                        summary["writing"]["imported"] += 1
                    else:
                        summary["writing"]["pending"] += 1
                        if len(pending_samples) < 15:
                            pending_samples.append({
                                "title": title,
                                "skill": "writing",
                                "folder": f"{sub.name}/{f.name}",
                                "path": str(de_bai_file)
                            })

                    all_tests.append({
                        "id": f"writing_{sub.name}_{f.name}",
                        "title": title,
                        "skill": "writing",
                        "category": sub.name,
                        "folder": f"{sub.name}/{f.name}",
                        "path": str(de_bai_file),
                        "is_imported": is_imp,
                        "duration_min": 60
                    })

    # 4. Quét Speaking
    sp_dir = root / "de_bai" / "speaking"
    if sp_dir.exists():
        for sub in sorted(sp_dir.iterdir()):
            if not sub.is_dir():
                continue
            for f in sorted(sub.iterdir()):
                de_bai_file = f / "de_bai.json"
                if f.is_dir() and de_bai_file.exists():
                    summary["speaking"]["total"] += 1
                    try:
                        with open(de_bai_file, "r", encoding="utf-8") as jf:
                            sp_data = json.load(jf)
                        title = (sp_data.get("title") or f.name.replace("_", " ")).strip()
                    except Exception:
                        title = f.name.replace("_", " ")

                    norm_key = (title.lower()[:280], "speaking")
                    is_imp = norm_key in existing_tests_set
                    if is_imp:
                        summary["speaking"]["imported"] += 1
                    else:
                        summary["speaking"]["pending"] += 1
                        if len(pending_samples) < 15:
                            pending_samples.append({
                                "title": title,
                                "skill": "speaking",
                                "folder": f"{sub.name}/{f.name}",
                                "path": str(de_bai_file)
                            })

                    all_tests.append({
                        "id": f"speaking_{sub.name}_{f.name}",
                        "title": title,
                        "skill": "speaking",
                        "category": sub.name,
                        "folder": f"{sub.name}/{f.name}",
                        "path": str(de_bai_file),
                        "is_imported": is_imp,
                        "duration_min": 15
                    })

    total_found = sum(s["total"] for s in summary.values())
    total_imported = sum(s["imported"] for s in summary.values())
    total_pending = sum(s["pending"] for s in summary.values())

    return {
        "total_found": total_found,
        "total_imported": total_imported,
        "total_pending": total_pending,
        "by_skill": summary,
        "pending_samples": pending_samples,
        "tests": all_tests
    }
