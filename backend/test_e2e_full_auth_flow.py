import asyncio
import httpx
import sys
import random
from datetime import datetime, date, timedelta

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

async def run_full_e2e_tests():
    from app.db.supabase import supabase

    print("=======================================================================")
    print(">>> BẮT ĐẦU TEST TOÀN BỘ LUỒNG AUTH & QUẢN LÝ TÀI KHOẢN CÁ NHÂN <<<")
    print("=======================================================================\n")

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=15.0) as client:
        # ---------------------------------------------------------------------
        # 1. KIỂM THỬ ĐĂNG NHẬP ADMIN VÀ CẤP QUYỀN (UC-19)
        # ---------------------------------------------------------------------
        print("[1] KIỂM THỬ ĐĂNG NHẬP ADMIN & TÁC VỤ QUẢN TRỊ (UC-19)")
        from supabase import create_client
        from app.core.config import settings
        auth_tester = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        admin_login_res = auth_tester.auth.sign_in_with_password({
            "email": "test1@gmail.com",
            "password": "Admin123456@"
        })
        admin_token = admin_login_res.session.access_token
        admin_id = admin_login_res.user.id
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print(f" -> Admin đăng nhập thành công: test1@gmail.com (ID: {admin_id})")

        # Admin lấy profile
        res = await client.get("/api/v1/users/me", headers=admin_headers)
        assert res.status_code == 200, res.text
        profile = res.json()
        assert profile["role"] == "admin"
        print(f" -> GET /api/v1/users/me (Admin) status: 200 OK | role={profile['role']}")

        # ---------------------------------------------------------------------
        # 2. KIỂM THỬ TẠO CHUYÊN GIA & QUẢN TRỊ VIÊN MỚI (UC-19)
        # ---------------------------------------------------------------------
        print("\n[2] KIỂM THỬ TẠO TÀI KHOẢN EXPERT & ADMIN (INVITE & IS_ACTIVATED)")
        rand_id = random.randint(10000, 99999)
        expert_email = f"expert_{rand_id}@ieltsgrader.edu.vn"
        
        # 2A. Admin tạo Expert
        exp_res = await client.post("/api/v1/admin/experts", json={
            "email": expert_email,
            "full_name": f"Teacher Expert {rand_id}",
            "bio": "IELTS Examiner 8.5 Overall",
            "max_active_reviews": 8
        }, headers=admin_headers)
        assert exp_res.status_code == 201, exp_res.text
        exp_data = exp_res.json()["data"]
        exp_user_id = exp_data["id"]
        assert exp_data["is_activated"] == False, "Tài khoản mời mới phải có is_activated=False"
        print(f" -> Tạo Expert thành công: {expert_email} | is_activated={exp_data['is_activated']}")

        # 2B. Admin gửi lại thư kích hoạt
        resend_res = await client.post(f"/api/v1/admin/users/{exp_user_id}/resend-invite", headers=admin_headers)
        assert resend_res.status_code == 200, resend_res.text
        print(f" -> Gửi lại thư kích hoạt Expert: 200 OK | message={resend_res.json()['meta']['message']}")

        # 2C. Admin tạo Admin mới
        co_admin_email = f"coadmin_{rand_id}@ieltsgrader.edu.vn"
        co_res = await client.post("/api/v1/admin/admins", json={
            "email": co_admin_email,
            "full_name": f"Co-Admin Manager {rand_id}"
        }, headers=admin_headers)
        assert co_res.status_code == 201, co_res.text
        assert co_res.json()["data"]["role"] == "admin"
        assert co_res.json()["data"]["is_activated"] == False
        print(f" -> Tạo Co-Admin thành công: {co_admin_email} | role=admin | is_activated=False")

        # 2D. Chặn tạo trùng lặp Admin (phải trả về 400 Bad Request)
        dup_res = await client.post("/api/v1/admin/admins", json={
            "email": co_admin_email,
            "full_name": f"Co-Admin Manager {rand_id}"
        }, headers=admin_headers)
        assert dup_res.status_code == 400, dup_res.text
        print(f" -> Chặn tạo trùng Admin thành công: 400 Bad Request")

        # ---------------------------------------------------------------------
        # 3. KIỂM THỬ QUẢN LÝ HỒ SƠ HỌC VIÊN (LEARNER / STUDENT)
        # ---------------------------------------------------------------------
        print("\n[3] KIỂM THỬ QUẢN LÝ HỒ SƠ HỌC VIÊN (PROFILE, GOALS, VOICE CONSENT NFR-07)")
        # Lấy một học viên từ database để test
        student_res = supabase.table("users").select("*").eq("role", "student").limit(1).execute()
        assert student_res.data, "Không tìm thấy học viên trong database"
        test_student = student_res.data[0]
        student_id = test_student["id"]
        student_email = test_student["email"]
        print(f" -> Học viên kiểm thử: {student_email} (ID: {student_id})")

        # Giả lập token học viên
        from jose import jwt
        JWT_SECRET = "peozqycguicekozognbbpeozqycguicekozognbbPeOzQyCgUiCeKoZoGnBb"
        student_jwt = jwt.encode({
            "sub": student_id,
            "email": student_email,
            "role": "authenticated",
            "app_metadata": {"role": "student"},
            "user_metadata": {"full_name": test_student.get("full_name", "Learner")},
            "exp": datetime.utcnow() + timedelta(hours=2)
        }, JWT_SECRET, algorithm="HS256")
        student_headers = {"Authorization": f"Bearer {student_jwt}"}

        # 3A. Xem profile học viên
        st_profile_res = await client.get("/api/v1/users/me", headers=student_headers)
        assert st_profile_res.status_code == 200, st_profile_res.text
        print(f" -> GET /api/v1/users/me (Student): 200 OK | email={st_profile_res.json()['email']}")

        # 3B. Cập nhật họ tên
        update_name_res = await client.put("/api/v1/users/me", json={
            "full_name": f"Học Viên Pro {rand_id}"
        }, headers=student_headers)
        assert update_name_res.status_code == 200, update_name_res.text
        assert update_name_res.json()["data"]["full_name"] == f"Học Viên Pro {rand_id}"
        print(f" -> Cập nhật họ tên học viên thành công: {update_name_res.json()['data']['full_name']}")

        # 3C. Đồng ý xử lý giọng nói (Grant Voice Consent - Nghị định 13)
        grant_voice_res = await client.put("/api/v1/users/me", json={
            "voice_consent": True
        }, headers=student_headers)
        assert grant_voice_res.status_code == 200, grant_voice_res.text
        assert grant_voice_res.json()["data"]["voice_consent_at"] is not None
        print(f" -> Cấp quyền Voice Consent thành công: voice_consent_at={grant_voice_res.json()['data']['voice_consent_at']}")

        # 3D. Hủy đồng ý xử lý giọng nói (Revoke Voice Consent - Quyền rút lại sự đồng ý)
        revoke_voice_res = await client.put("/api/v1/users/me", json={
            "voice_consent": False
        }, headers=student_headers)
        assert revoke_voice_res.status_code == 200, revoke_voice_res.text
        assert revoke_voice_res.json()["data"]["voice_consent_at"] is None
        print(f" -> Rút lại Voice Consent thành công: voice_consent_at=None")

        # 3E. Kiểm tra Audit Log đã ghi lại cả 2 hành vi grant và revoke
        consent_logs = supabase.table("audit_logs").select("*").eq("actor_id", student_id).in_("action", ["consent_grant", "consent_revoke"]).execute()
        assert len(consent_logs.data) >= 2, "Audit log phải ghi nhận sự kiện cấp và rút sự đồng ý"
        print(f" -> Audit log ghi nhận Nghị định 13: {len(consent_logs.data)} bản ghi hợp lệ!")

        # 3F. Cập nhật mục tiêu IELTS (UC-05, FR-06)
        future_date = (date.today() + timedelta(days=90)).isoformat()
        goals_res = await client.put("/api/v1/users/me/goals", json={
            "target_overall": 7.5,
            "target_listening": 8.0,
            "target_reading": 8.0,
            "target_writing": 7.0,
            "target_speaking": 7.0,
            "test_date": future_date
        }, headers=student_headers)
        assert goals_res.status_code == 200, goals_res.text
        print(f" -> Thiết lập mục tiêu IELTS thành công: Target 7.5 | Test date: {future_date}")

        # 3G. Xem lại mục tiêu IELTS đã lưu
        get_goals_res = await client.get("/api/v1/users/me/goals", headers=student_headers)
        assert get_goals_res.status_code == 200, get_goals_res.text
        assert get_goals_res.json()["data"]["target_overall"] == 7.5
        print(f" -> Đọc mục tiêu IELTS: 200 OK | target_overall=7.5")

        # 3H. Xem tiến độ học tập (GET /api/v1/users/me/progress)
        progress_res = await client.get("/api/v1/users/me/progress", headers=student_headers)
        assert progress_res.status_code == 200, progress_res.text
        print(f" -> Lấy tiến độ học tập: 200 OK | total_essays={progress_res.json()['data']['total_essays']}")

        # ---------------------------------------------------------------------
        # 4. KIỂM THỬ XÁC THỰC RÀNG BUỘC & AN TOÀN DỮ LIỆU (VALIDATION CHECKS)
        # ---------------------------------------------------------------------
        print("\n[4] KIỂM THỬ RÀNG BUỘC ĐIỂM SỐ & NGÀY THI (BOUNDARY TESTS)")
        # 4A. Điểm không phải bội số của 0.5 (VD: 7.2) -> 422 Unprocessable Entity
        invalid_score_res = await client.put("/api/v1/users/me/goals", json={"target_overall": 7.2}, headers=student_headers)
        assert invalid_score_res.status_code == 422, "Phải từ chối điểm lẻ không chia hết cho 0.5"
        print(f" -> Chặn điểm IELTS không hợp lệ (7.2): 422 Unprocessable Entity")

        # 4B. Điểm vượt quá 9.0 (VD: 9.5) -> 422
        overflow_score_res = await client.put("/api/v1/users/me/goals", json={"target_overall": 9.5}, headers=student_headers)
        assert overflow_score_res.status_code == 422
        print(f" -> Chặn điểm IELTS vượt trần (9.5): 422 Unprocessable Entity")

        # 4C. Ngày thi trong quá khứ -> 422
        past_date = (date.today() - timedelta(days=10)).isoformat()
        past_date_res = await client.put("/api/v1/users/me/goals", json={"test_date": past_date}, headers=student_headers)
        assert past_date_res.status_code == 422
        print(f" -> Chặn ngày thi trong quá khứ ({past_date}): 422 Unprocessable Entity")

        # ---------------------------------------------------------------------
        # 5. KIỂM THỬ BẢO MẬT PHÂN QUYỀN RBAC (SECURITY GATES)
        # ---------------------------------------------------------------------
        print("\n[5] KIỂM THỬ PHÂN QUYỀN TRUY CẬP RBAC (RBAC SECURITY ENFORCEMENT)")
        # 5A. Học viên cố tình gọi API Quản trị -> 403 Forbidden
        st_admin_res = await client.get("/api/v1/admin/users", headers=student_headers)
        assert st_admin_res.status_code == 403, f"Học viên phải bị chặn 403 Admin, nhận: {st_admin_res.status_code}"
        assert "admin" in st_admin_res.json()["detail"].lower()
        print(f" -> Học viên gọi API Admin bị chặn: 403 Forbidden | detail={st_admin_res.json()['detail']}")

        # 5B. Học viên cố tình gọi API Chuyên gia -> 403 Forbidden
        st_exp_res = await client.get("/api/v1/expert/me", headers=student_headers)
        assert st_exp_res.status_code == 403
        assert "expert" in st_exp_res.json()["detail"].lower()
        print(f" -> Học viên gọi API Expert bị chặn: 403 Forbidden | detail={st_exp_res.json()['detail']}")

        # 5C. Chuyên gia gọi API Quản trị -> 403 Forbidden
        exp_jwt = jwt.encode({
            "sub": exp_user_id,
            "email": expert_email,
            "role": "authenticated",
            "app_metadata": {"role": "expert"},
            "user_metadata": {"full_name": "Teacher Expert"},
            "exp": datetime.utcnow() + timedelta(hours=2)
        }, JWT_SECRET, algorithm="HS256")
        exp_headers = {"Authorization": f"Bearer {exp_jwt}"}

        exp_admin_res = await client.get("/api/v1/admin/users", headers=exp_headers)
        assert exp_admin_res.status_code == 403
        print(f" -> Chuyên gia gọi API Admin bị chặn: 403 Forbidden | detail={exp_admin_res.json()['detail']}")

        # 5D. Chuyên gia gọi đúng API Chuyên gia -> 200 OK
        exp_me_res = await client.get("/api/v1/expert/me", headers=exp_headers)
        assert exp_me_res.status_code == 200
        print(f" -> Chuyên gia gọi API Expert của mình: 200 OK | is_available={exp_me_res.json()['is_available']}")

        # 5E. Chuyên gia cập nhật trạng thái nhận bài (Availability)
        exp_avail_res = await client.patch("/api/v1/expert/me/availability", json={
            "is_available": True,
            "max_active_reviews": 12,
            "bio": "IELTS Examiner Senior"
        }, headers=exp_headers)
        assert exp_avail_res.status_code == 200
        assert exp_avail_res.json()["is_available"] == True
        assert exp_avail_res.json()["max_active_reviews"] == 12
        print(f" -> Chuyên gia cập nhật Availability: 200 OK | is_available=True, max=12")

        # 5F. Request không kèm Token -> 403 / 401 Unauthorized
        anon_res = await client.get("/api/v1/users/me")
        assert anon_res.status_code in [401, 403], f"Ẩn danh phải bị chặn, nhận: {anon_res.status_code}"
        print(f" -> Truy cập ẩn danh không Token: {anon_res.status_code} Chặn thành công")

        # ---------------------------------------------------------------------
        # 6. KIỂM THỬ KHÓA / MỞ KHÓA TÀI KHOẢN VÀ AUDIT LOGS
        # ---------------------------------------------------------------------
        print("\n[6] KIỂM THỬ KHÓA VÀ MỞ KHÓA TÀI KHOẢN (ACCOUNT LOCK / UNLOCK)")
        # 6A. Khóa tài khoản Expert
        lock_res = await client.put(f"/api/v1/admin/users/{exp_user_id}/status", json={
            "is_active": False,
            "reason": "Vi phạm quy chế chấm thi"
        }, headers=admin_headers)
        assert lock_res.status_code == 200, lock_res.text
        print(f" -> Khóa tài khoản Expert thành công: is_active=False")

        # 6B. Khi tài khoản bị khóa, mọi API gọi bằng tài khoản đó đều bị chặn 403 Inactive
        blocked_res = await client.get("/api/v1/expert/me", headers=exp_headers)
        assert blocked_res.status_code == 403
        assert "inactive" in blocked_res.json()["detail"].lower()
        print(f" -> Tài khoản bị khóa gọi API bị chặn ngay lập tức: 403 Forbidden | detail={blocked_res.json()['detail']}")

        # 6C. Mở khóa tài khoản Expert
        unlock_res = await client.put(f"/api/v1/admin/users/{exp_user_id}/status", json={
            "is_active": True,
            "reason": "Đã khiếu nại thành công"
        }, headers=admin_headers)
        assert unlock_res.status_code == 200
        print(f" -> Mở khóa tài khoản Expert: 200 OK")

        # 6D. Sau khi mở khóa, tài khoản hoạt động bình thường
        unblocked_res = await client.get("/api/v1/expert/me", headers=exp_headers)
        assert unblocked_res.status_code == 200
        print(f" -> Tài khoản sau mở khóa hoạt động bình thường: 200 OK")

    print("\n=======================================================================")
    print(">>> TẤT CẢ CÁC BÀI TEST E2E CHO AUTH & MANAGE ACCOUNT ĐỀU ĐẠT 100%! <<<")
    print("=======================================================================")

if __name__ == "__main__":
    asyncio.run(run_full_e2e_tests())
