# Phase 1: DB Notifications, Backend Hooks & Frontend Bell Sync

**Mục tiêu:** Xây dựng hệ thống thông báo thật (persisted in Supabase) thay thế `localStorage`-only hiện tại, đảm bảo mọi sự kiện AI & Chuyên gia đều tới được Học viên và Chuyên gia dù họ rời trang hay đổi thiết bị.

---

## 1. Database Migration (1 file duy nhất)
- Tạo `supabase/migrations/<timestamp>_create_notifications_table.sql`:
  - Bảng `public.notifications`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
    - `type TEXT NOT NULL` (`ai_grading`, `ai_complete`, `ai_failed`, `expert_requested`, `expert_assigned`, `expert_reassigned`, `expert_complete`)
    - `title TEXT NOT NULL`
    - `message TEXT NOT NULL`
    - `action_url TEXT`
    - `skill TEXT` (`writing`, `speaking`, `reading`, `listening`)
    - `attempt_id UUID`
    - `essay_id UUID`
    - `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
    - `is_read BOOLEAN NOT NULL DEFAULT FALSE`
    - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - Index `idx_notifications_user_unread_created ON public.notifications (user_id, is_read, created_at DESC)`.
  - Bật RLS: `SELECT`, `UPDATE (is_read)` cho `auth.uid() = user_id`; Backend service-role insert/manage.

## 2. Backend `notification_service.py` & API Endpoints
- Tạo `backend/app/services/notification_service.py`:
  - `create_notification(user_id, type, title, message, action_url=None, skill=None, attempt_id=None, essay_id=None, metadata=None)` (non-blocking / safe `try...except` để không làm gãy luồng chấm bài nếu thông báo lỗi).
  - `list_user_notifications(user_id, limit=30, unread_only=False)` trả về `{ items, unread_count }`.
  - `mark_notification_read(user_id, notification_id)` & `mark_all_notifications_read(user_id)`.
- Tạo `backend/app/api/endpoints/notifications.py` và gắn vào router `/api/v1/notifications`:
  - `GET /api/v1/notifications`
  - `PATCH /api/v1/notifications/{notification_id}/read`
  - `POST /api/v1/notifications/read-all`

## 3. Gắn Hook phát sinh Thông báo tại các điểm nghiệp vụ
1. **AI Workers (Writing & Speaking):**
   - Khi chấm xong (`done`): gửi `ai_complete` cho `learner_id` với `action_url = /test-practice/{skill}/{test_id}/summary?attemptId={attempt_id}`.
   - Khi chấm lỗi (`grading_failed`): gửi `ai_failed` cho `learner_id` kèm hướng dẫn bấm "Thử chấm lại".
2. **Expert Dispatch & Admin Reassign (`dispatcher.py` / `admin_review_dispatch_service.py`):**
   - Khi học viên gửi yêu cầu Chuyên gia: gửi `expert_requested` cho học viên + `expert_assigned` cho chuyên gia được phân công (`action_url = /expert/grade/{request_id}`).
   - Khi Admin gán / chuyển giao bài cho chuyên gia mới: gửi `expert_reassigned` cho chuyên gia mới.
3. **Expert Final Submit (Chuyên gia ký duyệt):**
   - Trong service xử lý hoàn tất chấm của Chuyên gia: gửi `expert_complete` cho `learner_id` với tiêu đề `"Chuyên gia đã chấm xong bài {Skill}"`, điểm Band chính thức trong `message`, và `action_url = /test-practice/{skill}/{test_id}/summary?attemptId={attempt_id}`.

## 4. Frontend Sync (`NotificationBell`, `NotificationItem`, `useNotifications`)
- Tạo `frontend/src/services/notifications.ts` & hook `useNotifications` dùng `@tanstack/react-query` (`refetchInterval: 30_000` khi tab active + refetch on window focus).
- Cập nhật `NotificationBell.tsx` & `NotificationItem.tsx`:
  - Hiển thị đầy đủ icon/màu sắc theo UI/UX Pro Max cho từng loại:
    - `ai_grading`: spinner/sparkles xanh dương nhạt
    - `ai_complete`: check emerald
    - `ai_failed`: alert rose + badge "Lỗi chấm"
    - `expert_complete`: mũ tốt nghiệp / shield teal/emerald nổi bật ("Chính thức")
    - `expert_assigned` / `expert_reassigned`: badge amber/indigo cho Expert Portal
  - Khi bấm item: gọi `PATCH /read` (optimistic update unread badge) và điều hướng theo `notification.action_url` (fallback về `/results/{essay_id}` nếu legacy).
  - Loại bỏ trạng thái kẹt `grading_pending` trong `localStorage`: tự động ẩn hoặc reconcile với server notifications.
  - Thêm banner trạng thái AI đang chấm trực tiếp trên `/summary` khi `status === 'evaluating'` với tiến trình rõ ràng & auto-poll mỗi 4s.
