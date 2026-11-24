---
phase: 2
title: "Backend: Bộ Tổng hợp Tiến độ Hàng tháng (Monthly Evolution), Criterion Mastery & Admin APIs"
status: pending
priority: P1
effort: "4h"
dependencies: [1]
---

# Phase 2: Backend — Bộ Tổng hợp Tiến độ Hàng tháng, Tiêu chí W/S & Admin APIs

## Overview
Xây dựng module tổng hợp tiến độ biến động theo từng tháng (`YYYY-MM` chuẩn giờ Việt Nam `UTC+7`), bảng điểm 8 tiêu chí Writing/Speaking, nâng cấp chẩn đoán AI thực tế dựa trên dữ liệu, và mở rộng API cho Admin quản trị cấu hình Lộ trình + xem báo cáo tiến bộ học viên toàn hệ thống theo tháng.

## Requirements
- **Functional**:
  - Tổng hợp chuỗi thời gian theo từng tháng (`monthly_progression`, tối đa 12 tháng gần nhất) với Band trung bình tháng (`overall`, `listening`, `reading`, `writing`, `speaking`), `month_over_month_delta`, `mock_count`, `practice_count`, `study_hours`, `lr_accuracy_percent`, cờ `is_provisional` (`< 2` bài có điểm trong tháng), `best_improved_skill`, và `monthly_insight` (giải thích nguyên nhân biến động).
  - Cung cấp bảng đối chiếu tháng hiện tại vs. tháng trước (`monthly_scorecard`).
  - Tổng hợp 8 tiêu chí Writing (`TA/TR, CC, LR, GRA`) và Speaking (`FC, LR, GRA, P`) kèm điểm trung bình 5 bài gần nhất và delta so với giai đoạn trước.
  - Cho phép `PUT /api/v1/admin/core/settings/{key}` hỗ trợ upsert cho key `roadmap_config` và trả về giá trị mặc định trong `GET /api/v1/admin/core/settings` ngay cả khi DB chưa seed dòng này.
  - Trả về `monthly_cohort_progression` (6 tháng gần nhất: band trung bình toàn hệ thống, số học viên hoạt động, tổng lượt thi đạt mục tiêu) trong `get_system_statistics()`.
- **Non-functional**:
  - Mỗi file `< 200 LOC`. Không tạo thêm bảng DB ngoài 33 bảng chuẩn (`ADR-09`).

## Related Code Files
- Create: `backend/app/services/learning_profile/monthly_aggregator.py`
- Modify: `backend/app/services/learning_profile/overview_aggregator.py`
- Modify: `backend/app/services/learning_profile/practice_aggregator.py`
- Modify: `backend/app/api/endpoints/admin_content/core.py`
- Modify: `backend/app/services/admin/system_statistics.py`

## Implementation Steps
1. **Tạo `monthly_aggregator.py` (< 185 LOC)**:
   - Quy đổi `submitted_at` / `started_at` sang múi giờ `Asia/Ho_Chi_Minh` (`UTC+7`) để tách khóa tháng `YYYY-MM` (tránh lệch ngày 01 đầu tháng).
   - Tính cho từng tháng:
     - `overall_band`, `listening`, `reading`, `writing`, `speaking` (trung bình hợp lệ `> 0`, riêng `mock_band` tính riêng để hỗ trợ toggle).
     - `mock_count`, `practice_count`, `total_tests`.
     - `study_hours`: tận dụng kết quả `compute_daily_active_minutes(attempts)` gom theo tháng `YYYY-MM`.
     - `lr_accuracy_percent`: tính `%` câu `is_correct = True` của L/R trong tháng (chỉ số quá trình).
     - `is_provisional = (scored_count < min_attempts_confidence)` (vá Lỗ hổng #5).
     - `month_over_month_delta`: chênh lệch `overall_band` so với tháng có dữ liệu liền trước.
     - `monthly_insight`: sinh 1 câu giải thích sư phạm rõ ràng (ví dụ: *"Tháng 11 ghi nhận tỷ lệ bài Thi thử Mock cao hơn (+40%), nên band phản ánh sát phòng thi thực tế hơn"* hoặc *"Tháng mới chỉ có 1 bài — cần thêm ít nhất 1 bài nữa để ổn định xu hướng"*).
   - Tạo `compute_criterion_mastery(user_id, attempts)` từ `user_criterion_scores`: gom theo `(skill, code)` tính trung bình 5 bài gần nhất vs. trước đó để ra `avg_band`, `delta`, `sample_count`.
2. **Tích hợp vào `overview_aggregator.py` & `practice_aggregator.py`**:
   - `overview_aggregator.py`: đính kèm `monthly_progression` và `monthly_scorecard` (tháng hiện tại vs. tháng trước) vào response của `GET /api/v1/test-practice/learning-profile` (tái sử dụng từ cùng batch `attempts` nên không tốn thêm round-trip chính).
   - `practice_aggregator.py`: đính kèm `monthly_progression`, `criterion_mastery`, và nâng cấp `make_note(...)` (lỗ hổng nhận xét sáo rỗng) để trích dẫn thẳng điểm yếu cụ thể (tên dạng câu hỏi hoặc mã tiêu chí thấp nhất + %/band thực tế).
3. **Nâng cấp `admin_content/core.py`**:
   - Định nghĩa `DEFAULT_ROADMAP_CONFIG` trong module/helper.
   - Trong `get_system_settings()`: nếu chưa có key `roadmap_config` trong DB thì bổ sung ảo bản mặc định vào danh sách trả về để Frontend Admin luôn có sẵn form chỉnh.
   - Trong `update_system_setting(key, value)`: cho phép `upsert` khi `key in {"roadmap_config"}` thay vì trả 404 như hiện tại (vẫn giữ validate schema dương cho các số nguyên `mock_window`, `practice_window`, `min_attempts_confidence`, `recent_exclude_days`, `recommended_count`, `tests_per_half_band`).
   - Gọi `clear` cache toàn bộ `overview_*` / `practice_*` (hoặc reset `_cache` trong `common.py`) khi Admin cập nhật `roadmap_config`.
4. **Nâng cấp `system_statistics.py`**:
   - Bổ sung hàm `_compute_monthly_cohort(months=6)`: truy vấn nhẹ bảng `attempt_results` trong 6 tháng qua (`submitted_at >= 6 months ago`, `status = 'scored'`), gom theo tháng `YYYY-MM` (`UTC+7`) trả về `month`, `avg_band`, `active_learners`, `scored_attempts`, `mock_attempts`.
   - Đính kèm trường `monthly_cohort_progression` vào output của `get_system_statistics()`.

## Success Criteria
- [ ] `monthly_progression` phân nhóm đúng các bài làm cuối tháng theo giờ Việt Nam (`UTC+7`) và gắn `is_provisional = True` khi `< 2 bài/tháng`.
- [ ] `criterion_mastery` trả về đủ điểm trung bình và `delta` cho các tiêu chí Writing (`TA/TR, CC, LR, GRA`) & Speaking (`FC, LR, GRA, P`).
- [ ] Admin gọi `PUT /api/v1/admin/core/settings/roadmap_config` thành công kể cả khi key chưa tồn tại sẵn trong bảng `system_settings`, và cập nhật có hiệu lực ngay với API Learner.
- [ ] `/api/v1/admin/statistics` trả về thêm `monthly_cohort_progression` gồm 6 tháng gần nhất.

## Risk Assessment
- **Risk**: User mới có quá nhiều tháng trống liên tiếp (tháng 07 làm bài, tháng 08–10 nghỉ, tháng 11 quay lại).
- **Mitigation**: Giữ các tháng có hoạt động và tháng hiện tại kèm đánh dấu khoảng nghỉ tự nhiên; tính `month_over_month_delta` so với **tháng có dữ liệu gần nhất trước đó** để không bị chia/trừ với `0.0`.
