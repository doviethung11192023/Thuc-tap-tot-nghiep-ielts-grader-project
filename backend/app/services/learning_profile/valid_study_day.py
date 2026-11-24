"""Kiểm chuẩn Ngày học hợp lệ (BR-28) & Chống cày Huy hiệu Mastery trong 24h (BR-30)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from app.db.supabase import db

from .common import get_from_cache, set_to_cache

MIN_LR_NON_EMPTY_ANSWERS = 5
MIN_WRITING_WORDS = 100
MASTERY_MIN_QUESTIONS = 20
MASTERY_COOLDOWN_SECONDS = 24 * 3600


def _valid_uuids(ids: List[str]) -> List[str]:
    out: List[str] = []
    for raw in ids:
        try:
            out.append(str(UUID(str(raw))))
        except Exception:
            continue
    return out


def _parse_utc(raw: Any) -> Optional[datetime]:
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _is_non_empty_answer(val: Any) -> bool:
    if val is None:
        return False
    if isinstance(val, str):
        return bool(val.strip())
    if isinstance(val, (list, tuple, set)):
        return any(str(x).strip() for x in val if x is not None)
    if isinstance(val, dict):
        return any(str(v).strip() for v in val.values() if v is not None)
    return bool(str(val).strip())


def load_attempt_quality_map(user_id: str, attempts: List[Dict[str, Any]]) -> Dict[str, Dict[str, int]]:
    """Batch-load số câu điền không rỗng (R/L) và tổng word_count (Writing) theo attempt_id (cache 60s)."""
    eligible = [a for a in attempts if a.get("status") in ("scored", "waiting_expert", "grading")][:120]
    if not eligible:
        return {}
    cache_key = f"quality_{user_id}:{eligible[0].get('id')}:{len(eligible)}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached

    lr_ids = _valid_uuids([a["id"] for a in eligible if str(a.get("skill") or "").lower() in ("reading", "listening")])
    w_ids = _valid_uuids([a["id"] for a in eligible if str(a.get("skill") or "").lower() == "writing"])

    qmap: Dict[str, Dict[str, int]] = {}
    if lr_ids:
        try:
            rows = db().table("answers").select("attempt_id, answer").in_("attempt_id", lr_ids).execute().data or []
            for aid in lr_ids:
                qmap.setdefault(aid, {"answered_non_empty": 0})
            for r in rows:
                aid = str(r.get("attempt_id") or "")
                if aid and _is_non_empty_answer(r.get("answer")):
                    qmap.setdefault(aid, {"answered_non_empty": 0})
                    qmap[aid]["answered_non_empty"] += 1
        except Exception:
            pass

    if w_ids:
        try:
            erows = db().table("essays").select("attempt_id, word_count").in_("attempt_id", w_ids).execute().data or []
            for aid in w_ids:
                qmap.setdefault(aid, {"word_count": 0})
            for r in erows:
                aid = str(r.get("attempt_id") or "")
                if aid:
                    qmap.setdefault(aid, {"word_count": 0})
                    qmap[aid]["word_count"] += int(r.get("word_count") or 0)
        except Exception:
            pass

    set_to_cache(cache_key, qmap, ttl_seconds=60)
    return qmap


def is_valid_study_attempt(
    att: Dict[str, Any],
    quality_map: Optional[Dict[str, Dict[str, int]]] = None,
) -> bool:
    """
    BR-28 Anti-Streak-Creep:
    - R/L: >= 5 câu trả lời không rỗng (chặn nộp trắng 0 câu)
    - Writing: tổng word_count >= 100
    - Speaking: không rơi vào no_speech / grading_failed / abandoned / in_progress
    """
    status = str(att.get("status") or "").lower()
    if status not in ("scored", "waiting_expert", "grading"):
        return False

    sk = str(att.get("skill") or "").lower()
    aid = str(att.get("id") or "")
    qinfo = (quality_map or {}).get(aid)

    if sk in ("reading", "listening"):
        if "answered_non_empty" in att and att["answered_non_empty"] is not None:
            return int(att["answered_non_empty"]) >= MIN_LR_NON_EMPTY_ANSWERS
        if qinfo is not None and "answered_non_empty" in qinfo:
            return int(qinfo["answered_non_empty"]) >= MIN_LR_NON_EMPTY_ANSWERS
        # Fallback an toàn cho fixture không có DB answers: yêu cầu có điểm hoặc đủ câu hỏi
        raw = att.get("raw_score")
        band = att.get("band")
        if raw is not None and float(raw) <= 0 and (band is None or float(band) <= 0):
            return False
        return True

    if sk == "writing":
        if "word_count" in att and att["word_count"] is not None:
            return int(att["word_count"]) >= MIN_WRITING_WORDS
        if qinfo is not None and "word_count" in qinfo:
            return int(qinfo["word_count"]) >= MIN_WRITING_WORDS
        return True

    if sk == "speaking":
        return status in ("scored", "waiting_expert", "grading")

    return True


def filter_mastery_attempts_anti_farm(scored_attempts: List[Dict[str, Any]]) -> set[str]:
    """
    BR-30 Anti-Farming: Các lượt làm cùng test_id trong vòng 24h chỉ tính đúng 1 lần vào huy hiệu Mastery.
    Các đề khác nhau luôn được tính đầy đủ.
    """
    ordered = sorted(
        scored_attempts,
        key=lambda a: _parse_utc(a.get("submitted_at") or a.get("started_at")) or datetime.min.replace(tzinfo=timezone.utc),
    )
    last_by_test: Dict[str, datetime] = {}
    allowed_ids: set[str] = set()
    for a in ordered:
        aid = str(a.get("id") or "")
        tid = str(a.get("test_id") or "")
        ts = _parse_utc(a.get("submitted_at") or a.get("started_at"))
        if not tid or ts is None:
            if aid:
                allowed_ids.add(aid)
            continue
        prev = last_by_test.get(tid)
        if prev is None or (ts - prev).total_seconds() >= MASTERY_COOLDOWN_SECONDS:
            if aid:
                allowed_ids.add(aid)
            last_by_test[tid] = ts
    return allowed_ids


def count_mastered_lr_types(
    scored_attempts: List[Dict[str, Any]],
    answers: List[Dict[str, Any]],
    min_accuracy_pct: float = 80.0,
    min_questions: int = MASTERY_MIN_QUESTIONS,
) -> Tuple[int, List[Dict[str, Any]]]:
    """Đếm các dạng bài L/R đạt >= min_accuracy_pct trên >= min_questions câu hợp lệ (đã lọc BR-30)."""
    allowed_ids = filter_mastery_attempts_anti_farm(scored_attempts)
    att_skill = {str(a["id"]): str(a.get("skill") or "").lower() for a in scored_attempts if a.get("id")}
    buckets: Dict[Tuple[str, str], Dict[str, int]] = {}
    for ans in answers:
        aid = str(ans.get("attempt_id") or "")
        if aid not in allowed_ids:
            continue
        sk = att_skill.get(aid, "")
        if sk not in ("listening", "reading"):
            continue
        qtype = str(ans.get("question_type") or "other")
        b = buckets.setdefault((sk, qtype), {"total": 0, "correct": 0})
        b["total"] += 1
        if ans.get("is_correct") is True:
            b["correct"] += 1

    mastered: List[Dict[str, Any]] = []
    for (sk, qtype), b in buckets.items():
        if b["total"] >= min_questions:
            acc = round((b["correct"] / b["total"]) * 100.0, 1)
            if acc >= min_accuracy_pct:
                mastered.append({"skill": sk, "question_type": qtype, "total": b["total"], "accuracy": acc})
    return len(mastered), mastered
