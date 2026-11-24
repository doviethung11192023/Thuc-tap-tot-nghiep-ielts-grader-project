from typing import Dict, Any, List
from app.services.practice import learning_profile_readers
from .common import get_user_answers_cached


def compute_question_type_accuracy(user_id: str, scored_attempts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Tính độ chính xác theo dạng bài (Question Types) và 4 highlight sư phạm.
    Cải tiến: 'most_improved' tính dựa trên chênh lệch (delta) giữa nửa gần đây và nửa trước đó.
    """
    if not scored_attempts:
        return {"report": [], "highlights": _get_empty_highlights()}

    att_order = {a["id"]: idx for idx, a in enumerate(scored_attempts)}  # 0 = mới nhất
    att_map = {a["id"]: a for a in scored_attempts}
    answers = get_user_answers_cached(user_id, list(att_map.keys())[:50])
    type_stats: Dict[Any, Dict[str, Any]] = {}

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
                    "type_name": type_name, "skill": skill, "total_questions": 0,
                    "correct": 0, "incorrect": 0, "accuracy": 0,
                    "last_practiced": date_raw or "Gần đây", "_series": [],
                }

            ok = 1.0 if ans.get("is_correct") is True else 0.0
            type_stats[key]["total_questions"] += 1
            type_stats[key]["_series"].append((att_order.get(ans["attempt_id"], 99), ok))
            if ok == 1.0:
                type_stats[key]["correct"] += 1
            else:
                type_stats[key]["incorrect"] += 1

    for idx, att in enumerate(scored_attempts[:50]):
        raw_sk = str(att.get("skill") or "").lower()
        if raw_sk not in ("writing", "speaking"):
            continue
        sk_cap = raw_sk.capitalize()
        mode_label = "Thi thử" if att.get("mode") in ("mock", "exam") else "Luyện tập"
        type_name = f"{sk_cap} ({mode_label})"
        key = (type_name, sk_cap)
        if key not in type_stats:
            date_raw = str(att.get("submitted_at") or att.get("started_at") or "")[:10]
            type_stats[key] = {
                "type_name": type_name, "skill": sk_cap, "total_questions": 0,
                "correct": 0, "incorrect": 0, "accuracy": 0,
                "last_practiced": date_raw or "Gần đây", "_band_sum": 0.0, "_series": [],
            }
        band_val = float(att.get("band") or 0.0)
        type_stats[key]["total_questions"] += 1
        type_stats[key]["_band_sum"] += band_val
        type_stats[key]["_series"].append((idx, min(1.0, band_val / 9.0)))
        if band_val >= 5.0:
            type_stats[key]["correct"] += 1
        else:
            type_stats[key]["incorrect"] += 1

    if not type_stats:
        return {"report": [], "highlights": _get_empty_highlights()}

    report_list = list(type_stats.values())
    for item in report_list:
        series = sorted(item.pop("_series", []), key=lambda x: x[0], reverse=True)  # cũ -> mới
        delta_pct = 0
        if len(series) >= 4:
            mid = len(series) // 2
            old_avg = sum(v for _, v in series[:mid]) / mid
            new_avg = sum(v for _, v in series[mid:]) / (len(series) - mid)
            delta_pct = round((new_avg - old_avg) * 100)
        item["improvement_delta"] = delta_pct

        band_sum = item.pop("_band_sum", None)
        if item["total_questions"] > 0:
            if band_sum is not None:
                item["metric_type"] = "band"
                item["avg_band"] = round(band_sum / item["total_questions"], 1)
                item["accuracy"] = min(100, round((band_sum / (item["total_questions"] * 9.0)) * 100))
            else:
                item["metric_type"] = "accuracy"
                item["accuracy"] = round((item["correct"] / item["total_questions"]) * 100)

    report_list.sort(key=lambda x: x["total_questions"], reverse=True)
    highlights = _extract_highlights(report_list)
    return {"report": report_list, "highlights": highlights}


def _format_type_name(qtype: str) -> str:
    mapping = {
        "completion": "Sentence & Summary Completion",
        "matching": "Matching Features / Headings",
        "true_false_not_given": "True / False / Not Given",
        "multiple_choice": "Multiple Choice (MCQ)",
        "short_answer": "Short Answer",
    }
    return mapping.get(qtype, qtype.replace("_", " ").title())


def _highlight_label(row: Dict[str, Any]) -> str:
    type_name = str(row.get("type_name") or "")
    skill = str(row.get("skill") or "")
    if not skill or skill.lower() in type_name.lower():
        return type_name
    return f"{type_name} ({skill})"


def _highlight_card(title: str, row: Dict[str, Any], **extra: Any) -> Dict[str, Any]:
    card: Dict[str, Any] = {
        "title": title,
        "type_name": _highlight_label(row),
        "total_attempts": row["total_questions"],
        "accuracy_rate": row["accuracy"],
        "metric_type": row.get("metric_type", "accuracy"),
    }
    if "avg_band" in row:
        card["avg_band"] = row["avg_band"]
    card.update(extra)
    return card


def _extract_highlights(report: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not report:
        return _get_empty_highlights()

    most_practiced = report[0]
    sorted_by_acc = sorted(report, key=lambda x: (x["accuracy"], x["total_questions"]), reverse=True)
    most_stable = sorted_by_acc[0]
    stable_note = "Tỷ lệ chính xác cao nhất trong các bài làm" if most_stable["accuracy"] >= 40 else "Cần luyện tập thêm để đánh giá độ ổn định"

    sorted_lowest = sorted(report, key=lambda x: (x["accuracy"], -x["total_questions"]))
    needs_imp = next((r for r in sorted_lowest if r is not most_stable), sorted_lowest[0]) if len(report) > 1 else sorted_lowest[0]

    positive_deltas = sorted([r for r in report if r.get("improvement_delta", 0) > 0], key=lambda x: x["improvement_delta"], reverse=True)
    if positive_deltas:
        best = positive_deltas[0]
        improved_block = _highlight_card("Cải thiện tốt", best, delta_badge=f"+{best['improvement_delta']}%")
    elif most_stable["accuracy"] > 0:
        improved_block = _highlight_card("Cải thiện tốt", most_stable, delta_badge=f"{most_stable['accuracy']}%")
    else:
        improved_block = {
            "title": "Cải thiện tốt", "type_name": "Chưa đủ dữ liệu tiến bộ",
            "total_attempts": 0, "accuracy_rate": 0, "delta_badge": "0%",
        }

    return {
        "most_practiced": _highlight_card("Luyện tập nhiều nhất", most_practiced),
        "most_stable": _highlight_card("Ổn định nhất", most_stable, note=stable_note),
        "most_improved": improved_block,
        "needs_improvement": _highlight_card("Cần cải thiện", needs_imp),
    }


def _get_empty_highlights() -> Dict[str, Any]:
    return {
        "most_practiced": {"title": "Luyện tập nhiều nhất", "type_name": "Chưa có dữ liệu", "total_attempts": 0, "accuracy_rate": 0},
        "most_stable": {"title": "Ổn định nhất", "type_name": "Chưa có dữ liệu", "total_attempts": 0, "accuracy_rate": 0},
        "most_improved": {"title": "Cải thiện tốt", "type_name": "Chưa có dữ liệu", "total_attempts": 0, "accuracy_rate": 0},
        "needs_improvement": {"title": "Cần cải thiện", "type_name": "Chưa có dữ liệu", "total_attempts": 0, "accuracy_rate": 0},
    }
