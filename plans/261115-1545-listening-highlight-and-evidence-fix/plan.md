---
title: "Master Plan: Sửa triệt để lỗi Highlight & Dẫn chứng ở Trang Kết Quả Chi Tiết Listening"
date: "2026-11-15"
status: "pending-approval"
priority: "P1"
scope: "frontend"
skills: ["ck:debug", "ck:plan", "ck:ui-ux-pro-max"]
---

# Master Plan: Listening Detail Highlight & Evidence Synchronization Fix

## 1. Kết quả Debug chi tiết (`/ck:debug`)

Qua phân tích luồng truyền props và state giữa 5 component của Listening Detail View (`CleanListeningDetailView`, `CleanListeningTranscriptPane`, `CleanListeningUtteranceCard`, `CleanListeningExerciseGroupsPane`, `CleanGroupDropdownExplanation`, `CleanGroupEvidenceLocation`), phát hiện **5 nguyên nhân gốc rễ** gây ra hiện tượng *"bấm highlight trên đề thì bình thường, nhưng bấm dưới đáp án / giải thích thì bị lỗi"*:

| Mã lỗi | Mức độ | Vị trí | Nguyên nhân gốc rễ |
| :--- | :--- | :--- | :--- |
| **BUG-LIS-HL-01** (`onSelectEvidence` không cập nhật `activeQuestionNumber`) | **CRITICAL** | `CleanListeningDetailView.tsx` (L181) & `CleanListeningExerciseGroupsPane.tsx` (L118) | `CleanQuestionDropdownExplanation` gọi `onSelectEvidence(evidenceText, questionNumber)` (2 tham số), nhưng `CleanListeningDetailView` chỉ truyền `(text) => setHighlightedEvidenceText(text)` và **bỏ qua `questionNumber`**. Do đó `activeQuestionNumber` vẫn giữ câu cũ (vd: Câu 1), làm `CleanListeningUtteranceCard` ở Câu 5 có `isCurrentActive = false` → **không highlight và scroll nhầm về Câu 1**. |
| **BUG-LIS-HL-02** (State `highlightedEvidenceText` bị cũ/stale khi đổi câu) | **HIGH** | `CleanListeningDetailView.tsx` (L167, L179) & `CleanGroupDropdownExplanation.tsx` (L70) | Khi bấm tab `Question X` ở phần "Giải thích đáp án" bên dưới hoặc bấm `Câu X` ở transcript/bảng, `onSelectQuestion(num)` chỉ đổi `activeQuestionNumber` mà **không reset hoặc đồng bộ `highlightedEvidenceText`**. Nếu `highlightedEvidenceText` đang lưu text của câu trước, `CleanListeningUtteranceCard` dùng `highlightedEvidenceText || activeQ?.evidence_text` nên match sai text của câu mới → **mất highlight**. |
| **BUG-LIS-HL-03** (Hardcode timestamp mock Test 1 cho mọi đề Listening) | **HIGH** | `CleanGroupEvidenceLocation.tsx` (L59–62, L112) | Hàm `getTimestampForQuestion(q)` hardcode `timeMap = { 1: 136, 2: 152, ... }` của đề mock Test 1 và fallback `(q.question_number - 1) * 35` (vd: Câu 38 nhảy tới giây `1295` = 21:35, vượt quá độ dài audio Part 4). Cần tìm đúng `utterance.start_seconds` khớp với `evidence_text` trong `currentSection.transcript_utterances`. |
| **BUG-LIS-HL-04** (Tab `Evidence 1 / Evidence 2` chết & không highlight đúng từ khóa) | **MEDIUM** | `CleanGroupEvidenceLocation.tsx` (L18, L78–99) | State `selectedEvidenceIndex` được set khi bấm `Evidence 1` / `Evidence 2` nhưng **không hề được sử dụng** ở bất kỳ chỗ nào trong render. |
| **BUG-LIS-HL-05** (Scroll không nhảy khi utterance đã active nhưng ở ngoài viewport) | **LOW** | `CleanListeningTranscriptPane.tsx` (L38–44) | `useEffect` tìm `#active-listening-evidence` khi `activeQuestionNumber` đổi; nếu không tìm thấy (do `evidence_text` có dấu câu/xuống dòng khác với `utterance.text` hoặc thiếu `utterance` match) thì không scroll tới card chứa utterance đó. |

---

## 2. Giải pháp kiến trúc & UI/UX (`/ck:plan` + `/ck:ui-ux-pro-max`)

### Hợp nhất nguồn chân lý Highlight (`highlightTarget: { text: string; qNum: number } | null`)
Thay vì để `activeQuestionNumber` và `highlightedEvidenceText` chạy lệch pha nhau ở 2 nơi, chuẩn hóa luồng dữ liệu tại `CleanListeningDetailView.tsx`:
- Khi bấm **bất kỳ nút Highlight / Phát dẫn chứng** nào (từ `CleanQuestionDropdownExplanation` trên từng câu, từ `CleanGroupEvidenceLocation` dưới đáp án, hay từ `CleanListeningTableRenderer`):
  - Tạo 1 hàm thống nhất `handleSelectEvidence(text: string, questionNumber?: number)`:
    1. Nếu có `questionNumber`, cập nhật `setActiveQuestionNumber(questionNumber)`.
    2. Cập nhật `setHighlightedEvidenceText(text)`.
- Khi bấm **chọn câu hỏi** (`handleSelectQuestion(num)` từ tab `Question X`, bảng `CleanListeningTableRenderer`, hoặc badge `Câu X` trên transcript):
  1. Cập nhật `setActiveQuestionNumber(num)`.
  2. Tự động đồng bộ `highlightedEvidenceText` = `evidence_text` của câu `num` (hoặc `null` để fallback về `activeQ.evidence_text`), tuyệt đối **không giữ text cũ của câu trước**.

---

## 3. Lộ trình triển khai chi tiết (4 Phase)

### Phase 1: Đồng bộ State Highlight & Question Selection (`CleanListeningDetailView` & `CleanListeningExerciseGroupsPane`)
- **Mục tiêu**: Đảm bảo bấm highlight ở trên câu hỏi hay dưới phần Giải thích đáp án đều cập nhật đồng thời `activeQuestionNumber` + `highlightedEvidenceText`.
- **File sửa**:
  - `CleanListeningDetailView.tsx`: Cập nhật `onSelectEvidenceText={(text, qNum) => ...}` và `handleSelectQuestion(num)` tự động đồng bộ `highlightedEvidenceText`.
  - `CleanListeningExerciseGroupsPane.tsx`: Mở rộng prop `onSelectEvidenceText: (text: string, questionNumber?: number) => void` và truyền xuống cả `CleanQuestionItemRenderer` lẫn `CleanGroupDropdownExplanation`.

### Phase 2: Sửa Timestamp Audio thực tế từ Transcript (`CleanGroupEvidenceLocation` & `CleanGroupDropdownExplanation`)
- **Mục tiêu**: Xóa bỏ `timeMap` hardcode của mock Test 1; bấm "Phát âm thanh" ở dưới đáp án phải nhảy đúng giây `start_seconds` của `utterance` chứa dẫn chứng trong `currentSection.transcript_utterances`, đồng thời gọi `onSelectEvidenceText(currentQ.evidence_text, currentQ.question_number)` để highlight & scroll transcript bên trái ngay lập tức.
- **File sửa**:
  - `CleanGroupEvidenceLocation.tsx`: Thêm prop `transcriptUtterances` (hoặc helper `findUtteranceStartSeconds(utterances, evidenceText)`), xử lý tab `Evidence 1 / Evidence 2` thực chất theo `keywords_mapping` hoặc ẩn nếu chỉ có 1 evidence.

### Phase 3: Cải thiện thuật toán Highlight & Scroll Fallback (`CleanListeningTranscriptPane` & `CleanListeningUtteranceCard`)
- **Mục tiêu**:
  - Chuẩn hóa khớp chuỗi thông minh hơn (bỏ khoảng trắng thừa, ngoặc kép, dấu câu nhẹ) khi `evidence_text` lấy từ DB hơi khác dấu câu với `utterance.text`.
  - Thêm `id="active-listening-utterance"` trên card utterance đang active để nếu không match được cụm từ con để bọc `<mark>`, transcript vẫn tự cuộn mượt đến đúng card lời thoại đó (`scrollIntoView`).
  - Bổ sung nút **"Highlight trên transcript 📍"** rõ ràng ngay cạnh nút **"Phát âm thanh"** trong `CleanGroupEvidenceLocation` (UI/UX Pro Max: rõ hành động, feedback thị giác nhất quán với Reading).

### Phase 4: Kiểm thử (`tsc` + `ck:agent-browser`)
- Chạy `cd frontend; npx tsc --noEmit` đảm bảo 0 lỗi TypeScript.
- Dùng `browser` subagent mở trực tiếp một bài Listening đã nộp (`/test-practice/listening/.../detail`):
  - Test bấm **"Highlight trên bài 📍"** ở câu bất kỳ (trên danh sách câu hỏi) → kiểm tra transcript bên trái scroll & highlight đúng câu đó.
  - Test bấm tab **Question X** và nút **Phát âm thanh / Highlight** ở phần **"Giải thích đáp án"** bên dưới → kiểm tra transcript bên trái đổi highlight sang đúng câu X, không bị kẹt câu cũ, và audio phát đúng mốc `start_seconds` của utterance đó.
