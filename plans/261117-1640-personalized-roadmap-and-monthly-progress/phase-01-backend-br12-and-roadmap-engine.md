---
phase: 1
title: "Backend: Chuẩn hóa BR-12, Metadata Readers & Engine Lộ trình Cá nhân hóa (BR-17)"
status: pending
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Backend — Chuẩn hóa `BR-12`, Readers Mở rộng & Engine Lộ trình Cá nhân hóa (`BR-17`)

## Overview
Xây dựng tầng dữ liệu và thuật toán chẩn đoán cốt lõi giúp tính chính xác trình độ từng kỹ năng theo `BR-12`, vá lỗ hổng dự đoán điểm tổng `BR-02`, lấy đủ metadata đề thi + điểm tiêu chí W/S, sửa thuật toán tính tiến bộ dạng câu hỏi, và xuất ra Lộ trình Cá nhân hóa 3 tầng (Chặng Band + Điểm yếu & Chiến thuật + Bộ 3 Bài luyện Chiến lược + Nhịp độ tuần tự cân bằng).

## Requirements
- **Functional**:
  - Tính `skill_diagnostic_bands` cho `listening, reading, writing, speaking` theo `BR-12` (ưu tiên 3 bài Mock chính thức gần nhất; chưa có Mock chuẩn thì lấy 5 bài Practice gần nhất kèm nhãn `low` confidence; `< 2` bài thì trả `insufficient` và dùng `input_band` khi tính `predicted_overall`).
  - Đọc cả `preliminary_band` và `question_count` từ DB để minh bạch số bài đang `waiting_expert` (`NFR-06`).
  - Chia lộ trình thành các chặng bước đệm (`study_milestones`, cách nhau `0.5–1.0 band`).
  - Xác định kỹ năng ưu tiên (`BR-17`), dạng câu hỏi L/R hoặc tiêu chí W/S yếu nhất từ dữ liệu thực, kèm **Chiến lược làm bài 3 bước** và **Bộ 3 Bài luyện Chiến lược** (`Slot 1: Micro-Drill`, `Slot 2: Difficulty-Matched Practice`, `Slot 3: Mock Verification + Expert Review Reminder`), loại trừ đề đã làm trong `14` ngày gần nhất (hoặc số ngày Admin cấu hình).
  - Sửa thẻ `most_improved` trong `question_type_aggregator.py` dựa trên độ tăng trưởng thực tế $\Delta_{\text{acc}}$ theo thời gian.
  - Xóa cache Learning Profile khi learner lưu mục tiêu qua `PUT /api/v1/users/me/goals`.
- **Non-functional**:
  - Mỗi file backend `< 200 LOC`. Không N+1 query (batch load một lần). Thời gian tính toán `< 250ms` khi cache miss.

## Related Code Files
- Modify: `backend/app/services/practice/learning_profile_readers.py`
- Create: `backend/app/services/learning_profile/roadmap_strategies.py` (kho chiến lược làm bài theo từng `question_type` và `criterion_code` — giữ `roadmap_aggregator.py` < 200 LOC)
- Create: `backend/app/services/learning_profile/roadmap_aggregator.py`
- Modify: `backend/app/services/learning_profile/question_type_aggregator.py`
- Modify: `backend/app/services/learning_profile/overview_aggregator.py`
- Modify: `backend/app/api/endpoints/users.py`

## Implementation Steps
1. **Nâng cấp `learning_profile_readers.py`**:
   - Trong `user_attempts(user_id)`: select thêm `question_count` từ `attempts`, `preliminary_band` từ `attempt_results`, và `difficulty, source_name` từ `tests`.
   - Bổ sung `published_tests_with_metadata()`: đọc các đề `status = 'published'` kèm `id, title, skill, duration_minutes, difficulty, source_name`, join nhẹ `sections -> lr_sections(question_groups(question_type, subtype))` và `writing_tasks(task_type)` để gán danh sách `question_types: set[str]` và `task_types: set[str]` cho mỗi đề.
   - Bổ sung `user_criterion_scores(attempt_ids)`: batch query `evaluations(id, attempt_id, evaluator_type, is_official)` và `criterion_scores(evaluation_id, band, criteria(code, name, skill))` ưu tiên đánh giá `is_official = true` (hoặc AI nếu đang chờ Expert).
   - Bổ sung `get_roadmap_config()`: đọc bảng `system_settings` với `key = 'roadmap_config'`, fallback an toàn về:
     `{"mock_window": 3, "practice_window": 5, "min_attempts_confidence": 2, "recent_exclude_days": 14, "recommended_count": 3, "tests_per_half_band": 6}`.
2. **Tạo `roadmap_strategies.py` (< 120 LOC)**:
   - Chứa bảng ánh xạ chuẩn (`dict`) từ `question_type` (`true_false_not_given`, `matching`, `completion`, `multiple_choice`, `short_answer`) và `criterion_code` (`TA`, `TR`, `CC`, `LR`, `GRA`, `FC`, `P`) ra tiêu đề ngắn, mô tả chẩn đoán, và **3 bước chiến thuật luyện đề cụ thể** bằng tiếng Việt chuẩn IELTS.
3. **Tạo `roadmap_aggregator.py` (< 195 LOC)**:
   - `compute_br12_skill_profile(attempts, goal, cfg)`: Trả về `skill_diagnostics` cho cả 4 kỹ năng (`current_band`, `target_band`, `gap`, `confidence: 'high' | 'low' | 'insufficient'`, `confidence_label`, `attempts_count`, `mock_count`, `waiting_expert_count`, `preliminary_avg`).
   - Tính `predicted_overall` theo `BR-02`: lấy trung bình đúng 4 kỹ năng (kỹ năng nào `insufficient` thì lấy `goal["input_band"]` làm nền tạm thời — vá Lỗ hổng #1).
   - Chọn `priority_skill` theo `BR-17` (ưu tiên `insufficient` cần chẩn đoán hoặc `max(target_skill - current_skill)`).
   - Tìm điểm yếu cốt lõi trong 5 bài gần nhất của `priority_skill`:
     - Nếu `listening`/`reading`: gọi dữ liệu câu trả lời để tìm `question_type` có tỷ lệ đúng thấp nhất (`min_questions >= 3` hoặc thấp nhất hiện có).
     - Nếu `writing`/`speaking`: đọc `user_criterion_scores` để tìm tiêu chí (`TA/TR/CC/LR/GRA/FC/P`) có trung bình thấp nhất.
   - Chọn **3 Bài luyện Chiến lược (`recommended_tests`)** từ `published_tests_with_metadata()`:
     - Loại bỏ `test_id` đã xuất hiện trong `attempts` ở `recent_exclude_days` ngày qua (nếu cạn đề thì nới điều kiện chọn đề làm lâu nhất theo `UC-06`).
     - Gán nhãn vai trò cho từng slot: Slot 1 = `Targeted Micro-Drill` (`source_name == 'micro_exercise'` & chứa dạng yếu), Slot 2 = `Difficulty-Matched Practice` (khớp band hiện tại), Slot 3 = `Mock / Diagnostic Verification`.
   - Tính **Self-Healing Weekly Pacing** (`days_remaining`, `weeks_remaining`, `weekly_target_tests`, `completed_this_week`, `pacing_status`) và **`study_milestones`** (stepping stones từ `input_band` → `target_overall`).
4. **Sửa `question_type_aggregator.py`**:
   - Cập nhật `_extract_highlights`: đối với mỗi `(type_name, skill)` có $\ge 4$ câu trả lời (hoặc $\ge 2$ lượt với W/S), chia theo thời gian `submitted_at/started_at` thành nửa cũ và nửa mới, tính `delta_pct = round(acc_new - acc_old)`. Chọn dạng bài có `delta_pct > 0` cao nhất làm `most_improved` (vá Lỗ hổng #2).
5. **Cập nhật `overview_aggregator.py` & `users.py`**:
   - Gắn `roadmap`, `study_milestones`, `skill_diagnostics` và cập nhật `goals.predicted_band` trong `overview_aggregator.py`.
   - Thêm `invalidate_user_profile_cache(user["id"])` vào `update_my_goals` trong `users.py`.

## Success Criteria
- [ ] Gọi `compute_learning_profile_overview(user_id)` với user chỉ mới làm 1 bài ngắn 5 câu Reading cho kết quả `predicted_band` neo theo `input_band` (không nhảy vọt lên 8.0–9.0), Listening/Writing/Speaking được đánh dấu `insufficient` & gợi ý bài Chẩn đoán.
- [ ] `recommended_tests` trả về tối đa 3 đề thật đã publish, không trùng đề vừa làm trong 14 ngày (trừ khi hết kho đề).
- [ ] Bài Mock đang `waiting_expert` được đếm và hiển thị `preliminary_avg` rõ ràng.
- [ ] Cập nhật goal từ `/profile` (`PUT /api/v1/users/me/goals`) làm mới dữ liệu ngay tại `/learning-profile`.

## Risk Assessment
- **Risk**: User mới chưa có dữ liệu `answers` hoặc `criterion_scores` dẫn đến `weakest_area` rỗng.
- **Mitigation**: Tự động chuyển sang trạng thái `diagnostic_mode = True` với lời khuyên làm bài Chẩn đoán tổng quan kỹ năng ưu tiên và chiến lược khởi động chuẩn `input_band`.
