---
phase: 2
title: "Database Schema Expansion & 3-Role RBAC"
status: pending
priority: P0
effort: "5 days"
dependencies: ["1"]
---

# Phase 02: Database Schema Expansion & 3-Role RBAC

## Overview
Mở rộng cấu trúc cơ sở dữ liệu trên Supabase để hỗ trợ toàn diện cả 4 kỹ năng (Reading, Listening, Writing, Speaking), thiết lập bảng quản lý mục tiêu học tập, bài thi, và cơ chế phân quyền (RBAC) 3 vai trò: Learner, Expert, Admin.

## Requirements
- Functional:
  - Cập nhật enum phân quyền người dùng: bổ sung role `expert`.
  - Tạo bảng `learner_profiles` (mục tiêu band score theo từng kỹ năng, ngày thi dự kiến) và `expert_profiles` (chuyên môn, trạng thái sẵn sàng chấm bài).
  - Tạo hệ thống bảng quản lý bài thi chuẩn: `tests`, `test_attempts`, `questions`, `skill_progress`.
  - Cập nhật backend middleware/guard xác thực token JWT và kiểm tra quyền tương ứng (Learner, Expert, Admin).
  - Cập nhật frontend `RoleGuard` để chuyển hướng đúng dashboard theo vai trò.
- Non-functional:
  - Sử dụng khóa ngoại (Foreign Keys) và Index tối ưu cho các truy vấn lịch sử học tập.
  - Áp dụng Supabase RLS (Row Level Security) ngăn học viên đọc bài làm của học viên khác.

## Architecture
```
users (auth.users)
  ├── 1:1 ── learner_profiles (target_overall, target_sub_skills, target_date)
  ├── 1:1 ── expert_profiles (specialization, availability, max_queue)
  └── 1:N ── test_attempts (test_id, status, overall_score, started_at, completed_at)
               ├── 1:N ── attempt_answers (question_id, user_answer, is_correct, score)
               ├── 1:1 ── writing_submissions (essay_id)
               └── 1:1 ── speaking_submissions (audio_url, transcript, scores)
```

## Related Code Files
- Create:
  - `backend/migrations/002_expand_schema_for_4_skills.sql`
  - `backend/app/models/profiles.py`
  - `backend/app/models/tests.py`
  - `backend/app/api/endpoints/profiles.py`
  - `frontend/src/components/guards/RoleGuard.tsx`
  - `frontend/src/app/(expert)/layout.tsx`
- Modify:
  - `backend/app/api/endpoints/auth.py` (Bổ sung trả về Role và Profile trong session)
  - `backend/app/core/security.py` (Viết dependency `require_role(role: str)`)
  - `frontend/src/components/guards/AuthGuard.tsx` (Tích hợp kiểm tra Role)

## Implementation Steps
1. **Thiết kế Migration Script SQL:**
   - Cập nhật enum: `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'expert';`.
   - Tạo bảng `learner_profiles`, `expert_profiles`, `tests`, `test_attempts`, `questions`, `skill_progress`.
   - Thiết lập các chỉ mục: `idx_test_attempts_user_id`, `idx_questions_skill_type`.
2. **Triển khai Pydantic Models & Schemas:** Khai báo cấu trúc DTO cho `LearnerProfileCreate`, `LearnerProfileResponse`, `ExpertProfileUpdate`.
3. **Cập nhật Backend RBAC Dependencies:** Tạo các decorator FastAPI: `require_learner`, `require_expert`, `require_admin`.
4. **Endpoint Quản lý Profile:** Xây dựng API `GET/PUT /api/profiles/learner` và `GET/PUT /api/profiles/expert/availability`.
5. **Cập nhật Frontend Route Guards:** Cấu hình Next.js Middleware và Component `RoleGuard` để định tuyến người dùng (`/dashboard` cho Learner, `/expert` cho Expert, `/admin` cho Admin).

## Success Criteria
- [ ] Chạy migration thành công trên Supabase mà không làm gián đoạn bảng dữ liệu `essays` hiện tại.
- [ ] Đăng ký/Đăng nhập với tài khoản role `expert` truy cập được vào `/expert`, bị chặn khi vào `/admin`.
- [ ] Học viên lưu thành công mục tiêu học tập (ví dụ: Overall 7.0, Writing 6.5, Speaking 7.0, Ngày thi: 2026-12-30).

## Risk Assessment
- *Nguy cơ:* Bảng `essays` cũ gắn liền với logic Writing Task 2 có thể bị gãy liên kết khi chuyển sang mô hình `test_attempts`.
- *Giải pháp:* Giữ nguyên bảng `essays` làm bảng con tham chiếu đến `test_attempts` thông qua trường `attempt_id` có thể NULL (nullable foreign key) để tương thích ngược.
