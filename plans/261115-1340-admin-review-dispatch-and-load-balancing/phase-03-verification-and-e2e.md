---
phase: 3
title: "Kiểm thử API, TypeScript Build & Browser E2E"
status: pending
priority: P1
effort: "1h"
dependencies: ["01", "02"]
---

# Phase 03: Kiểm thử API, TypeScript Build & Browser E2E

## Overview
Kiểm tra toàn bộ luồng từ Backend API đến giao diện Admin `/admin/reviews` và cổng Expert bằng trình duyệt thật (`/ck:agent-browser`) để đảm bảo phân bổ Least-Loaded và Admin Reassign hoạt động chính xác 100%.

## Requirements
- Backend endpoint tests (Least-Loaded selection, Admin full-override assign/reassign, guard against `completed`).
- Frontend `npx tsc --noEmit` / `npm run build` pass.
- Browser E2E với tài khoản `admin@ieltsgrader.edu.vn` và `expert_9497@ieltsgrader.edu.vn`.

## Implementation Steps
1. Chạy unit/integration test kiểm tra `auto_dispatch_pending_requests()` chọn Expert ít tải nhất và `admin_assign_review_request()` ghi đúng `end_reason = 'reassigned'`.
2. Chạy `npx tsc --noEmit` trong `frontend/`.
3. Dùng `/ck:agent-browser` đăng nhập Admin -> vào `/admin/reviews` -> kiểm tra hiển thị request `177b14d8` (`attempt_id = 166dde56`) -> test chức năng lọc và chuyển giao -> kiểm tra Expert Portal.

## Success Criteria
- [ ] 0 lỗi TypeScript / Python runtime.
- [ ] Xác minh trực quan qua ảnh chụp `/admin/reviews` hoạt động mượt, không lỗi console/network.
