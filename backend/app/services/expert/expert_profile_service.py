"""Hồ sơ Expert: đọc hồ sơ, chỉ số hiệu suất 30 ngày và cập nhật trạng thái khả dụng nhận bài.

Tách khỏi route để luật nghiệp vụ (khoá khi cooldown/suspended, trần theo hạng) test được không cần HTTP.
Lỗi ném bằng DomainError; handler đăng ký ở app.main đổi sang JSON {"detail": ...} với đúng status cũ.
"""
from datetime import datetime, timezone
from typing import Any

from app.core.domain_errors import (
    ForbiddenError,
    InternalFailureError,
    InvalidRequestError,
    NotFoundError,
)
from app.db.supabase import db
from app.schemas.expert import ExpertProfileResponse
from app.services.expert.expert_policy_config import TIER_MAX_CAP
from app.services.expert.expert_tier_evaluation_service import compute_expert_performance_metrics
from app.services.expert.sla_service import TZ_VN


def get_expert_profile(expert_id: str) -> ExpertProfileResponse:
    """Hồ sơ Expert + số bài đang được phân công + tóm tắt hiệu suất (hạng lấy từ tính toán mới nhất)."""
    user_res = db().table("profiles").select("id, email, full_name, avatar_key, created_at").eq("id", expert_id).execute()
    if not user_res.data:
        raise NotFoundError("User not found")
    user_data = {**user_res.data[0], "avatar_url": user_res.data[0].get("avatar_key")}

    profile_res = db().table("expert_profiles").select("*").eq("user_id", expert_id).execute()
    if not profile_res.data:
        raise NotFoundError("Expert profile not found")
    expert_data = profile_res.data[0]

    count_res = db().table("review_assignments").select("id", count="exact") \
        .eq("expert_id", expert_id).is_("ended_at", "null").execute()
    active_count = count_res.count if getattr(count_res, "count", None) is not None else len(count_res.data or [])

    perf_summary = compute_expert_performance_metrics([expert_id]).get(expert_id)
    tier = str((perf_summary or {}).get("tier") or expert_data.get("tier") or "standard")
    return ExpertProfileResponse(
        user_id=user_data["id"],
        email=user_data["email"],
        full_name=user_data.get("full_name"),
        avatar_url=user_data.get("avatar_url"),
        is_available=expert_data.get("is_available", False),
        max_active_reviews=expert_data.get("max_active_reviews", 5),
        bio=expert_data.get("bio"),
        active_reviews_count=active_count,
        created_at=user_data.get("created_at"),
        tier=tier,
        tier_max_reviews=TIER_MAX_CAP.get(tier, 5),
        cooldown_until=expert_data.get("cooldown_until"),
        consecutive_clean_reviews=int(expert_data.get("consecutive_clean_reviews") or 0),
        is_suspended_by_penalty=bool(expert_data.get("is_suspended_by_penalty", False)),
        rps_summary=perf_summary,
        performance_summary=perf_summary,
    )


def get_expert_performance(expert_id: str) -> dict[str, Any]:
    """6 chỉ số hiệu suất 30 ngày, tiến độ lên hạng, cảnh báo vi phạm và 6 snapshot tháng gần nhất."""
    metrics = compute_expert_performance_metrics([expert_id], period="30d").get(expert_id) or {}
    snapshots = (
        db().table("expert_performance_snapshots")
        .select("*")
        .eq("expert_id", expert_id)
        .order("period_start", desc=True)
        .limit(6)
        .execute()
        .data
        or []
    )
    return {**metrics, "snapshots": snapshots, "tier_max_cap": TIER_MAX_CAP}


def _parse_cooldown(raw: Any) -> datetime | None:
    """Đổi cooldown_until sang datetime UTC; giá trị hỏng coi như không có cooldown."""
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)
    except Exception:
        return None


def update_expert_availability(expert_id: str, fields_to_update: dict[str, Any]) -> ExpertProfileResponse:
    """Cập nhật khả dụng / giới hạn bài / bio. Chặn bật nhận bài khi đang bị tạm ngưng hoặc đang cooldown,
    và chặn vượt trần số bài đồng thời của hạng hiện tại."""
    if not fields_to_update:
        raise InvalidRequestError("No fields to update")

    ep_res = db().table("expert_profiles").select("*").eq("user_id", expert_id).limit(1).execute()
    if not ep_res.data:
        raise NotFoundError("Expert profile not found")
    ep = ep_res.data[0]
    tier = str(ep.get("tier") or "standard")
    tier_cap = TIER_MAX_CAP.get(tier, 5)
    now_utc = datetime.now(timezone.utc)
    cd_dt = _parse_cooldown(ep.get("cooldown_until"))

    if fields_to_update.get("is_available") is True:
        if ep.get("is_suspended_by_penalty"):
            raise ForbiddenError("Tài khoản đang tạm ngưng điều phối do vi phạm SLA. Vui lòng liên hệ Admin để xem xét.")
        if cd_dt and cd_dt > now_utc:
            until_vn = cd_dt.astimezone(TZ_VN).strftime("%H:%M %d/%m/%Y")
            raise ForbiddenError(f"Tài khoản đang trong thời gian tạm nghỉ điều phối đến {until_vn} (GMT+7).")

    if "max_active_reviews" in fields_to_update and fields_to_update["max_active_reviews"] is not None:
        if int(fields_to_update["max_active_reviews"]) > tier_cap:
            raise InvalidRequestError(f"Hạng hiện tại ({tier}) chỉ cho phép nhận tối đa {tier_cap} bài đồng thời.")

    res = db().table("expert_profiles").update(fields_to_update).eq("user_id", expert_id).execute()
    if not res.data:
        raise InternalFailureError("Failed to update expert profile")

    return get_expert_profile(expert_id)
