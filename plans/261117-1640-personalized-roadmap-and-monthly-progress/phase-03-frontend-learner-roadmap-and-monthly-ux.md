---
phase: 3
title: "Frontend Learner: Giao diện Lộ trình Cá nhân hóa, Theo dõi Hàng tháng & UI/UX Pro Max"
status: pending
priority: P1
effort: "5h"
dependencies: [1, 2]
---

# Phase 3: Frontend Learner — Giao diện Lộ trình Cá nhân hóa & Theo dõi Hàng tháng (`/ck:ui-ux-pro-max`)

## Overview
Triển khai trọn vẹn trải nghiệm cá nhân hóa và theo dõi tiến bộ hàng tháng cho học viên tại `/learning-profile`, `/test-practice`, và `/test-practice/history`. Mọi component tuân thủ `< 200 LOC`, **Strict Purple Ban** (`#932120`, `#2563eb`, `#10b981`, `#f59e0b`, `#18181b`), và phân tầng thông tin chống quá tải nhận thức (`Progressive Disclosure`).

## Requirements
- **Functional**:
  - `GoalSetterModal.tsx`: cho phép chỉnh sửa `input_band`, `target_overall`, **4 band mục tiêu từng kỹ năng** (`target_listening`, `target_reading`, `target_writing`, `target_speaking`), và `test_date`.
  - `LearningProfileBanner.tsx`: hiển thị 3 mốc Band (`Đầu vào → Hiện tại BR-12 → Mục tiêu`), badge độ tin cậy (`Chuẩn Thi Thử` / `Ước lượng Luyện tập` / `Cần chẩn đoán`), thông báo bài đang `waiting_expert` (`NFR-06`), đếm ngược `days_remaining` và **Thanh Nhịp độ Tuần Tự Cân Bằng (`Self-Healing Weekly Pacing`)**.
  - `PersonalizedRoadmapSection.tsx`: hiển thị Chặng Mốc Band (`study_milestones`), Kỹ năng Ưu tiên + Bằng chứng điểm yếu, **Hộp Chiến thuật Làm bài 3 Bước**, nhắc suất **Chấm Chuyên Gia (Expert Review Quota)** cho W/S, và **Bộ 3 Bài luyện Chiến lược (Smart Practice Trio)** kèm nút *"Vào luyện ngay →"*.
  - `MonthlyProgressSection.tsx`: hiển thị 4 thẻ Scorecard Tháng này vs. Tháng trước, biểu đồ Recharts `ComposedChart` (`Line` Band thực tế + `ReferenceLine` Target Band + `Bar` số đề hoàn thành mỗi tháng) có bộ lọc `Overall | Listening | Reading | Writing | Speaking` & chế độ `Tất cả | Thi thử | Luyện tập`, hộp **Smart Delta Explainer**, và bảng đối chiếu từng tháng.
  - `CriterionMasteryCards.tsx`: hiển thị tiến độ 4 tiêu chí Writing & 4 tiêu chí Speaking trên `TestPracticeTab.tsx`.
  - `PracticeHistorySidebarWidget.tsx`: thêm thẻ rút gọn **"Nhiệm vụ Lộ trình Hôm nay"** ở trang `/test-practice`.
  - Dọn dẹp toàn bộ mock fallback (`5.5`/`5.0` giả) trong `PracticeHistoryRadarCard.tsx` và `PracticeQuestionTypeAccuracyCard.tsx`.
- **Non-functional**:
  - Mỗi file `.tsx`/`.ts` `< 200 LOC`. Không dùng `purple`, `violet`, `indigo` trong Tailwind class hoặc mã màu. Responsive sạch trên mobile & desktop, đảm bảo contrast WCAG 4.5:1.

## Related Code Files
- Modify: `frontend/src/types/learning-profile.ts`
- Modify: `frontend/src/components/learning-profile/GoalSetterModal.tsx`
- Modify: `frontend/src/components/learning-profile/LearningProfileBanner.tsx`
- Create: `frontend/src/components/learning-profile/PersonalizedRoadmapSection.tsx`
- Create: `frontend/src/components/learning-profile/MonthlyProgressSection.tsx`
- Create: `frontend/src/components/learning-profile/CriterionMasteryCards.tsx`
- Modify: `frontend/src/components/learning-profile/OverviewTab.tsx`
- Modify: `frontend/src/components/learning-profile/TestPracticeTab.tsx`
- Modify: `frontend/src/components/exam/student-practice/PracticeHistorySidebarWidget.tsx`
- Modify: `frontend/src/components/exam/history/PracticeHistoryRadarCard.tsx`
- Modify: `frontend/src/components/exam/history/PracticeQuestionTypeAccuracyCard.tsx`

## Implementation Steps
1. **Cập nhật Type Contracts (`frontend/src/types/learning-profile.ts`)**:
   - Bổ sung `SkillDiagnosticBand`, `SmartRecommendedTest`, `WeeklyPacingSummary`, `PersonalizedRoadmap`, `MonthlyProgressionPoint`, `MonthlyScorecard`, `CriterionMasteryItem` và mở rộng `LearningProfileOverview` / `LearningProfileTestPractice`.
2. **Nâng cấp `GoalSetterModal.tsx` & `LearningProfileBanner.tsx`**:
   - `GoalSetterModal`: Thêm 4 input `number`/`select` (bước 0.5, từ 1.0–9.0) cho 4 kỹ năng bên cạnh `input_band`, `target_overall`, `test_date`, lưu đồng thời vào `PUT /api/v1/test-practice/learning-profile/goals` và `PUT /api/v1/users/me/goals` (hoặc payload hợp nhất trên `analytics.py`).
   - `LearningProfileBanner`: Hiển thị badge độ tin cậy cạnh `predicted_band`, cảnh báo số bài `waiting_expert` nếu `> 0`, số ngày còn lại tới `test_date`, và thanh `completed_this_week / weekly_target_tests` (`Đúng tiến độ` / `Cần tăng tốc`).
3. **Tạo `PersonalizedRoadmapSection.tsx` (< 185 LOC)**:
   - Bố cục 2 cột / 3 khối gọn gàng:
     - **Hàng trên**: Track các chặng mốc Band (`StudyMilestone[]`: `4.0 → 5.0 → 6.0 → 6.5`), tô xanh Emerald chặng đã qua, đỏ PTIT `#932120` chặng đang chạy kèm `%` tiến độ.
     - **Cột trái**: Thẻ **Chẩn đoán Trọng tâm** — Tên kỹ năng ưu tiên, khoảng cách tới mục tiêu (`gap`), điểm yếu cụ thể (dạng câu hoặc tiêu chí + con số thực tế), **3 bước chiến thuật làm bài**, và nhắc dùng suất Chuyên gia nếu kỹ năng ưu tiên là Writing/Speaking.
     - **Cột phải**: **Bộ 3 Bài luyện Đề xuất** (Slot 1: *Chữa điểm nghẽn*, Slot 2: *Rèn sức bền*, Slot 3: *Kiểm chứng Mock*), mỗi thẻ hiển thị thời lượng, độ khó, lý do chọn, và nút link thẳng tới `/test-practice/{skill}/{test_id}?mode={mode}`.
4. **Tạo `MonthlyProgressSection.tsx` (< 190 LOC)**:
   - **Scorecard 4 ô**: Band Tháng này (`+/- delta vs tháng trước`), Độ chính xác L/R trong tháng (`%`), Số đề tháng này (`Mock` + `Practice`), và Giờ luyện tháng này.
   - **Bộ lọc & Biểu đồ ComposedChart (Recharts)**: Chuyển nhanh giữa `Overall`, `Listening`, `Reading`, `Writing`, `Speaking` và chế độ `Tất cả / Thi thử / Luyện tập`; vẽ đường `Band`, cột mờ `Số đề`, đường kẻ ngang `Target Band`.
   - **Smart Delta Explainer & Bảng đối chiếu tháng**: Hiển thị giải thích nếu `is_provisional` hoặc biến động do chuyển sang Thi thử, kèm bảng thu gọn so sánh 6 tháng gần nhất.
5. **Tạo `CriterionMasteryCards.tsx` (< 160 LOC) & Gắn vào Tabs**:
   - Render 2 khối riêng biệt cho **Writing (`TA/TR, CC, LR, GRA`)** và **Speaking (`FC, LR, GRA, P`)** với thanh tiến độ màu chuẩn (`#10b981` nếu đạt mục tiêu, `#2563eb` nếu đang tiến bộ, `#f59e0b` nếu là tiêu chí thấp nhất cần cải thiện).
   - Cập nhật `OverviewTab.tsx` (mount `PersonalizedRoadmapSection`, `MonthlyProgressSection`, `OverviewKpiCards`) và `TestPracticeTab.tsx` (mount `CriterionMasteryCards`).
6. **Cập nhật Sidebar `/test-practice` & Xóa Mock Fallback ở `/test-practice/history`**:
   - Trong `PracticeHistorySidebarWidget.tsx`: hiển thị nút đề xuất đầu tiên từ `roadmap.recommended_tests[0]` dưới dạng **"Nhiệm vụ ưu tiên hôm nay"**.
   - Trong `PracticeHistoryRadarCard.tsx` và `PracticeQuestionTypeAccuracyCard.tsx`: xóa bỏ các giá trị giả (`5.5`, `5.0`, array mock cứng), hiển thị empty state lịch sự hướng dẫn làm bài chẩn đoán.

## Success Criteria
- [ ] Trang `/learning-profile` hiển thị đầy đủ dữ liệu thật cho Lộ trình Cá nhân hóa (Chặng Band + Chiến lược 3 bước + 3 Bài luyện 1-click) và Biểu đồ Tiến hóa Hàng tháng.
- [ ] Thay đổi kỹ năng trên Biểu đồ Tháng hoặc sửa 4 band mục tiêu trong Modal cập nhật UI tức thì.
- [ ] `/test-practice/history` không còn hiện điểm giả `5.5`/`5.0` khi người dùng chưa làm bài ở một kỹ năng nào đó.
- [ ] Zero classes màu `purple`, `violet`, `indigo` và toàn bộ file `< 200 LOC`.

## Risk Assessment
- **Risk**: Payload của `OverviewTab` quá dài gây cảm giác ngợp khi mở trên laptop 13".
- **Mitigation**: Giữ bảng đối chiếu chi tiết các tháng ở trạng thái thu gọn/chuyển tab nhỏ ("Biểu đồ" vs "Bảng tháng") và sắp xếp đúng thứ tự ưu tiên từ hành động (`Roadmap`) → xu hướng dài hạn (`Monthly`) → hoạt động chi tiết (`Radar/Heatmap`).
