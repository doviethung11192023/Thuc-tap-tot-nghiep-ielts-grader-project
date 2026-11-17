---
phase: 1
title: "Backend: Least-Loaded Dispatcher & Admin Review APIs"
status: pending
priority: P1
effort: "2h"
dependencies: []
---

# Phase 01: Backend: Least-Loaded Dispatcher & Admin Review APIs

## Overview
Nâng cấp thuật toán phân bổ tự động sang Least-Loaded trong `dispatcher.py` và bổ sung service + API cho phép Admin xem danh sách `review_requests`, tải hiện tại của từng Expert, chạy auto-dispatch thủ công, và toàn quyền gán/chuyển bài (`assign`/`reassign`).

## Requirements
- **Functional:**
  1. `auto_dispatch_pending_requests()` chọn Expert khả dụng (`is_available = True`) có số bài đang mở (`ended_at IS NULL`) ít nhất; hòa thì ưu tiên tỉ lệ tải `active_count / max_active_reviews` thấp nhất.
  2. `GET /api/v1/admin/reviews` trả về danh sách phân trang `review_requests` (kèm thông tin học viên, kỹ năng, mode, đề thi, trạng thái, assignment đang mở, lịch sử assignment trước đó) + danh sách `experts` kèm `active_open`, `max_active_reviews`, `is_available`, `is_active`.
  3. `POST /api/v1/admin/reviews/{request_id}/assign` cho phép Admin gán bài `pending` hoặc chuyển giao bài `assigned` / `in_progress` sang bất kỳ Expert nào có `is_active = True` (Admin toàn quyền override `is_available` và `max_active_reviews`).
  4. `POST /api/v1/admin/reviews/auto-dispatch` kích hoạt `auto_dispatch_pending_requests()` theo yêu cầu Admin.
- **Non-functional:**
  - Tách service mới `admin_review_dispatch_service.py` để giữ file gọn dưới ~200 dòng.
  - Không thay đổi schema DB (tái sử dụng `end_reason = 'reassigned'`).

## Architecture
- `dispatcher.py` (`auto_dispatch_pending_requests`):
  - Lấy tất cả `expert_profiles` với `is_available = True`.
  - Đếm `active_count` (`review_assignments` có `ended_at IS NULL`) cho từng Expert 1 lần, rồi chọn `min(...)` theo `(active_count, active_count / max(max_active_reviews, 1))` bỏ qua `excluded_experts` và các Expert đã đầy `active_count >= max_active_reviews`.
- `admin_review_dispatch_service.py`:
  - `list_admin_reviews(page, limit, status, skill, expert_id, search)`
  - `admin_assign_review_request(request_id, target_expert_id, admin_user_id, note)`
    - Validate `request_id` tồn tại, `status not in ('completed', 'cancelled')`.
    - Validate `target_expert_id` tồn tại trong `expert_profiles` và `profiles.is_active == True`.
    - Nếu có assignment đang mở (`ended_at IS NULL`):
      - Nếu `expert_id == target_expert_id`: trả thông báo không đổi (idempotent) hoặc `400`.
      - Update assignment cũ: `ended_at = now_vn`, `end_reason = 'reassigned'`, `note = note or f"Admin {admin_user_id} reassigned"`.
    - Insert assignment mới (`request_id`, `attempt_id`, `expert_id = target_expert_id`, `assigned_at = now_vn`).
    - Update `review_requests.status = 'assigned'`.

## Related Code Files
- Modify: `backend/app/services/expert/dispatcher.py`
- Create: `backend/app/services/expert/admin_review_dispatch_service.py`
- Modify: `backend/app/schemas/admin.py`
- Modify: `backend/app/api/endpoints/admin.py`

## Implementation Steps
1. Sửa vòng lặp chọn Expert trong `backend/app/services/expert/dispatcher.py` sang Least-Loaded.
2. Tạo `backend/app/services/expert/admin_review_dispatch_service.py` với `list_admin_reviews()` và `admin_assign_review_request()`.
3. Thêm `AdminAssignReviewRequest` vào `backend/app/schemas/admin.py`.
4. Thêm 3 endpoint `/reviews`, `/reviews/{request_id}/assign`, `/reviews/auto-dispatch` vào `backend/app/api/endpoints/admin.py` với `Depends(require_admin)`.

## Success Criteria
- [ ] Gửi 2 yêu cầu liên tiếp khi các Expert đều rảnh sẽ phân bổ cho 2 Expert khác nhau (Least-Loaded).
- [ ] `GET /api/v1/admin/reviews` trả về đầy đủ `items`, `total`, và `experts`.
- [ ] `POST /api/v1/admin/reviews/{request_id}/assign` đóng assignment cũ với `end_reason = 'reassigned'` và gán được sang Expert dù `is_available = False`.

## Risk Assessment
- Nếu có nhiều `review_requests` cùng lúc, cần truy vấn batch (`in_`) `profiles`, `attempts`, `tests`, `review_assignments` thay vì N+1 query để tránh chậm API.
