"""
Endpoints dành cho Học viên tương tác với Phân hệ Chuyên gia (Expert Quota & Review Requests).
Tuân thủ BR-15, BR-16, BR-20 trong docs/source-of-truth.md.
"""

from fastapi import APIRouter, Depends, Request, HTTPException, status
from app.core.security import User, require_learner, get_optional_user
from app.schemas.expert import ExpertHelpfulnessRatingRequest, LearnerQuotaResponse
from app.services.expert.quota_manager import (
    get_learner_quota_status,
    reserve_mock_expert_slot,
    release_mock_expert_slot
)
from app.services.expert.dispatcher import auto_dispatch_pending_requests
from app.services.notification_service import notify_expert_requested
from app.services.practice.practice_attempt_lifecycle import get_owned_attempt
from app.db.supabase import db

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
    attempt = get_owned_attempt(attempt_id, current_user.id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phiên làm bài không tồn tại hoặc không thuộc quyền sở hữu của bạn"
        )
    if attempt.get("mode") != "practice":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Chỉ bài thi ở chế độ Luyện tập (Practice) mới dùng chức năng xin chấm lại"
        )
    
    if attempt.get("skill") not in ("writing", "speaking"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Chỉ kỹ năng Writing và Speaking mới có thể xin Chuyên gia chấm lại"
        )

    # Kiểm tra điểm AI đã hoàn thành chưa
    ai_eval = db().table("evaluations") \
        .select("id, status") \
        .eq("attempt_id", attempt_id) \
        .eq("evaluator_type", "ai") \
        .eq("status", "done") \
        .execute()
    
    if not ai_eval.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Bài làm chưa hoàn tất chấm AI, vui lòng chờ AI chấm xong trước khi xin Chuyên gia thẩm định"
        )

    # Kiểm tra đã có request mở chưa
    open_req = db().table("review_requests") \
        .select("id, status") \
        .eq("attempt_id", attempt_id) \
        .in_("status", ["waiting", "assigned"]) \
        .execute()
    
    if open_req.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Bài thi này đã có một yêu cầu chấm Chuyên gia đang được xử lý"
        )

    # Kiểm tra hạn mức tuần
    quota_status = await get_learner_quota_status(current_user.id, getattr(request.app.state, "redis", None))
    if not quota_status["can_request_practice"]:
        if quota_status["practice_remaining"] <= 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS, 
                detail="Bạn đã dùng hết 3 lượt xin Chuyên gia chấm bài Practice trong tuần này"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                detail="Hệ thống đã hết suất chấm Chuyên gia của tuần này (BR-20). Vui lòng thử lại vào tuần sau."
            )

    # Tạo review_requests
    insert_res = db().table("review_requests").insert({
        "attempt_id": attempt_id,
        "learner_id": current_user.id,
        "skill": attempt["skill"],
        "status": "waiting"
    }).execute()

    if not insert_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Không thể tạo yêu cầu thẩm định Chuyên gia"
        )

    notify_expert_requested(attempt_id, current_user.id)

    # Tự động gán ngay nếu có Chuyên gia rảnh
    try:
        await auto_dispatch_pending_requests()
    except Exception as e:
        print(f"[Dispatcher] Warning on auto dispatch: {e}")

    return {
        "status": "waiting",
        "request_id": insert_res.data[0]["id"],
        "message": "Đã gửi yêu cầu thẩm định Chuyên gia thành công (SLA hoàn tất trong 48 giờ làm việc)"
    }


@router.get("/attempts/{attempt_id}/expert-rating")
async def get_expert_helpfulness_rating(
    attempt_id: str,
    current_user: User = Depends(require_learner),
):
    """Kiểm tra học viên đã gửi đánh giá mức độ hữu ích cho bài chấm Chuyên gia hay chưa."""
    attempt = get_owned_attempt(attempt_id, current_user.id)
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phiên làm bài không tồn tại")
    rows = db().table("expert_helpfulness_ratings").select("*").eq("attempt_id", attempt_id).limit(1).execute().data or []
    return {"rated": bool(rows), "rating": rows[0] if rows else None}


@router.post("/attempts/{attempt_id}/expert-rating")
async def submit_expert_helpfulness_rating(
    attempt_id: str,
    payload: ExpertHelpfulnessRatingRequest,
    current_user: User = Depends(require_learner),
):
    """Học viên đánh giá ẩn danh mức độ hữu ích của nhận xét Chuyên gia (1 lần/attempt — FR-52, UC-44)."""
    attempt = get_owned_attempt(attempt_id, current_user.id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phiên làm bài không tồn tại hoặc không thuộc quyền sở hữu của bạn",
        )
    asgns = (
        db().table("review_assignments")
        .select("id, expert_id, ended_at, end_reason")
        .eq("attempt_id", attempt_id)
        .eq("end_reason", "completed")
        .order("ended_at", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not asgns or not asgns[0].get("expert_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bài thi chưa có kết quả chấm hoàn tất từ Chuyên gia",
        )
    existing = db().table("expert_helpfulness_ratings").select("id").eq("attempt_id", attempt_id).limit(1).execute().data or []
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bạn đã gửi đánh giá nhận xét cho bài chấm này trước đó",
        )
    ins = (
        db().table("expert_helpfulness_ratings")
        .insert({
            "attempt_id": attempt_id,
            "assignment_id": asgns[0]["id"],
            "learner_id": current_user.id,
            "expert_id": asgns[0]["expert_id"],
            "is_helpful": payload.is_helpful,
            "tags": payload.tags,
        })
        .execute()
        .data
        or [{}]
    )
    return {"status": "saved", "rating_id": ins[0].get("id")}
