---
phase: 4
title: "Frontend Admin & Kiểm thử Toàn diện (TypeCheck, Purple Ban, LOC Audit, E2E Browser)"
status: pending
priority: P1
effort: "3h"
dependencies: [2, 3]
---

# Phase 4: Frontend Admin (`/admin/settings`, `/admin/statistics`) & Kiểm thử Toàn diện

## Overview
Hoàn thiện giao diện quản trị để Admin trực tiếp điều chỉnh tham số thuật toán Lộ trình & Chẩn đoán và theo dõi tăng trưởng Band học viên toàn hệ thống theo từng tháng; đồng thời thực hiện rà soát chất lượng mã nguồn, TypeScript, và kiểm thử E2E trên trình duyệt thật.

## Requirements
- **Functional**:
  - Tại `/admin/settings`: thêm tab `"Lộ trình & Chẩn đoán"` hiển thị form cấu hình `roadmap_config` thân thiện (`mock_window`, `practice_window`, `min_attempts_confidence`, `recent_exclude_days`, `recommended_count`, `tests_per_half_band`) kèm mô tả tác dụng của từng tham số và nút "Lưu cấu hình" gọi `PUT /api/v1/admin/core/settings/roadmap_config`.
  - Tại `/admin/statistics`: bổ sung biểu đồ **Tiến độ Band Học viên theo Tháng (`monthly_cohort_progression`)** hiển thị Band trung bình hệ thống, số lượt bài đã chấm và số học viên tích cực qua 6 tháng gần nhất.
- **Non-functional**:
  - `npx tsc --noEmit` tại `frontend/` đạt `0` lỗi.
  - Quét `purple|violet|indigo` trong các file frontend vừa sửa/tạo trả về `0` kết quả.
  - Tất cả file mới/sửa đều `< 200 LOC`.

## Related Code Files
- Create: `frontend/src/components/admin/AdminRoadmapConfigTab.tsx`
- Modify: `frontend/src/app/admin/settings/page.tsx`
- Modify: `frontend/src/app/admin/statistics/page.tsx`

## Implementation Steps
1. **Tạo `AdminRoadmapConfigTab.tsx` (< 175 LOC)**:
   - Fetch/nhận cấu hình `roadmap_config` từ `GET /api/v1/admin/core/settings`.
   - Hiển thị 6 trường số có validate biên hợp lý:
     - `mock_window` (1–10 bài Mock gần nhất để tính `BR-12`, mặc định `3`).
     - `practice_window` (1–15 bài Practice dự phòng, mặc định `5`).
     - `min_attempts_confidence` (1–5 bài tối thiểu để kết luận trình độ/tháng, mặc định `2`).
     - `recent_exclude_days` (1–60 ngày không lặp lại đề vừa làm, mặc định `14`).
     - `recommended_count` (1–5 đề gợi ý cùng lúc, mặc định `3`).
     - `tests_per_half_band` (2–20 bài định mức để tăng 0.5 band, mặc định `6`).
   - Nút **Khôi phục mặc định** và **Lưu cấu hình Lộ trình** gọi `PUT /api/v1/admin/core/settings/roadmap_config`, hiện toast xác nhận.
2. **Tích hợp vào `frontend/src/app/admin/settings/page.tsx` & `statistics/page.tsx`**:
   - Trong `admin/settings/page.tsx`: thêm nút chuyển tab `"Lộ trình & Chẩn đoán"` (`"roadmap"`) bên cạnh `"band"` và `"settings"`.
   - Trong `admin/statistics/page.tsx`: thêm card biểu đồ Recharts `ComposedChart` hiển thị `monthly_cohort_progression` từ `/api/v1/admin/statistics`.
3. **Chạy Kiểm thử & Kiểm toán Chất lượng (Verification Gate)**:
   - Chạy `cd frontend; npx tsc --noEmit`.
   - Kiểm tra độ dài dòng code của tất cả file vừa tạo/sửa (`< 200 LOC`).
   - Quét Regex kiểm tra **Purple Ban** trên toàn bộ file mới/sửa.
   - Chạy kiểm thử backend bằng Python/Pytest cho các case:
     1. Cold-start (0 bài).
     2. 1 bài ngắn 5 câu Reading 9.0 (xác minh `predicted_band` không ảo giác).
     3. Đủ 3 bài Mock + dữ liệu nhiều tháng (`UTC+7`) + `waiting_expert`.
     4. Admin cập nhật `roadmap_config` và xóa cache.
   - Khởi động lại / kiểm tra các service và chạy E2E trình duyệt (`ck:agent-browser`) nếu Chrome remote debugging sẵn sàng, chụp screenshot nghiệm thu giao diện Learner (`/learning-profile`, `/test-practice`) & Admin (`/admin/settings`, `/admin/statistics`).

## Success Criteria
- [ ] Admin chỉnh sửa & lưu `roadmap_config` thành công ở `/admin/settings` mà không cần sửa JSON thô.
- [ ] `/admin/statistics` hiển thị biểu đồ xu hướng Band & số học viên 6 tháng gần nhất.
- [ ] `npx tsc --noEmit` pass (exit code 0), `< 200 LOC` mọi file, 0 vi phạm Purple Ban, và toàn bộ test backend pass.

## Risk Assessment
- **Risk**: `admin/statistics/page.tsx` hoặc `admin/settings/page.tsx` tiến sát giới hạn 200 LOC khi thêm block mới.
- **Mitigation**: Tách biểu đồ Cohort thành component con `AdminMonthlyCohortChart.tsx` nếu `admin/statistics/page.tsx` vượt 185 dòng code.
