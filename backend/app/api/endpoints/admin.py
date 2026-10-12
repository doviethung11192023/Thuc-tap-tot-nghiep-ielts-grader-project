from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from typing import Optional
from app.schemas.admin import UserStatusUpdate, AdminCreateAdminRequest
from app.schemas.expert import AdminCreateExpertRequest
from app.core.security import require_admin, User
from app.db.supabase import supabase
from datetime import datetime
import json

router = APIRouter()

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    role: Optional[str] = Query(None, description="Lọc theo role: student, expert, admin"),
    search: Optional[str] = Query(None, description="Tìm kiếm email hoặc họ tên"),
    current_user: User = Depends(require_admin)
):
    """
    Danh sách người dùng với phân trang, tìm kiếm và lọc theo vai trò (UC-19).
    """
    offset = (page - 1) * limit
    query = supabase.table("users").select("*", count="exact")
    
    if role:
        query = query.eq("role", role)
    if search:
        s = search.strip()
        if s:
            query = query.or_(f"email.ilike.%{s}%,full_name.ilike.%{s}%")
            
    res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {
        "meta": {"code": 200},
        "data": {
            "items": res.data or [],
            "total": res.count if hasattr(res, 'count') and res.count is not None else len(res.data or [])
        }
    }

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str, 
    status_update: UserStatusUpdate, 
    current_user: User = Depends(require_admin)
):
    """
    Khóa hoặc mở khóa tài khoản người dùng, đồng bộ sang Supabase Auth và ghi audit log (UC-19, FR-04).
    """
    if user_id == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Admins cannot lock their own account"
        )
        
    res = supabase.table("users").update({"is_active": status_update.is_active}).eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Đồng bộ khóa/mở khóa ở tầng Supabase GoTrue Auth
    try:
        ban_duration = "876000h" if not status_update.is_active else "none"
        supabase.auth.admin.update_user_by_id(user_id, {"ban_duration": ban_duration})
    except Exception as e:
        print(f"Warning: Failed to sync ban status to GoTrue for user {user_id}: {str(e)}")

    # Ghi nhận vào audit_logs
    try:
        supabase.table("audit_logs").insert({
            "actor_id": current_user.id,
            "action": "lock_user" if not status_update.is_active else "unlock_user",
            "entity": "users",
            "entity_id": user_id,
            "after": {"is_active": status_update.is_active, "reason": status_update.reason}
        }).execute()
    except Exception as log_err:
        print(f"Warning: Failed to write audit log: {str(log_err)}")

    action_text = "mở khóa" if status_update.is_active else "khóa"
    return {"meta": {"code": 200, "message": f"User status updated successfully ({action_text})"}}

@router.post("/users/{user_id}/resend-invite")
async def resend_user_invite(
    user_id: str,
    current_user: User = Depends(require_admin)
):
    """
    Gửi lại email kích hoạt & tạo mật khẩu cho người dùng (UC-19).
    """
    user_res = supabase.table("users").select("id, email, role, is_activated").eq("id", user_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    u = user_res.data[0]
    email_clean = u["email"].strip().lower()
    redirect_target = "http://localhost:3000/auth/callback?next=/reset-password"
    email_sent = False
    setup_link = None
    
    # 1. Thử gửi email đặt lại mật khẩu / kích hoạt trực tiếp từ Supabase Auth
    try:
        supabase.auth.reset_password_for_email(email_clean, options={"redirect_to": redirect_target})
        email_sent = True
    except Exception as reset_err:
        print(f"Warning resending reset email to {email_clean}: {reset_err}")
        
    # 2. Sinh fallback setup link trực tiếp
    try:
        link_res = supabase.auth.admin.generate_link({
            "type": "recovery",
            "email": email_clean,
            "options": {"redirect_to": redirect_target}
        })
        if link_res and hasattr(link_res, 'properties') and link_res.properties:
            setup_link = getattr(link_res.properties, 'action_link', None)
    except Exception as link_err:
        print(f"Warning generating setup link on resend: {link_err}")
        
    # 3. Ghi audit log
    try:
        supabase.table("audit_logs").insert({
            "actor_id": current_user.id,
            "action": "resend_invite",
            "entity": "users",
            "entity_id": user_id,
            "after": {"email": email_clean}
        }).execute()
    except Exception as log_err:
        print(f"Warning audit log resend_invite: {log_err}")

    return {
        "meta": {"code": 200, "message": f"Đã gửi lại thư kích hoạt tới {email_clean}"},
        "data": {
            "email_sent": email_sent,
            "setup_link": setup_link
        }
    }

@router.post("/experts", status_code=status.HTTP_201_CREATED)
async def create_expert(
    expert_req: AdminCreateExpertRequest,
    current_user: User = Depends(require_admin)
):
    """
    Admin tạo tài khoản Expert (UC-19, FR-03).
    Gửi email kích hoạt, gán app_metadata={'role': 'expert'}, khởi tạo expert_profiles, sinh link kích hoạt và ghi audit log.
    """
    email_clean = expert_req.email.strip().lower()
    redirect_target = "http://localhost:3000/auth/callback?next=/reset-password"
    email_sent = False
    is_activated = False

    # 1. Kiểm tra email đã tồn tại hay chưa
    existing = supabase.table("users").select("id, role, is_activated").eq("email", email_clean).execute()
    if existing.data:
        existing_user = existing.data[0]
        if existing_user.get("role") == "expert":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Tài khoản này đã là Chuyên gia (Expert) trong hệ thống"
            )
        expert_id = existing_user["id"]
        is_activated = existing_user.get("is_activated", False)
        try:
            supabase.auth.admin.update_user_by_id(expert_id, {
                "app_metadata": {"role": "expert"}
            })
        except Exception:
            pass
            
        # Gửi email đặt lại mật khẩu để người dùng kích hoạt quyền
        try:
            supabase.auth.reset_password_for_email(email_clean, options={"redirect_to": redirect_target})
            email_sent = True
        except Exception as e:
            print(f"Warning sending reset password email: {e}")
    else:
        # 2. Thử mời qua email bằng Supabase GoTrue Auth invite_user_by_email
        try:
            invite_res = supabase.auth.admin.invite_user_by_email(
                email_clean,
                options={
                    "data": {"full_name": expert_req.full_name},
                    "redirect_to": redirect_target
                }
            )
            if invite_res and getattr(invite_res, "user", None):
                expert_id = invite_res.user.id
                email_sent = True
                # Gán app_metadata role
                try:
                    supabase.auth.admin.update_user_by_id(expert_id, {
                        "app_metadata": {"role": "expert"}
                    })
                except Exception:
                    pass
        except Exception as invite_err:
            print(f"Invite user by email note: {invite_err}, falling back to create_user")

        # Fallback nếu email không hỗ trợ MX hoặc invite bị giới hạn
        if not email_sent:
            try:
                auth_user = supabase.auth.admin.create_user({
                    "email": email_clean,
                    "user_metadata": {"full_name": expert_req.full_name},
                    "app_metadata": {"role": "expert"},
                    "email_confirm": True
                })
                if not auth_user or not getattr(auth_user, "user", None):
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                        detail="Không nhận được phản hồi khởi tạo tài khoản từ dịch vụ Auth"
                    )
                expert_id = auth_user.user.id
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail=f"Lỗi khi khởi tạo tài khoản trên hệ thống xác thực: {str(e)}"
                )

    # 3. Đảm bảo bản ghi public.users được lưu đúng role 'expert' và trạng thái is_activated
    supabase.table("users").upsert({
        "id": expert_id,
        "email": email_clean,
        "full_name": expert_req.full_name,
        "role": "expert",
        "is_active": True,
        "is_activated": is_activated
    }).execute()

    # 4. Khởi tạo bản ghi hồ sơ chuyên gia expert_profiles
    supabase.table("expert_profiles").upsert({
        "user_id": expert_id,
        "is_available": False,
        "max_active_reviews": expert_req.max_active_reviews,
        "bio": expert_req.bio
    }).execute()

    # 5. Sinh fallback setup_link (redirect về trang đặt mật khẩu)
    setup_link = None
    try:
        link_res = supabase.auth.admin.generate_link({
            "type": "recovery",
            "email": email_clean,
            "options": {"redirect_to": redirect_target}
        })
        if link_res and hasattr(link_res, 'properties') and link_res.properties:
            setup_link = getattr(link_res.properties, 'action_link', None)
    except Exception as link_err:
        print(f"Warning: Failed to generate setup link: {str(link_err)}")

    # 6. Ghi Audit Log
    try:
        supabase.table("audit_logs").insert({
            "actor_id": current_user.id,
            "action": "create_expert",
            "entity": "users",
            "entity_id": expert_id,
            "after": {
                "email": email_clean,
                "full_name": expert_req.full_name,
                "role": "expert",
                "max_active_reviews": expert_req.max_active_reviews,
                "email_sent": email_sent
            }
        }).execute()
    except Exception as log_err:
        print(f"Warning: Failed to write audit log for create_expert: {str(log_err)}")

    return {
        "meta": {"code": 201, "message": "Tạo tài khoản Expert thành công"},
        "data": {
            "id": expert_id,
            "email": email_clean,
            "full_name": expert_req.full_name,
            "role": "expert",
            "is_activated": is_activated,
            "email_sent": email_sent,
            "max_active_reviews": expert_req.max_active_reviews,
            "setup_link": setup_link
        }
    }

@router.post("/admins", status_code=status.HTTP_201_CREATED)
async def create_admin(
    admin_req: AdminCreateAdminRequest,
    current_user: User = Depends(require_admin)
):
    """
    Admin cấp quyền hoặc tạo mới tài khoản Quản trị viên (Admin) (UC-19).
    Gửi email kích hoạt, gán app_metadata={'role': 'admin'}, cập nhật public.users với role='admin', sinh setup link và ghi audit log.
    """
    email_clean = admin_req.email.strip().lower()
    redirect_target = "http://localhost:3000/auth/callback?next=/reset-password"
    email_sent = False
    is_activated = False

    # 1. Kiểm tra tài khoản đã tồn tại hay chưa
    existing = supabase.table("users").select("id, role, is_activated").eq("email", email_clean).execute()
    if existing.data:
        existing_user = existing.data[0]
        if existing_user.get("role") == "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Tài khoản này đã có vai trò Quản trị viên (Admin) trong hệ thống"
            )
        admin_id = existing_user["id"]
        is_activated = existing_user.get("is_activated", False)
        try:
            supabase.auth.admin.update_user_by_id(admin_id, {
                "app_metadata": {"role": "admin"}
            })
        except Exception as e:
            print(f"Warning updating GoTrue role to admin for {email_clean}: {e}")
            
        # Gửi email đặt lại mật khẩu để người dùng kích hoạt quyền
        try:
            supabase.auth.reset_password_for_email(email_clean, options={"redirect_to": redirect_target})
            email_sent = True
        except Exception as e:
            print(f"Warning sending reset password email: {e}")
    else:
        # 2. Thử mời qua email bằng Supabase GoTrue Auth invite_user_by_email
        try:
            invite_res = supabase.auth.admin.invite_user_by_email(
                email_clean,
                options={
                    "data": {"full_name": admin_req.full_name},
                    "redirect_to": redirect_target
                }
            )
            if invite_res and getattr(invite_res, "user", None):
                admin_id = invite_res.user.id
                email_sent = True
                try:
                    supabase.auth.admin.update_user_by_id(admin_id, {
                        "app_metadata": {"role": "admin"}
                    })
                except Exception:
                    pass
        except Exception as invite_err:
            print(f"Invite admin by email note: {invite_err}, falling back to create_user")

        # Fallback nếu email không hỗ trợ MX hoặc invite bị giới hạn
        if not email_sent:
            try:
                auth_user = supabase.auth.admin.create_user({
                    "email": email_clean,
                    "user_metadata": {"full_name": admin_req.full_name},
                    "app_metadata": {"role": "admin"},
                    "email_confirm": True
                })
                if not auth_user or not getattr(auth_user, "user", None):
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                        detail="Không nhận được phản hồi khởi tạo tài khoản từ dịch vụ Auth"
                    )
                admin_id = auth_user.user.id
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail=f"Lỗi khi khởi tạo tài khoản Admin trên hệ thống xác thực: {str(e)}"
                )

    # 3. Đảm bảo bản ghi public.users được lưu đúng role 'admin' và trạng thái is_activated
    supabase.table("users").upsert({
        "id": admin_id,
        "email": email_clean,
        "full_name": admin_req.full_name,
        "role": "admin",
        "is_active": True,
        "is_activated": is_activated
    }).execute()

    # 4. Sinh link thiết lập mật khẩu (recovery link) cho Admin
    setup_link = None
    try:
        link_res = supabase.auth.admin.generate_link({
            "type": "recovery",
            "email": email_clean,
            "options": {"redirect_to": redirect_target}
        })
        if link_res and hasattr(link_res, 'properties') and link_res.properties:
            setup_link = getattr(link_res.properties, 'action_link', None)
    except Exception as link_err:
        print(f"Warning: Failed to generate setup link for admin: {str(link_err)}")

    # 5. Ghi Audit Log
    try:
        supabase.table("audit_logs").insert({
            "actor_id": current_user.id,
            "action": "create_admin",
            "entity": "users",
            "entity_id": admin_id,
            "after": {
                "email": email_clean,
                "full_name": admin_req.full_name,
                "role": "admin",
                "email_sent": email_sent
            }
        }).execute()
    except Exception as log_err:
        print(f"Warning: Failed to write audit log for create_admin: {str(log_err)}")

    return {
        "meta": {"code": 201, "message": "Khởi tạo/phân quyền tài khoản Quản trị viên (Admin) thành công"},
        "data": {
            "id": admin_id,
            "email": email_clean,
            "full_name": admin_req.full_name,
            "role": "admin",
            "is_activated": is_activated,
            "email_sent": email_sent,
            "setup_link": setup_link
        }
    }

@router.get("/statistics")
async def get_statistics(request: Request, current_user: User = Depends(require_admin)):
    redis = request.app.state.redis
    cache_key = "admin:statistics"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    users_count = supabase.table("users").select("*", count="exact").limit(1).execute()
    essays_count = supabase.table("essays").select("*", count="exact").limit(1).execute()
    
    # Lấy số bài đã nộp hôm nay
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_essays_count = supabase.table("essays").select("*", count="exact").gte("submitted_at", today_start).limit(1).execute()
    
    # Tính AI Error Rate
    logs = supabase.table("evaluation_logs").select("status").execute()
    total_logs = len(logs.data)
    failed_logs = sum(1 for log in logs.data if log.get("status") == "failed")
    error_rate = (failed_logs / total_logs * 100) if total_logs > 0 else 0.0
    
    # Xu hướng 7 ngày qua
    import datetime as dt
    trend_data = []
    today = dt.datetime.utcnow().date()
    for i in range(6, -1, -1):
        target_date = today - dt.timedelta(days=i)
        start_of_day = dt.datetime.combine(target_date, dt.time.min).isoformat()
        end_of_day = dt.datetime.combine(target_date, dt.time.max).isoformat()
        day_count = supabase.table("essays").select("*", count="exact").gte("submitted_at", start_of_day).lte("submitted_at", end_of_day).limit(1).execute()
        trend_data.append({
            "date": target_date.strftime("%d/%m"),
            "count": day_count.count if hasattr(day_count, 'count') and day_count.count is not None else 0
        })
    
    result = {
        "meta": {"code": 200},
        "data": {
            "total_users": users_count.count if hasattr(users_count, 'count') else 0,
            "total_essays": essays_count.count if hasattr(essays_count, 'count') else 0,
            "essays_today": today_essays_count.count if hasattr(today_essays_count, 'count') else 0,
            "ai_error_rate_percent": round(error_rate, 2),
            "average_processing_time_sec": 5.5,
            "submissions_trend": trend_data
        }
    }
    
    await redis.setex(cache_key, 300, json.dumps(result))
    return result

@router.get("/evaluations/logs")
async def get_eval_logs(page: int = 1, limit: int = 10, current_user: User = Depends(require_admin)):
    offset = (page - 1) * limit
    res = supabase.table("evaluation_logs").select("*, essay:essays(id, user:users(email), topic:topics(title))", count="exact").range(offset, offset + limit - 1).order('created_at', desc=True).execute()
    return {
        "meta": {"code": 200, "message": "Success"},
        "data": {
            "items": res.data,
            "total": res.count if hasattr(res, 'count') else len(res.data)
        }
    }
