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
    type_stats = {}

    if answers:
        q_grp_map = {a["question_id"]: (a["question_type"], a["question_subtype"]) for a in answers}
        for ans in answers:
            att = att_map.get(ans["attempt_id"])
            if not att:
                continue
            skill = str(att.get("skill") or "reading").capitalize()
            qtype, _ = q_grp_map.get(ans["question_id"], ("other", ""))

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

    # Bổ sung thống kê Writing & Speaking để bảng Báo cáo toàn thời gian không bị trống
    for att in scored_attempts[:50]:
        raw_sk = str(att.get("skill") or "").lower()
        if raw_sk not in ("writing", "speaking"):
            continue
        sk_cap = raw_sk.capitalize()
        mode_label = "Thi thử" if att.get("mode") in ("mock", "exam") else "Luyện tập"
        type_name = f"{sk_cap} ({mode_label})"
        key = (type_name, sk_cap)
        date_raw = str(att.get("submitted_at") or att.get("started_at") or "")[:10]
        if key not in type_stats:
            type_stats[key] = {
                "type_name": type_name,
                "skill": sk_cap,
                "total_questions": 0,
                "correct": 0,
                "incorrect": 0,
                "accuracy": 0,
                "last_practiced": date_raw or "Gần đây",
                "_band_sum": 0.0,
            }
        band_val = float(att.get("band") or 0.0)
        type_stats[key]["total_questions"] += 1
        type_stats[key]["_band_sum"] += band_val
        if band_val >= 5.0:
            type_stats[key]["correct"] += 1
        else:
            type_stats[key]["incorrect"] += 1

    if not type_stats:
        return {"report": [], "highlights": _get_empty_highlights()}

    report_list = list(type_stats.values())
    for item in report_list:
        band_sum = item.pop("_band_sum", None)
        if item["total_questions"] > 0:
            if band_sum is not None:
                item["accuracy"] = min(100, round((band_sum / (item["total_questions"] * 9.0)) * 100))
            else:
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
    stable_note = (
        "Tỷ lệ chính xác cao nhất trong các bài làm"
        if most_stable["accuracy"] >= 40
        else "Cần luyện tập thêm để đánh giá độ ổn định"
    )

    # 3. Cần cải thiện (tỷ lệ chính xác thấp nhất, ưu tiên khác dạng bài ổn định nhất nếu có >1 dạng)
    sorted_lowest = sorted(report, key=lambda x: (x["accuracy"], -x["total_questions"]))
    needs_imp = next((r for r in sorted_lowest if r is not most_stable), sorted_lowest[0]) if len(report) > 1 else sorted_lowest[0]

    # 4. Cải thiện tốt (chỉ chọn dạng có accuracy > 0, tránh gán nhầm dạng 0% là 'Cải thiện tốt')
    positive_others = [r for r in sorted_by_acc if r is not most_stable and r["accuracy"] > 0]
    if positive_others:
        most_improved = positive_others[0]
        improved_block = {
            "title": "Cải thiện tốt",
            "type_name": f"{most_improved['type_name']} ({most_improved['skill']})",
            "total_attempts": most_improved["total_questions"],
            "accuracy_rate": most_improved["accuracy"],
            "delta_badge": f"{most_improved['accuracy']}%",
        }
    elif most_stable["accuracy"] > 0:
        improved_block = {
            "title": "Cải thiện tốt",
            "type_name": f"{most_stable['type_name']} ({most_stable['skill']})",
            "total_attempts": most_stable["total_questions"],
            "accuracy_rate": most_stable["accuracy"],
            "delta_badge": f"{most_stable['accuracy']}%",
        }
    else:
        improved_block = {
            "title": "Cải thiện tốt",
            "type_name": "Chưa đủ dữ liệu tiến bộ",
            "total_attempts": 0,
            "accuracy_rate": 0,
            "delta_badge": "0%",
        }

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
            "note": stable_note
        },
        "most_improved": improved_block,
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
