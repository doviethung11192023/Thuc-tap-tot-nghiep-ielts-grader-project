"""
Dịch vụ Quản lý Hạn mức và Suất chấm Chuyên gia (Expert Quota Manager).
Tuân thủ BR-15, BR-16, BR-20 trong docs/source-of-truth.md:
- BR-15: Mỗi Học viên tối đa 2 bài Mock được Expert chấm mỗi tuần lịch (Thứ 2 00:00 GMT+7).
- BR-16: Mỗi Học viên tối đa 3 bài Practice xin chấm lại mỗi tuần lịch.
- BR-20: Suất chung toàn hệ thống mỗi tuần lịch (expert_weekly_capacity trong system_settings, mặc định 50).
"""

from datetime import datetime, timedelta
import zoneinfo
import json
from typing import Dict, Any, Optional
from app.db.supabase import db
import logging

logger = logging.getLogger(__name__)

TZ_VN = zoneinfo.ZoneInfo("Asia/Ho_Chi_Minh")

def get_current_week_start(now_dt: Optional[datetime] = None) -> datetime:
    """Lấy thời điểm 00:00:00 Thứ Hai của tuần lịch hiện tại theo giờ Việt Nam (GMT+7)."""
    if now_dt is None:
        now_dt = datetime.now(TZ_VN)
    elif now_dt.tzinfo is None:
        now_dt = now_dt.replace(tzinfo=TZ_VN)
    else:
        now_dt = now_dt.astimezone(TZ_VN)

    days_since_monday = now_dt.weekday()
    return (now_dt - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)

async def get_system_capacity_settings() -> Dict[str, int]:
    """Lấy cấu hình hạn mức từ bảng system_settings."""
    try:
        res = db().table("system_settings").select("key, value").in_("key", [
            "expert_weekly_capacity", 
            "mock_expert_weekly_quota", 
            "practice_review_weekly_quota"
        ]).execute()
        
        settings_map = {item["key"]: item["value"] for item in (res.data or [])}
        return {
            "expert_weekly_capacity": int(settings_map.get("expert_weekly_capacity", 50)),
            "mock_expert_weekly_quota": int(settings_map.get("mock_expert_weekly_quota", 2)),
            "practice_review_weekly_quota": int(settings_map.get("practice_review_weekly_quota", 3))
        }
    except Exception as e:
        logger.warning(f"[QuotaManager] Lỗi đọc system_settings: {e}")
        return {
            "expert_weekly_capacity": 50,
            "mock_expert_weekly_quota": 2,
            "practice_review_weekly_quota": 3
        }

async def get_learner_quota_status(learner_id: str, redis_client: Any = None) -> Dict[str, Any]:
    """
    Kiểm tra toàn diện tình trạng hạn mức của học viên trong tuần lịch hiện tại:
    - Số lượt Mock đã dùng / còn lại (BR-15).
    - Số lượt Practice đã xin chấm lại / còn lại (BR-16).
    - Suất chung toàn trường còn hay hết (BR-20).
    """
    week_start = get_current_week_start()
    week_start_iso = week_start.isoformat()
    caps = await get_system_capacity_settings()

    # 1. Đếm số yêu cầu của chính learner từ đầu tuần
    req_res = db().table("review_request_details") \
        .select("request_id, source, status, requested_at") \
        .eq("learner_id", learner_id) \
        .gte("requested_at", week_start_iso) \
        .execute()
    
    mock_used = sum(1 for r in (req_res.data or []) if r.get("source") == "mock")
    practice_used = sum(1 for r in (req_res.data or []) if r.get("source") == "practice")

    # 2. Đếm số suất giữ chỗ tạm thời trên Redis của learner (nếu đang trong phòng thi Mock)
    active_reservations = 0
    if redis_client and hasattr(redis_client, "keys"):
        try:
            pattern = f"mock_reserve:{learner_id}:*"
            keys = await redis_client.keys(pattern)
            active_reservations = len(keys) if keys else 0
        except Exception:
            pass

    # 3. Đếm tổng số bài đã nhận chấm trên toàn trường trong tuần
    school_total_res = db().table("review_requests") \
        .select("id", count="exact") \
        .gte("requested_at", week_start_iso) \
        .execute()
    
    school_used = school_total_res.count if getattr(school_total_res, "count", None) is not None else len(school_total_res.data or [])

    mock_remaining = max(0, caps["mock_expert_weekly_quota"] - mock_used - active_reservations)
    practice_remaining = max(0, caps["practice_review_weekly_quota"] - practice_used)
    school_capacity_left = max(0, caps["expert_weekly_capacity"] - school_used)

    return {
        "week_start": week_start_iso,
        "mock_quota": caps["mock_expert_weekly_quota"],
        "mock_used": mock_used,
        "mock_reserved": active_reservations,
        "mock_remaining": mock_remaining,
        "practice_quota": caps["practice_review_weekly_quota"],
        "practice_used": practice_used,
        "practice_remaining": practice_remaining,
        "school_weekly_capacity": caps["expert_weekly_capacity"],
        "school_capacity_left": school_capacity_left,
        "can_reserve_mock": (mock_remaining > 0 and school_capacity_left > 0),
        "can_request_practice": (practice_remaining > 0 and school_capacity_left > 0)
    }

async def reserve_mock_expert_slot(learner_id: str, attempt_id: str, redis_client: Any, ttl_seconds: int = 7200) -> bool:
    """
    Giữ chỗ 1 suất chấm Expert khi Học viên bắt đầu làm bài Mock Writing/Speaking (BR-15).
    Sử dụng Redis Key có TTL (mặc định 2 giờ = 7200s).
    """
    if not redis_client or not hasattr(redis_client, "set"):
        return True # Fallback an toàn nếu Redis không chạy

    status = await get_learner_quota_status(learner_id, redis_client)
    if not status["can_reserve_mock"]:
        return False

    reserve_key = f"mock_reserve:{learner_id}:{attempt_id}"
    payload = json.dumps({
        "learner_id": learner_id,
        "attempt_id": attempt_id,
        "reserved_at": datetime.now(TZ_VN).isoformat()
    })
    await redis_client.setex(reserve_key, ttl_seconds, payload)
    return True

async def release_mock_expert_slot(learner_id: str, attempt_id: str, redis_client: Any) -> None:
    """Nhả chỗ nếu học viên thoát khỏi phòng thi hoặc huỷ bài (abandoned)."""
    if redis_client and hasattr(redis_client, "delete"):
        reserve_key = f"mock_reserve:{learner_id}:{attempt_id}"
        await redis_client.delete(reserve_key)

async def confirm_mock_submission_slot(learner_id: str, attempt_id: str, skill: str, redis_client: Any) -> bool:
    """
    Khi nộp bài Mock:
    1. Kiểm tra nếu có giữ chỗ trong Redis.
    2. Tạo bản ghi review_requests (status='waiting').
    3. Xóa key giữ chỗ tạm trong Redis.
    """
    reserve_key = f"mock_reserve:{learner_id}:{attempt_id}"
    had_reservation = False
    if redis_client and hasattr(redis_client, "get"):
        val = await redis_client.get(reserve_key)
        if val:
            had_reservation = True
            await redis_client.delete(reserve_key)
    else:
        # Nếu không có redis, kiểm tra quota trực tiếp
        status = await get_learner_quota_status(learner_id, redis_client)
        had_reservation = status["can_reserve_mock"]

    if not had_reservation:
        return False

    # Thêm vào bảng review_requests
    db().table("review_requests").insert({
        "attempt_id": attempt_id,
        "learner_id": learner_id,
        "skill": skill,
        "status": "waiting"
    }).execute()
    return True
