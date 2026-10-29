import json
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime
from app.db.supabase import supabase
from app.schemas.exam_content import SkillType, ContentStatus, AllowedMode
from app.services.importers.rl_parser_helpers import (
    clean_html, extract_section_payload, parse_exercise_group
)

def process_single_rl_exam(
    test_set_id: str,
    json_path: Path,
    ans_path: Optional[Path],
    skill: SkillType,
    default_duration: int,
    admin_id: Optional[str],
    stats: Dict[str, Any],
    only_pending: bool = True,
    progress_callback = None,
    difficulty: Optional[str] = "medium"
):
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
        exam = raw_data.get("data", raw_data)
        title = (exam.get("title") or f"{skill.value.capitalize()} Actual Test").strip()
        diff_val = difficulty if difficulty in ("easy", "medium", "hard") else "medium"

        explanations_map = {}
        if ans_path and ans_path.exists():
            with open(ans_path, "r", encoding="utf-8") as af:
                ans_data = json.load(af)
                for ev in ans_data.get("evidences", []):
                    if ev.get("question_id"):
                        explanations_map[str(ev["question_id"])] = ev

        raw_dur = exam.get("duration", default_duration) or default_duration
        duration_min = max(1, round(raw_dur / 60)) if raw_dur > 180 else raw_dur

        existing = supabase.table("tests").select("id").eq("title", title[:280]).eq("skill", skill.value).limit(1).execute()
        if existing.data:
            if only_pending:
                stats["tests_skipped_existing"] += 1
                if progress_callback:
                    progress_callback({"skill": skill.value, "title": title[:280], "status": "skipped", "message": f"Bài '{title[:280]}' đã tồn tại."})
                return
            test_id = existing.data[0]["id"]
            supabase.table("tests").update({
                "test_set_id": test_set_id, "difficulty": diff_val, "duration_min": duration_min,
                "status": ContentStatus.PUBLISHED.value, "reviewed_at": datetime.utcnow().isoformat()
            }).eq("id", test_id).execute()
            supabase.table("test_sections").delete().eq("test_id", test_id).execute()
            stats["tests_created"] += 1
        else:
            t_res = supabase.table("tests").insert({
                "test_set_id": test_set_id, "title": title[:280], "skill": skill.value,
                "allowed_mode": AllowedMode.BOTH.value, "status": ContentStatus.PUBLISHED.value,
                "duration_min": duration_min, "difficulty": diff_val, "origin": "manual",
                "source_name": "Cambridge IELTS Actual Tests", "reviewed_by": admin_id,
                "reviewed_at": datetime.utcnow().isoformat(), "created_by": admin_id
            }).execute()
            if not t_res.data:
                return
            test_id = t_res.data[0]["id"]
            stats["tests_created"] += 1

        if progress_callback:
            progress_callback({"skill": skill.value, "title": title[:280], "status": "created", "message": f"Đã nạp bài '{title[:280]}' ({skill.value.capitalize()})."})

        q_counter = 1
        for sec_idx, sec in enumerate(exam.get("sections", []), 1):
            sec_payload = extract_section_payload(sec, skill.value, sec_idx)
            sec_res = supabase.table("test_sections").insert({
                "test_id": test_id, "order_no": sec_idx,
                "title": sec_payload["title"],
                "passage_text": sec_payload["passage_text"],
                "audio_key": sec_payload["audio_key"]
            }).execute()
            if not sec_res.data:
                continue
            section_id = sec_res.data[0]["id"]
            stats["sections_created"] += 1

            for ex_idx, ex in enumerate(sec.get("exercises", []), 1):
                q_type, grp_title, img_key, content_meta, parsed_qs, q_counter = parse_exercise_group(
                    ex, q_counter, sec_payload["paragraphs"] if ex_idx == 1 else []
                )
                grp_res = supabase.table("question_groups").insert({
                    "section_id": section_id, "order_no": ex_idx, "question_type": q_type,
                    "instructions": grp_title, "image_key": img_key, "content": content_meta
                }).execute()
                if not grp_res.data:
                    continue
                group_id = grp_res.data[0]["id"]
                stats["question_groups_created"] += 1

                for pq in parsed_qs:
                    q_res = supabase.table("questions").insert({
                        "group_id": group_id, "number": pq["number"],
                        "prompt": pq["prompt"], "options": pq["options"]
                    }).execute()
                    if not q_res.data:
                        continue
                    question_id = q_res.data[0]["id"]
                    stats["questions_created"] += 1

                    ev_item = explanations_map.get(pq["raw_id"])
                    accepted, expl, evidence = [], None, None
                    if ev_item:
                        expl = ev_item.get("detail_explanation")
                        for ae in ev_item.get("answer_evidences", []):
                            if ae.get("is_correct") or not accepted:
                                raw_ans = (ae.get("answer_text") or "").strip()
                                clean_ans = raw_ans.split(".")[0].strip() if len(raw_ans) > 2 and raw_ans[1:3] == ". " and raw_ans[0] in "ABCDEFGH" else raw_ans
                                if clean_ans:
                                    accepted.append(clean_ans)
                                if raw_ans and raw_ans not in accepted:
                                    accepted.append(raw_ans)
                            if not evidence:
                                evidence = ae.get("evidence_quote") or (ae.get("evidence_items", [{}])[0].get("evidence_text") if ae.get("evidence_items") else None)
                    if not accepted:
                        accepted = ["N/A"]

                    supabase.table("question_answer_keys").insert({
                        "question_id": question_id, "accepted_answers": accepted,
                        "explanation": expl, "evidence": evidence
                    }).execute()
    except Exception as e:
        stats["errors"].append(f"Error processing {json_path.name}: {str(e)}")
