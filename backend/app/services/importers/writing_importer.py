import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.db.supabase import supabase
from app.schemas.exam_content import SkillType, ContentStatus, AllowedMode

def import_single_writing_test(t_dir: Path, root_path: Path, admin_id: str, test_set_id: str, stats: Dict[str, Any], only_pending: bool = True, progress_callback = None):
    w_de_bai_dir = root_path / "de_bai" / "writing"
    w_dap_an_dir = root_path / "dap_an_loi_giai" / "writing"
    try:
        de_bai_file = t_dir / "de_bai.json"
        if not de_bai_file.exists():
            return

        with open(de_bai_file, "r", encoding="utf-8") as f:
            de_bai = json.load(f)

        title = de_bai.get("title") or t_dir.name.replace("_", " ")

        # Deduplication Check
        if only_pending:
            existing = supabase.table("tests").select("id").eq("title", title[:280]).eq("skill", SkillType.WRITING.value).limit(1).execute()
            if existing.data:
                stats["tests_skipped_existing"] = stats.get("tests_skipped_existing", 0) + 1
                if progress_callback:
                    progress_callback({
                        "skill": "writing",
                        "title": title[:280],
                        "status": "skipped",
                        "message": f"Bài thi '{title[:280]}' (Writing) đã tồn tại, bỏ qua."
                    })
                return

        # Build sample answers map
        sample_answers_map = {}
        rel_path = t_dir.relative_to(w_de_bai_dir)
        ans_file = w_dap_an_dir / rel_path / "sample_answers.json"
        if ans_file.exists():
            with open(ans_file, "r", encoding="utf-8") as af:
                ans_data = json.load(af)
                for p in ans_data.get("parts", []):
                    for q in p.get("questions", []):
                        if q.get("id"):
                            sample_answers_map[q["id"]] = q

        # Create Test in tests table
        t_res = supabase.table("tests").insert({
            "test_set_id": test_set_id,
            "title": title[:280],
            "skill": SkillType.WRITING.value,
            "allowed_mode": AllowedMode.BOTH.value,
            "status": ContentStatus.PUBLISHED.value,
            "duration_min": 60,
            "origin": "manual",
            "source_name": "IELTS Actual Writing Tests",
            "created_by": admin_id,
            "reviewed_by": admin_id,
            "reviewed_at": datetime.utcnow().isoformat()
        }).execute()

        if not t_res.data:
            return

        test_id = t_res.data[0]["id"]
        stats["tests_created"] += 1
        if progress_callback:
            progress_callback({
                "skill": "writing",
                "title": title[:280],
                "status": "created",
                "message": f"Đã nạp bài thi '{title[:280]}' (Writing)."
            })

        for part_idx, part in enumerate(de_bai.get("parts", []), 1):
            p_title = part.get("title") or f"Writing Task {part_idx}"
            direction = part.get("direction") or ""
            is_task1 = "task 1" in p_title.lower() or part_idx == 1

            # Section
            s_res = supabase.table("test_sections").insert({
                "test_id": test_id,
                "order_no": part_idx,
                "title": p_title,
                "passage_text": direction
            }).execute()
            if not s_res.data:
                continue
            section_id = s_res.data[0]["id"]
            stats["sections_created"] += 1

            first_q = part.get("questions", [{}])[0] if part.get("questions") else {}
            img_url = first_q.get("image_url")

            # Question Group
            g_res = supabase.table("question_groups").insert({
                "section_id": section_id,
                "order_no": 1,
                "question_type": "writing_task1" if is_task1 else "writing_task2",
                "instructions": direction,
                "image_key": img_url,
                "content": {
                    "task_type": "task1" if is_task1 else "task2",
                    "min_words": 150 if is_task1 else 250,
                    "target_time_min": 20 if is_task1 else 40
                }
            }).execute()
            if not g_res.data:
                continue
            group_id = g_res.data[0]["id"]
            stats["question_groups_created"] += 1

            # Question
            sample_item = sample_answers_map.get(first_q.get("id")) or {}
            q_res = supabase.table("questions").insert({
                "group_id": group_id,
                "number": 1,
                "prompt": direction,
                "max_words": 150 if is_task1 else 250,
                "options": None,
                "prep_time_sec": None,
                "answer_time_sec": (20 if is_task1 else 40) * 60
            }).execute()
            if not q_res.data:
                continue
            q_id = q_res.data[0]["id"]
            stats["questions_created"] += 1

            # Answer Key
            if sample_item:
                supabase.table("question_answer_keys").insert({
                    "question_id": q_id,
                    "accepted_answers": [sample_item.get("sample_essay", "")],
                    "explanation": json.dumps({
                        "outline": sample_item.get("outline", ""),
                        "suggestions": sample_item.get("suggestions", "")
                    }, ensure_ascii=False),
                    "evidence": None
                }).execute()
    except Exception as e:
        stats["errors"].append(f"Error importing writing test {t_dir.name}: {str(e)}")

def import_writing_tests(root_path: Path, admin_id: str, test_set_id: str, limit: Optional[int], stats: Dict[str, Any], only_pending: bool = True, progress_callback = None):
    w_de_bai_dir = root_path / "de_bai" / "writing"
    if not w_de_bai_dir.exists():
        return

    test_dirs: List[Path] = []
    for sub in sorted(w_de_bai_dir.iterdir()):
        if sub.is_dir():
            test_dirs.extend(sorted([f for f in sub.iterdir() if f.is_dir()]))

    if limit:
        test_dirs = test_dirs[:limit]

    for t_dir in test_dirs:
        import_single_writing_test(t_dir, root_path, admin_id, test_set_id, stats, only_pending, progress_callback)

