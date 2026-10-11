---
phase: 7
title: "Learning Dashboard, Goals & Band Analytics"
status: pending
priority: P1
effort: "5 days"
dependencies: ["2", "3", "4", "5"]
---

# Phase 07: Learning Dashboard, Goals & Band Analytics

## Overview
Nâng cấp Dashboard học viên thành trung tâm quản lý học tập thông minh: thiết lập mục tiêu điểm số IELTS (Target Overall Band & từng kỹ năng), đếm ngược ngày thi thực tế, phân tích xu hướng tiến bộ qua biểu đồ trực quan (Recharts), và gợi ý các kỹ năng/dạng bài cần cải thiện gấp.

## Requirements
- Functional:
  - **Mục tiêu cá nhân hóa (Goal Setting):**
    - Học viên chọn ngày thi dự kiến (Intended Test Date).
    - Học viên đặt mục tiêu Band điểm mong muốn cho Overall, Reading, Listening, Writing, Speaking.
    - Thanh tiến độ (Progress Bar) thể hiện khoảng cách giữa Band hiện tại và Band mục tiêu.
  - **Phân tích Năng lực Tổng quát (Skill Radar / Spider Chart):**
    - Biểu đồ radar thể hiện độ cân bằng giữa 4 kỹ năng (R, L, W, S).
    - Biểu đồ đường xu hướng (Trend Line) thể hiện lịch sử điểm số qua các lần làm bài gần nhất.
  - **Khu vực Đề xuất Trọng tâm (Focus Recommendations):**
    - Hệ thống tự động phân tích: kỹ năng nào đang thấp hơn mục tiêu nhiều nhất để gợi ý bài luyện tập ưu tiên.
    - Thống kê các dạng câu hỏi hay làm sai nhất (ví dụ: Reading hay sai T/F/NG; Writing hay bị trừ điểm Coherence & Cohesion).
  - **Admin Global Analytics:**
    - Tổng số người dùng hoạt động, số lượt nộp bài mỗi ngày, phân phối điểm trung bình của toàn hệ thống.
- Non-functional:
  - Dashboard tải nhanh ($< 1$ giây), dữ liệu thống kê được tính toán trước (aggregated) hoặc cache qua Redis.

## Architecture
```
[Learner Profile & Attempt Records]
                 │
                 ▼
[Backend Aggregation Service: GET /api/analytics/progress]
   ├── Tính toán Band trung bình 5 lần thi gần nhất
   ├── Tính chênh lệch: (Current Band - Target Band)
   └── Xác định dạng câu hỏi có tỷ lệ đúng < 50%
                 │
                 ▼
[Frontend Dashboard: Recharts]
   ├── Target vs Current Comparison Cards
   ├── Skill Radar Chart (Balance 4 skills)
   ├── Score History Line Chart
   └── Recommended Next Practice Actions
```

## Related Code Files
- Create:
  - `backend/app/api/endpoints/analytics.py`
  - `backend/app/services/analytics_service.py`
  - `frontend/src/components/dashboard/GoalSettingModal.tsx`
  - `frontend/src/components/dashboard/SkillRadarChart.tsx`
  - `frontend/src/components/dashboard/ProgressTrendChart.tsx`
  - `frontend/src/components/dashboard/WeaknessAlertCard.tsx`
- Modify:
  - `frontend/src/app/(student)/dashboard/page.tsx` (Tái thiết kế toàn diện)
  - `frontend/src/app/admin/statistics/page.tsx` (Mở rộng thống kê 4 kỹ năng)

## Implementation Steps
1. **Backend Analytics Service:**
   - Viết truy vấn tổng hợp: lấy điểm số các bài thi theo kỹ năng của user, tính trung bình động (Moving Average) và phân loại theo dạng bài.
   - Endpoint `GET /api/analytics/learner-summary`: trả về mục tiêu, band hiện tại, số ngày còn lại đến kỳ thi, danh sách các bài thi gần nhất.
2. **Component Đặt mục tiêu (Goal Setting):**
   - Modal cho phép học viên điều chỉnh Target Band (từ 4.0 đến 9.0) và ngày thi.
   - Lưu mục tiêu về `learner_profiles` trên Supabase.
3. **Biểu đồ Trực quan hóa (Recharts):**
   - Tích hợp biểu đồ Radar (`RadarChart`) thể hiện năng lực 4 kỹ năng.
   - Tích hợp biểu đồ đường (`LineChart`) theo dõi biến động điểm số theo dòng thời gian.
4. **Thuật toán Gợi ý Học tập (Recommendation Engine):**
   - Viết hàm logic đơn giản: so sánh điểm từng kỹ năng với mục tiêu, chọn ra kỹ năng yếu nhất và truy vấn 3 bài luyện tập tương ứng từ ngân hàng câu hỏi để đưa lên đầu Dashboard.

## Success Criteria
- [ ] Dashboard hiển thị đầy đủ thông tin mục tiêu, ngày đếm ngược và biểu đồ tiến độ của học viên.
- [ ] Sau khi học viên hoàn thành thêm 1 bài thi (Reading/Listening/Writing/Speaking), biểu đồ tự động cập nhật điểm mới.
- [ ] Khối "Đề xuất bài luyện tập tiếp theo" hiển thị bài tập thuộc kỹ năng học viên đang có điểm thấp nhất.

## Risk Assessment
- *Nguy cơ:* Tính toán thống kê phức tạp gây chậm database khi số lượng bản ghi `test_attempts` lớn.
- *Giải pháp:* Lưu sẵn điểm tóm tắt trong bảng `skill_progress` mỗi khi hoàn thành bài thi (cập nhật gia tăng - incremental update) thay vì quét toàn bộ bảng lịch sử mỗi lần tải trang.
