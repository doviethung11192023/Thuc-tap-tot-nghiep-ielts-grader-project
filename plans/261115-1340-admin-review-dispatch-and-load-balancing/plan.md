---
title: "Admin Review Dispatch Dashboard & Least-Loaded Auto-Dispatch"
plan_id: "261115-1340-admin-review-dispatch-and-load-balancing"
date: "2026-11-15"
version: "1.0.0"
status: "ready"
priority: "P1"
authors: ["Antigravity AI (@backend-specialist, @frontend-specialist)"]
---

# KẾ HOẠCH TRIỂN KHAI: QUẢN LÝ & ĐIỀU PHỐI CHẤM BÀI CHUYÊN GIA (ADMIN `/admin/reviews`)

## 1. Bối cảnh & Mục tiêu
- **Vấn đề hiện tại:**
  1. `auto_dispatch_pending_requests()` trong `backend/app/services/expert/dispatcher.py` dùng thuật toán **First-Match** (duyệt tuần tự `expert_profiles` và dừng ở Expert đầu tiên còn slot), khiến toàn bộ bài mới bị dồn vào một Expert đứng đầu danh sách (`expert_15574@ieltsgrader.edu.vn`) thay vì chia đều.
  2. Cổng Admin (`frontend/src/components/layout/AdminSidebar.tsx`, `backend/app/api/endpoints/admin.py`) **chưa có màn hình hay API nào** để theo dõi `review_requests` / `review_assignments` (bài đang ở đâu, trạng thái nào) hoặc gán/chuyển bài thủ công sang Expert khác.
- **Giải pháp đã chốt (Phương án A — Hybrid + Admin Toàn Quyền):**
  1. Nâng cấp `auto_dispatch_pending_requests()` sang **Least-Loaded** (ưu tiên Expert có ít bài đang mở nhất).
  2. Tạo trang Admin **`/admin/reviews` ("Điều phối Chấm bài")** + API backend cho phép Admin xem toàn bộ yêu cầu chấm, lịch sử phân công, và **toàn quyền gán / chuyển giao (`reassign`)** sang bất kỳ Expert nào đang hoạt động (`is_active = True`), kể cả khi Expert đó đang bật `is_available = False` hoặc đã đạt/vượt `max_active_reviews` (có cảnh báo trực quan trên UI).
  3. **Zero New Tables:** Tận dụng 100% bảng `review_requests`, `review_assignments` (với `end_reason = 'reassigned'`), `expert_profiles`, `profiles`, `attempts`.

## 2. Danh sách Phase

| Phase | Tên Phase | Độ ưu tiên | Trạng thái | File chi tiết |
| --- | --- | --- | --- | --- |
| 01 | Backend: Least-Loaded Dispatcher & Admin Review APIs | P1 | `pending` | [phase-01-backend-dispatcher-and-admin-apis.md](./phase-01-backend-dispatcher-and-admin-apis.md) |
| 02 | Frontend: Admin Sidebar & Trang `/admin/reviews` | P1 | `pending` | [phase-02-frontend-admin-reviews-ui.md](./phase-02-frontend-admin-reviews-ui.md) |
| 03 | Kiểm thử API, TypeScript Build & Browser E2E | P1 | `pending` | [phase-03-verification-and-e2e.md](./phase-03-verification-and-e2e.md) |

## 3. Rủi ro & Biện pháp kiểm soát
- **Rủi ro ghi đè bài đã chấm xong:** Chặn cứng `POST /admin/reviews/{request_id}/assign` nếu `review_requests.status` là `completed` hoặc `cancelled` (trả `400`).
- **Rủi ro Expert cũ đang viết bản nháp (`draft`):** Khi chuyển giao (`reassign`), đóng assignment cũ với `ended_at = now()`, `end_reason = 'reassigned'` và `note` ghi rõ Admin nào đã chuyển; hiển thị cảnh báo trên UI nếu assignment cũ đã có `started_at`.
- **Modularization:** Không nhồi thêm logic vào `dispatcher.py` (đã 416 dòng); tách nghiệp vụ Admin dispatch sang `backend/app/services/expert/admin_review_dispatch_service.py`.
