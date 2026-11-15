---
phase: 1
title: "Expert Workspace Pro Max: Layout, Annotation Editor, Snippet Filter & Save Draft"
status: pending
priority: P0
effort: "3h"
dependencies: []
---

# Phase 01: Expert Workspace Pro Max & Annotation Editor

## Overview
Giải quyết triệt để lỗi giao diện nhảy/đè sticky bar, nâng cấp trình biên tập lỗi (Edit/Add/Delete + exact offset), lọc Kho nhận xét mẫu theo đúng kỹ năng, và bổ sung lưu bản nháp thật (`PUT /draft` + Auto-save).

## Related Code Files
- Modify: `backend/app/schemas/expert.py`
- Modify: `backend/app/services/expert/dispatcher.py` (hoặc tạo helper `save_expert_grading_draft`)
- Modify: `backend/app/api/endpoints/expert.py`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/expert.ts`
- Modify: `frontend/src/app/expert/assignments/page.tsx`
- Modify: `frontend/src/app/expert/assignments/[assignmentId]/page.tsx`
- Modify: `frontend/src/components/expert/WritingAnnotationWorkspace.tsx`
- Modify: `frontend/src/components/expert/CriterionScoringPanel.tsx`
- Modify: `frontend/src/components/expert/SnippetDrawer.tsx`

## Implementation Steps
1. **Sửa Sticky Bar & Layout Split-View (`[assignmentId]/page.tsx`):**
   - Bỏ `h-[calc(100vh-210px)] min-h-[650px]` gây tràn và đè thanh dưới; chuyển sang bố cục Flex/Grid chuẩn (`lg:grid-cols-12 gap-6 items-start`), cột phải có `lg:sticky lg:top-20 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto`, và thanh Action Bar đặt cố định gọn ở chân trang (`sticky bottom-0 z-30` nằm ngoài vùng tràn, không bao giờ cắt ngang nội dung).
2. **Nâng cấp Annotation Editor (`WritingAnnotationWorkspace.tsx`):**
   - Tính chính xác vị trí bôi đen (`start_pos`, `end_pos`) dựa trên DOM Range trong `essayContentRef` thay vì `fullText.indexOf(text)`.
   - Thêm nút **Sửa (`Pencil`)** ngay trên từng thẻ lỗi và cho phép **click trực tiếp vào vùng `<mark>`** trong bài viết để mở form chỉnh sửa (`category`, `corrected_text`, `explanation`) — áp dụng cho cả lỗi AI tạo sẵn lẫn lỗi Expert tự thêm.
   - Thêm nút **"+ Thêm nhận xét / lỗi mới"** ở thanh công cụ phía trên danh sách lỗi để Expert có thể thêm nhận xét tùy chỉnh mà không bắt buộc phải bôi đen một đoạn chữ.
   - Chuyển form tạo/sửa ghi chú sang dạng **Inline / Modal gọn có kiểm soát vị trí** (hoặc dock ngay dưới thanh công cụ) để không bị cắt mất khi bôi đen ở dòng đầu tiên.
3. **Chống lẫn Snippet Speaking ↔ Writing (`CriterionScoringPanel.tsx`, `SnippetDrawer.tsx`):**
   - Truyền `skill` vào `SnippetDrawer` và `CriterionScoringPanel`; chỉ hiển thị `TA, TR, CC, LR, GRA, GENERAL` cho Writing và `FC, P, LR, GRA, GENERAL` cho Speaking.
   - Đồng bộ `selectedCat` trong `SnippetDrawer` qua `useEffect` mỗi khi `isOpen` hoặc `defaultCategory` thay đổi.
   - Cải thiện slash command `/` dropdown dùng `bottom-full mb-1` hoặc mở hướng thông minh để không bị cắt khuất ở tiêu chí cuối.
4. **Lưu Bản Nháp Thật (`PUT /api/v1/expert/assignments/{id}/draft`):**
   - Backend: Cập nhật `evaluations` (`overall_band`, `feedback`, `status='draft'`), upsert `criterion_scores`, cập nhật `annotations` và trả về timestamp `saved_at`.
   - Frontend: Thêm nút **"Lưu nháp"** + auto-save debounce (2.5 giây sau khi sửa) + hiển thị trạng thái thực (`Đang lưu...` / `Đã lưu lúc HH:mm:ss`), và nút **"Lưu và thoát"** chỉ thoát sau khi lưu xong.
5. **Cải thiện Card Hàng Đợi (`/expert/assignments`):**
   - Backend `list_expert_assignments` trả thêm `learner_name`, `learner_email` (ẩn bớt hoặc gọn), và sửa nhãn/tính toán thời gian còn lại rõ ràng (`Còn X giờ` thay vì ghép sai `giờ làm việc` với giờ thực).
   - Bấm **"Tiếp tục chấm"** đi thẳng tới `/expert/assignments/${id}` nếu đã có `started_at` (bỏ bước `POST /start` thừa).

## Success Criteria
- [ ] Thanh Action Bar không còn đè lên bài làm hay ô nhận xét ở mọi kích thước màn hình (1280×720, 1440×900, 1920×1080).
- [ ] Expert có thể **Bôi đen đúng vị trí lặp**, **Sửa lỗi AI sẵn có**, **Thêm nhận xét tùy chỉnh không cần bôi đen**, và **Xóa lỗi**.
- [ ] Chấm Writing tuyệt đối không hiện gợi ý Speaking (`FC`, `P`).
- [ ] Sửa điểm/nhận xét/lỗi -> bấm "Lưu và thoát" -> mở lại bài giữ nguyên 100% thay đổi.
