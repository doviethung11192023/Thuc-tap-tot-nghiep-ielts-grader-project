"""
Endpoints dành cho Học viên tương tác với Phân hệ Chuyên gia (Expert Quota & Review Requests).
Tuân thủ BR-15, BR-16, BR-20 trong docs/source-of-truth.md.
"""

import logging

from fastapi import APIRouter, Depends, Request
from fastapi.concurrency import run_in_threadpool
from app.core.security import User, require_learner, get_optional_user
from app.schemas.expert import ExpertHelpfulnessRatingRequest, LearnerQuotaResponse
from app.services.expert.quota_manager import (
    get_learner_quota_status,
    reserve_mock_expert_slot,
    release_mock_expert_slot
)
from app.services.expert.dispatcher import auto_dispatch_pending_requests
from app.services.notifications.notification_service import notify_expert_requested
from app.services.practice.practice_attempt_lifecycle import get_owned_attempt
from app.services.expert import learner_expert_review_service as review_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/expert-quota", response_model=LearnerQuotaResponse)
async def get_learner_quota(request: Request, current_user: User = Depends(require_learner)):
    """Lấy số lượt Mock, Practice còn lại và hạn mức toàn trường trong tuần lịch hiện tại (BR-15, 16, 20)."""
    status_data = await get_learner_quota_status(current_user.id, getattr(request.app.state, "redis", None))
    return LearnerQuotaResponse(**status_data)

@router.post("/attempts/{attempt_id}/reserve-mock-slot")
async def reserve_mock_slot(
    attempt_id: str, 
    request: Request, 
    current_user: User = Depends(require_learner)
):
    """Giữ chỗ 1 suất chấm Chuyên gia khi bắt đầu bài thi Mock (BR-15)."""
    success = await reserve_mock_expert_slot(
        learner_id=current_user.id,
        attempt_id=attempt_id,
        redis_client=getattr(request.app.state, "redis", None)
    )
    if not success:
        return {
            "reserved": False,
            "message": "Không còn suất chấm Chuyên gia trong tuần này. Bạn vẫn có thể làm bài thi và nhận điểm AI."
        }
    return {
        "reserved": True,
        "message": "Đã bảo lưu thành công suất chấm Chuyên gia cho bài thi Mock này."
    }

@router.post("/attempts/{attempt_id}/release-mock-slot")
async def release_mock_slot(
    attempt_id: str, 
    request: Request, 
    current_user: User = Depends(require_learner)
):
    """Nhả suất chấm Chuyên gia nếu học viên bỏ dở bài thi Mock (abandoned)."""
    await release_mock_expert_slot(
        learner_id=current_user.id,
        attempt_id=attempt_id,
        redis_client=getattr(request.app.state, "redis", None)
    )
    return {"status": "released"}

@router.post("/attempts/{attempt_id}/request-expert-review")
async def request_practice_expert_review(
    attempt_id: str, 
    request: Request, 
    current_user: User = Depends(require_learner)
):
    """
    Học viên chủ động xin Chuyên gia chấm lại bài Practice sau khi đã có điểm AI (BR-16).
    - Tối đa 3 bài Practice mỗi tuần lịch.
    - Phải còn suất chung toàn trường (BR-20).
    - Bài phải ở chế độ Practice, đã nộp và đã có điểm AI.
    - Mỗi attempt chỉ có tối đa 1 yêu cầu đang mở (ràng buộc 11).
    """
    attempt = await run_in_threadpool(review_service.validate_practice_review_request, attempt_id, current_user.id)

    # Kiểm tra hạn mức tuần
    quota_status = await get_learner_quota_status(current_user.id, getattr(request.app.state, "redis", None))
    review_service.ensure_practice_quota_available(quota_status)

    request_id = await run_in_threadpool(
        review_service.create_waiting_review_request, attempt_id, attempt["skill"], current_user.id
    )

    notify_expert_requested(attempt_id, current_user.id)

    # Tự động gán ngay nếu có Chuyên gia rảnh
    try:
        await auto_dispatch_pending_requests()
    except Exception as e:
        logger.warning("[Dispatcher] Warning on auto dispatch: %s", e)

    return {
        "status": "waiting",
        "request_id": request_id,
        "message": "Đã gửi yêu cầu thẩm định Chuyên gia thành công (SLA hoàn tất trong 48 giờ làm việc)"
    }


@router.get("/attempts/{attempt_id}/expert-rating")
def get_expert_helpfulness_rating(
    attempt_id: str,
    current_user: User = Depends(require_learner),
):
    """Kiểm tra học viên đã gửi đánh giá mức độ hữu ích cho bài chấm Chuyên gia hay chưa."""
    return review_service.get_helpfulness_rating(attempt_id, current_user.id)


@router.post("/attempts/{attempt_id}/expert-rating")
def submit_expert_helpfulness_rating(
    attempt_id: str,
    payload: ExpertHelpfulnessRatingRequest,
    current_user: User = Depends(require_learner),
):
    """Học viên đánh giá ẩn danh mức độ hữu ích của nhận xét Chuyên gia (1 lần/attempt — FR-52, UC-44)."""
    return review_service.submit_helpfulness_rating(attempt_id, current_user.id, payload.is_helpful, payload.tags)
