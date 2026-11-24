"""Cổng kiểm tra độ đầy đủ 5 quy tắc & chống duyệt vội (Pillar 1 — FR-43, FR-44)."""
from datetime import datetime
import re
from typing import Any

from app.services.expert.expert_policy_config import get_completeness_rules
from app.services.expert.sla_service import TZ_VN

AI_ERROR_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("channels_disagree", re.compile(r"channels_disagree", re.IGNORECASE)),
    ("word confidence score", re.compile(r"word confidence score", re.IGNORECASE)),
    ("traceback", re.compile(r"traceback", re.IGNORECASE)),
    ("internal server error", re.compile(r"internal server error", re.IGNORECASE)),
    ("none", re.compile(r"\bnone\b", re.IGNORECASE)),
    ("null", re.compile(r"\bnull\b", re.IGNORECASE)),
    ("todo", re.compile(r"\btodo\b", re.IGNORECASE)),
    ("exception:", re.compile(r"exception:", re.IGNORECASE)),
    ("ai provider error", re.compile(r"(?:openai|gemini).*error", re.IGNORECASE)),
]


def _parse_dt_vn(raw: Any) -> datetime | None:
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return dt.replace(tzinfo=TZ_VN) if dt.tzinfo is None else dt.astimezone(TZ_VN)
    except Exception:
        return None


def find_ai_error_matches(text: str) -> list[str]:
    """Trả về danh sách từ khóa lỗi AI bị rò rỉ trong văn bản (khớp ranh giới từ)."""
    if not text:
        return []
    return [label for label, pat in AI_ERROR_PATTERNS if pat.search(text)]


def is_gibberish_text(text: str) -> bool:
    """Phát hiện chuỗi lặp ký tự vô nghĩa (ví dụ 'aaaaaaaaaa', 'zzzzzzzz')."""
    clean = (text or "").strip()
    if not clean:
        return False
    if re.search(r"(.)\1{7,}", clean):
        return True
    alnum = [c for c in clean.lower() if c.isalnum()]
    return len(alnum) >= 15 and len(set(alnum)) < 4


def _ann_sig(ann: dict[str, Any]) -> tuple[str, str, str, str, str]:
    return (
        str(ann.get("category") or "").strip(),
        str(ann.get("original_text") or "").strip(),
        str(ann.get("corrected_text") or "").strip(),
        str(ann.get("explanation") or "").strip(),
        str(ann.get("essay_id") or ann.get("response_id") or ""),
    )


def _compute_ai_diff(
    criterion_scores: list[dict[str, Any]],
    annotations: list[dict[str, Any]],
    general_feedback: str,
    overall_band: float | None,
    ai_eval: dict[str, Any] | None,
    ai_criteria: list[dict[str, Any]],
    ai_annotations: list[dict[str, Any]],
) -> dict[str, Any]:
    has_valid_ai = bool(
        ai_eval and ai_eval.get("status") != "failed" and ai_eval.get("overall_band") is not None
    )
    if not has_valid_ai or not ai_eval:
        return {
            "has_valid_ai": False,
            "ai_band": None,
            "criteria_modified_count": len(criterion_scores),
            "annotations_delta": len(annotations),
            "unchanged_vs_ai": False,
        }

    ai_crit_map = {(c.get("criterion_id"), int(c.get("task_no") or 1)): c for c in ai_criteria}
    if ai_crit_map:
        crit_mod = 0
        for cs in criterion_scores:
            key = (cs.get("criterion_id"), int(cs.get("task_no") or 1))
            ai_c = ai_crit_map.get(key)
            if not ai_c:
                crit_mod += 1
                continue
            band_diff = abs(float(cs.get("band") or 0) - float(ai_c.get("band") or 0)) >= 0.01
            comment_diff = str(cs.get("comment") or "").strip() != str(ai_c.get("comment") or "").strip()
            if band_diff or comment_diff:
                crit_mod += 1
    else:
        crit_mod = len(criterion_scores)

    exp_sigs = {_ann_sig(a) for a in annotations}
    ai_sigs = {_ann_sig(a) for a in ai_annotations}
    ann_delta = max(abs(len(annotations) - len(ai_annotations)), len(exp_sigs - ai_sigs))
    fb_changed = (general_feedback or "").strip() != str(ai_eval.get("feedback") or "").strip()
    ai_band = float(ai_eval["overall_band"])
    band_changed = overall_band is not None and abs(float(overall_band) - ai_band) >= 0.01
    unchanged = bool(crit_mod == 0 and ann_delta == 0 and not fb_changed and not band_changed and bool(ai_crit_map))

    return {
        "has_valid_ai": True,
        "ai_band": ai_band,
        "criteria_modified_count": crit_mod,
        "annotations_delta": ann_delta,
        "unchanged_vs_ai": unchanged,
    }


def validate_and_analyze_submission(
    *,
    assignment: dict[str, Any],
    skill: str,
    overall_band: float | None,
    criterion_scores: list[dict[str, Any]],
    annotations: list[dict[str, Any]],
    general_feedback: str,
    change_reason: str,
    ai_agreement_confirmed: bool,
    study_tip_note: str | None,
    ai_eval: dict[str, Any] | None,
    ai_criteria: list[dict[str, Any]],
    ai_annotations: list[dict[str, Any]],
    now_vn: datetime,
) -> dict[str, Any]:
    """Kiểm tra 5 quy tắc Completeness Gate và tính telemetry chống rubber-stamping."""
    rules = get_completeness_rules()
    min_fb = int(rules.get("min_overall_feedback_chars", 50))
    min_cnt = int(rules.get("min_criteria_count", 4))
    min_cc = int(rules.get("min_criterion_comment_chars", 20))
    min_w_ann = int(rules.get("min_writing_annotations", 1))
    exempt_band = float(rules.get("exempt_annotation_band", 8.5))
    min_reason = int(rules.get("min_change_reason_chars", 15))
    min_tip = int(rules.get("min_study_tip_chars", 30))

    violations: list[dict[str, str]] = []
    fb_clean = (general_feedback or "").strip()

    if len(fb_clean) < min_fb:
        violations.append({
            "code": "overall_feedback_too_short",
            "message": f"Nhận xét tổng quan cần tối thiểu {min_fb} ký tự trước khi nộp bài.",
        })

    if len(criterion_scores) < min_cnt or any(len(str(cs.get("comment") or "").strip()) < min_cc for cs in criterion_scores):
        violations.append({
            "code": "criteria_incomplete",
            "message": f"Vui lòng chấm đủ {min_cnt} tiêu chí và nhập nhận xét chi tiết tối thiểu {min_cc} ký tự mỗi tiêu chí.",
        })

    if skill == "writing":
        band_exempt = overall_band is not None and float(overall_band) >= exempt_band
        if not band_exempt and len(annotations) < min_w_ann:
            violations.append({
                "code": "annotations_insufficient",
                "message": f"Bài Writing (Band < {exempt_band:g}) cần ít nhất {min_w_ann} chú thích lỗi (annotation) trước khi nộp.",
            })
    elif skill == "speaking" and rules.get("require_speaking_part_feedback", True):
        if len(annotations) < 1 and len(fb_clean) < max(min_fb, 100):
            violations.append({
                "code": "speaking_evidence_insufficient",
                "message": "Bài Speaking cần ít nhất 1 ghi chú âm thanh (annotation) hoặc nhận xét tổng quan tối thiểu 100 ký tự.",
            })

    texts_to_scan = [("Nhận xét tổng quan", fb_clean), *((f"Tiêu chí {cs.get('criterion_id', '')}", str(cs.get("comment") or "")) for cs in criterion_scores)]
    if study_tip_note:
        texts_to_scan.append(("Gợi ý học tập", study_tip_note))

    bad_hits: list[str] = []
    gibberish_hit = False
    for label, txt in texts_to_scan:
        hits = find_ai_error_matches(txt)
        if hits:
            bad_hits.extend(hits)
        if is_gibberish_text(txt):
            gibberish_hit = True
    if bad_hits or gibberish_hit:
        unique_hits = sorted(set(bad_hits))
        detail = f" chứa chuỗi lỗi kỹ thuật/nháp ({', '.join(unique_hits)})" if unique_hits else " chứa ký tự lặp vô nghĩa"
        violations.append({
            "code": "invalid_text_quality",
            "message": f"Nội dung nhận xét{detail}. Vui lòng viết nhận xét chuyên môn rõ ràng.",
        })

    diff = _compute_ai_diff(
        criterion_scores, annotations, fb_clean, overall_band, ai_eval, ai_criteria, ai_annotations
    )
    agrees_with_ai = True
    if diff["ai_band"] is not None and overall_band is not None:
        if abs(float(overall_band) - float(diff["ai_band"])) >= 1.0:
            agrees_with_ai = False
            if len((change_reason or "").strip()) < min_reason:
                violations.append({
                    "code": "change_reason_required",
                    "message": f"Điểm lệch AI từ 1.0 band trở lên. Vui lòng nhập lý do giải trình tối thiểu {min_reason} ký tự.",
                })

    if diff["unchanged_vs_ai"]:
        tip_len = len((study_tip_note or "").strip())
        if not ai_agreement_confirmed or tip_len < min_tip:
            violations.append({
                "code": "ai_agreement_required",
                "message": f"Bạn giữ nguyên 100% điểm & nhận xét AI. Vui lòng xác nhận đồng thuận và bổ sung Gợi ý học tập tối thiểu {min_tip} ký tự.",
            })

    start_dt = _parse_dt_vn(assignment.get("started_at")) or _parse_dt_vn(assignment.get("assigned_at")) or now_vn
    duration_sec = max(0, int((now_vn - start_dt).total_seconds()))
    stamp_limit = int(rules.get("writing_rubber_stamp_sec" if skill == "writing" else "speaking_rubber_stamp_sec", 90 if skill == "writing" else 120))
    rubber_stamp_flag = bool(
        diff["has_valid_ai"]
        and diff["criteria_modified_count"] == 0
        and diff["annotations_delta"] == 0
        and duration_sec < stamp_limit
    )

    return {
        "passed": len(violations) == 0,
        "violations": violations,
        "agrees_with_ai": agrees_with_ai,
        "metrics": {
            "review_duration_sec": duration_sec,
            "criteria_modified_count": diff["criteria_modified_count"],
            "annotations_delta": diff["annotations_delta"],
            "rubber_stamp_flag": rubber_stamp_flag,
        },
    }
