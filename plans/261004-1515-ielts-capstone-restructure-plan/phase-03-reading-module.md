---
phase: 3
title: "Reading Module (Practice & Mock Test)"
status: pending
priority: P1
effort: "7 days"
dependencies: ["2"]
---

# Phase 03: Reading Module (Practice & Mock Test)

## Overview
Xây dựng phân hệ kỹ năng Đọc (Reading) hoàn chỉnh: ngân hàng bài đọc chia theo Passage, các dạng câu hỏi chuẩn IELTS (Multiple Choice, True/False/Not Given, Matching, Fill in the blanks), giao diện thi chia cột đôi (Split-screen), chấm điểm tự động tức thì kèm giải thích chi tiết.

## Requirements
- Functional:
  - Hỗ trợ 2 chế độ thi:
    - **Luyện tập (Practice Mode):** Làm từng Passage riêng lẻ (13-14 câu), không giới hạn thời gian gắt gao, có thể xem giải thích ngay sau khi nộp.
    - **Thi thử (Mock Test Mode):** Làm trọn bộ 3 Passages (40 câu), đồng hồ đếm ngược 60 phút, tự động nộp bài khi hết giờ.
  - Các dạng câu hỏi hỗ trợ: Trắc nghiệm đơn/đa lựa chọn, T/F/NG, Y/N/NG, Điền từ vào chỗ trống, Nối tiêu đề (Headings).
  - Thuật toán chấm điểm tự động đối soát đáp án chính xác, xử lý chữ hoa/thường và khoảng trắng thừa.
  - Quy đổi điểm thô (Raw score 0-40) sang Band score chuẩn IELTS Academic (ví dụ: 30/40 -> Band 7.0).
  - Giao diện Highlight bài đọc trực tiếp trên trình duyệt để ghi chú từ khóa.
- Non-functional:
  - Tải bài đọc mượt mà, layout 2 cột độc lập (cột trái cuộn bài đọc, cột phải cuộn câu hỏi).
  - Tự động lưu đáp án tạm thời vào LocalStorage/State để tránh mất bài khi mất kết nối mạng.

## Architecture
```
[Learner] ──> [Next.js: /exam/reading/[testId]]
                   ├── [Split View: PassagePanel (Left) | QuestionPanel (Right)]
                   └── [Timer & Progress Indicator]
                          │ Submit Answers (POST /api/reading/submit)
                          ▼
             [FastAPI: ReadingService]
                   ├── Grade Raw Answers (Case-insensitive Match)
                   ├── Map Raw Score -> IELTS Band (Academic/General)
                   └── Save Attempt & Update Skill Progress (PostgreSQL)
```

## Related Code Files
- Create:
  - `backend/app/api/endpoints/reading.py`
  - `backend/app/services/reading_grader.py`
  - `frontend/src/app/(student)/reading/page.tsx`
  - `frontend/src/app/(student)/reading/[testId]/page.tsx`
  - `frontend/src/components/reading/ReadingSplitLayout.tsx`
  - `frontend/src/components/reading/PassageHighlighter.tsx`
  - `frontend/src/components/reading/QuestionRenderer.tsx`
  - `backend/data/seed_reading_cambridge18.json`
- Modify:
  - `backend/app/api/api_router.py` (Khai báo route Reading)
  - `frontend/src/app/(student)/history/page.tsx` (Thêm tab xem lại bài thi Reading)

## Implementation Steps
1. **Dữ liệu mẫu & Ngân hàng câu hỏi:** Thiết kế định dạng JSON cho bài thi Reading chuẩn và nhập ít nhất 2 bài thi mẫu (Sample Test 1 & 2 từ Cambridge IELTS).
2. **Backend API Reading:**
   - `GET /api/reading/tests`: Lấy danh sách đề thi (lọc theo độ khó, mode).
   - `GET /api/reading/tests/{id}`: Lấy nội dung chi tiết bài đọc & danh sách câu hỏi (ẩn trường đáp án đúng).
   - `POST /api/reading/tests/{id}/submit`: Nhận danh sách câu trả lời, chấm điểm, lưu DB, trả kết quả kèm lời giải thích.
3. **Thuật toán Chấm điểm & Quy đổi Band:** Viết logic chuẩn hóa chuỗi (`strip()`, `lower()`, loại bỏ dấu câu thừa) và bảng tra cứu Band score IELTS Reading.
4. **Frontend Split-Screen Workspace:** Xây dựng component giao diện 2 cột có thể kéo chỉnh độ rộng (Resizable Split Pane), tích hợp chức năng bôi vàng (Highlighter) đoạn văn.
5. **Màn hình Đánh giá Kết quả:** Hiển thị Band score, số câu đúng/sai, danh sách câu hỏi kèm đáp án của người dùng vs đáp án đúng, hiển thị đoạn trích dẫn giải thích vì sao đúng/sai.

## Success Criteria
- [ ] Học viên mở được bài thi Reading, đọc bài bên trái, trả lời bên phải mà không bị nhảy cuộn trang.
- [ ] Nộp bài xong nhận ngay kết quả Band score trong $< 1$ giây.
- [ ] Highlight văn bản bài đọc hoạt động mượt mà.
- [ ] Chấm đúng các trường hợp điền từ có nhiều đáp án hợp lệ (ví dụ: "a car / car").

## Risk Assessment
- *Nguy cơ:* Các dạng câu hỏi phức tạp như "Drag and drop" hoặc "Matching headings" khó dựng UI và xử lý state.
- *Giải pháp:* Ưu tiên chuyển đổi dạng Matching sang dạng Select dropdown trước trong giai đoạn 1 để đảm bảo tiến độ.
