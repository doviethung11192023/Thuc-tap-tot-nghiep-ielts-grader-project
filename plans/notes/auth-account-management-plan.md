# Kế hoạch Triển khai: Hệ thống API Xác thực & Quản lý Tài khoản (Register, Sign In & Manage Personal Account)

> **Mã công việc:** `auth-account-management`  
> **Tài liệu tham chiếu:**  
> - `C:\Users\Admin\Downloads\Phan_tich_Thiet_ke_IELTS_AI_v3.0.md` (Mục 1.4, 2.1, 3.4, 5.8, 6.3, 6.4, 7.1, 7.2, 7.7)  
> - `docs/capstone/CAPSTONE_PROJECT_PROPOSAL.md` (Mục 3: Business Scope & Mục 5: Proposed Implementation Plan)  
> **Vai trò hỗ trợ:** 3 roles (`learner`, `expert`, `admin`)  

---

## 1. Mục tiêu (Goal)
Xây dựng trọn vẹn và chuẩn hóa hệ sinh thái API cho **Đăng ký (Register), Đăng nhập (Sign in) và Quản lý Tài khoản Cá nhân (Manage Personal Account)** cho cả 3 vai trò `learner` (student), `expert`, và `admin`. Tuân thủ nghiêm ngặt nguyên tắc phân tách trách nhiệm (Separation of Concerns) giữa Supabase Auth (GoTrue) và FastAPI Core API, cơ chế kích hoạt Expert qua Admin API, thiết lập mục tiêu học tập (UC-05), quản lý trạng thái khả dụng của Expert (UC-14), và quản trị khóa/mở khóa tài khoản đồng bộ kèm audit log (UC-19).

---

## 2. Nhiệm vụ Chi tiết (Tasks)

### Giai đoạn 1: Schema Pydantic & Data Contracts
- [ ] **Task 1.1:** Mở rộng `backend/app/schemas/user.py`:
  - Cập nhật `UserProfileResponse` đầy đủ trường: `id`, `email`, `full_name`, `avatar_url`, `role`, `is_active`, `voice_consent_at`, `created_at`.
  - Bổ sung `UserUpdate`: cho phép cập nhật `full_name` (2-150 ký tự), `avatar_url` (optional URL), `voice_consent` (optional bool).
  - Thêm `LearnerGoalUpdate` và `LearnerGoalResponse`: xác thực điểm IELTS từ `0.0` đến `9.0`, bước nhảy `0.5` (`val * 2 == int(val * 2)`), `test_date` phải là ngày trong tương lai.
  - *Verify:* Chạy unit test Pydantic validator kiểm tra input hợp lệ và ngoại lệ khi điểm lẻ (vd: 6.3 bị chặn).

- [ ] **Task 1.2:** Tạo mới `backend/app/schemas/expert.py`:
  - `ExpertProfileResponse`: `user_id`, `email`, `full_name`, `is_available`, `max_active_reviews`, `bio`, `active_reviews_count`, `created_at`.
  - `ExpertAvailabilityUpdate`: `is_available: bool`, `max_active_reviews: Optional[int] = Field(None, ge=1, le=20)`, `bio: Optional[str]`.
  - `AdminCreateExpertRequest`: `email: EmailStr`, `full_name: str`, `bio: Optional[str]`, `max_active_reviews: Optional[int] = 5`.
  - *Verify:* Model validation với trường email hợp lệ và giới hạn review từ 1 đến 20.

- [ ] **Task 1.3:** Cập nhật `backend/app/schemas/admin.py`:
  - Mở rộng `UserListResponse` hỗ trợ bộ lọc vai trò (`role: Optional[str]`), tìm kiếm (`search: Optional[str]`), phân trang (`page`, `limit`, `total`).
  - *Verify:* Swagger schema hiển thị đúng tham số filter.

---

### Giai đoạn 2: Phân quyền & Bảo mật (RBAC & Core Security)
- [ ] **Task 2.1:** Cập nhật `backend/app/core/security.py`:
  - Bổ sung dependency `require_expert(current_user: User)` kiểm tra nghiêm ngặt `current_user.role == 'expert'`.
  - Tinh chỉnh `require_student(current_user: User)` kiểm tra `current_user.role == 'student'`.
  - Đảm bảo cơ chế từ chối ngay lập tức (HTTP 401/403) nếu tài khoản có `is_active == False` hoặc hồ sơ không tồn tại trong DB (loại bỏ fallback tự phong student).
  - *Verify:* Gọi API với token của learner vào route yêu cầu expert trả về 403 Forbidden.

---

### Giai đoạn 3: API cho Vai trò Learner (Quản lý Hồ sơ & Mục tiêu IELTS - UC-04, UC-05)
- [ ] **Task 3.1:** Hoàn thiện `backend/app/api/endpoints/users.py`:
  - `GET /api/v1/users/me`: Trả về thông tin hồ sơ của user hiện tại, bao gồm cả role và voice_consent_at.
  - `PUT /api/v1/users/me`: Cập nhật `full_name`, `avatar_url`, và cập nhật `voice_consent_at = now()` nếu người dùng đồng ý ghi âm (tuân thủ Nghị định 13/2023/NĐ-CP).
  - `GET /api/v1/users/me/goals`: Truy vấn bảng `learner_goals` theo `current_user.id`. Nếu chưa có trả về null hoặc giá trị mặc định.
  - `PUT /api/v1/users/me/goals`: Upsert dữ liệu mục tiêu IELTS (`target_overall`, `target_listening`, `target_reading`, `target_writing`, `target_speaking`, `test_date`) vào `learner_goals`.
  - *Verify:* `curl` hoặc gửi request tới `PUT /api/v1/users/me/goals` với điểm hợp lệ, kiểm tra DB `learner_goals` cập nhật đúng.

---

### Giai đoạn 4: API cho Vai trò Expert (Hồ sơ Chuyên gia & Trạng thái Khả dụng - UC-14)
- [ ] **Task 4.1:** Tạo mới endpoint `backend/app/api/endpoints/expert.py`:
  - `GET /api/v1/expert/me`: Lấy thông tin cá nhân của Expert, trạng thái `is_available`, `max_active_reviews`, và đếm số lượng bài đang được phân công (`assigned` hoặc `in_review` trong `review_requests`).
  - `PATCH /api/v1/expert/me/availability`: Cập nhật trạng thái `is_available` (bật/tắt nhận bài), `max_active_reviews`, `bio`.
- [ ] **Task 4.2:** Đăng ký router `expert.py` vào `backend/app/api/api_router.py`:
  - `api_router.include_router(expert.router, prefix="/expert", tags=["Expert"])`.
  - *Verify:* Swagger UI hiển thị nhóm tag "Expert" với 2 endpoints và yêu cầu Bearer token có role `expert`.

---

### Giai đoạn 5: API cho Vai trò Admin (Quản trị Người dùng & Cấp quyền Expert - UC-19)
- [ ] **Task 5.1:** Bổ sung chức năng tạo tài khoản Expert vào `backend/app/api/endpoints/admin.py`:
  - `POST /api/v1/admin/experts`:
    1. Kiểm tra email chưa tồn tại trong hệ thống.
    2. Sử dụng `supabase.auth.admin.invite_user_by_email` hoặc `supabase.auth.admin.create_user` với `app_metadata={"role": "expert"}` và `user_metadata={"full_name": ...}`.
    3. Trigger `on_auth_user_created` tự động tạo bản ghi trong `public.users` với `role = 'expert'`.
    4. Upsert/khởi tạo bản ghi trong `public.expert_profiles` với `is_available = false`, `max_active_reviews = 5`, `bio = ...`.
    5. Ghi log vào bảng `public.audit_logs` (actor_id = admin, action = 'create_expert', entity = 'users').
    6. Trả về thông tin tài khoản Expert vừa tạo kèm trạng thái đã gửi email mời kích hoạt.
- [ ] **Task 5.2:** Nâng cấp `GET /api/v1/admin/users` và `PUT /api/v1/admin/users/{user_id}/status`:
  - `GET /api/v1/admin/users`: Bổ sung filter theo `role` (student, expert, admin) và `search` (email, full_name).
  - `PUT /api/v1/admin/users/{user_id}/status`: Cập nhật `is_active` trong `public.users`, đồng thời gọi `supabase.auth.admin.update_user_by_id(user_id, {"ban_duration": "876000h" if not is_active else "none"})` để chặn ngay ở tầng GoTrue. Ghi nhận `audit_logs`.
  - *Verify:* Admin tạo Expert thành công, tài khoản xuất hiện trong danh sách với role `expert`, kiểm tra audit log được lưu.

---

### Giai đoạn 6: Frontend Integration & Đồng bộ Giao diện
- [ ] **Task 6.1:** Bổ sung API client trong `frontend/src/services/users.ts` và tạo mới `frontend/src/services/expert.ts`:
  - Viết các hàm: `getLearnerGoals()`, `updateLearnerGoals()`, `getExpertProfile()`, `updateExpertAvailability()`, `adminCreateExpert()`.
- [ ] **Task 6.2:** Cập nhật giao diện `frontend/src/app/(student)/profile/page.tsx`:
  - Thêm form/section "Mục tiêu IELTS": cài đặt Target Band (Overall & 4 kỹ năng) và ngày thi dự kiến.
- [ ] **Task 6.3:** Cập nhật giao diện `frontend/src/app/admin/users/page.tsx`:
  - Bổ sung nút & Modal "Tạo tài khoản Expert" với form: Email, Họ tên, Giới thiệu (bio), Số bài chấm tối đa.
  - Bổ sung bộ lọc Role Tabs: Tất cả, Học viên (Student), Chuyên gia (Expert), Quản trị viên (Admin).
- [ ] **Task 6.4:** Tạo trang quản lý trạng thái cho Expert tại `frontend/src/app/expert/profile/page.tsx`:
  - Hiển thị Switch toggle "Sẵn sàng nhận bài (Available)", chỉnh sửa bio, hiển thị số bài đang phụ trách.

---

### Giai đoạn 7: Kiểm thử Toàn diện & Xác thực (Verification)
- [ ] **Task 7.1:** Chạy test API endpoints qua kịch bản tự động (pytest/script):
  - Đăng ký học viên -> Xác thực -> Đăng nhập -> Cập nhật profile -> Đặt mục tiêu IELTS.
  - Admin đăng nhập -> Tạo tài khoản Expert -> Kiểm tra bảng `users`, `expert_profiles`, `audit_logs`.
  - Khóa tài khoản -> Thử đăng nhập/gọi API -> Kiểm tra mã lỗi 403 Forbidden.
  - Expert đăng nhập -> Toggle trạng thái Available -> Kiểm tra DB cập nhật.
- [ ] **Task 7.2:** Chạy kiểm tra TypeScript frontend (`npm run build` / lint) đảm bảo không có lỗi type nào.

---

## 3. Tiêu chí Hoàn thành (Done When)
- [ ] 100% các API cho 3 role hoạt động ổn định trên Swagger `/docs`:
  - Learner: `GET /api/v1/users/me`, `PUT /api/v1/users/me`, `GET /api/v1/users/me/goals`, `PUT /api/v1/users/me/goals`.
  - Expert: `GET /api/v1/expert/me`, `PATCH /api/v1/expert/me/availability`.
  - Admin: `GET /api/v1/admin/users` (filter role/search), `PUT /api/v1/admin/users/{id}/status`, `POST /api/v1/admin/experts`.
- [ ] Bảo mật phân quyền: Learner không thể gọi API Expert/Admin; Expert không thể gọi API Admin; Admin không tự khóa tài khoản của mình.
- [ ] Dữ liệu nhất quán: Trigger Supabase tự gán role `student` cho public signup, role `expert` chỉ được tạo bởi Admin thông qua `app_metadata`.
- [ ] Giao diện Web phản ánh đầy đủ: Thiết lập mục tiêu học viên, Modal tạo Expert của Admin, Switch nhận bài của Expert.
