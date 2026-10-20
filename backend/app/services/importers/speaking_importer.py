import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.db.supabase import supabase
from app.schemas.exam_content import SkillType, ContentStatus, AllowedMode

def import_single_speaking_test(t_dir: Path, root_path: Path, admin_id: str, test_set_id: str, stats: Dict[str, Any], only_pending: bool = True, progress_callback = None):
    sp_de_bai_dir = root_path / "de_bai" / "speaking"
    sp_dap_an_dir = root_path / "dap_an_loi_giai" / "speaking"
    try:
        de_bai_file = t_dir / "de_bai.json"
        if not de_bai_file.exists():
            return

        with open(de_bai_file, "r", encoding="utf-8") as f:
            de_bai = json.load(f)

        title = de_bai.get("title") or t_dir.name.replace("_", " ")

        # Deduplication Check
        if only_pending:
            existing = supabase.table("tests").select("id").eq("title", title[:280]).eq("skill", SkillType.SPEAKING.value).limit(1).execute()
            if existing.data:
                stats["tests_skipped_existing"] = stats.get("tests_skipped_existing", 0) + 1
                if progress_callback:
                    progress_callback({
                        "skill": "speaking",
                        "title": title[:280],
                        "status": "skipped",
                        "message": f"Bài thi '{title[:280]}' (Speaking) đã tồn tại, bỏ qua."
                    })
                return

        # Build sample answers map
        sample_answers_map = {}
        rel_path = t_dir.relative_to(sp_de_bai_dir)
        ans_file = sp_dap_an_dir / rel_path / "sample_answers.json"
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
            "skill": SkillType.SPEAKING.value,
            "allowed_mode": AllowedMode.BOTH.value,
            "status": ContentStatus.PUBLISHED.value,
            "duration_min": 15,
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
        if progress_callback:
            progress_callback({
                "skill": "speaking",
                "title": title[:280],
                "status": "created",
                "message": f"Đã nạp bài thi '{title[:280]}' (Speaking)."
            })

        for part_idx, part in enumerate(de_bai.get("parts", []), 1):
            p_title = part.get("title") or f"Speaking Part {part_idx}"
            q_low = p_title.lower()
            if "part 1" in q_low:
                q_type = "speaking_part1"
            elif "part 2" in q_low:
                q_type = "speaking_part2"
            else:
                q_type = "speaking_part3"

            # Section
            s_res = supabase.table("test_sections").insert({
                "test_id": test_id,
                "order_no": part_idx,
                "title": p_title,
                "passage_text": part.get("direction") or ""
            }).execute()
            if not s_res.data:
                continue
            section_id = s_res.data[0]["id"]
            stats["sections_created"] += 1

            # Group
            g_res = supabase.table("question_groups").insert({
                "section_id": section_id,
                "order_no": 1,
                "question_type": q_type,
                "instructions": part.get("direction") or ""
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

                q_res = supabase.table("questions").insert({
                    "group_id": group_id,
                    "number": q_sub_idx,
                    "prompt": prompt,
                    "prompt_audio_key": audio_url,
                    "prep_time_sec": prep_time,
                    "answer_time_sec": ans_time
                }).execute()
                if not q_res.data:
                    continue
                question_id = q_res.data[0]["id"]
                stats["questions_created"] += 1

                sample_info = sample_answers_map.get(q_id, {})
                sample_ans = sample_info.get("sample_answer") or ""
                vocab = sample_info.get("sample_vocabulary") or ""
                steps = sample_info.get("idea_steps") or ""
                expl_parts = []
                if sample_ans:
                    expl_parts.append(f"### BÀI MẪU CÂU TRẢ LỜI\n\n{sample_ans}")
                if vocab:
                    expl_parts.append(f"### TỪ VỰNG ĂN ĐIỂM\n\n{vocab}")
                if steps:
                    expl_parts.append(f"### CÁC BƯỚC PHÁT TRIỂN Ý TƯỞNG\n\n{steps}")

                supabase.table("question_answer_keys").insert({
                    "question_id": question_id,
                    "accepted_answers": ["Sample Answer"],
                    "explanation": "\n\n".join(expl_parts) if expl_parts else None
                }).execute()

    except Exception as e:
        stats["errors"].append(f"Speaking test {t_dir.name} error: {str(e)}")

def import_speaking_tests(root_path: Path, admin_id: str, test_set_id: str, limit: Optional[int], stats: Dict[str, Any], only_pending: bool = True, progress_callback = None):
    sp_de_bai_dir = root_path / "de_bai" / "speaking"
    if not sp_de_bai_dir.exists():
        return

    test_dirs: List[Path] = []
    for sub in sorted(sp_de_bai_dir.iterdir()):
        if sub.is_dir():
            test_dirs.extend(sorted([f for f in sub.iterdir() if f.is_dir()]))

    if limit:
        test_dirs = test_dirs[:limit]

    for t_dir in test_dirs:
        import_single_speaking_test(t_dir, root_path, admin_id, test_set_id, stats, only_pending, progress_callback)

