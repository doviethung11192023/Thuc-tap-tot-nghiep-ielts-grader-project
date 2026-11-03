import json
from pathlib import Path
from typing import Optional, Dict, Any
from app.services.importers import import_writer
from app.schemas.exam_content import SkillType
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

        test_id = import_writer.begin_test(title, skill.value, duration_min, diff_val, "Cambridge IELTS Actual Tests",
                                           admin_id, only_pending, stats, progress_callback)
        if not test_id:
            return

        q_counter = 1
        for sec_idx, sec in enumerate(exam.get("sections", []), 1):
            sec_payload = extract_section_payload(sec, skill.value, sec_idx)
            section_id = import_writer.add_section(test_id, sec_idx, sec_payload["title"], stats,
                                                   sec_payload["passage_text"], sec_payload["audio_key"])
            for ex_idx, ex in enumerate(sec.get("exercises", []), 1):
                q_type, grp_title, img_key, content_meta, parsed_qs, q_counter = parse_exercise_group(
                    ex, q_counter, sec_payload["paragraphs"] if ex_idx == 1 else []
                )
                questions = []
                for pq in parsed_qs:
                    accepted, expl, evidence = _answer_key(explanations_map.get(pq["raw_id"]))
                    questions.append({"number": pq["number"], "prompt": pq["prompt"], "options": pq["options"],
                                      "answer_key": {"accepted_answers": accepted, "explanation": expl, "evidence": evidence}})
                import_writer.add_group(section_id, {"order_no": ex_idx, "question_type": q_type,
                                                     "instructions": grp_title, "image_key": img_key,
                                                     "content": content_meta, "questions": questions}, stats)
        import_writer.publish(test_id, admin_id, title, stats)
    except Exception as e:
        stats["errors"].append(f"Error processing {json_path.name}: {str(e)}")


def _answer_key(ev_item):
    """Đáp án chấp nhận + lời giải + dẫn chứng từ file lời giải 4 bước (chữ cái "C. ..." nhận cả "C")."""
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
    return accepted or ["N/A"], expl, evidence
