"""
Hồ sơ, mục tiêu và tiến độ của người dùng (UC-04, UC-05, FR-06/07) cho UserProfileResponse,
LearnerGoalResponse, UserProgressResponse.

profiles(full_name, avatar_key, role learner|expert|admin) + learner_profiles(target_*,
test_date, voice_consent_at). Không còn is_activated: kích hoạt tài khoản do Supabase Auth lo.
"""
from datetime import date, datetime, timedelta, timezone
import math
from typing import Any, Optional

from app.core.domain_errors import ForbiddenError, InvalidRequestError

from app.db.supabase import db

GOAL_FIELDS = ("input_band", "target_overall", "target_listening", "target_reading", "target_writing", "target_speaking", "test_date")
BAND_GOAL_FIELDS = ("input_band", "target_overall", "target_listening", "target_reading", "target_writing", "target_speaking")
VN_TZ = timezone(timedelta(hours=7))


def _validate_goal_payload(goals: dict[str, Any]) -> dict[str, Any]:
    """Kiểm duyệt chặt band (bội 0.5, chống hack huy hiệu) và ngày thi hợp lệ (GMT+7)."""
    payload: dict[str, Any] = {}
    for k in BAND_GOAL_FIELDS:
        if k not in goals or goals[k] is None:
            continue
        raw = float(goals[k])
        if not math.isfinite(raw):
            raise InvalidRequestError(f"Giá trị {k} không hợp lệ")
        lo = 1.0 if k == "input_band" else 4.0
        if raw < lo or raw > 9.0:
            raise InvalidRequestError(f"{k} phải nằm trong khoảng {lo:.1f} đến 9.0")
        payload[k] = round(raw * 2.0) / 2.0
    if "input_band" in payload and "target_overall" in payload and payload["target_overall"] < payload["input_band"]:
        raise InvalidRequestError("Mục tiêu tổng (target_overall) không thể thấp hơn trình độ đầu vào (input_band)")
    if "test_date" in goals and goals["test_date"] is not None:
        raw_d = str(goals["test_date"]).strip()
        if raw_d == "":
            payload["test_date"] = None
        else:
            try:
                parsed = date.fromisoformat(raw_d[:10])
            except ValueError:
                raise InvalidRequestError("Ngày thi phải đúng định dạng YYYY-MM-DD")
            today_vn = datetime.now(VN_TZ).date()
            if parsed < today_vn:
                raise InvalidRequestError("Ngày thi dự kiến không được nằm trong quá khứ")
            if parsed > today_vn + timedelta(days=365 * 5):
                raise InvalidRequestError("Ngày thi dự kiến tối đa trong vòng 5 năm tới")
            payload["test_date"] = parsed.isoformat()
    if not payload:
        raise InvalidRequestError("Không có trường mục tiêu hợp lệ để cập nhật")
    return payload


def get_profile(user_id: str) -> Optional[dict[str, Any]]:
    rows = db().table("profiles").select("id, email, full_name, avatar_key, role, is_active, created_at") \
        .eq("id", user_id).execute().data
    if not rows:
        return None
    p = rows[0]
    learner = db().table("learner_profiles").select("voice_consent_at").eq("user_id", user_id).execute().data
    return {
        "id": p["id"], "email": p["email"], "full_name": p["full_name"], "avatar_url": p.get("avatar_key"),
        "role": p["role"], "is_active": p["is_active"], "is_activated": True,
        "voice_consent_at": learner[0]["voice_consent_at"] if learner else None, "created_at": p["created_at"],
    }


def update_profile(user_id: str, full_name: Optional[str], avatar_url: Optional[str],
                   voice_consent: Optional[bool]) -> dict[str, Any]:
    changes = {k: v for k, v in (("full_name", full_name), ("avatar_key", avatar_url)) if v is not None}
    if changes:
        db().table("profiles").update(changes).eq("id", user_id).execute()
    if voice_consent is not None:          # FR-38 / NFR-07: thời điểm đồng ý ghi âm là bằng chứng
        res = db().table("learner_profiles").update({
            "voice_consent_at": datetime.now(timezone.utc).isoformat() if voice_consent else None,
        }).eq("user_id", user_id).execute()
        if not res.data:
            raise ForbiddenError("Chỉ Learner mới cần đồng ý ghi âm")
    if not changes and voice_consent is None:
        raise InvalidRequestError("No fields to update")
    return get_profile(user_id)


def get_goals(user_id: str) -> Optional[dict[str, Any]]:
    rows = db().table("learner_profiles").select("user_id, " + ", ".join(GOAL_FIELDS)).eq("user_id", user_id).execute().data
    if not rows or all(rows[0].get(f) is None for f in GOAL_FIELDS):
        return None
    return {**rows[0], "updated_at": None}


def save_goals(user_id: str, goals: dict[str, Any]) -> dict[str, Any]:
    payload = _validate_goal_payload(goals)
    res = db().table("learner_profiles").update(payload).eq("user_id", user_id).execute()
    if not res.data:
        raise ForbiddenError("Chỉ Learner mới đặt mục tiêu IELTS")
    return res.data[0]


def writing_progress(user_id: str) -> dict[str, Any]:
    """Thống kê Writing: số bài đã nộp, trung bình/ cao nhất theo kết quả chính thức."""
    attempts = db().table("attempt_results").select("attempt_id, band, submitted_at, status") \
        .eq("learner_id", user_id).eq("skill", "writing").not_.in_("status", ["in_progress", "abandoned"]) \
        .order("submitted_at", desc=True).execute().data or []
    graded = [a for a in attempts if a.get("band") is not None]
    sums = {"TA": [], "TR": [], "CC": [], "LR": [], "GRA": []}
    eval_ids = [e["id"] for e in db().table("evaluations").select("id").in_("attempt_id", [a["attempt_id"] for a in graded])
                .eq("is_official", True).execute().data or []] if graded else []
    if eval_ids:
        for s in db().table("criterion_scores").select("band, criteria(code)").in_("evaluation_id", eval_ids).execute().data or []:
            sums[s["criteria"]["code"]].append(float(s["band"]))

    def avg(values):
        return round(sum(values) / len(values), 2) if values else 0.0
    bands = [float(a["band"]) for a in graded]
    return {
        "total_essays": len(attempts), "avg_overall_band": avg(bands),
        "avg_tr_score": avg(sums["TA"] + sums["TR"]), "avg_cc_score": avg(sums["CC"]),
        "avg_lr_score": avg(sums["LR"]), "avg_gra_score": avg(sums["GRA"]),
        "best_overall_band": max(bands) if bands else 0.0,
        "last_submission_at": attempts[0]["submitted_at"] if attempts else None,
    }
