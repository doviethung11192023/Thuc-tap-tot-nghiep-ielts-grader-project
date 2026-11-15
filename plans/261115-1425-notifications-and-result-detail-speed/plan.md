# Plan: Hệ thống Thông báo Đa trạng thái (AI + Expert) & Tối ưu Tốc độ Xem Chi Tiết + Sửa Bug Summary

**Slug:** `notifications-and-result-detail-speed`  
**Date:** 2026-11-15  
**Status:** Planned (Chờ xác nhận triển khai)

---

## 1. Bối cảnh & Kết quả Debug (`/ck:debug`)

### 1.1. Lỗi hệ thống Thông báo (`NotificationBell`)
- `frontend/src/stores/notification-store.ts` hiện là **100% client-side Zustand + `localStorage`** (`NotificationType = 'grading_pending' | 'grading_complete' | 'grading_failed'`).
- Backend (`backend/app/api`, `backend/app/services`, `backend/app/worker`) hoàn toàn **không có bảng `notifications`**, không có API `/notifications`, và không phát sinh thông báo nào khi:
  - Chuyên gia chấm xong (`submit_expert_final_review`).
  - Hệ thống phân công / Admin chuyển giao / Chuyên gia từ chối bài chấm.
  - AI chấm xong hoặc thất bại khi học viên đã rời trang `/summary` hoặc đăng nhập trên thiết bị/tab khác.
- Nếu học viên rời trang `/summary` trong lúc AI đang chấm, item `grading_pending` trong `localStorage` bị kẹt vĩnh viễn.
- `NotificationItem.tsx` chỉ điều hướng cứng tới `/results/${notification.essay_id}`, không hỗ trợ Speaking, Reading, Listening hay `/test-practice/.../summary`.

### 1.2. Tốc độ tải "Xem chi tiết" chậm (`/results/[essayId]`) & Fallback Mock nguy hiểm
- `frontend/src/app/(student)/results/[essayId]/page.tsx` dùng `useEffect` + `setLoading(true)` thuần túy (**không dùng `@tanstack/react-query` cache**), nên mỗi lần bấm từ `/summary` sang `/results/[essayId]` hoặc chuyển Task 1 ↔ Task 2 đều hiện spinner toàn màn hình và fetch lại từ đầu.
- `backend/app/services/writing/writing_result_views.py` (`build_essay_result`) thực hiện **8–9 truy vấn Supabase HTTP đồng bộ nối tiếp nhau** (`essays`, `attempts`, `evaluations`, `criterion_scores`, `grading_runs` x2, `annotations`, và truy vấn `essays` lần 2 cho `sibling_essays`), gây độ trễ backend ~1.0–1.8s mỗi lần bấm.
- Ngoài ra, `frontend/src/app/(student)/test-practice/[skill]/[testId]/detail/page.tsx` (L41–49) vẫn fallback về `mockWritingExamDataset.sample_student_submission` nếu người dùng truy cập route `/test-practice/writing/[testId]/detail`.

### 1.3. Các lỗi UI/UX & Dữ liệu trên trang Tổng kết (`/summary`)
- **BUG-SUM-01 (Lỗi dữ liệu nghiêm trọng trên ảnh chụp):** Trong `backend/app/services/writing/writing_result_views.py` L132–134, khi `is_expert and not strengths and comments_map.get(tno)`, hệ thống lấy `list(comments_map[tno].values())[:2]` đắp vào `strengths` — khiến nhận xét điểm yếu `"To improve: Complete failure to address the task lexically..."` bị hiển thị trong mục **"Ưu điểm nổi bật:"**!
- **BUG-SUM-02 (Nhãn công thức sai khi làm 1 Task):** `frontend/src/components/exam/summary/WritingSummaryResult.tsx` L221 hiển thị cứng `(Task 1 + 2 × Task 2) / 3` kể cả khi `tasks.length === 1` (bài Practice 1 task).
- **BUG-SUM-03 (Khung cuộn trang `/summary`):** `frontend/src/components/layout/StudentPageLayout.tsx` L19–35 đặt `h-screen overflow-hidden` cho mọi route khớp `/test-practice/writing/` (bao gồm cả `/summary`), khiến thao tác cuộn bị phụ thuộc vào inner scroll container thay vì cuộn tự nhiên toàn trang như trang tổng kết thông thường.

---

## 2. Ma trận Trạng thái Thông báo Toàn hệ thống

| Sự kiện | Người nhận | Kênh Backend phát sinh | Trạng thái UI / Bell | Action URL |
| :--- | :--- | :--- | :--- | :--- |
| AI bắt đầu chấm Writing/Speaking | Learner | Worker / Submit endpoint (hoặc optimistic + sync) | Banner live + Bell (`ai_grading`) | `/test-practice/{skill}/{testId}/summary?attemptId=...` |
| AI chấm xong Writing/Speaking | Learner | ARQ Worker (`on_success`) | Badge xanh + Bell (`ai_complete`) | `/test-practice/{skill}/{testId}/summary?attemptId=...` |
| AI chấm thất bại | Learner | ARQ Worker (`on_failure`) | Banner cảnh báo + nút Thử lại + Bell (`ai_failed`) | `/test-practice/{skill}/{testId}/summary?attemptId=...` |
| Học viên gửi yêu cầu Chuyên gia | Learner + Expert | `request_expert_review` / `dispatcher.py` | Bell cho Learner (`expert_requested`) & Expert (`expert_assigned`) | Learner: `/summary`; Expert: `/expert/grade/{id}` |
| Admin gán / chuyển giao bài chấm | Expert mới | `admin_review_dispatch_service.py` | Bell (`expert_reassigned`) | `/expert/grade/{id}` |
| Chuyên gia chấm xong (Ký duyệt) | Learner | `submit_expert_final_review` | Bell nổi bật (`expert_complete`) + Toast khi đang online | `/test-practice/{skill}/{testId}/summary?attemptId=...` |

---

## 3. Các Phase Triển khai

| Phase | Tên Phase | Phạm vi chính | File Plan |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **DB Notifications, Backend Hooks & Bell Sync** | Tạo bảng `notifications` (1 migration), `notification_service.py`, hook AI Workers + Expert Dispatch/Submit + Admin Reassign, API `/api/v1/notifications`, nâng cấp `NotificationBell` + `NotificationItem` + React Query polling/sync | [phase-01-notifications-db-backend-and-bell-sync.md](./phase-01-notifications-db-backend-and-bell-sync.md) |
| **Phase 2** | **Tối ưu Tốc độ Xem Chi Tiết & Sửa Bug Summary** | Song song hóa `build_essay_result` & Speaking detail bằng `asyncio.gather`, bỏ query thừa; chuyển `/results/[essayId]` & `SpeakingResultsView` sang React Query + prefetch từ `/summary`; fix `BUG-SUM-01`, `BUG-SUM-02`, `BUG-SUM-03` | [phase-02-result-detail-speed-and-summary-ui-fixes.md](./phase-02-result-detail-speed-and-summary-ui-fixes.md) |
| **Phase 3** | **Kiểm thử & Nghiệm thu E2E** | Apply migration, chạy backend tests, `npx tsc --noEmit`, kiểm thử `/ck:agent-browser` luồng Expert submit -> Learner NotificationBell -> `/summary` -> `/results/[essayId]` | [phase-03-verification-and-e2e.md](./phase-03-verification-and-e2e.md) |
