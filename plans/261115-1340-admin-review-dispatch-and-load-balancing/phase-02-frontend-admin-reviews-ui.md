---
phase: 2
title: "Frontend: Admin Sidebar & Trang /admin/reviews"
status: pending
priority: P1
effort: "2h"
dependencies: ["01"]
---

# Phase 02: Frontend: Admin Sidebar & Trang /admin/reviews

## Overview
Thêm mục điều hướng **"Điều phối Chấm bài"** vào `AdminSidebar.tsx` và xây dựng trang `/admin/reviews` để Admin quan sát trực quan bài đang ở đâu, lọc theo trạng thái/kỹ năng/chuyên gia, và mở Modal gán/chuyển bài toàn quyền.

## Requirements
- **Functional:**
  1. Sidebar Admin có thêm link `/admin/reviews`.
  2. Trang `/admin/reviews` hiển thị:
     - 4 thẻ thống kê nhanh: `Chờ phân bổ (pending)`, `Đang chấm (assigned/in_progress)`, `Đã hoàn thành (completed)`, `Expert sẵn sàng`.
     - Thanh lọc: tìm kiếm theo `request_id`/`attempt_id`/email học viên, lọc trạng thái, lọc kỹ năng (`writing`/`speaking`), nút `Làm mới`, và nút `Phân bổ tự động` (khi có bài `pending`).
     - Bảng danh sách yêu cầu chấm: Mã yêu cầu / Attempt, Học viên, Đề thi & Kỹ năng, Trạng thái, Chuyên gia đang giữ (hoặc chưa gán), Thời gian, Nút **"Gán / Chuyển Expert"** (ẩn/disable nếu `completed`/`cancelled`).
     - Modal **"Gán / Chuyển Chuyên gia"**: hiển thị danh sách tất cả Expert đang `is_active = True`, hiện rõ tải `active_open / max_active_reviews`, badge trạng thái (`Sẵn sàng`, `Đang tạm nghỉ`, `Đầy tải`), cảnh báo nhẹ nếu Admin chọn Expert đang tạm nghỉ/đầy tải hoặc nếu Expert cũ đã mở bản nháp (`started_at != null`), ô nhập ghi chú lý do chuyển, và nút xác nhận.
- **Non-functional:**
  - Giao diện đồng bộ với phong cách Admin hiện tại (`zinc-*`, `#932120` brand accent, clean cards, không dùng màu tím).
  - Tách component Modal thành file riêng để giữ code dễ đọc.

## Architecture
- `frontend/src/services/admin-reviews.ts`: client calls tới `/api/v1/admin/reviews`, `/api/v1/admin/reviews/{id}/assign`, `/api/v1/admin/reviews/auto-dispatch`.
- `frontend/src/components/layout/AdminSidebar.tsx`: thêm nav item `/admin/reviews`.
- `frontend/src/components/admin/AdminAssignExpertModal.tsx`: Modal chọn Expert với cảnh báo override toàn quyền.
- `frontend/src/app/admin/reviews/page.tsx`: Trang chính quản lý & điều phối.

## Related Code Files
- Create: `frontend/src/services/admin-reviews.ts`
- Modify: `frontend/src/components/layout/AdminSidebar.tsx`
- Create: `frontend/src/components/admin/AdminAssignExpertModal.tsx`
- Create: `frontend/src/app/admin/reviews/page.tsx`

## Implementation Steps
1. Tạo `frontend/src/services/admin-reviews.ts` với TypeScript interfaces đầy đủ.
2. Cập nhật `navItems` trong `frontend/src/components/layout/AdminSidebar.tsx`.
3. Tạo `frontend/src/components/admin/AdminAssignExpertModal.tsx` hiển thị toàn bộ Expert kèm tải & badge override.
4. Tạo `frontend/src/app/admin/reviews/page.tsx` kết nối API, bộ lọc, bảng dữ liệu, và toast thông báo.

## Success Criteria
- [ ] Admin truy cập `/admin/reviews` từ Sidebar thấy đầy đủ danh sách yêu cầu chấm và Expert đang giữ bài.
- [ ] Admin mở Modal chọn được cả Expert đang `is_available = False` và chuyển bài thành công, bảng cập nhật ngay lập tức.
- [ ] `npm run build` / TypeScript không có lỗi.
