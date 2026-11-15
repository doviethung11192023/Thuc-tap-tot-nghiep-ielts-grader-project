---
title: "Master Plan: Debug & Cải thiện toàn diện Luồng Speaking (Exam Room, Review, Summary)"
date: "2026-11-15"
status: "pending-approval"
priority: "P1"
scope: "frontend"
skills: ["ck:debug", "ck:sequential-thinking", "ck:brainstorm", "ck:ui-ux-pro-max", "ck:plan"]
---

# Master Plan: Speaking Flow Debug & UI/UX Pro Max Overhaul

## 1. Kết quả Debug toàn diện Luồng Speaking (`/ck:debug`)

Sau khi rà soát toàn bộ luồng Speaking từ lúc vào phòng thi (`SpeakingWorkspace`), kiểm tra micro (`SpeakingMicCheck`), giao diện thi (`SpeakingVirtualRoomStage`, `SpeakingAnswerControls`, `SpeakingQuestionSidebar`, `SpeakingAidsPanel`), màn hình xem lại (`SpeakingReviewScreen`) cho đến trang tổng kết (`SpeakingSummaryResult` & `speaking-result-sections`), phát hiện **7 vấn đề cốt lõi**:

| Mã lỗi | Mức độ | Vị trí | Nguyên nhân & Tác động |
| :--- | :--- | :--- | :--- |
| **BUG-SPK-FLOW-01** (Khóa scroll ở Workspace & Review trên màn hình thấp/mobile) | **CRITICAL** | `SpeakingWorkspace.tsx` (L208) & `SpeakingReviewScreen.tsx` (L44) | `StudentPageLayout` bọc `/test-practice/speaking/*` (trừ `/summary`) bằng `h-screen overflow-hidden`, nhưng `SpeakingWorkspace` và `SpeakingReviewScreen` lại dùng `min-h-screen` thay vì `h-full overflow-y-auto`. Khi xếp dọc trên mobile/laptop màn hình thấp (768px), phần `SpeakingAidsPanel` hoặc nút Nộp bài bị cắt mất và **không cuộn được**. |
| **BUG-SPK-FLOW-02** (Thiếu phản hồi âm thanh trực tiếp khi đang ghi âm) | **HIGH** | `SpeakingVirtualRoomStage.tsx` (L88–93) & `SpeakingWorkspace.tsx` | `useSpeakingRecorder` đã có sẵn `getLevel()` đo cường độ micro theo thời gian thực, nhưng chỉ dùng ở `SpeakingMicCheck`, **không truyền vào `SpeakingVirtualRoomStage`**. Khi thí sinh đang nói, chỉ có 1 chấm đỏ nhỏ 12px → không biết micro có đang thu tiếng thật hay bị tắt tiếng. |
| **BUG-SPK-FLOW-03** (Ghi chú `notes` bị dùng chung cho mọi câu) | **MEDIUM** | `SpeakingWorkspace.tsx` (L56, L301) | `const [notes, setNotes] = useState('')` dùng chung 1 chuỗi cho toàn bài thi, khiến ghi chú của Part 1 dính sang Part 2 Cue Card và Part 3. Cần tách `notesByQuestion: Record<string, string>` theo `currentQuestion.id`. |
| **BUG-SPK-FLOW-04** (Dùng Emoji thay SVG icon & thiếu `cursor-pointer` / `aria-label`) | **MEDIUM** | `SpeakingAnswerControls.tsx` (L26–30), `SpeakingAidsPanel.tsx` (L30, L67), `SpeakingReviewScreen.tsx` (L46–48) | Dùng emoji (`🎧`, `⏱️`, `💡`, `📝`, `✦`) thay cho icon SVG chuẩn `lucide-react` (vi phạm chuẩn `ui-ux-pro-max`), thiếu `cursor-pointer` và `aria-label` trên các nút điều khiển chính. |
| **BUG-SPK-FLOW-05** (Audio player mặc định `<audio controls>` đơn điệu ở Controls/Review/MicCheck) | **MEDIUM** | `SpeakingAnswerControls.tsx` (L64), `SpeakingReviewScreen.tsx`, `SpeakingMicCheck.tsx` (L72) | Vẫn dùng `<audio controls>` mặc định của trình duyệt (với mẹo `Number.MAX_SAFE_INTEGER`), thiếu đồng bộ với custom player vừa làm ở trang `/detail`. |
| **BUG-SPK-FLOW-06** (Giao diện `SpeakingReviewScreen` lệch tông & thiếu trạng thái rõ ràng) | **MEDIUM** | `SpeakingReviewScreen.tsx` (L44–120) | Dùng nền tối `bg-slate-900/90` kèm sao `✦` lạc quẻ với toàn bộ hệ thống sáng (Slate-50 / White / Blue-600), thiếu thanh tiến độ upload & cảnh báo rõ câu chưa trả lời trước khi nộp. |
| **BUG-SPK-FLOW-07** (`SpeakingSummaryResult` nền `#0071f9` chói, bố cục 1 cột đơn giản) | **HIGH** | `SpeakingSummaryResult.tsx` (L75) & `speaking-result-sections.tsx` | Nền xanh đậm `#0071f9` tương phản gắt, 4 thẻ tiêu chí chưa có thanh tiến độ Band, chưa có layout Bento 2 cột hiện đại đồng bộ với trang `/detail` vừa nâng cấp. |

---

## 2. Phân tích Brainstorm & Thiết kế UI/UX Pro Max (`/ck:brainstorm` + `/ck:ui-ux-pro-max`)

### Định hướng thiết kế thống nhất ("Clean Academic Studio")
- **Bảng màu nhất quán**: Nền `bg-slate-50`, thẻ trắng `bg-white border-slate-200/90 shadow-xs`, màu chủ đạo `blue-600` (Listening/Speaking) kết hợp trạng thái ngữ nghĩa chuẩn (`emerald` cho Đã lưu/Chuyên gia, `rose/red` cho Đang ghi âm, `amber` cho Chuẩn bị/Chờ chấm).
- **Typography & Iconography**: 100% icon `lucide-react` đồng bộ nét, không dùng emoji thô; số đếm thời gian và Band điểm dùng `tabular-nums`.

### Cải tiến trọng tâm theo từng màn hình:
1. **Màn hình Kiểm tra Micro (`SpeakingMicCheck`)**:
   - Thanh đo mức âm thanh có vạch ngưỡng tối thiểu (`QUIET_PEAK`), nút dừng sớm nếu đã nói xong, và phát lại ngay bằng compact custom audio player.
2. **Phòng thi ảo (`SpeakingWorkspace` + `SpeakingVirtualRoomStage` + `SpeakingAnswerControls`)**:
   - **Fix scroll**: Bọc `SpeakingWorkspace` bằng `h-full w-full overflow-y-auto` để không bao giờ bị cắt nội dung trên laptop/mobile.
   - **Live Voice Visualizer**: Khi `phase === 'recording'`, hiển thị dải sóng âm 12 thanh nhảy theo `recorder.getLevel()` ngay dưới Avatar MoonLab AI Examiner + thanh tiến độ thời gian trả lời còn lại (`progress bar`).
   - **Header chuyên nghiệp**: Hiển thị Badge chế độ (`Thi thử IELTS` vs `Luyện tập`), thanh tiến độ tổng số câu đã trả lời (`X / Y câu`), đồng hồ đếm ngược.
   - **Ghi chú tách theo từng câu** (`notesByQuestion[questionId]`) + thay thế toàn bộ emoji bằng icon `lucide-react`.
3. **Màn hình Xem lại bài làm (`SpeakingReviewScreen`)**:
   - Chuyển sang nền sáng `bg-slate-50` đồng bộ với Phòng thi & Trang Chi tiết; layout 2 cột gọn (`Danh sách câu theo Part` + `Bảng tổng kết sẵn sàng nộp bài`), badge trạng thái Upload (`Đã lưu` / `Đang tải lên` / `Lỗi tải lên`) rõ ràng.
4. **Trang Tổng kết Speaking (`SpeakingSummaryResult` + `speaking-result-sections.tsx`)**:
   - Thay nền `#0071f9` chói bằng `bg-slate-50` hiện đại + Hero Score Banner tinh tế (Overall Band lớn, thanh tiến độ Band 0–9.0, trạng thái Chuyên gia/AI, 2 nút CTA nổi bật: **"Xem chi tiết & Audio từng câu"** và **"Xin Chuyên gia chấm lại"**).
   - Bố cục Bento 2 cột (`lg:grid-cols-12`) cho 4 tiêu chí (`CriteriaGrid` có progress bar), `PronunciationEvidence`, `SpeechMetricsPanel`, và `OverallReport`.

---

## 3. Lộ trình triển khai chi tiết (5 Phase)

### Phase 1: Sửa Scroll Container & State Phòng thi (`SpeakingWorkspace` & `SpeakingQuestionSidebar`)
- Đổi `SpeakingWorkspace` sang `h-full w-full overflow-y-auto bg-slate-50`.
- Tách `notesByQuestion: Record<string, string>` theo `currentQuestion.id`.
- Nâng cấp Header phòng thi (thêm badge chế độ + tiến độ `answeredCount / totalCount`).

### Phase 2: Live Voice Visualizer & Chuẩn hóa Controls (`SpeakingVirtualRoomStage`, `SpeakingAnswerControls`, `SpeakingMicCheck`)
- Truyền `getLevel={recorder.getLevel}` vào `SpeakingVirtualRoomStage` để vẽ thanh sóng âm real-time khi `phase === 'recording'`.
- Thay toàn bộ emoji trong `SpeakingAnswerControls` và `SpeakingAidsPanel` bằng icon `lucide-react`; bổ sung `cursor-pointer` & `aria-label`.
- Tái sử dụng `SpeakingDetailAudioPlayer` (chế độ compact) hoặc đồng bộ thanh audio trong `SpeakingAnswerControls` & `SpeakingMicCheck` để không bao giờ dính lỗi `Infinity:NaN`.

### Phase 3: Thiết kế lại `SpeakingReviewScreen` (Light Studio Mode + Fix Scroll)
- Đổi `SpeakingReviewScreen` sang `h-full w-full overflow-y-auto bg-slate-50`, loại bỏ sao `✦` nền tối.
- Dàn layout 2 cột rõ ràng trên desktop: Danh sách câu trả lời kèm audio preview bên trái + Thẻ Tóm tắt trạng thái & Nút Nộp bài sticky bên phải.

### Phase 4: Nâng cấp `SpeakingSummaryResult` & `speaking-result-sections.tsx`
- Chuyển nền từ `#0071f9` sang hệ thống thẻ `bg-slate-50` + Hero Card chuyên nghiệp.
- Bổ sung thanh tiến độ Band cho từng tiêu chí trong `CriteriaGrid`, sắp xếp Bento Grid cho `PronunciationEvidence`, `SpeechMetricsPanel`, `OverallReport`.

### Phase 5: Kiểm thử (`tsc` + `ck:agent-browser`)
- Chạy `cd frontend; npx tsc --noEmit`.
- Dùng `browser` subagent kiểm thử trọn vẹn luồng Speaking (vào phòng thi `Practice` -> Mic Check -> Testing & Live Visualizer -> Review Screen -> Summary Page -> Detail Page) để xác nhận không có lỗi console, không mất scroll, và giao diện hiển thị chuẩn trên desktop & mobile.
