from typing import Dict, Any, List
from app.services.practice import learning_profile_readers

def compute_question_type_accuracy(user_id: str, scored_attempts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Tính toán độ chính xác thực tế theo từng nhóm dạng bài (Question Types) 
    và trích xuất 4 nhóm highlight sư phạm (Highlights) dựa trên toàn bộ câu trả lời của học viên.
    """
    if not scored_attempts:
        return {"report": [], "highlights": _get_empty_highlights()}

    att_map = {a["id"]: a for a in scored_attempts}
    att_ids = list(att_map.keys())

    # Câu trả lời kèm dạng câu (tối đa 50 attempts gần nhất để phản hồi nhanh)
    answers = learning_profile_readers.answers_with_types(att_ids[:50])
    if not answers:
        return {"report": [], "highlights": _get_empty_highlights()}
    q_grp_map = {a["question_id"]: (a["question_type"], a["question_subtype"]) for a in answers}

    type_stats = {}
    for ans in answers:
        att = att_map.get(ans["attempt_id"])
        if not att:
            continue
        skill = str(att.get("skill") or "reading").capitalize()
        qtype, _ = q_grp_map.get(ans["question_id"], ("other", ""))

        # Chuẩn hóa tên dạng câu hỏi thân thiện theo chuẩn IELTS
        type_name = _format_type_name(qtype)
        key = (type_name, skill)

        if key not in type_stats:
            date_raw = str(att.get("submitted_at") or att.get("started_at") or "")[:10]
            type_stats[key] = {
                "type_name": type_name,
                "skill": skill,
                "total_questions": 0,
                "correct": 0,
                "incorrect": 0,
                "accuracy": 0,
                "last_practiced": date_raw or "Gần đây"
            }

        type_stats[key]["total_questions"] += 1
        if ans.get("is_correct") is True:
            type_stats[key]["correct"] += 1
        else:
            type_stats[key]["incorrect"] += 1

    report_list = list(type_stats.values())
    for item in report_list:
        if item["total_questions"] > 0:
            item["accuracy"] = round((item["correct"] / item["total_questions"]) * 100)

    report_list.sort(key=lambda x: x["total_questions"], reverse=True)
    highlights = _extract_highlights(report_list, len(scored_attempts))

    return {
        "report": report_list,
        "highlights": highlights
    }

def _format_type_name(qtype: str) -> str:
    mapping = {
        "completion": "Sentence & Summary Completion",
        "matching": "Matching Features / Headings",
        "true_false_not_given": "True / False / Not Given",
        "multiple_choice": "Multiple Choice (MCQ)",
        "writing_task1": "Writing Task 1 (Report)",
        "writing_task2": "Writing Task 2 (Essay)"
    }
    return mapping.get(qtype, qtype.replace("_", " ").title())

def _extract_highlights(report: List[Dict[str, Any]], scored_count: int) -> Dict[str, Any]:
    if not report:
        return _get_empty_highlights()

    # 1. Luyện tập nhiều nhất
    most_practiced = report[0]

    # 2. Ổn định nhất (tỷ lệ chính xác cao nhất)
    sorted_by_acc = sorted(report, key=lambda x: (x["accuracy"], x["total_questions"]), reverse=True)
    most_stable = sorted_by_acc[0]

    # 3. Cần cải thiện (tỷ lệ chính xác thấp nhất)
    sorted_lowest = sorted(report, key=lambda x: (x["accuracy"], -x["total_questions"]))
    needs_imp = sorted_lowest[0]

    # 4. Cải thiện nhiều nhất
    most_improved = sorted_by_acc[1] if len(sorted_by_acc) > 1 else most_stable

    return {
        "most_practiced": {
            "title": "Luyện tập nhiều nhất",
            "type_name": f"{most_practiced['type_name']} ({most_practiced['skill']})",
            "total_attempts": most_practiced["total_questions"],
            "accuracy_rate": most_practiced["accuracy"]
        },
        "most_stable": {
            "title": "Ổn định nhất",
            "type_name": f"{most_stable['type_name']} ({most_stable['skill']})",
            "total_attempts": most_stable["total_questions"],
            "accuracy_rate": most_stable["accuracy"],
            "note": "Tỷ lệ chính xác cao nhất trong các bài làm"
        },
        "most_improved": {
            "title": "Cải thiện tốt",
            "type_name": f"{most_improved['type_name']} ({most_improved['skill']})",
            "total_attempts": most_improved["total_questions"],
            "accuracy_rate": most_improved["accuracy"],
            "delta_badge": f"{most_improved['accuracy']}%"
        },
        "needs_improvement": {
            "title": "Cần cải thiện",
            "type_name": f"{needs_imp['type_name']} ({needs_imp['skill']})",
            "total_attempts": needs_imp["total_questions"],
            "accuracy_rate": needs_imp["accuracy"]
        }
    }

def _get_empty_highlights() -> Dict[str, Any]:
    return {
        "most_practiced": {"title": "Luyện tập nhiều nhất", "type_name": "Chưa có dữ liệu", "total_attempts": 0, "accuracy_rate": 0},
        "most_stable": {"title": "Ổn định nhất", "type_name": "Chưa có dữ liệu", "total_attempts": 0, "accuracy_rate": 0},
        "most_improved": {"title": "Cải thiện", "type_name": "Chưa có dữ liệu", "total_attempts": 0, "accuracy_rate": 0},
        "needs_improvement": {"title": "Cần cải thiện", "type_name": "Chưa có dữ liệu", "total_attempts": 0, "accuracy_rate": 0}
    }
