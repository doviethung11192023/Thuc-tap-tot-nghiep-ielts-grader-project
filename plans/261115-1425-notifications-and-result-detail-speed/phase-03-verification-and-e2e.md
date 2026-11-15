# Phase 3: Kiểm thử & Nghiệm thu E2E

**Mục tiêu:** Xác minh toàn bộ luồng từ DB migration, Backend unit/API tests, TypeScript check, cho tới trải nghiệm thực tế trên trình duyệt bằng `/ck:agent-browser`.

---

## 1. Migration & Static Checks
- Apply migration bảng `notifications` lên Supabase local/remote và xác nhận RLS + indexes hoạt động.
- Chạy `cd frontend && npx tsc --noEmit` đảm bảo 0 lỗi TypeScript.
- Chạy backend pytest cho `notification_service`, `writing_result_views` (test case `is_expert=True` không đưa `comments_map` vào `strengths`), và endpoint `/api/v1/notifications`.

## 2. Kiểm thử Luồng Thực Tế (`/ck:agent-browser`)
1. **Kiểm tra trang Tổng kết (`/test-practice/writing/.../summary`):**
   - Xác nhận mục **"Ưu điểm nổi bật:"** không còn chứa `"To improve: ..."`.
   - Xác nhận bài 1 Task không hiển thị `(Task 1 + 2 × Task 2) / 3`.
   - Xác nhận trang `/summary` cuộn mượt mà, không kẹt scroll.
2. **Kiểm tra tốc độ "Xem chi tiết" (`/results/[essayId]`):**
   - Từ `/summary`, bấm **"Xem chi tiết"** và đo thời gian chuyển trang + hiển thị dữ liệu (hit prefetch cache / parallel backend).
3. **Kiểm tra E2E Thông báo Chuyên gia -> Học viên:**
   - Học viên gửi yêu cầu Chuyên gia -> kiểm tra `NotificationBell` của Chuyên gia có thông báo mới.
   - Chuyên gia ký duyệt hoàn tất chấm -> đăng nhập lại Học viên -> kiểm tra `NotificationBell` hiển thị badge unread & thông báo `"Chuyên gia đã chấm xong..."`, bấm vào điều hướng đúng về `/summary?attemptId=...`, trạng thái chuyển thành đã đọc (`is_read = true`).
4. **Kiểm tra trạng thái AI đang chấm / AI lỗi:**
   - Khi đang `evaluating`, `/summary` hiện banner tiến trình rõ ràng và tự cập nhật khi xong; `NotificationBell` đồng bộ trạng thái thật từ DB.
