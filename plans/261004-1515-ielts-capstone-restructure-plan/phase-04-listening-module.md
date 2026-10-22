---
phase: 4
title: "Listening Module & Audio Auto-Scoring"
status: pending
priority: P1
effort: "5 days"
dependencies: ["2", "3"]
---

# Phase 04: Listening Module & Audio Auto-Scoring

## Overview
Xây dựng phân hệ kỹ năng Nghe (Listening): tích hợp trình phát âm thanh (Audio Player) kiểm soát chặt chẽ theo chuẩn thi thật, hiển thị câu hỏi chia theo 4 Sections, chấm điểm tự động tức thì kèm Audio Script (Transcript có highlight đáp án).

## Requirements
- Functional:
  - 2 Chế độ thi:
    - **Luyện tập (Practice Mode):** Tự do tạm dừng (pause), tua lại (rewind), xem transcript giải thích sau khi hoàn thành từng Section.
    - **Thi thử (Mock Test Mode):** Audio phát liên tục tự động từ Section 1 đến 4, chỉ được nghe 1 lần duy nhất, cấm tua lại, có thời gian đọc đề và chuyển tiếp chuẩn thi thật.
  - Hỗ trợ câu hỏi: Điền từ vào biểu mẫu (Form/Note completion), Trắc nghiệm, Bản đồ/Sơ đồ (Map/Diagram labeling).
  - Tự động đối soát và chấm điểm (Raw score 0-40 -> Band score IELTS Listening).
  - Hiển thị Audio Transcript có đánh dấu mốc thời gian (Timestamps) và đoạn chứa đáp án câu hỏi.
- Non-functional:
  - Tải trước âm thanh (Audio Preloading) mượt mà, hạn chế gián đoạn khi đang làm bài.
  - Lưu file âm thanh trên Supabase Storage / Public CDN.

## Architecture
```
[Learner] ──> [Next.js: /exam/listening/[testId]]
                   ├── [Sticky Top Audio Controller: Play/Progress/TimeRemaining]
                   └── [Question Workspace: Sections 1-4 Accordion/Tabs]
                          │ Submit Answers (POST /api/listening/submit)
                          ▼
             [FastAPI: ListeningService]
                   ├── Compare Answers with Answer Keys
                   ├── Calculate Raw & Band Score
                   └── Return Results + Full Audio Script with Highlights
```

## Related Code Files
- Create:
  - `backend/app/api/endpoints/listening.py`
  - `backend/app/services/listening_grader.py`
  - `frontend/src/app/(student)/listening/page.tsx`
  - `frontend/src/app/(student)/listening/[testId]/page.tsx`
  - `frontend/src/components/listening/AudioPlayerBar.tsx`
  - `frontend/src/components/listening/ListeningQuestionRenderer.tsx`
  - `frontend/src/components/listening/AudioTranscriptViewer.tsx`
  - `backend/data/seed_listening_cambridge18.json`
- Modify:
  - `backend/app/api/api_router.py` (Khai báo route Listening)

## Implementation Steps
1. **Lưu trữ & Dữ liệu Âm thanh:** Tải 2 bộ đề Listening mẫu (audio MP3 + đề thi + transcript + đáp án) lên bucket `audio-assets` trên Supabase Storage.
2. **Audio Controller Component:** Xây dựng trình phát nhạc HTML5 Audio tùy chỉnh:
   - Trong Mock Test: Ẩn thanh tua (seek bar), khóa nút lùi lại.
   - Quản lý sự kiện `onTimeUpdate`, `onEnded`, báo hiệu khi chuyển Section.
3. **Backend API Listening:**
   - `GET /api/listening/tests`: Danh sách đề thi nghe.
   - `GET /api/listening/tests/{id}`: Trả về link audio CDN, danh sách câu hỏi theo Section.
   - `POST /api/listening/tests/{id}/submit`: Chấm điểm, trả kết quả và Transcript có đánh dấu đoạn trích dẫn.
4. **Thuật toán Chấm điểm Listening:** Xử lý các quy chuẩn đặc thù IELTS (viết số dạng chữ hoặc số: "2" hoặc "two", chính tả ngày tháng).
5. **Giao diện Xem lại Lỗi sai:** Kết nối transcript với audio: khi học viên bấm vào câu sai, audio tự động nhảy đến đúng mốc thời gian phát câu đó.

## Success Criteria
- [ ] Trình phát audio chạy ổn định trong suốt 30 phút bài thi mà không bị đứng giữa chừng.
- [ ] Chế độ Mock Test ngăn chặn được việc người dùng tua lại audio.
- [ ] Chấm điểm chính xác dạng điền từ và hiển thị đúng transcript kèm đoạn chứng cứ câu hỏi.

## Risk Assessment
- *Nguy cơ:* File audio dung lượng lớn (30-50MB) có thể tải chậm gây ức chế cho người dùng.
- *Giải pháp:* Nén âm thanh sang chuẩn MP3 96kbps / AAC và sử dụng cơ chế preload metadata của trình duyệt.
