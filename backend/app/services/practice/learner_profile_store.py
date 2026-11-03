"""
Hồ sơ, mục tiêu và tiến độ của người dùng (UC-04, UC-05, FR-06/07) cho UserProfileResponse,
LearnerGoalResponse, UserProgressResponse.

profiles(full_name, avatar_key, role learner|expert|admin) + learner_profiles(target_*,
test_date, voice_consent_at). Không còn is_activated: kích hoạt tài khoản do Supabase Auth lo.
"""
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException

from app.db.supabase import db

GOAL_FIELDS = ("target_overall", "target_listening", "target_reading", "target_writing", "target_speaking", "test_date")


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
            raise HTTPException(status_code=403, detail="Chỉ Learner mới cần đồng ý ghi âm")
    if not changes and voice_consent is None:
        raise HTTPException(status_code=400, detail="No fields to update")
    return get_profile(user_id)


def get_goals(user_id: str) -> Optional[dict[str, Any]]:
    rows = db().table("learner_profiles").select("user_id, " + ", ".join(GOAL_FIELDS)).eq("user_id", user_id).execute().data
    if not rows or all(rows[0].get(f) is None for f in GOAL_FIELDS):
        return None
    return {**rows[0], "updated_at": None}


def save_goals(user_id: str, goals: dict[str, Any]) -> dict[str, Any]:
    payload = {k: v for k, v in goals.items() if k in GOAL_FIELDS}
    res = db().table("learner_profiles").update(payload).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=403, detail="Chỉ Learner mới đặt mục tiêu IELTS")
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
