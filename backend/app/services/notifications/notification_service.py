"""Dịch vụ quản lý và phát sinh thông báo (AI grading, Expert dispatch, Expert completion)."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.db.supabase import db

logger = logging.getLogger(__name__)

_SKILL_LABELS = {
    "writing": "Writing",
    "speaking": "Speaking",
    "reading": "Reading",
    "listening": "Listening",
}


def _summary_url(skill: Optional[str], test_id: Optional[str], attempt_id: Optional[str]) -> Optional[str]:
    if not skill or not test_id or not attempt_id:
        return None
    return f"/test-practice/{skill}/{test_id}/summary?attemptId={attempt_id}"


def _attempt_context(attempt_id: str) -> Dict[str, Any]:
    rows = (
        db().table("attempts")
        .select("id, learner_id, skill, test_id")
        .eq("id", attempt_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        return {}
    att = rows[0]
    title = "Bài thi IELTS"
    if att.get("test_id"):
        trows = db().table("tests").select("title").eq("id", att["test_id"]).limit(1).execute().data or []
        if trows and trows[0].get("title"):
            title = trows[0]["title"]
    return {**att, "test_title": title}


def create_notification(
    *,
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    action_url: Optional[str] = None,
    skill: Optional[str] = None,
    attempt_id: Optional[str] = None,
    essay_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """Tạo thông báo mới trong DB; không làm gián đoạn luồng chính nếu gặp lỗi."""
    if not user_id:
        return None
    try:
        payload = {
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "action_url": action_url,
            "skill": skill,
            "attempt_id": attempt_id,
            "essay_id": essay_id,
            "metadata": metadata or {},
        }
        res = db().table("notifications").insert(payload).execute()
        return (res.data or [None])[0]
    except Exception as exc:
        logger.warning("Failed to create notification (%s) for user %s: %s", notification_type, user_id, exc)
        return None


def notify_ai_grading_result(
    attempt_id: str,
    *,
    success: bool,
    band: Optional[float] = None,
    attempt_status: str = "grading_failed",
) -> None:
    """Phát thông báo cho Học viên khi AI chấm xong hoặc gặp lỗi."""
    try:
        ctx = _attempt_context(attempt_id)
        learner_id = ctx.get("learner_id")
        if not learner_id:
            return
        skill = ctx.get("skill")
        skill_label = _SKILL_LABELS.get(skill or "", "IELTS")
        test_title = ctx.get("test_title") or f"Bài thi {skill_label}"
        action_url = _summary_url(skill, ctx.get("test_id"), attempt_id)

        if success:
            band_text = f" (Band {band:.1f})" if band is not None else ""
            create_notification(
                user_id=learner_id,
                notification_type="ai_complete",
                title=f"AI đã chấm xong bài {skill_label}{band_text}",
                message=f"Bài \"{test_title}\" đã có kết quả đánh giá ước lượng từ AI.",
                action_url=action_url,
                skill=skill,
                attempt_id=attempt_id,
                metadata={"band": band, "source": "ai"},
            )
            return

        title = (
            f"Không phát hiện giọng nói trong bài {skill_label}"
            if attempt_status == "no_speech"
            else f"Chấm AI bài {skill_label} gặp sự cố"
        )
        msg = (
            f"Bài \"{test_title}\" chưa nhận diện được giọng nói rõ ràng. Vui lòng kiểm tra lại bản ghi."
            if attempt_status == "no_speech"
            else f"Hệ thống chưa thể hoàn tất chấm AI cho \"{test_title}\". Bạn có thể vào trang kết quả để thử chấm lại."
        )
        create_notification(
            user_id=learner_id,
            notification_type="ai_failed",
            title=title,
            message=msg,
            action_url=action_url,
            skill=skill,
            attempt_id=attempt_id,
            metadata={"attempt_status": attempt_status},
        )
    except Exception as exc:
        logger.warning("notify_ai_grading_result failed for attempt %s: %s", attempt_id, exc)


def notify_expert_requested(attempt_id: str, learner_id: str) -> None:
    """Xác nhận đã tiếp nhận yêu cầu Chuyên gia thẩm định cho Học viên."""
    try:
        ctx = _attempt_context(attempt_id)
        skill = ctx.get("skill")
        skill_label = _SKILL_LABELS.get(skill or "", "IELTS")
        test_title = ctx.get("test_title") or f"Bài thi {skill_label}"
        create_notification(
            user_id=learner_id,
            notification_type="expert_requested",
            title=f"Đã gửi yêu cầu Chuyên gia chấm bài {skill_label}",
            message=f"Bài \"{test_title}\" đã vào hàng đợi thẩm định (SLA tối đa 48 giờ làm việc).",
            action_url=_summary_url(skill, ctx.get("test_id"), attempt_id),
            skill=skill,
            attempt_id=attempt_id,
        )
    except Exception as exc:
        logger.warning("notify_expert_requested failed for attempt %s: %s", attempt_id, exc)


def notify_expert_assigned(
    *,
    assignment_id: Optional[str],
    attempt_id: str,
    expert_id: str,
    reassigned: bool = False,
) -> None:
    """Thông báo cho Chuyên gia khi được hệ thống hoặc Admin giao bài mới."""
    try:
        ctx = _attempt_context(attempt_id)
        skill = ctx.get("skill")
        skill_label = _SKILL_LABELS.get(skill or "", "IELTS")
        test_title = ctx.get("test_title") or f"Bài thi {skill_label}"
        action_url = f"/expert/assignments/{assignment_id}" if assignment_id else "/expert/assignments"
        notif_type = "expert_reassigned" if reassigned else "expert_assigned"
        title = (
            f"Admin vừa điều phối cho bạn bài {skill_label} mới"
            if reassigned
            else f"Bạn có bài {skill_label} mới cần chấm"
        )
        create_notification(
            user_id=expert_id,
            notification_type=notif_type,
            title=title,
            message=f"Bài \"{test_title}\" đang chờ bạn thẩm định trong hàng đợi.",
            action_url=action_url,
            skill=skill,
            attempt_id=attempt_id,
            metadata={"assignment_id": assignment_id, "reassigned": reassigned},
        )
    except Exception as exc:
        logger.warning("notify_expert_assigned failed for attempt %s: %s", attempt_id, exc)


def notify_expert_completed(attempt_id: str, overall_band: Optional[float]) -> None:
    """Thông báo cho Học viên ngay khi Chuyên gia ký duyệt điểm chính thức."""
    try:
        ctx = _attempt_context(attempt_id)
        learner_id = ctx.get("learner_id")
        if not learner_id:
            return
        skill = ctx.get("skill")
        skill_label = _SKILL_LABELS.get(skill or "", "IELTS")
        test_title = ctx.get("test_title") or f"Bài thi {skill_label}"
        band_text = f" — Band {overall_band:.1f}" if overall_band is not None else ""
        create_notification(
            user_id=learner_id,
            notification_type="expert_complete",
            title=f"Chuyên gia đã chấm xong bài {skill_label}{band_text}",
            message=f"Kết quả chính thức cho \"{test_title}\" đã sẵn sàng. Nhấn để xem nhận xét chi tiết.",
            action_url=_summary_url(skill, ctx.get("test_id"), attempt_id),
            skill=skill,
            attempt_id=attempt_id,
            metadata={"band": overall_band, "source": "expert"},
        )
    except Exception as exc:
        logger.warning("notify_expert_completed failed for attempt %s: %s", attempt_id, exc)


def list_user_notifications(
    user_id: str,
    *,
    limit: int = 30,
    unread_only: bool = False,
) -> Dict[str, Any]:
    """Lấy danh sách thông báo gần nhất và tổng số chưa đọc của user."""
    query = (
        db().table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(max(1, min(limit, 50)))
    )
    if unread_only:
        query = query.eq("is_read", False)
    items: List[Dict[str, Any]] = query.execute().data or []

    unread_res = (
        db().table("notifications")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("is_read", False)
        .execute()
    )
    unread_count = (
        unread_res.count
        if getattr(unread_res, "count", None) is not None
        else len(unread_res.data or [])
    )
    return {"items": items, "unread_count": unread_count}


def mark_notification_read(user_id: str, notification_id: str) -> Optional[Dict[str, Any]]:
    res = (
        db().table("notifications")
        .update({"is_read": True})
        .eq("id", notification_id)
        .eq("user_id", user_id)
        .execute()
    )
    return (res.data or [None])[0]


def mark_all_notifications_read(user_id: str) -> int:
    res = (
        db().table("notifications")
        .update({"is_read": True})
        .eq("user_id", user_id)
        .eq("is_read", False)
        .execute()
    )
    return len(res.data or [])
