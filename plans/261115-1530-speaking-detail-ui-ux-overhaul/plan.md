---
title: "Master Plan: Cải thiện toàn diện Giao diện & Lỗi Scroll Trang Kết Quả Chi Tiết Speaking (/detail)"
date: "2026-11-15"
status: "pending-approval"
priority: "P1"
scope: "frontend"
skills: ["ck:sequential-thinking", "ck:brainstorm", "ck:ui-ux-pro-max", "ck:debug", "ck:plan"]
---

# Master Plan: Speaking Detail View Overhaul & Scroll Bug Fix

## 1. Kết quả Debug & Rà soát lỗi (`/ck:debug`)

Qua kiểm tra trực tiếp mã nguồn tại [StudentPageLayout.tsx](file:///e:/Thuc%20tap%20tot%20nghiep/ielts-grader-project/frontend/src/components/layout/StudentPageLayout.tsx), [SpeakingResultsView.tsx](file:///e:/Thuc%20tap%20tot%20nghiep/ielts-grader-project/frontend/src/components/exam/SpeakingResultsView.tsx), [SpeakingRecordedAudio.tsx](file:///e:/Thuc%20tap%20tot%20nghiep/ielts-grader-project/frontend/src/components/exam/speaking/speaking-recorded-audio.tsx) và API Backend [speaking_result_views.py](file:///e:/Thuc%20tap%20tot%20nghiep/ielts-grader-project/backend/app/services/speaking/speaking_result_views.py):

| Mã lỗi | Mức độ | Vị trí | Nguyên nhân gốc rễ |
| :--- | :--- | :--- | :--- |
| **BUG-SPK-DETAIL-01** (Mất scroll hoàn toàn) | **CRITICAL** | `StudentPageLayout.tsx` (L19–27, L37, L67) & `SpeakingResultsView.tsx` (L107) | `StudentPageLayout` gán `isWorkspace = true` cho `/test-practice/speaking/*/detail`, bọc ngoài bằng `h-screen overflow-hidden` + `overflow-hidden`. Trong khi `CleanReadingDetailView` tự tạo scroll nội bộ, `SpeakingResultsView` dùng `min-h-screen` mà không có `h-full overflow-y-auto`, làm nội dung vượt quá `100vh` bị cắt cụt và không cuộn được. |
| **BUG-SPK-DETAIL-02** (Giao diện bó hẹp 1 thanh) | **HIGH** | `SpeakingResultsView.tsx` (L122) | `<main className="max-w-3xl mx-auto p-4 space-y-6">` chỉ chiếm ~768px ở giữa màn hình desktop, bỏ trống ~50% chiều ngang hai bên, thiếu cột điều hướng câu hỏi và thẻ tổng quan điểm số. |
| **BUG-SPK-DETAIL-03** (Lãng phí dữ liệu Backend) | **HIGH** | `SpeakingResultsView.tsx` vs `speaking_result_views.py` (L130–152) | Backend đã trả về `overall_band`, `speaking.criteria` (4 tiêu chí FC/LR/GRA/P), `speaking.feedback` (nhận xét tổng Chuyên gia), `answer.duration_ms`, `answer.metrics` (tốc độ nói WPM, pause ratio, filler count từng câu), và `relevance`/`development` từng câu — nhưng Frontend chưa render. |
| **BUG-SPK-DETAIL-04** (Audio player đơn điệu & WebM `Infinity`) | **MEDIUM** | `speaking-recorded-audio.tsx` (L18–26) | Dùng `<audio controls>` mặc định của trình duyệt; dùng mẹo `currentTime = Number.MAX_SAFE_INTEGER` dễ nhấp nháy khi `duration === Infinity`, không tận dụng `answer.duration_ms` từ backend, không có tốc độ phát (`1x/1.25x/1.5x`) và không hiển thị mốc ghim lỗi (`MapPin`) ngay trên thanh scrub. |
| **BUG-SPK-DETAIL-05** (Match feedback theo `index` cứng) | **MEDIUM** | `SpeakingResultsView.tsx` (L169) | `partFeedback?.answers?.[index]` dễ lệch nếu có câu bị bỏ qua/thiếu response. Nên ưu tiên match theo `question` chuẩn hóa rồi mới fallback `index`. |
| **BUG-SPK-DETAIL-06** (Sticky Header & Jump-to-Question) | **LOW** | `SpeakingResultsView.tsx` (L108) | Thiếu thanh điều hướng nhanh giữa các câu (Q1..Q7) và Part summary card chưa nổi bật. |

---

## 2. Phân tích Brainstorm & Lựa chọn kiến trúc (`/ck:brainstorm` + `/ck:sequential-thinking`)

### Phương án A: Giữ 1 cột nhưng mở rộng `max-w-5xl`
- **Ưu điểm**: Nhanh, ít thay đổi cấu trúc.
- **Nhược điểm**: Vẫn phải cuộn dài theo chiều dọc qua 7 câu hỏi; không nhìn thấy điểm Band / 4 tiêu chí / danh sách câu hỏi song song; vẫn mang cảm giác "1 thanh dọc".

### Phương án B (Đề xuất — UI/UX Pro Max): Bố cục 2 cột rộng `max-w-7xl` (Sticky Left Navigator & Score Overview + Wide Right Question Workspace)
- **Ưu điểm**:
  - Tận dụng toàn bộ màn hình desktop (`max-w-7xl`, grid 12 cột: `lg:col-span-4` trái + `lg:col-span-8` phải; mobile tự xếp dọc 1 cột).
  - **Cột trái (Sticky Sidebar)**:
    1. **Score Summary Card**: Overall Band, huy hiệu trạng thái (`Chuyên gia đã thẩm định` / `AI ước lượng`), 4 mini-pill điểm FC / LR / GRA / P, nút quay lại trang Tổng kết.
    2. **Expert Overall Feedback** (nếu Chuyên gia đã chấm) hoặc tóm tắt Part đang xem.
    3. **Question Navigator**: Danh sách Q1..Q7 chia theo Part 1 / Part 2 / Part 3 — click để nhảy mượt (`scrollIntoView`) tới đúng câu, hiển thị badge số ghim lỗi của Chuyên gia (nếu có) và thời lượng câu trả lời.
  - **Cột phải (Main Detailed Review)**:
    1. **Sticky Filter Bar**: Tab `Tất cả (N câu)`, `Part 1`, `Part 2`, `Part 3` + nút mở rộng/thu gọn tất cả câu trả lời nâng cấp.
    2. **Part Header Banner**: Tiêu đề Part + `part_summary` được trình bày rõ ràng trong callout card.
    3. **Rich Question Card** cho từng câu:
       - **Header câu hỏi**: Badge `Part X • Câu Y`, prompt (`SpeakingPromptDisplay` hỗ trợ Part 2 Cue Card), thời lượng.
       - **Custom Audio Player Pro**: Scrub bar đồng bộ với Expert Workspace (có fallback `duration_ms / 1000` chống `Infinity:NaN`), hiển thị các chấm `MapPin` vị trí Chuyên gia ghim lỗi ngay trên thanh tiến độ, nút Play/Pause, Tua lại 5s, chọn tốc độ `1x / 1.25x / 1.5x`.
       - **Expert Timestamp Pins** (nếu có): Danh sách thẻ lỗi với nút click mốc thời gian `00:XX` phát audio ngay tại giây đó + loại lỗi + gợi ý sửa.
       - **Per-Question Speech Metrics Strip**: Thanh chỉ số gọn (Tốc độ nói `WPM`, Tỉ lệ ngắt quãng `%`, Khoảng ngừng dài, Từ đệm) lấy từ `answer.metrics`.
       - **2-Column Comparison Grid (trên desktop `md:grid-cols-2`)**:
         - Trái: **Transcript bài nói của bạn** + đánh giá `Mức độ liên quan (Relevance)` / `Phát triển ý (Development)`.
         - Phải: **Phân tích AI & Gợi ý nâng cấp** (`Điểm tốt`, `Cần cải thiện`, `Cụm từ nên dùng` dạng pill tags, và khối `Câu trả lời nâng cấp Band 8+` kèm nút Copy).

---

## 3. Lộ trình triển khai chi tiết (`/ck:plan`)

### Phase 1: Sửa triệt để lỗi không Scroll & Khung trang (`StudentPageLayout` & `SpeakingResultsView`)
- **Mục tiêu**: Khôi phục scroll mượt trên cả desktop và mobile, không làm hỏng Reading/Listening split-pane.
- **Thay đổi dự kiến**:
  - `SpeakingResultsView.tsx`: Đổi container gốc thành `h-full w-full overflow-y-auto bg-slate-50 scroll-smooth` (tương thích 100% với `StudentPageLayout` `h-screen overflow-hidden`), đảm bảo sticky header & sticky left sidebar hoạt động đúng trong scroll container.
  - Kiểm tra thêm `CleanReadingDetailView` và `CleanListeningDetailView` để chắc chắn không bị ảnh hưởng.

### Phase 2: Nâng cấp Custom Audio Player với `duration_ms` Fallback & Pin Markers
- **Mục tiêu**: Thay `<audio controls>` đơn điệu bằng component `SpeakingDetailAudioPlayer` trực quan, không bao giờ dính lỗi `Infinity:NaN`.
- **File tạo/sửa**: `frontend/src/components/exam/speaking/speaking-detail-audio-player.tsx` (hoặc nâng cấp `speaking-recorded-audio.tsx` giữ backward-compatible).
- **Tính năng**:
  - Nhận `src`, `durationMs`, `pins` (mốc thời gian lỗi), `audioRef`.
  - Thanh progress bar custom, marker `MapPin` màu rose trên thanh scrub, nút `1x / 1.25x / 1.5x`, tua `-5s`, xử lý `Number.isFinite` an toàn.

### Phase 3: Thiết kế lại Bố cục 2 Cột Rộng (`max-w-7xl`) & Sidebar Điều hướng
- **Mục tiêu**: Dàn trải giao diện rộng rãi, hiện đại theo chuẩn UI/UX Pro Max (`bg-slate-50`, card trắng viền `slate-200/80`, shadow nhẹ, contrast đạt chuẩn WCAG AA ≥ 4.5:1).
- **Thành phần**:
  - Header sticky `max-w-7xl`: Nút quay lại, Tên bài thi, Badge trạng thái (`Chuyên gia đã thẩm định` / `AI ước lượng`), Overall Band badge nhanh.
  - Left Sticky Column (`lg:col-span-4`): Score Overview Card (Overall Band + 4 tiêu chí FC/LR/GRA/P) + Expert Feedback tổng quan + Question Navigator (`scrollIntoView` tới `#speaking-q-{response_id}`).

### Phase 4: Làm giàu Question Card & So sánh Song song (Side-by-Side)
- **Mục tiêu**: Hiển thị đầy đủ dữ liệu Backend đã trả về mà không làm rối mắt.
- **Thành phần**:
  - Hiển thị `answer.metrics` (WPM, Pause %, Long pauses, Fillers) dưới dạng 4 mini-stat pills nếu câu có dữ liệu.
  - Layout 2 cột (`xl:grid-cols-2`) bên trong mỗi Question Card: Cột Transcript & Timestamp Pins vs Cột Nhận xét & Câu trả lời nâng cấp (mở sẵn hoặc toggle mượt, có nút Copy).
  - Match feedback an toàn theo chuẩn hóa câu hỏi (`normalizeQuestion`) + fallback `index`.

### Phase 5: Kiểm thử & Xác minh (`tsc` + `ck:agent-browser`)
- Chạy `cd frontend; npx tsc --noEmit` đảm bảo 0 lỗi TypeScript.
- Dùng `browser` subagent mở trực tiếp `/test-practice/speaking/641c4a00-a8f6-4ce2-913c-c17f42af8838/detail?attemptId=...`:
  - Kiểm tra cuộn trang xuống cuối mượt mà (`scrollHeight > clientHeight`, `scrollTop` tăng được).
  - Kiểm tra bố cục 2 cột desktop, không tràn ngang, scrub bar hiển thị thời lượng chuẩn (không `Infinity:NaN`), bấm Question Navigator nhảy đúng câu, bấm mốc thời gian pin phát audio đúng vị trí.
