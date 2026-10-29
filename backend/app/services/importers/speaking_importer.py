import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.db.supabase import supabase
from app.schemas.exam_content import SkillType, ContentStatus, AllowedMode
from app.services.dataset_path_resolver import resolve_dataset_paths

def _build_sample_answers(t_dir: Path, sp_de_bai_dir: Path, sp_dap_an_dir: Path) -> dict:
    try:
        rel = t_dir.relative_to(sp_de_bai_dir)
        ans_file = sp_dap_an_dir / rel / "sample_answers.json"
        if not ans_file.exists():
            return {}
        with open(ans_file, "r", encoding="utf-8") as af:
            ans_data = json.load(af)
        return {
            q["id"]: q
            for p in ans_data.get("parts", [])
            for q in p.get("questions", [])
            if q.get("id")
        }
    except Exception:
        return {}

def import_single_speaking_test(
    t_dir: Path,
    root_path: Path,
    admin_id: str,
    test_set_id: str,
    stats: Dict[str, Any],
    only_pending: bool = True,
    progress_callback = None,
    difficulty: Optional[str] = "medium"
):
    _, de_bai_dir, dap_an_dir = resolve_dataset_paths(str(root_path))
    sp_de_bai_dir = de_bai_dir / "speaking"
    sp_dap_an_dir = dap_an_dir / "speaking"
    try:
        de_bai_file = t_dir / "de_bai.json"
        if not de_bai_file.exists():
            return

        with open(de_bai_file, "r", encoding="utf-8") as f:
            de_bai = json.load(f)

        title = (de_bai.get("title") or t_dir.name.replace("_", " ")).strip()
        diff_val = difficulty if difficulty in ("easy", "medium", "hard") else "medium"

        existing = supabase.table("tests").select("id").eq("title", title[:280]).eq("skill", SkillType.SPEAKING.value).limit(1).execute()
        if existing.data:
            if only_pending:
                stats["tests_skipped_existing"] = stats.get("tests_skipped_existing", 0) + 1
                if progress_callback:
                    progress_callback({"skill": "speaking", "title": title[:280], "status": "skipped", "message": f"Bài '{title[:280]}' đã tồn tại."})
                return
            test_id = existing.data[0]["id"]
            supabase.table("tests").update({
                "test_set_id": test_set_id, "difficulty": diff_val,
                "status": ContentStatus.PUBLISHED.value, "reviewed_at": datetime.utcnow().isoformat()
            }).eq("id", test_id).execute()
            supabase.table("test_sections").delete().eq("test_id", test_id).execute()
            stats["tests_created"] += 1
        else:
            t_res = supabase.table("tests").insert({
                "test_set_id": test_set_id,
                "title": title[:280],
                "skill": SkillType.SPEAKING.value,
                "allowed_mode": AllowedMode.BOTH.value,
                "status": ContentStatus.PUBLISHED.value,
                "duration_min": 15,
                "difficulty": diff_val,
                "origin": "manual",
                "source_name": "IELTS Speaking Forecast Tests",
                "created_by": admin_id,
                "reviewed_by": admin_id,
                "reviewed_at": datetime.utcnow().isoformat()
            }).execute()
            if not t_res.data:
                return
            test_id = t_res.data[0]["id"]
            stats["tests_created"] += 1

        sample_answers_map = _build_sample_answers(t_dir, sp_de_bai_dir, sp_dap_an_dir)
        if progress_callback:
            progress_callback({"skill": "speaking", "title": title[:280], "status": "created", "message": f"Đã nạp bài '{title[:280]}' (Speaking)."})

        for part_idx, part in enumerate(de_bai.get("parts", []), 1):
            p_title = part.get("title") or f"Speaking Part {part_idx}"
            q_low = p_title.lower()
            q_type = "speaking_part1" if "part 1" in q_low else ("speaking_part2" if "part 2" in q_low else "speaking_part3")

            s_res = supabase.table("test_sections").insert({
                "test_id": test_id, "order_no": part_idx, "title": p_title, "passage_text": part.get("direction") or ""
            }).execute()
            if not s_res.data:
                continue
            section_id = s_res.data[0]["id"]
            stats["sections_created"] += 1

            g_res = supabase.table("question_groups").insert({
                "section_id": section_id, "order_no": 1, "question_type": q_type, "instructions": part.get("direction") or ""
            }).execute()
            if not g_res.data:
                continue
            group_id = g_res.data[0]["id"]
            stats["question_groups_created"] += 1

            for q_sub_idx, q in enumerate(part.get("questions", []), 1):
                q_id = q.get("id")
                prompt = q.get("question") or q.get("prompt") or ""
                audio_url = q.get("examiner_audio_url")
                prep_time = q.get("time_to_think")
                ans_time = q.get("limit_time")
                sample_info = sample_answers_map.get(q_id, {})
                idea_steps = sample_info.get("idea_steps") or []

                q_res = supabase.table("questions").insert({
                    "group_id": group_id, "number": q_sub_idx, "prompt": prompt,
                    "options": idea_steps if isinstance(idea_steps, list) else None,
                    "prompt_audio_key": audio_url, "prep_time_sec": prep_time, "answer_time_sec": ans_time
                }).execute()
                if not q_res.data:
                    continue
                question_id = q_res.data[0]["id"]
                stats["questions_created"] += 1

                sample_ans = sample_info.get("sample_answer") or ""
                if sample_ans:
                    supabase.table("question_answer_keys").insert({
                        "question_id": question_id,
                        "accepted_answers": [sample_ans],
                        "explanation": json.dumps({
                            "vocabulary": sample_info.get("sample_vocabulary", ""),
                            "idea_steps": idea_steps,
                            "native_audio": sample_info.get("native_speaker_audio_url", "")
                        }, ensure_ascii=False),
                        "evidence": None
                    }).execute()
    except Exception as e:
        stats["errors"].append(f"Error importing speaking test {t_dir.name}: {str(e)}")

def import_speaking_tests(root_path: Path, admin_id: str, test_set_id: str, limit: Optional[int], stats: Dict[str, Any], only_pending: bool = True, progress_callback = None, difficulty: Optional[str] = "medium"):
    _, de_bai_dir, _ = resolve_dataset_paths(str(root_path))
    sp_de_bai_dir = de_bai_dir / "speaking"
    if not sp_de_bai_dir.exists():
        return
    test_dirs: List[Path] = []
    for sub in sorted(sp_de_bai_dir.iterdir()):
        if sub.is_dir():
            test_dirs.extend(sorted([f for f in sub.iterdir() if f.is_dir()]))
    if limit:
        test_dirs = test_dirs[:limit]
    for t_dir in test_dirs:
        import_single_speaking_test(t_dir, root_path, admin_id, test_set_id, stats, only_pending, progress_callback, difficulty)
