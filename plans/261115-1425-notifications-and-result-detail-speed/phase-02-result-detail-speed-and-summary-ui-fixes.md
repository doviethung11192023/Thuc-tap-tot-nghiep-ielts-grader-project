# Phase 2: Tối ưu Tốc độ Xem Chi Tiết & Sửa Bug Trang Tổng Kết

**Mục tiêu:** Giảm độ trễ chuyển từ `/summary` sang `/results/[essayId]` (và `/detail`) từ ~1.5s+ xuống gần như tức thì (<200ms khi đã prefetch), đồng thời sửa triệt để 3 lỗi UI/dữ liệu trên trang Tổng kết Writing.

---

## 1. Backend Parallelization (`writing_result_views.py` & Speaking Detail)
- File: `backend/app/services/writing/writing_result_views.py` (`build_essay_result`):
  - Hiện tại chạy tuần tự 8–9 Supabase `.execute()` calls.
  - Chuyển sang chạy song song bằng `asyncio.gather(asyncio.to_thread(...))`:
    - Batch 1: `essays` (current essay) + `evaluations` + `annotations` + `grading_runs` (latest for essay) chạy đồng thời theo `essay_id`.
    - Batch 2 (sau khi có `attempt_id` & `evaluation_id`): `attempts` + `sibling_essays` + `criterion_scores` + `grading_runs` (attempt-level nếu chưa có run theo essay) chạy đồng thời.
  - Loại bỏ truy vấn `essays` trùng lặp và chuẩn hóa helper query nhỏ gọn.
- Kiểm tra tương tự cho Speaking detail view service để đảm bảo cả Writing và Speaking đều dùng `asyncio.gather`.

## 2. Frontend React Query Cache + Prefetch từ `/summary`
- File: `frontend/src/app/(student)/results/[essayId]/page.tsx`:
  - Thay `useEffect` + `useState` bằng `useQuery({ queryKey: ['essay-result', essayId], queryFn: () => getEssayResults(essayId), staleTime: 60_000 })`.
  - Chuyển Task 1 ↔ Task 2 sẽ hit cache ngay lập tức nếu đã xem hoặc prefetch trước.
- File: `frontend/src/components/exam/summary/WritingSummaryResult.tsx`:
  - Dùng `queryClient.prefetchQuery` cho `['essay-result', task.essay_id]` khi `/summary` load xong danh sách tasks (hoặc `onMouseEnter` trên nút **"Xem chi tiết"**) để khi bấm **"Xem chi tiết"**, dữ liệu đã sẵn sàng trong cache!
  - Đồng thời chuyển fetch của `WritingSummaryResult` / `SpeakingSummaryResult` sang React Query (với `refetchInterval` tự động khi còn task đang `evaluating` và tự dừng khi `done` / `grading_failed`).
- File: `frontend/src/app/(student)/test-practice/[skill]/[testId]/detail/page.tsx`:
  - Kiểm tra trường hợp `skill === 'writing'`: nếu có `attemptId` hoặc `essayId` query param thì lấy từ API thật hoặc redirect sang `/results/[essayId]` thay vì render `mockWritingExamDataset.sample_student_submission`.

## 3. Sửa 3 Bug UI/UX & Dữ liệu trên Trang Tổng kết (`/summary`)
1. **BUG-SUM-01 (Fix `"To improve: ..."` lọt vào `"Ưu điểm nổi bật:"`):**
   - Trong `backend/app/services/writing/writing_result_views.py` L132–134:
     - Xóa đoạn fallback lấy `comments_map[tno].values()` gán vào `strengths`!
     - Nếu `strengths` trống (ví dụ bài điểm thấp 1.0–3.0 hoặc chuyên gia chỉ ghi điểm cần cải thiện), giữ `strengths = []` và trên UI (`WritingSummaryResult.tsx`) hiển thị thông điệp trung tính rõ ràng (ví dụ `"Chưa ghi nhận ưu điểm nổi bật cho bài viết này"` hoặc ẩn block Ưu điểm nếu rỗng thay vì hiển thị nhầm nhận xét tiêu cực).
2. **BUG-SUM-02 (Fix nhãn công thức `(Task 1 + 2 × Task 2) / 3` cho bài 1 Task):**
   - Trong `frontend/src/components/exam/summary/WritingSummaryResult.tsx` L221:
     - Chỉ render `(Task 1 + 2 × Task 2) / 3` khi `tasks.length >= 2`.
     - Khi `tasks.length === 1`, hiển thị nhãn phù hợp như `Điểm Task ${tasks[0].task_number}` hoặc `Practice Single Task`.
3. **BUG-SUM-03 (Fix Scroll Behavior cho `/summary` trong `StudentPageLayout.tsx`):**
   - Trong `frontend/src/components/layout/StudentPageLayout.tsx` L19–25 & L35:
     - Tách biệt `isExamWorkspace` (trang làm bài & `/results/[essayId]` cần split-pane `h-screen overflow-hidden`) với trang `/summary` (`pathname?.includes('/summary')`) để trang `/summary` cuộn tự nhiên mượt mà trên window/document, không bị double-scrollbar hay kẹt scroll.
