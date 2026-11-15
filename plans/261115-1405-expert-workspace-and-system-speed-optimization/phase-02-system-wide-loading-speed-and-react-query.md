---
phase: 2
title: "System-Wide Loading Speed Optimization & React Query Cache"
status: pending
priority: P0
effort: "2.5h"
dependencies: ["01"]
---

# Phase 02: Tối ưu Tốc độ Tải Toàn Hệ Thống (Zero-Spinner Back Navigation)

## Overview
Loại bỏ hiện tượng "bấm ra rồi bấm quay lại phải load lại từ đầu" bằng cách kích hoạt `@tanstack/react-query` (đã cài sẵn trong `Providers.tsx`) cho các trang chính của Expert, Admin và Student; đồng thời tối ưu Backend loại bỏ N+1 query và chạy song song các truy vấn độc lập.

## Bottleneck Inventory (Toàn hệ thống)
1. **Expert Portal:**
   - `GET /api/v1/expert/assignments`: N+1 query `attempts` -> gộp thành 1 batch query `.in_("id", attempt_ids)` + 1 batch `profiles` cho learner info.
   - `GET /api/v1/expert/assignments/{id}/workspace`: 10–12 truy vấn Supabase tuần tự -> gom các truy vấn độc lập chạy song song bằng `asyncio.gather(asyncio.to_thread(...))`.
   - Frontend `/expert/assignments` & `/expert/assignments/[assignmentId]` & `/expert/profile`: chuyển sang `useQuery` (giữ cache ngay lập tức khi bấm Back, chỉ refetch ngầm khi stale) + prefetch workspace khi hover nút "Tiếp tục chấm".
2. **Admin Portal:**
   - `/admin/reviews`, `/admin/users`, `/admin/logs`, `/admin/tests`: chuyển sang `useQuery` với `placeholderData: keepPreviousData` để chuyển trang/filter/quay lại không bị nháy trắng màn hình.
   - `/admin/statistics`: kiểm tra lỗi CORS/500 khi cache Redis hoặc timeout; bọc fallback an toàn.
3. **Student Portal:**
   - `/history`, `/learning-profile`, `/dashboard`, `/test-practice`, `/test-practice/set/[setId]`: chuyển sang `useQuery` với `staleTime: 60s–120s` (invalidate khi nộp bài mới / chấm lại AI / xin chuyên gia chấm), giúp học viên bấm xem chi tiết bài rồi bấm Quay lại lịch sử hiển thị **tức thì (0ms)** thay vì quay spinner!

## Related Code Files
- Modify: `backend/app/api/endpoints/expert.py`
- Modify: `backend/app/services/expert/dispatcher.py`
- Modify: `frontend/src/components/Providers.tsx` (tinh chỉnh `gcTime: 5 * 60 * 1000`, `staleTime: 60 * 1000`)
- Modify: `frontend/src/app/expert/assignments/page.tsx`
- Modify: `frontend/src/app/expert/assignments/[assignmentId]/page.tsx`
- Modify: `frontend/src/app/expert/profile/page.tsx`
- Modify: `frontend/src/app/admin/reviews/page.tsx`
- Modify: `frontend/src/app/admin/logs/page.tsx`
- Modify: `frontend/src/app/admin/users/page.tsx`
- Modify: `frontend/src/app/(student)/history/page.tsx`
- Modify: `frontend/src/app/(student)/dashboard/page.tsx`
- Modify: `frontend/src/app/(student)/learning-profile/page.tsx`
- Modify: `frontend/src/app/(student)/test-practice/page.tsx`

## Implementation Steps
1. **Backend Query Optimization (`expert.py`):**
   - Xóa N+1 trong `list_expert_assignments` (batch `attempts`, `profiles`).
   - Dùng `asyncio.gather` + `asyncio.to_thread` trong `get_assignment_workspace` cho các query độc lập (`learner_profiles`, `essays`/`speaking_responses`, `ai_eval`, `expert_eval`, `criteria`).
2. **Frontend React Query Migration:**
   - Cấu hình `gcTime: 5 * 60 * 1000` trong `Providers.tsx` để dữ liệu đã xem được giữ trong bộ nhớ 5 phút khi chuyển trang.
   - Chuyển các trang Expert -> Admin -> Student sang `useQuery` + `queryClient.invalidateQueries(...)` sau mỗi mutation (`submit`, `saveDraft`, `assignExpert`, `decline`, `retryAi`).

## Success Criteria
- [ ] Bấm vào bài chấm rồi bấm Quay lại `/expert/assignments` hiển thị ngay lập tức (0ms spinner).
- [ ] Bấm giữa `/admin/reviews` ↔ `/admin/users` ↔ `/admin/logs` hoặc `/history` ↔ `/results/[id]` hiển thị tức thì từ React Query cache.
- [ ] API `GET /api/v1/expert/assignments` giảm từ N+1 queries xuống tối đa 3 queries; `workspace` giảm thời gian phản hồi đáng kể.
