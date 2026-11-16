# Ghi chú tối ưu UI – trang Luyện đề (/test-practice)

Ngày test: 2026-11-13 · Môi trường: local (Next dev :3000, uvicorn :8000, fakeredis), tài khoản Learner đăng nhập Google · Đo bằng Performance API + click thật trong Chrome.

## 1. Kết luận chính

Lọc chậm **không do số bài** (chỉ 53 đề, 34–44 bài tập/kỹ năng). Dữ liệu từ Redis cache trả về trong 2–4 ms. Gần như toàn bộ độ trễ nằm ở **bước xác thực token chạy đồng bộ trong `async def`**, làm backend xử lý tuần tự mọi request.

| Phép đo | Kết quả |
|---|---|
| `GET /tests?skill=…` không gửi token, cache hit | 2–4 ms |
| Cùng request đó, có token | 410 ms (lần đầu 1 008 ms) |
| 4 request song song, không token | 11 ms |
| 4 request song song, có token | 1 624 ms (≈ 4 × 410, tức bị xếp hàng) |
| Tải trang lần đầu (~10 request cùng lúc) | request cuối xong sau 6.9 s |

Nguyên nhân (`backend/app/core/security.py:28` `get_current_user`):
- Mỗi request gọi `supabase.auth.get_user(token)` (HTTP tới GoTrue, ~200 ms) và một query `profiles` (~200 ms). Cả hai là lời gọi **đồng bộ**, nằm trong `async def`, nên chặn event loop: request sau phải chờ request trước.
- `GET /tests` (`student_practice/catalog.py:11`) và `GET /exercises` (`exercises.py:104`) khai báo `Depends(get_optional_user)` nhưng **không dùng `current_user`**, nên mất 400 ms mà không được gì.
- `get_or_load` (`core/student_content_cache.py:34`) gọi `load()` đồng bộ khi cache miss, nên cũng chặn event loop thêm khoảng 300–600 ms.

## 2. Kết quả bấm từng nút

### Tab "Khám phá đề thi thực tế"
| Nút | Lần đầu | Lần sau (cache FE) |
|---|---|---|
| Reading | 1 117 ms | ~20–60 ms |
| Listening | 511 ms | |
| Writing | 719 ms | |
| Speaking | 615 ms | |
| Dễ | 793 ms, **0 kết quả** | |
| Khó | 607 ms, **0 kết quả** | |
| Ô tìm kiếm, gõ "describe" | **8 request**, kết quả cuối về sau **5.3 s** | |

### Tab "Luyện theo dạng bài"
| Nút | Thời gian |
|---|---|
| Mở tab | 1 235 ms |
| Listening / Writing / Speaking (lần đầu) | 587 / 393 / 372 ms |
| Quay lại kỹ năng đã xem | ~40 ms |
| Mỗi dạng bài (Multiple Choice, Completion, Matching) | ~345 ms |

## 3. Việc cần tối ưu (xếp theo hiệu quả)

### Backend (tác động lớn nhất)
1. **Xác thực không chặn event loop**: kiểm JWT cục bộ (chữ ký + hạn), không gọi GoTrue mỗi request. Cache `profiles(role, is_active)` theo user trong khoảng 60 s (Redis hoặc in-memory). Nếu vẫn cần gọi Supabase thì bọc bằng `run_in_threadpool`. Ước tính mỗi request giảm khoảng 400 ms, và request song song không còn phải xếp hàng. Sửa một chỗ này là có lợi cho cả 20 file endpoint đang dùng auth.
2. **Bỏ `get_optional_user`** ở `/tests` và `/exercises` vì không dùng tới. Bỏ xong là có ngay 2–4 ms khi cache hit.
3. **`get_or_load` chạy `load()` trong threadpool** (`await run_in_threadpool(load)`), để cache miss không chặn các request khác.

### Frontend
4. **Debounce ô tìm kiếm** (300 ms) và huỷ request cũ (AbortController). Hiện mỗi phím gõ là một request, trong khi backend xếp hàng nên kết quả về rất chậm (`StudentDirectTestsSection.tsx`, `useStudentPublishedTests.ts`).
5. **Lọc phía client**: chỉ có 53 đề, nên tải hết một lần (`limit=100`) rồi lọc kỹ năng/độ khó/tìm kiếm ngay trên trình duyệt. Mọi nút lọc sẽ phản hồi tức thì (0 ms). Có thể áp dụng tương tự cho bài tập theo dạng (34–44 bài mỗi kỹ năng).
6. **Dùng React Query** thay cho cache tự viết: `QueryClientProvider` đã có sẵn trong `Providers` nhưng `useStudentPublishedTests` và `useSkillExercises` lại tự viết Map/sessionStorage. React Query cho sẵn dedupe, `keepPreviousData`, prefetch và huỷ request khi đổi bộ lọc.
7. **Prefetch** 4 kỹ năng ngay sau khi trang tải xong (hoặc khi hover lên nút), để lần bấm đầu cũng nhanh như lần sau.
8. **Phản hồi thị giác khi đang lọc**: hiện tại danh sách cũ vẫn hiển thị nguyên vẹn khoảng 0.5–1 s, chỉ có một spinner nhỏ cạnh tiêu đề, nên người dùng tưởng nút không ăn. Nên làm mờ grid (`opacity-60`) và đánh dấu nút đang chọn ngay lập tức. Riêng tab "Luyện theo dạng bài" thì ngược lại: toàn bộ grid bị thay bằng loader, gây giật layout, nên giữ dữ liệu cũ và làm mờ.
9. **Tải trang lần đầu bắn khoảng 10 request cùng lúc** (mock summary, learning-profile ×2, tests, history…). Do backend xếp hàng, danh sách đề phải chờ sau sidebar. Sau khi sửa mục 1 thì vấn đề này tự hết. Ngoài ra có thể ưu tiên tải `/tests` trước và lazy-load sidebar. (Mỗi request bị gọi 2 lần là do React StrictMode ở chế độ dev, production không bị.)

### Lỗi UI / dữ liệu phát hiện khi test
10. **Bộ lọc độ khó vô dụng**: cả 53 đề đều có `difficulty = medium`, nên "Dễ"/"Khó" luôn ra 0 kết quả. Cách sửa: ẩn những mức không có đề, hoặc hiện số lượng cạnh nút (Dễ 0 · Vừa 53 · Khó 0), hoặc bỏ hẳn bộ lọc này (theo hướng giữ tính năng tối thiểu).
11. **"Đang phục vụ X đề thi chuẩn hóa"** dùng `total` của bộ lọc hiện tại, nên khi chọn Reading + Dễ thì hiện "0 đề". Câu này nên luôn hiện tổng toàn kho (53).
12. **Badge "Tất cả dạng bài"** hiện `total` của dạng đang lọc. Ví dụ đang lọc Matching thì badge ghi 6, trong khi thực tế có 34. Nên lấy tổng từ `typesSummary` (cộng các `count`).
13. **"Tất cả dạng bài" chỉ hiện 20/34 bài và không có phân trang hay nút "Xem thêm"**, nên 14 bài không thể truy cập được (`useSkillExercises` gọi với `limit: 20`).
14. **Thanh lọc bị tràn ngang** ở màn 1513 px: nút "Khó" bị cắt, xuất hiện scrollbar ngang. Nên tách hàng kỹ năng và hàng độ khó, hoặc đổi độ khó thành dropdown.

## 3b. Kết quả sau khi sửa backend (mục 1–3, 2026-11-13)
Đã code: `app/core/supabase_access_token_verifier.py`, `security.py`, `student_content_cache.py` (threadpool), bỏ xác thực ở `/tests`, `/exercises`, `/tests/{id}/content`; xoá cache hồ sơ khi khoá tài khoản hoặc đổi role. Test: 11 test xác thực mới, toàn bộ 178 test backend pass.

| Phép đo | Trước | Sau |
|---|---|---|
| `/tests?skill=…` có token, cache hit | 410 ms | 3 ms |
| 4 request song song | 1 624 ms | 8 ms |
| Endpoint cần đăng nhập (`/learning-profile`, có cache) | ~410 ms | 4–7 ms |
| Tải trang Luyện đề (10 API) | 6,9 s | 1,1 s |
| Bấm nút kỹ năng (Explore) | 511–1 117 ms | 50–88 ms |
| Bấm tổ hợp chưa có cache / dạng bài lần đầu | 350–800 ms | ~300 ms |
| Token bị sửa chữ ký | 401 | 401 |

Còn lại: ~300 ms khi cache Redis miss là truy vấn Supabase thật (đồng bộ, ADR-24). `/mock/summary` không có cache nên vẫn ~200 ms mỗi lần và vẫn xếp hàng khi gọi song song. Các mục frontend (4–14) chưa làm.

## 3c. Kết quả sau khi sửa frontend (2026-11-13)
Đã code: tải cả danh mục một lần rồi lọc / tìm / phân trang trên trình duyệt (`useStudentPublishedTests`, `useSkillExercises`, `services/catalog-session-cache.ts`, `getAllStudentPublishedTests`, `getAllSkillExercises`); thanh lọc 2 hàng có số đếm, khoá mức độ khó 0 đề; "Đang phục vụ" dùng tổng kho; badge "Tất cả dạng bài" dùng tổng kỹ năng; bỏ giới hạn 20 bài.

| Phép đo | Trước | Sau |
|---|---|---|
| Request `/tests` khi vào trang + bấm mọi bộ lọc | 1 mỗi tổ hợp lọc (×2 do StrictMode) | 1 cho cả phiên |
| Bấm nút kỹ năng / độ khó | 50–1 117 ms | ~25 ms (dev mode, gồm render) |
| Gõ "describe" | 8 request, 5,3 s | 0 request, tức thì |
| Đổi kỹ năng (tab dạng bài) | 372–587 ms | 29–54 ms (đã tải trước ở nền) |
| Đổi dạng bài | ~345 ms | ~10 ms |
| "Tất cả dạng bài" Listening | 20/34 bài, badge sai khi lọc | 34/34, badge luôn 34 |
| Request `question-types-summary` | 1 mỗi kỹ năng | 0 (suy ra từ bài tập) |

Chưa làm: mục 6 (React Query, không còn cần), mục 10 phần dữ liệu (Admin gán độ khó cho đề trong CMS; hiện 53/53 đề là `medium`).

## 4. Đề xuất thứ tự làm
1 + 2 + 3 (backend, khoảng 1 giờ, giải quyết gốc rễ) → 4 + 10–13 (sửa lỗi nhỏ) → 5/6 (lọc client hoặc React Query) → 8 + 14 (UI polish).

## Quyết định (2026-11-13)
- Token Supabase thực tế được ký bằng **ES256 qua JWT Signing Keys** (header có `kid`, endpoint `/auth/v1/.well-known/jwks.json` trả một khoá ES256/EC, token sống 60 phút). Vì vậy nhánh fallback HS256 `_verified_sub` trong `security.py` hiện không bao giờ khớp với token thật.
- Mục 1 sẽ kiểm token cục bộ bằng JWKS (khoá công khai cache trong bộ nhớ, tự tải lại khi gặp `kid` lạ) và cache `profiles` 60 s.
- Giữ bộ lọc độ khó và gán lại độ khó cho đề (mục 10).
- Chấp nhận tài khoản bị khoá vẫn dùng được tối đa 60 s do cache `is_active`.
