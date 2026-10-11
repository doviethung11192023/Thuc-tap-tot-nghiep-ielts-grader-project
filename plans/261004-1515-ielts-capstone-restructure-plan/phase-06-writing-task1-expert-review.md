---
phase: 6
title: "Writing Task 1 Multimodal & Expert Review Workflow"
status: pending
priority: P1
effort: "7 days"
dependencies: ["1", "2"]
---

# Phase 06: Writing Task 1 Multimodal & Expert Review Workflow

## Overview
Bổ sung tính năng chấm điểm bài viết **Writing Task 1** (sử dụng Multimodal LLM để đối chiếu bài viết với hình ảnh biểu đồ/bản đồ/quy trình) và xây dựng quy trình làm việc cho vai trò **Expert/Teacher** (giáo viên nhận bài, chấm bài, ghi âm nhận xét hoặc phản hồi định tính cho học viên).

## Requirements
- Functional:
  - **Writing Task 1 (Academic & General):**
    - Hỗ trợ hiển thị đề bài kèm hình ảnh biểu đồ (Line, Bar, Pie, Table, Process, Map).
    - Bộ đếm từ thời gian thực (tối thiểu 150 từ).
    - Pipeline AI chấm Task 1 sử dụng Vision LLM (GPT-4o hoặc Gemini 1.5 Flash): đưa cả hình ảnh đề bài và bài viết của học viên vào prompt để kiểm tra tiêu chí **Task Achievement** (học viên có mô tả đúng số liệu, có nêu được Overview rõ ràng không).
  - **Expert Review Workflow (Học viên gửi bài cho giáo viên chấm):**
    - Học viên có thể đánh dấu "Yêu cầu giáo viên chấm lại" (Request Expert Evaluation) đối với bài Writing hoặc Speaking.
    - Giáo viên có Dashboard riêng xem danh sách bài đang chờ (Pending Queue).
    - Giao diện chấm bài của Expert: Xem bài viết/nghe audio của học viên, xem điểm số gợi ý từ AI, điều chỉnh điểm Band Score cuối cùng và viết nhận xét chi tiết (hoặc tải audio nhận xét).
    - Cập nhật kết quả vào bài nộp và gửi thông báo cho học viên.
- Non-functional:
  - Phân bổ bài chấm công bằng cho các giáo viên đang ở trạng thái "Available".
  - Bảo mật thông tin học viên khi giáo viên chấm bài (ẩn tên/email cá nhân nếu cần).

## Architecture
```
[Learner Essay + Chart Image]
             │
             ▼
[AI Task 1 Vision Grader (GPT-4o)] ──> [Initial AI Score: 6.5]
                                               │
                                               ▼
                              [Request Expert Review]
                                               │
                                               ▼
                                 [expert_assignments Queue]
                                               │
                                               ▼
                        [Expert Dashboard: Review Workspace]
                        - Inspect Essay & AI Suggestions
                        - Modify Scores: TA=7.0, CC=6.5...
                        - Write Qualitative Advice
                                               │
                                               ▼
                                  [Final Verified Result]
```

## Related Code Files
- Create:
  - `backend/app/ai/writing_task1/vision_evaluator.py`
  - `backend/app/api/endpoints/expert.py`
  - `backend/app/models/expert_review.py`
  - `frontend/src/app/(student)/writing/task1/[topicId]/page.tsx`
  - `frontend/src/app/(expert)/dashboard/page.tsx`
  - `frontend/src/app/(expert)/review/[submissionId]/page.tsx`
  - `frontend/src/components/expert/ExpertScoringForm.tsx`
- Modify:
  - `frontend/src/components/workspace/WritingCanvas.tsx` (Bổ sung hiển thị hình ảnh đề bài Task 1)
  - `backend/app/worker/tasks.py` (Bổ sung `evaluate_task1_essay_task`)

## Implementation Steps
1. **Multimodal Task 1 AI Pipeline:**
   - Xây dựng service `vision_evaluator.py`: mã hóa hình ảnh đề bài sang Base64 hoặc truyền URL ảnh trực tiếp vào API của GPT-4o / Gemini 1.5.
   - Thiết kế Prompt chuyên biệt kiểm tra: 1) Có Overview không; 2) Có trích dẫn số liệu chính xác từ biểu đồ không; 3) Có so sánh xu hướng không.
2. **Giao diện làm bài Writing Task 1:**
   - Mở rộng Workspace hiện có: thêm khung xem ảnh biểu đồ có tính năng phóng to (Zoom in/out).
3. **Backend API cho Expert:**
   - `GET /api/expert/queue`: Lấy danh sách các bài nộp được phân công.
   - `GET /api/expert/submissions/{id}`: Lấy chi tiết bài nộp + điểm AI gợi ý + annotations.
   - `POST /api/expert/submissions/{id}/review`: Lưu điểm và nhận xét của giáo viên.
4. **Frontend Expert Workspace:**
   - Dựng giao diện chấm bài: hiển thị bài làm của học sinh ở bên trái và biểu mẫu nhập điểm của giáo viên ở bên phải.
   - Tích hợp xem kết quả so sánh: Điểm AI đề xuất vs Điểm giáo viên chốt.

## Success Criteria
- [ ] Chấm thành công 1 bài Writing Task 1 có hình ảnh biểu đồ cột, AI phát hiện được việc học viên viết sai số liệu biểu đồ.
- [ ] Tài khoản Expert nhận được bài trong hàng đợi, nhập điểm và gửi thành công.
- [ ] Học viên mở kết quả thấy cả điểm AI lẫn điểm chốt kèm lời nhận xét của Expert.

## Risk Assessment
- *Nguy cơ:* Gửi ảnh dung lượng lớn lên Vision LLM gây tốn băng thông và chi phí token cao.
- *Giải pháp:* Tự động nén và resize ảnh biểu đồ về độ phân giải chuẩn (tối đa 1024x1024) trước khi gửi vào LLM API.
