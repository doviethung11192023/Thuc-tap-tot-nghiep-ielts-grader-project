"""Quản trị người dùng, thống kê hệ thống, giám sát chấm AI (UC-19, UC-23, UC-24)."""
import json
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status

from app.core.security import User, require_admin
from app.schemas.admin import AdminAssignReviewRequest, AdminCreateAdminRequest, UserStatusUpdate
from app.schemas.expert import AdminCreateExpertRequest, AdminWaivePenaltyRequest
from app.services.admin import expert_kpi_service, learner_audit_service, learner_audit_trace, staff_accounts, system_statistics, user_admin
from app.services.expert.admin_review_dispatch_service import (
    admin_assign_review_request,
    list_admin_reviews,
)
from app.services.expert.dispatcher import auto_dispatch_pending_requests
from app.services.expert.penalty_circuit_breaker import waive_penalty

router = APIRouter()


@router.get("/users")
async def list_users(page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100),
                     role: Optional[str] = Query(None, description="learner | expert | admin"),
                     search: Optional[str] = Query(None, description="Tìm theo email hoặc họ tên"),
                     current_user: User = Depends(require_admin)):
    """Danh sách người dùng, phân trang, tìm kiếm, lọc vai trò."""
    return {"meta": {"code": 200}, "data": user_admin.list_users(page, limit, role, search)}


@router.put("/users/{user_id}/status")
async def update_user_status(user_id: str, status_update: UserStatusUpdate, current_user: User = Depends(require_admin)):
    """Khoá / mở khoá tài khoản, đồng bộ Supabase Auth, ghi audit log (FR-04)."""
    user_admin.set_user_active(current_user.id, user_id, status_update.is_active, status_update.reason)
    action_text = "mở khóa" if status_update.is_active else "khóa"
    return {"meta": {"code": 200, "message": f"User status updated successfully ({action_text})"}}


@router.post("/users/{user_id}/resend-invite")
async def resend_user_invite(user_id: str, current_user: User = Depends(require_admin)):
    """Gửi lại email kích hoạt / đặt mật khẩu."""
    data = staff_accounts.resend_invite(current_user.id, user_id)
    return {"meta": {"code": 200, "message": f"Đã gửi lại thư kích hoạt tới {data['email']}"},
            "data": {"email_sent": data["email_sent"], "setup_link": data["setup_link"]}}


@router.post("/experts", status_code=status.HTTP_201_CREATED)
async def create_expert(expert_req: AdminCreateExpertRequest, current_user: User = Depends(require_admin)):
    """Tạo (hoặc cấp quyền) tài khoản Expert và gửi lời mời (FR-03)."""
    data = staff_accounts.provision_staff(
        current_user.id, expert_req.email, expert_req.full_name, "expert",
        expert_fields={"max_active_reviews": expert_req.max_active_reviews, "bio": expert_req.bio})
    return {"meta": {"code": 201, "message": "Tạo tài khoản Expert thành công"}, "data": data}


@router.post("/admins", status_code=status.HTTP_201_CREATED)
async def create_admin(admin_req: AdminCreateAdminRequest, current_user: User = Depends(require_admin)):
    """Tạo (hoặc cấp quyền) tài khoản Admin và gửi lời mời."""
    data = staff_accounts.provision_staff(current_user.id, admin_req.email, admin_req.full_name, "admin")
    return {"meta": {"code": 201, "message": "Khởi tạo/phân quyền tài khoản Quản trị viên (Admin) thành công"},
            "data": data}


@router.get("/statistics")
async def get_statistics(request: Request, current_user: User = Depends(require_admin)):
    """Người dùng, bài viết, tỉ lệ lỗi AI, thời gian chấm, xu hướng 7 ngày & KPI Chuyên gia (FR-29)."""
    redis = request.app.state.redis
    cached = await redis.get("admin:statistics:v3")
    if cached:
        return json.loads(cached)
    result = {"meta": {"code": 200}, "data": system_statistics.system_statistics()}
    await redis.setex("admin:statistics:v3", 300, json.dumps(result))
    return result


@router.get("/evaluations/logs")
async def get_eval_logs(page: int = 1, limit: int = 10,
                        skill: Optional[str] = Query(None, description="writing | speaking"),
                        status: Optional[str] = Query(None, description="done | failed | running"),
                        current_user: User = Depends(require_admin)):
    """Các lượt chấm AI (grading_runs) mới nhất: trạng thái, lỗi, độ trễ, trace (FR-30)."""
    return {"meta": {"code": 200, "message": "Success"}, "data": system_statistics.grading_run_logs(page, limit, skill, status)}


@router.get("/reviews")
async def get_admin_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status", description="waiting | assigned | completed | cancelled"),
    skill: Optional[str] = Query(None, description="writing | speaking"),
    expert_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_admin),
):
    """Danh sách yêu cầu chấm Chuyên gia kèm tải hiện tại của từng Expert."""
    data = list_admin_reviews(page=page, limit=limit, status_filter=status_filter, skill=skill, expert_id=expert_id, search=search)
    return {"meta": {"code": 200, "message": "Success"}, "data": data}


@router.post("/reviews/auto-dispatch")
async def trigger_admin_auto_dispatch(current_user: User = Depends(require_admin)):
    """Admin kích hoạt phân bổ tự động (Least-Loaded) cho các yêu cầu đang waiting."""
    assigned_count = await auto_dispatch_pending_requests()
    return {
        "meta": {"code": 200, "message": f"Đã phân bổ tự động {assigned_count} bài chấm"},
        "data": {"assigned_count": assigned_count},
    }


@router.post("/reviews/{request_id}/assign")
async def assign_review_to_expert(
    request_id: str,
    payload: AdminAssignReviewRequest,
    current_user: User = Depends(require_admin),
):
    """Admin toàn quyền gán mới hoặc chuyển giao bài chấm sang bất kỳ Expert nào."""
    data = admin_assign_review_request(
        request_id=request_id,
        target_expert_id=payload.expert_id,
        admin_user_id=current_user.id,
        note=payload.note,
    )
    action_label = "chuyển giao" if data.get("reassigned") else "gán"
    return {
        "meta": {"code": 200, "message": f"Đã {action_label} bài chấm cho {data.get('expert_email')}"},
        "data": data,
    }


@router.get("/learners/analytics")
async def get_admin_learners_analytics(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_admin),
):
    """Bảng hội tụ thống kê học viên (3-Query Bulk Vectorized)."""
    return {"meta": {"code": 200}, "data": learner_audit_service.list_learners_analytics(page, limit, search)}


@router.get("/learners/{user_id}/audit")
async def get_admin_learner_audit(user_id: str, current_user: User = Depends(require_admin)):
    """Hồ sơ Minh chứng Trắng 360° cho mọi số liệu hiển thị của một học viên."""
    return {"meta": {"code": 200}, "data": learner_audit_trace.get_learner_whitebox_audit(user_id)}


@router.get("/experts/performance")
async def get_admin_experts_performance(
    period: str = Query("30d", description="30d hoặc YYYY-MM"),
    tier: Optional[str] = Query(None, description="probation | standard | high_performer | top_expert"),
    flagged_only: bool = Query(False, description="Chỉ lọc chuyên gia có dấu hiệu rubber-stamp"),
    current_user: User = Depends(require_admin),
):
    """Báo cáo hiệu suất 4-Tier, chỉ số vận hành & vi phạm của Chuyên gia (FR-50, FR-51)."""
    data = expert_kpi_service.get_expert_performance_report(period=period, tier=tier, flagged_only=flagged_only)
    return {"meta": {"code": 200, "message": "Success"}, "data": data}


@router.post("/penalties/{penalty_id}/waive")
async def waive_expert_penalty(
    penalty_id: str,
    payload: AdminWaivePenaltyRequest,
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Admin miễn phạt vi phạm của Expert kèm giải trình và tự tính lại hạng/cooldown (FR-51)."""
    data = waive_penalty(penalty_id=penalty_id, admin_id=current_user.id, waive_reason=payload.waive_reason)
    try:
        await request.app.state.redis.delete("admin:statistics:v3")
    except Exception:
        pass
    return {"meta": {"code": 200, "message": "Đã miễn phạt và cập nhật lại hạng Chuyên gia"}, "data": data}
