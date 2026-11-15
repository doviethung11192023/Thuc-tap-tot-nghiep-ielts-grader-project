---
title: "Expert Workspace Overhaul, Annotation Editor & System-Wide Loading Speed Optimization"
plan_id: "261115-1405-expert-workspace-and-system-speed-optimization"
date: "2026-11-15"
version: "1.0.0"
status: "ready"
priority: "P0"
authors: ["Antigravity AI (@backend-specialist, @frontend-specialist)"]
---

# KẾ HOẠCH TỔNG THỂ: SỬA LỖI LUỒNG EXPERT (`/ck:ui-ux-pro-max`) & TỐI ƯU TỐC ĐỘ TẢI TOÀN HỆ THỐNG

## 1. Kết quả Debug & Phân tích Nguyên nhân (`/ck:debug`, `/ck:sequential-thinking`)

### A. Các lỗi nghiêm trọng trong Luồng Chấm của Expert
1. **BUG-EXP-01 — Thanh Action Bar dính đè giữa màn hình (`[assignmentId]/page.tsx`):**
   - Khung Split-View dùng `h-[calc(100vh-210px)] min-h-[650px]`. Trên màn hình laptop (768px–900px), `min-h-[650px]` vượt quá `100vh - 210px`, khiến thanh `<div className="sticky bottom-0 z-40 ...">` trôi đè ngang qua giữa bài làm và khung chấm điểm (đúng như ảnh chụp của người dùng).
   - Hai cột cuộn độc lập bên trong một container có chiều cao cố định khiến trang bị "2 thanh cuộn lồng nhau" và nhảy bố cục.
2. **BUG-EXP-02 — Nhầm nhận xét Speaking vào Writing (`CriterionScoringPanel.tsx`, `SnippetDrawer.tsx`):**
   - `loadExpertSnippets()` nạp chung toàn bộ mẫu `TA/TR/CC/LR/GRA/FC/P`. Khi chấm Writing, Expert vẫn thấy mẫu `FC` / `P` (Speaking), dẫn đến chèn nhầm nhận xét phát âm vào Writing TA.
   - `SnippetDrawer` dùng `useState(defaultCategory)` chỉ chạy 1 lần lúc mount nên không đồng bộ lại khi mở kho cho tiêu chí khác.
3. **BUG-EXP-03 — Trình chỉnh sửa lỗi (Annotation Editor) thiếu Edit, sai vị trí highlight, không có nút thêm nhận xét ngoài bôi đen (`WritingAnnotationWorkspace.tsx`):**
   - Danh sách lỗi chỉ có nút Xóa (`Trash2`), **không có nút Sửa (Edit)** để Expert chỉnh sửa nội dung lỗi AI đưa ra hoặc đổi category/explanation.
   - Khi bôi đen đoạn văn lặp lại (vd `"test"`, `"the"`), `fullText.indexOf(text)` luôn lấy vị trí xuất hiện đầu tiên thay vì đúng đoạn Expert vừa chọn.
   - Không có nút **"+ Thêm nhận xét / lỗi mới"** độc lập (ngoài việc bôi đen) cho nhận xét tổng quát của từng Task.
   - Popover form gán cố định `top: toolbarPos.top - 100` dễ bị cắt mất khi bôi đen ở đầu bài.
4. **BUG-EXP-04 — Danh sách `/expert/assignments` thiếu thông tin phân biệt & sai nhãn giờ SLA:**
   - Hai bài cùng tên đề hiển thị giống hệt nhau (thiếu email/tên học viên và mã `#attempt_id`).
   - `remaining_hours` tính theo giờ thực (`due_at - now`) nhưng lại gắn nhãn `"giờ làm việc"`, gây hiểu nhầm `58h làm việc` dù SLA là 48h.
   - Bấm "Tiếp tục chấm" luôn gọi `POST /start` trước khi chuyển trang dù bài đã mở draft từ trước.
5. **BUG-EXP-05 — Nút "Lưu và thoát" KHÔNG hề lưu bản nháp:**
   - Giao diện ghi *"Bản nháp đã đồng bộ tự động"* nhưng thực tế không có API lưu draft (`PUT /draft`) và nút `"Lưu và thoát"` chỉ là thẻ `<Link>` thoát trang — khiến mọi thay đổi band/comment/annotation chưa bấm "Ký Duyệt" bị mất sạch khi quay lại.

### B. Nguyên nhân Chậm Tải & "Load lại từ đầu" khi Bấm Quay Lại Toàn Hệ Thống
1. **Frontend bỏ phí `@tanstack/react-query`:**
   - `Providers.tsx` đã cấu hình `<QueryClientProvider>` (`staleTime: 60s`), **nhưng 0 trang nào trong toàn bộ dự án dùng `useQuery`**!
   - Mọi trang (`(student)/*`, `expert/*`, `admin/*`) đều dùng `useEffect` + `setLoading(true)` thô. Mỗi lần bấm sang trang khác rồi bấm Quay lại (Back), React unmount -> remount -> hiện spinner toàn màn hình và gọi lại API từ đầu.
2. **Backend N+1 & Sequential Queries:**
   - `GET /api/v1/expert/assignments` chạy vòng lặp N+1 query `attempts` cho từng bài.
   - `GET /api/v1/expert/assignments/{id}/workspace` chạy tuần tự 10–12 HTTP request tới Supabase (~1.2s–2.0s mỗi lần mở).

---

## 2. Danh sách Phase Triển Khai

| Phase | Nội dung chính | Độ ưu tiên | Trạng thái | File chi tiết |
| --- | --- | --- | --- | --- |
| 01 | Expert Workspace Pro Max: Sửa layout, Editor Edit/Add/Delete, Lọc Snippet theo Skill, Save Draft thật & Assignment Cards | P0 | `pending` | [phase-01-expert-workspace-ux-and-editor-fixes.md](./phase-01-expert-workspace-ux-and-editor-fixes.md) |
| 02 | Tối ưu Tốc độ Toàn Hệ Thống: React Query Cache (Zero-Spinner Back Navigation) + Batch/Parallel Backend Queries | P0 | `pending` | [phase-02-system-wide-loading-speed-and-react-query.md](./phase-02-system-wide-loading-speed-and-react-query.md) |
| 03 | Kiểm thử API, TypeScript Build & Browser E2E (`/ck:test` + `/ck:agent-browser`) | P0 | `pending` | [phase-03-verification-and-e2e.md](./phase-03-verification-and-e2e.md) |
