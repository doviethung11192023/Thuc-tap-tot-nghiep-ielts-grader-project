"""Quản trị người dùng, thống kê hệ thống, giám sát chấm AI (UC-19, UC-23, UC-24)."""
import json
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status

from app.core.security import User, require_admin
from app.schemas.admin import AdminCreateAdminRequest, UserStatusUpdate
from app.schemas.expert import AdminCreateExpertRequest
from app.services.admin import staff_accounts, system_statistics, user_admin

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
    """Người dùng, bài viết, tỉ lệ lỗi AI, thời gian chấm, xu hướng 7 ngày (FR-29)."""
    redis = request.app.state.redis
    cached = await redis.get("admin:statistics")
    if cached:
        return json.loads(cached)
    result = {"meta": {"code": 200}, "data": system_statistics.system_statistics()}
    await redis.setex("admin:statistics", 300, json.dumps(result))
    return result


@router.get("/evaluations/logs")
async def get_eval_logs(page: int = 1, limit: int = 10, current_user: User = Depends(require_admin)):
    """Các lượt chấm AI (grading_runs) mới nhất: trạng thái, lỗi, độ trễ, trace (FR-30)."""
    return {"meta": {"code": 200, "message": "Success"}, "data": system_statistics.grading_run_logs(page, limit)}
