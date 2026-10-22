---
phase: 5
title: "Speaking Module (Audio, Whisper STT & AI Scoring)"
status: pending
priority: P0
effort: "10 days"
dependencies: ["1", "2"]
---

# Phase 05: Speaking Module (Audio, Whisper STT & AI Scoring)

## Overview
Xây dựng phân hệ kỹ năng Nói (Speaking) tích hợp AI: giao diện ghi âm mô phỏng kỳ thi 3 phần (Part 1, 2, 3), pipeline chuyển đổi giọng nói thành văn bản (Speech-to-Text qua Whisper API), và hệ thống AI Multi-Agent chấm điểm chi tiết theo 4 tiêu chí chuẩn IELTS Speaking (Fluency, Lexical Resource, Grammar, Pronunciation).

## Requirements
- Functional:
  - Giao diện phòng thi Speaking theo quy trình 3 phần:
    - **Part 1:** Phỏng vấn ngắn với các câu hỏi đời sống (ghi âm 30-45s mỗi câu).
    - **Part 2:** Cue card (1 phút chuẩn bị với đồng hồ đếm ngược, 2 phút ghi âm liên tục).
    - **Part 3:** Thảo luận chuyên sâu với các câu hỏi mở rộng.
  - Bộ thu âm trực tiếp trên trình duyệt (MediaRecorder API) lưu định dạng `audio/webm` hoặc `audio/mp4`.
  - Tải file ghi âm lên Supabase Storage bucket `speaking-recordings`.
  - Pipeline xử lý bất đồng bộ qua ARQ Worker:
    1. Gửi file âm thanh đến OpenAI Whisper API (hoặc local Whisper) -> Nhận transcript văn bản kèm timestamps.
    2. Đánh giá độ trôi chảy (Fluency): phân tích độ dài khoảng lặng (pauses), tốc độ nói (words per minute - WPM).
    3. Đánh giá ngữ pháp & từ vựng: phân tích độ phức tạp câu và từ nối qua LLM.
    4. Trả về kết quả JSON có điểm thành phần (FC, LR, GRA, Pronunciation estimate) và điểm Overall Speaking band (0-9).
  - Hiển thị bài chấm chi tiết: Phát lại audio, đọc lại transcript, xem nhận xét điểm mạnh/yếu và gợi ý câu trả lời mẫu cải thiện.
- Non-functional:
  - Tổng thời gian xử lý AI (STT + Scoring) $< 45$ giây cho mỗi phần nói.
  - Xử lý lỗi mất mic, âm thanh quá nhỏ hoặc im lặng hoàn toàn.

## Architecture
```
[Learner Microphone]
        │ MediaRecorder (Webm/Mp4)
        ▼
[Frontend Next.js] ──Upload Audio──> [Supabase Storage: speaking-recordings]
        │
        │ POST /api/speaking/submit (audio_url, question_id, part)
        ▼
[FastAPI Core] ──Enqueue Task──> [Redis 7 / ARQ Worker]
                                      │
                                      ├── 1. Call Whisper API -> Transcript
                                      ├── 2. Calculate WPM & Silence ratio
                                      ├── 3. Call LLM (GPT-4o) with IELTS Rubric Prompt
                                      └── 4. Save speaking_submissions & evaluation
                                              │
                                              ▼ Supabase Realtime
                                      [Frontend receives "completed" state]
```

## Related Code Files
- Create:
  - `backend/app/ai/speaking/pipeline.py`
  - `backend/app/ai/speaking/prompt_templates.py`
  - `backend/app/services/stt_service.py`
  - `backend/app/api/endpoints/speaking.py`
  - `frontend/src/app/(student)/speaking/page.tsx`
  - `frontend/src/app/(student)/speaking/[testId]/page.tsx`
  - `frontend/src/components/speaking/AudioRecorder.tsx`
  - `frontend/src/components/speaking/CueCardTimer.tsx`
  - `frontend/src/components/speaking/SpeakingResultsView.tsx`
- Modify:
  - `backend/app/worker/tasks.py` (Bổ sung `evaluate_speaking_task`)
  - `backend/init_supabase.sql` (Tạo bảng `speaking_submissions`)

## Implementation Steps
1. **Frontend Audio Recorder:**
   - Xây dựng component `AudioRecorder.tsx` sử dụng `navigator.mediaDevices.getUserMedia`.
   - Hiển thị sóng âm động (Audio Visualizer Canvas) để học viên biết mic đang thu âm.
   - Thêm nút nghe lại bài nói trước khi chính thức nộp (đối với chế độ Practice).
2. **Lưu trữ File Ghi âm:** Viết hàm tải file blob trực tiếp lên Supabase Storage và sinh URL công khai an toàn.
3. **STT Pipeline:** Tích hợp gọi API OpenAI Whisper (`v1/audio/transcriptions`), nhận transcript và word-level timestamps.
4. **Speaking LLM Evaluator:**
   - Xây dựng Prompt IELTS Speaking chuyên biệt với few-shot learning từ các bài thi thực tế.
   - Yêu cầu LLM chấm điểm theo 4 tiêu chí chuẩn IELTS:
     - Fluency & Coherence (FC)
     - Lexical Resource (LR)
     - Grammatical Range & Accuracy (GRA)
     - Pronunciation (P - dựa trên các chỉ số lỗi ghi nhận và độ tự nhiên)
   - Trả về JSON có cấu trúc chuẩn xác (`response_format={"type": "json_object"}`).
5. **ARQ Worker Task:** Viết task `evaluate_speaking_task` trong `worker/tasks.py` tương tự luồng của Writing Task 2.
6. **Màn hình Trả kết quả Speaking:** Hiển thị Band score, transcript bài nói của học viên, phân tích lỗi ngữ pháp/từ vựng kèm bài mẫu Band 8.0 để học hỏi.

## Success Criteria
- [ ] Học viên ghi âm bài nói 1-2 phút và tải lên thành công trên trình duyệt.
- [ ] Worker hoàn thành nhận diện âm thanh và chấm bài trong vòng dưới 45 giây.
- [ ] Trả về điểm thành phần và nhận xét cụ thể cho từng tiêu chí, không bị lỗi JSON parse.

## Risk Assessment
- *Nguy cơ:* Whisper tự động "sửa" lỗi ngữ pháp của người nói (hallucination correction) khiến LLM chấm ngữ pháp cao hơn thực tế.
- *Giải pháp:* Đặt tham số `temperature=0` trong Whisper API và bổ sung lưu ý trong System Prompt của LLM để phát hiện cấu trúc câu đứt đoạn, lặp từ hoặc ngập ngừng.
