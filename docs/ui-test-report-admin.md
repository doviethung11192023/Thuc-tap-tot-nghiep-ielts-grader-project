# Báo cáo kết quả test chức năng Admin

> **Cập nhật vòng 2 (2026-11-04):** đã sửa thêm E-21 (importer chỉ tạo đề nháp, đúng UC-30), E-11 (đổi nhãn thẻ "Total Essays"), E-16 một phần (ghi `grading_runs.model`). Kiểm lại: API suite 86/86, suite phụ 10 đạt + 2 endpoint chưa có, `tsc` sạch.

- Ngày test: 2026-11-03 và 2026-11-04
- Nhánh `LongRevert`, commit `9927c51` cộng các thay đổi chưa commit
- Tài khoản: Admin test do người dùng tạo bằng SQL, đăng nhập tay trong Chrome Playwright
- Cách chạy: **bằng code trước** (script gọi API bằng token Admin và đối chiếu DB bằng psql), **giao diện sau** (Playwright; lần chạy cuối do một subagent thực hiện)
- Báo cáo liên quan: `docs/ui-test-report.md` (tổng hợp mọi vai trò), `docs/ui-test-report-upload-de.md` (chi tiết nạp đề), `docs/ui-test-report-db-cutover.md` (Learner)

## 1. Kết luận

- Bảng chức năng (mục 3): **39 chức năng, 26 đạt, 9 lệch, 1 lỗi, 3 chưa test**.
- **Không còn lỗi do đổi DB** ở chức năng Admin. Các lỗi có từ trước mà sửa được mà không phải xây tính năng mới đã được sửa (mục 6).
- Kết quả chạy lại sau khi sửa: **bộ test code 85/85 đạt** và bộ bổ sung **10 đạt + 2 ca endpoint chưa có**; **giao diện 61/61 đạt, 0 lỗi thật của app**; pytest 23 đạt; `tsc` sạch.
- Còn lại là việc **phải xây tính năng mới** hoặc **cần bạn quyết định** (mục 8): kiểm nội dung trước publish, thêm dạng câu hỏi vào editor, nối cài đặt vào code, nạp đề không tự publish, khoá chống trùng trong DB, chạy lại AI và giao lại Expert, trang Logs, xuất báo cáo; cùng dữ liệu cũ (Reading Test 5 thiếu câu, 10 đáp án N/A, đề Listening rỗng, 36 chủ đề rác).
- Hai nhận định trước đây của mình đã được rút lại: **E-32** (thời gian Speaking của dataset nằm trong mức tối đa của BR-13, không phải lỗi) và **E-37** (trang cài đặt báo lỗi bằng `alert`, trang chủ đề bằng toast; script test cũ tự chấp nhận hộp thoại nên bỏ sót).

## 2. Cách test

| Lớp | Công cụ | Nội dung |
|---|---|---|
| Code | `scratchpad/suite/admin_api_suite.py` và `admin_api_suite2.py` (Python, `requests`, `psql`) | 97 ca trên 11 nhóm; đối chiếu số liệu với DB; ghi thử đều có dọn dữ liệu; không in chuỗi kết nối |
| Giao diện | Playwright qua CDP, các kịch bản `ui_admin1` đến `ui_admin7` | Từng trang Admin: lọc, tìm, phân trang, modal, tạo, sửa, xoá, khoá, mở khoá, xuất bản, lưu trữ; bắt `alert` và toast; theo dõi lỗi API và console |
| Nguyên tắc ghi dữ liệu | — | Chỉ ghi trên dữ liệu `ZZ …` của chính test; không đổi giá trị bảng quy đổi band và cài đặt; không tạo tài khoản; không nạp thật qua giao diện; không publish đề khác ngoài đề thử |

## 3. Bảng chức năng và trạng thái

Ký hiệu: ✅ Đạt, ⚠️ Lệch (chạy được nhưng sai hoặc thiếu so với thiết kế), ❌ Lỗi, ⬜ Chưa test.

| Nhóm | Chức năng | Bằng code | Bằng giao diện | Trạng thái | Ghi chú |
|---|---|---|---|---|---|
| Phân quyền | Không token → 401 trên mọi route `/admin` | Đạt (38 route) | — | ✅ Đạt | Kiểm tĩnh: mọi route có `require_admin` |
| Phân quyền | Admin gọi API Expert → 403; Admin bắt đầu làm bài → 403 | Đạt | — | ✅ Đạt | Admin làm bài là yêu cầu mở rộng của nhóm, chưa làm |
| Phân quyền | Learner hoặc Expert gọi API Admin | Chưa chạy | — | ⬜ Chưa test | Cần đăng nhập Learner và tài khoản Expert (phiên chỉ có Admin) |
| Thống kê | Trang thống kê, biểu đồ, số liệu | Đạt (khớp DB) | Đạt | ✅ Đạt | E-11 **đã sửa**: thẻ ghi rõ "Bài Writing trong đề + bài chấm tự do" |
| Thống kê | Ô chọn khoảng thời gian, nút Xuất Báo Cáo | — | Đã vô hiệu hoá | ⚠️ Lệch | E-39 chưa có chức năng; đã disable, 0 request, 0 tệp tải về (xây mới ngoài phạm vi) |
| Thống kê | Nhật ký chấm AI | Đạt (tổng, phân trang) | Đạt | ⚠️ Lệch | E-16 lượt lỗi cũ không có nguyên nhân; `model`, `trace_id` trống (cần AI engine trả về) |
| Người dùng | Danh sách, lọc vai trò, tìm kiếm, phân trang | Đạt | Đạt | ✅ Đạt | Expert 10, Admin 10, Learner 8 khớp DB |
| Người dùng | Khoá, mở khoá (FR-04) | Đạt | Đạt | ✅ Đạt | Ghi audit, đồng bộ ban Supabase Auth; tự khoá 400, user lạ 404 |
| Người dùng | Tạo Expert/Admin: kiểm tra dữ liệu và từ chối | Đạt (8 ca) | Đạt | ✅ Đạt | Email sai, tên ngắn, số bài ngoài 1 đến 20, đã có vai trò → 400 hoặc 422; HTML5 chặn ở modal; không tạo gì |
| Người dùng | Tạo Expert/Admin, gửi lại thư mời: nhánh thành công | Không chạy | Không chạy | ⬜ Chưa test | Tạo tài khoản thật và gửi email; người dùng tự làm |
| Đề thi | Danh sách, lọc kỹ năng, trạng thái, tìm kiếm, sắp xếp | Đạt | Đạt | ✅ Đạt | Lọc 4 kỹ năng đúng số lượng |
| Đề thi | Soạn đề nháp: tạo, sửa, xoá (API và modal) | Đạt | Đạt | ✅ Đạt | Gồm 422 tiêu đề ngắn, BR-19 400 |
| Đề thi | Soạn section, nhóm câu hỏi, câu hỏi, đáp án | Đạt | Đạt | ✅ Đạt | Trùng số câu, section, nhóm → 400 |
| Đề thi | Editor: danh sách dạng câu hỏi | — | Đạt | ⚠️ Lệch | E-33 chỉ 6 dạng, thiếu dạng dataset dùng (34 nhóm); cần xây thêm |
| Đề thi | Xuất bản đề (BR-18) | Đạt | Đạt | ⚠️ Lệch | Ghi người duyệt đúng; E-13 không kiểm nội dung trước publish; E-19 đề rỗng đang published |
| Đề thi | Lưu trữ (archive), bulk status | Đạt | Đạt | ✅ Đạt | E-17 đã sửa: biến khỏi danh mục Learner ngay (kiểm bằng UI) |
| Đề thi | BR-10: đề published/archived không sửa được; xoá đề archived | Đạt (409, dữ liệu không đổi) | Đạt (alert báo lỗi) | ✅ Đạt | E-14 đã sửa thông báo; không xoá được là theo thiết kế |
| Bộ đề Mock | Tạo, đổi tên, gán, gỡ đề, bulk-assign | Đạt | Đạt | ✅ Đạt | Trùng tên 400, danh sách rỗng 400 |
| Bộ đề Mock | FR-36: đề thứ hai cùng kỹ năng trong một bộ | 409 | — | ✅ Đạt | E-09 **đã sửa** (trước đó 500) |
| Bộ đề Mock | Xoá bộ đề | Đạt; bộ có đề archived → 409 | — | ✅ Đạt | E-12 **đã sửa** (trước đó 500); bộ đó vẫn không xoá được theo BR-10 |
| Nạp đề | Quét dataset (API) | Đạt (267 đề; thư mục sai → 404) | Đạt | ✅ Đạt | E-20 **đã sửa**; đề trùng tiêu đề được đánh dấu |
| Nạp đề | Nạp bằng giao diện (modal Nạp từ Dataset) | — | Đạt (listing) | ✅ Đạt | E-20, E-38 **đã sửa**: hiện 267 đề, không chọn sẵn đề nào; nạp thật qua giao diện chưa chạy |
| Nạp đề | Nạp 1 đề Writing và 1 đề Speaking (API) | Đạt, khớp file gốc | — | ⚠️ Lệch | E-30 **đã sửa**; E-21 **đã sửa** (nạp xong ở dạng nháp); còn E-22 ảnh và audio bên thứ ba |
| Nạp đề | Nạp lại đề đã có; nạp đè đề published | Bỏ qua; từ chối (BR-10) | — | ✅ Đạt |  |
| Nạp đề | Xử lý lỗi và báo kết quả | Đạt (8 ca) | — | ✅ Đạt | E-27, E-28 **đã sửa**: success đúng, dọn đề dở dang, báo lỗi rõ |
| Nạp đề | Chống nạp trùng | Chỉ so tiêu đề, có cảnh báo | — | ⚠️ Lệch | E-29 giảm nhẹ: không còn im lặng; sửa hẳn cần cột khoá nguồn trong DB |
| Nạp đề | Nạp hàng loạt không chọn đề | Đạt (0 dòng `topics` mới) | — | ✅ Đạt | E-31 **đã sửa** |
| Nạp đề | Luồng SSE (`ingest/stream`) | Đạt | — | ✅ Đạt | Chỉ chạy khi không chọn kỹ năng; chưa nạp thật qua luồng |
| Nạp đề | Chất lượng dữ liệu đã nạp | Phát hiện | — | ⚠️ Lệch | E-18 và E-19: đã lưu trữ Reading Test 5 (15/40 câu) và Listening "Cambridge" (rỗng) ngày 2026-11-04. Còn E-26: 10 đáp án N/A ở Listening Test 1, 3, 5, có sẵn trong `legacy` |
| Media | Upload ảnh và audio lên R2 | Đạt (PNG hợp lệ 201) | — | ✅ Đạt | `.exe`, PDF, 31 MB, thiếu file bị từ chối đúng |
| Cấu hình | Bảng quy đổi band: xem | Đạt (17 dòng, phủ kín 0 đến 40) | Đạt | ✅ Đạt |  |
| Cấu hình | Bảng quy đổi band: sửa | Đạt, giá trị sai bị từ chối | Đạt | ✅ Đạt | E-23, E-36 **đã sửa**; band 8.7 → 422, ô về giá trị thật |
| Cấu hình | Bảng quy đổi band: thêm, xoá dòng | Không chạy | — | ⬜ Chưa test | Đổi cách chấm điểm thật; việc chạy bị chặn, cần bạn cho phép |
| Cấu hình | Cài đặt hệ thống: xem, lưu object, lưu số | Đạt | Đạt | ✅ Đạt | E-24 **đã sửa**: lưu số 200; khoá lạ 404 |
| Cấu hình | Cài đặt có tác dụng lên hệ thống | Không code nào đọc | — | ⚠️ Lệch | E-25 giá trị là hằng số cứng; cần nối vào code (xây thêm) |
| Chủ đề | Xem, tìm, sửa, xoá (xoá mềm) | Đạt | Đạt | ⚠️ Lệch | E-15 đã sửa nhãn; còn 36/42 chủ đề đang hiện là rác `Tong Quan Bo De` (E-31 cũ), chờ bạn cho phép dọn |
| Chủ đề | Thêm chủ đề | Đạt (không mô tả → 201) | Đạt | ✅ Đạt | E-35 **đã sửa** |
| Điều hướng | Sidebar, Trải nghiệm Học viên, Đăng xuất | — | Đạt | ✅ Đạt | E-34 **đã sửa**: gỡ mục Hệ thống Logs dẫn tới 404; trang Logs thật chưa có |
| Vận hành | Chạy lại chấm AI, giao lại Expert | 404 (chưa có endpoint) | — | ❌ Lỗi | SD-09 chưa triển khai; cần xây mới nên ngoài phạm vi |

## 4. Kết quả test bằng code (97 ca)

| Nhóm | Ca | Kết quả |
|---|---|---|
| 1 Phân quyền | Không token → 401 (38 route); Admin gọi API Expert, bắt đầu làm bài → 403 | 3/3 đạt |
| 2 Thống kê | `total_users`, `total_essays`, `ai_error_rate` khớp DB; xu hướng 7 ngày; log AI | 7/7 đạt |
| 3 Người dùng | Lọc 3 vai trò, tìm, phân trang; khoá, mở khoá (+2 audit); tự khoá 400; user lạ 404 | 9/9 đạt |
| 4 Đề thi | Danh sách, lọc 4 kỹ năng, trạng thái, tìm, sắp xếp, 404, chi tiết 40 câu kèm đáp án | 10/10 đạt |
| 5 CMS | Bộ đề, đề nháp, section, nhóm, câu hỏi, FR-36, BR-19, BR-10, xoá bộ còn đề archived, bulk, dọn | 25/25 đạt |
| 6 Cấu hình | Quy đổi band phủ kín và không đổi sau ca sai (md5); band 8.7 → 422; lưu object và lưu số 200; khoá lạ 404 | 9/9 đạt |
| 7 Media | `.exe`, PDF, 31 MB, thiếu file | 4/4 đạt |
| 8 Nạp đề | Quét (có và không đường dẫn, thư mục sai → 404); nạp lại; BR-10; JSON hỏng; lỗi giữa chừng; file, skill, path sai; SSE | 13/13 đạt |
| 9 Topics | Danh sách; thêm (có và không mô tả), sửa, xoá mềm | 5/5 đạt |
| 10 Tài khoản nhân sự | Email sai, tên ngắn, số bài ngoài khoảng, thiếu trường, đã có vai trò expert và admin, tạo Admin sai email, gửi lại thư mời user lạ; không tạo user, không ghi audit | 10/10 đạt |
| 11 Vận hành | `regrade`, `reassign` | 2 ca: endpoint chưa tồn tại (SD-09) |
| Khác | Đo độ trễ API khác trong lúc nạp 4,8 s: ~200 ms (E-30); nạp hàng loạt 2 lần: `topics` 42 → 42 (E-31) | Đạt |

## 5. Kết quả giao diện (Playwright)

Lần chạy cuối do subagent thực hiện sau khi sửa: **61 ca đạt, 0 lỗi thật của app**. Các ca báo lỗi ở lần chạy đầu đều do script (selector và kỳ vọng sai), đã sửa script rồi chạy lại.

| Trang | Ca đã chạy | Kết quả |
|---|---|---|
| Thống kê | Tải, 5 chỉ số, log 10 dòng; ô chọn thời gian và nút Xuất Báo Cáo đã disable, bấm cưỡng bức: 0 request, 0 tệp | Đạt |
| Người dùng | 3 tab (Tổng 8, 10, 10), tìm kiếm, trang 2, 2 modal tạo tài khoản (email sai bị HTML5 chặn, 0 POST), khoá và mở khoá user bằng giao diện | Đạt |
| Đề thi | 36 đề, lọc 4 kỹ năng, bộ lọc, modal Quản Lý Bộ Đề, tạo đề nháp, editor, Lưu thay đổi, xoá đề nháp | Đạt |
| Nạp dataset (modal) | Tất cả 267 (Reading 10, Listening 10, Writing 97, Speaking 150), đã có 33, chờ 234; tab từng kỹ năng; 0 POST nạp | Đạt |
| Chủ đề | Tiêu đề trang mới; thêm không mô tả (POST 201, toast), thêm có mô tả, tìm, sửa (PUT 200), xoá (DELETE 204) | Đạt |
| Cài đặt | 17 dòng mỗi kỹ năng; lưu 39-40-9 (alert thành công); band 8.7 → PUT 422, alert lỗi, ô về 9; lưu `min_words` và `mock_expert_weekly_quota` 200 | Đạt |
| Điều hướng | Sidebar còn 6 mục (không có Hệ thống Logs); Trải nghiệm Học viên mở Learning Profile; Đăng xuất hiển thị | Đạt |
| Vòng đời đề (đề thử `f7b0cc10…`) | Xuất bản → PUT 200, status published, có trong danh mục; Lưu trữ → archived, **biến khỏi danh mục ngay** (không còn cache 60 s); sửa đề archived → 409 BR-10 và alert báo lỗi | Đạt |

Lưu ý từ subagent: nút khoá và mở khoá user tác động trực tiếp (không có hộp xác nhận); số "Bộ Đề Thi Đầy Đủ" là 36 vì đề thử đang được đếm.

## 6. Đã sửa trong phiên (không xây chức năng mới)

| Mã | Sửa | Kiểm tra |
|---|---|---|
| E-08 | Đồng hồ thi thử giới hạn theo hạn server; Listening 30 phút; `start` trả thêm `server_time` | `tsc` sạch; **chưa test bằng UI Learner** |
| E-09, E-12 | Tạo đề trùng kỹ năng trong bộ Mock, tạo đề với bộ không tồn tại, xoá bộ còn đề archived: trả 409 hoặc 400 có lý do thay vì 500 | Bộ test code |
| E-14 | Thông báo xoá đề đã publish hoặc archive đúng ngữ cảnh (BR-10) | Bộ test code |
| E-17 | Admin đổi đề, bộ đề, câu hỏi, quy đổi band thì xoá cache RAM phía Learner (middleware) | UI: archive biến khỏi danh mục ngay |
| E-20, E-38 | Thư mục dataset mặc định `dataset_clean/` trong repo; thư mục sai → 404; modal không tick sẵn đề | Bộ test code; UI hiện 267 đề |
| E-26 | Importer không gán `N/A` cho câu thiếu đáp án (chỉ có tác dụng với lần nạp sau) | Đọc code; dữ liệu cũ chưa sửa |
| E-27, E-28 | `success` đúng, dọn đề nháp dở dang khi lỗi, báo lỗi rõ cho file, skill, path sai | Bộ test code (8 ca) |
| E-29 | Giảm nhẹ: đề trùng tiêu đề trong dataset có cảnh báo, không còn bỏ qua âm thầm | Đọc code |
| E-30 | Importer chạy luồng riêng | Đo: API khác ~200 ms trong lúc nạp 4,8 s (trước đó chờ 7 s) |
| E-31 | Bỏ file tổng quan bộ đề khỏi `topics`, không thêm chủ đề trùng | Nạp hàng loạt 2 lần: `topics` 42 → 42 |
| E-23, E-24, E-35 | Band bội số 0.5 (422), xoá dòng không có 404, thông báo lỗi đúng; cài đặt nhận JSON bất kỳ, khoá lạ 404; thêm chủ đề không cần mô tả | Bộ test code và UI |
| E-34, E-36, E-15, E-39 | Gỡ mục sidebar dẫn tới trang 404; ô band về giá trị thật; nhãn trang chủ đề; vô hiệu hoá điều khiển chưa có chức năng | UI |

File sửa: backend `dataset_path_resolver.py`, `dataset_scanner.py`, `dataset_importer.py`, `importers/*`, `ingest.py`, `core.py`, `test_sets.py`, `cms_tests.py`, `main.py`, `cache_control.py` (mới, hàm nhỏ), `practice_attempt_lifecycle.py`, 2 schema; frontend `DatasetIngestModal`, trang settings, topics, statistics, sidebar, hook thi và 3 workspace. Quy ước đã ghi vào `docs/source-of-truth.md` §12.

## 7. Danh sách lỗi và nguyên nhân (liên quan Admin)

| Mã | Mức | Lỗi | Nguyên nhân | Vị trí | Nguồn gốc | Tình trạng |
|---|---|---|---|---|---|---|
| E-09 | Thấp | Tạo đề thứ hai cùng kỹ năng trong cùng bộ Mock trả 500 thay vì 409 (FR-36) | Schema mới thêm `UNIQUE(test_set_id, skill)` (FR-36). `create_test` insert không bắt lỗi, trong khi hàm `db_error` đã có sẵn thông điệp 409. | `cms/cms_tests.py` `create_test` không bắt lỗi DB | **Lộ ra sau đổi DB**: ràng buộc `UNIQUE(test_set_id, skill)` (FR-36) là của schema mới, code không bắt lỗi | **Đã sửa** (409 có lý do; còn sửa luôn tạo đề với bộ không tồn tại, thời lượng quá lớn) |
| E-11 | Thấp | "Tổng bài viết" cộng `essays` và `free_essays`; biểu đồ xu hướng đếm mọi kỹ năng | `system_statistics.py` cộng `essays` (bài Writing trong attempt) với `free_essays` (Chấm bài tự do); biểu đồ đếm `attempts` mọi kỹ năng. | `admin/system_statistics.py` | Có từ trước | **Đã sửa** (đổi nhãn thẻ thành "Bài Writing trong đề + bài chấm tự do") |
| E-12 | Thấp | Xoá bộ đề có đề archived trả 500 (trigger BR-10 chặn bước gỡ liên kết, lỗi không được bắt) | `delete_admin_test_set` gỡ liên kết bằng `UPDATE tests SET test_set_id = NULL`. Trigger `block_published_edit` (BR-10) của schema mới chặn lệnh này với đề archived, và lỗi không được bắt. | `admin_content/test_sets.py` | **Lộ ra sau đổi DB**: code cũ vẫn gỡ liên kết bằng `UPDATE`, trigger BR-10 mới chặn lệnh này | **Đã sửa** (409 có lý do) |
| E-13 | Trung bình | Publish không kiểm nội dung: đề trống publish được (đọc code, chưa chạy) | SD-08 yêu cầu validate trước publish nhưng `set_status` chỉ đặt `status` và người duyệt; DB chỉ bắt buộc có `reviewer_id` (BR-18). | `cms/cms_tests.py` `set_status` | Chưa rõ | Chưa sửa |
| E-14 | Thấp | Đề đã archive không xoá được qua API; thông báo lỗi sai ngữ cảnh | Trigger chặn mọi sửa, kể cả xoá, với đề published hoặc archived. Thông báo "hãy tạo phiên bản mới" dùng chung cho cả ca xoá nên không hợp ngữ cảnh. | Trigger `block_published_edit` | Theo thiết kế BR-10 | **Đã sửa** thông báo; không xoá được là theo thiết kế BR-10 |
| E-15 | Thấp | `/admin/topics` quản lý bảng `topics`, không phải đề Writing/Speaking | Trang `/admin/topics` quản lý bảng `topics` của tính năng Chấm bài tự do (ngoài thiết kế, đang chờ nhóm quyết định) nhưng tiêu đề trang nói về đề Writing và Speaking. | `frontend/src/app/admin/topics` | Có từ trước | **Đã sửa** nhãn trang |
| E-16 | Trung bình | Nhật ký chấm AI: 6 lượt lỗi không có nguyên nhân, và cột `model`, `trace_id` luôn trống nên Admin không chẩn đoán được (FR-30, NFR-05) | 6 lượt lỗi (và hầu hết lượt `done` ngày 01 và 02/11) do bước chuyển dữ liệu cũ tạo ra, không có `error` và `latency_ms`. Code chấm hiện tại có ghi `error`, `output`, `latency_ms`, nên lượt lỗi mới sẽ có nguyên nhân. `model` và `trace_id` luôn trống vì AI engine chưa trả về (§12). Hệ quả: tỉ lệ lỗi AI 28,57% trên trang thống kê chủ yếu đến từ dữ liệu cũ. | `grading_runs`, `writing_grading_service.py`, AI engine | Dữ liệu cũ do bước chuyển dữ liệu; phần model, trace đã ghi §12 | Sửa một phần: `model` đã ghi; `trace_id` chờ AI engine có tracing |
| E-17 | Trung bình | Danh mục Learner cache RAM 60 s, publish và archive của Admin không xoá cache: đề vừa archive vẫn hiện tối đa 60 s | Catalog giữ cache RAM 60 s trong tiến trình; thao tác publish, archive của Admin không xoá cache. TTL này đã có ở code cũ. | `student_practice/catalog.py` `_CATALOG_TTL_SECONDS` | Có từ trước (TTL 60 s đã có ở `383b0b3`) | **Đã sửa** (middleware xoá cache; đã kiểm bằng UI: archive có hiệu lực ngay) |
| E-18 | Cao | Đề Reading `Test 5` published chỉ có 15 câu (số 1 đến 15) trong khi file gốc `reading_de_bai.json` có 40 mục; Learner làm đề này không bao giờ có band | Importer đọc `reading_de_bai.json` nhưng DB chỉ có câu 1 đến 15 của Test 5, và chưa có kiểm tra tổng số câu sau khi nạp (đề L/R phải đủ 40 theo BR-03). Cũng có đề lệch 1 câu (Reading Test 9: gốc 39, DB 40); chưa tra nguyên nhân. | Bảng `questions` (nạp từ `dataset_clean/de_bai_clean`) | Có từ trước: schema `legacy` cũng 15 câu; parser hiện tại cho đủ 40 | **Đã xử lý dữ liệu**: đề đã lưu trữ (archived) ngày 2026-11-04, Learner không còn thấy; chưa bổ sung 25 câu thiếu |
| E-19 | Trung bình | Đề Listening tên "Cambridge" có 0 câu nhưng đang `published`, không có trong dataset; Learner thấy đề rỗng | Không có bước validate nên đề rỗng publish được; đề này không nằm trong `dataset_clean/` nên do tạo thủ công. | Bảng `tests` | Có từ trước: `legacy` cũng có đề này 0 câu, published; không có trong dataset | **Đã xử lý dữ liệu**: đề rỗng đã lưu trữ (archived) ngày 2026-11-04 |
| E-20 | Cao | Giao diện 'Nạp từ Dataset Crawled' không gửi `dataset_path` và không có ô nhập, nên backend dùng đường dẫn Windows mặc định `C:\Users\Admin\Downloads\dataset_clean`: mọi bộ đếm 0, không nạp được; đường dẫn sai cũng trả 200 toàn số 0 thay vì lỗi | `DEFAULT_DATASET_ROOT` là đường dẫn Windows của tác giả cũ; modal không có ô nhập và `scan_dataset` không báo lỗi khi thư mục không tồn tại. | `dataset_path_resolver.py`, `DatasetIngestModal.tsx`, `ingest/scan` | Có từ trước (đường dẫn mặc định có ở `383b0b3`) | **Đã sửa** (mặc định trỏ `dataset_clean/` trong repo, thư mục sai → 404, modal không tick sẵn đề) |
| E-21 | Trung bình | Importer publish ngay đề vừa nạp: không qua bước Admin duyệt và kiểm tra (UC-21 bước 6), `license` luôn trống (33/33 đề published chưa có giấy phép, BR-18); đề đã publish thì không xoá được (BR-10) | Cả ba importer gọi `import_writer.publish` ngay sau khi nạp; `set_status` chỉ ghi người duyệt là chính Admin chạy nạp. Importer không đặt `license`. | `importers/import_writer.py` `publish` | Có từ trước | **Đã sửa** (importer chỉ tạo đề nháp, đúng UC-30) |
| E-22 | Thấp | Đề Writing nạp mới trỏ ảnh biểu đồ tới `storage.googleapis.com/prep-storage-service` (bên thứ ba), trong khi 6 đề nạp trước dùng khoá R2 của dự án: phụ thuộc link ngoài và cần xem lại giấy phép nguồn | Importer giữ nguyên `image_url` trong file dataset (link crawl từ bên thứ ba); chép ảnh lên R2 là script riêng (`upload_writing_dataset_to_r2.py`) chưa chạy cho đề mới. | `writing_importer.py`, `upload_writing_dataset_to_r2.py` | Quy trình nạp tách hai bước (nạp rồi mới chép ảnh lên R2) | Chưa sửa |
| E-23 | Thấp | Sửa dòng quy đổi band với `band = 8.7` (không phải bước 0.5) trả 409 'bị chồng lấn hoặc trùng': thông báo sai, nguyên nhân là vi phạm BR-01. Schema Pydantic không kiểm bước 0.5; xoá dòng không kiểm bảng còn phủ đủ 0 đến 40 (đọc code) | Pydantic chỉ kiểm `0 ≤ band ≤ 9`; bước 0.5 do domain `band` của DB chặn, và `except` chung gắn nhãn 'chồng lấn' cho mọi lỗi DB. | `admin_content/core.py` | Có từ trước | **Đã sửa** (422, thông báo đúng, xoá dòng không có → 404) |
| E-24 | Cao | Lưu tham số hệ thống kiểu số trả 422: 6 trong 9 khoá lưu dạng số (ví dụ `mock_expert_weekly_quota = 2`) nhưng API PUT chỉ nhận object. Giao diện gửi `{value: 2}`; chỉ 3 khoá dạng object (`min_words`, `mock_duration_minutes`, `speaking_time_limits`) lưu được | `system_settings.value` là `jsonb` nên lưu được số trần (10, 180, 30...), nhưng `SystemSettingUpdate.value` khai báo `Dict[str, Any]`. Có từ trước: schema cũ cũng khai báo `Dict` và `legacy.system_settings` cũng lưu số. | `core.py` `SystemSettingUpdate`, seed `system_settings` | Có từ trước: `SystemSettingUpdate` đã là `Dict` ở `383b0b3` và `legacy.system_settings` cũng lưu số | **Đã sửa** (`value` nhận JSON bất kỳ; khoá lạ → 404) |
| E-25 | Cao | Không có code nào đọc `system_settings`: `late_answer_grace_seconds`, giờ Mock, hạn mức Expert, giới hạn thời gian Speaking... đều là hằng số cứng, nên Admin đổi trên trang cài đặt không có tác dụng (FR-28) | Phần đọc cấu hình lúc chạy chưa được viết; code dùng hằng số (`LATE_GRACE_SECONDS`, `DEFAULT_MINUTES`...). Trang cài đặt chỉ ghi vào bảng. | Backend (không có chỗ đọc), `practice_attempt_lifecycle.py` `LATE_GRACE_SECONDS` | Có từ trước | Chưa sửa |
| E-26 | Cao | 10 câu có đáp án `N/A` (Listening Test 1: 4, Test 3: 1, Test 5: 5): gõ `N/A` thì được điểm, đáp án thật không bao giờ đúng | `_answer_key` điền `N/A` khi không có lời giải 4 bước; hàm chấm coi `N/A` là một đáp án bình thường. `legacy` cũng có đúng 10 dòng này nên bước chuyển DB chỉ sao chép. | `importers/rl_importer.py` `_answer_key` | Có từ trước (`legacy` cũng 10 dòng, code `383b0b3` cũng vậy) | **Đã sửa importer** (không gán N/A nữa); dữ liệu cũ 10 dòng chưa sửa (BR-10 khoá) |
| E-27 | Trung bình | Phản hồi nạp đề báo sai: lỗi giữa chừng vẫn `success = true`; file không tồn tại, `skill` lạ báo thành công 0 đề không lỗi; chạy lại đếm `created` hai lần | `success = len(errors) == 0 or created > 0 or skipped > 0`; `import_single_*` gặp file không tồn tại thì `return` im lặng; `_import_selected` không kiểm `skill`; bộ đếm `created` tăng ở `begin_test`, trước khi nạp nội dung. | `admin_content/ingest.py`, `importers/*` | Chưa rõ | **Đã sửa** |
| E-28 | Cao | Nạp lỗi giữa chừng để lại đề nháp dở dang (1 section) và kẹt: chạy lại với `only_pending = true` thì báo đã tồn tại | Importer ghi từng lệnh riêng, không rollback; `begin_test` coi đề đã có (theo tiêu đề) là đã tồn tại nên đề dở dang bị bỏ qua mãi. | `importers/import_writer.py` `begin_test` | Chưa rõ | **Đã sửa** (dọn đề nháp dở dang) |
| E-29 | Cao | Chống trùng chỉ theo tiêu đề: 6 đề thật (1 Writing, 5 Speaking) khác nội dung nhưng trùng tiêu đề bị bỏ qua âm thầm; DB không có `UNIQUE(title, skill)` | So `(title.lower()[:280], skill)` ở tầng ứng dụng; không có ràng buộc DB; dataset có 6 cặp trùng tiêu đề khác `test_id`. | `import_writer.begin_test`, `dataset_scanner.py` | Có từ trước (cùng cách chống trùng ở `383b0b3`) | **Giảm nhẹ**: có cảnh báo, không còn âm thầm; sửa hẳn cần cột khoá nguồn trong DB |
| E-30 | Trung bình | Nạp 1 đề mất 5 đến 6 s và trong lúc đó mọi API khác bị đứng (đo được một lượt chờ 7,1 s) | Endpoint `async def` gọi `DatasetImporter.run()` đồng bộ (nhiều lệnh DB tuần tự) nên không nhường cho request khác. | `ingest.py` (async def gọi code đồng bộ) | Chưa rõ | **Đã sửa** (chạy luồng riêng; đo: API khác vẫn ~200 ms khi nạp) |
| E-31 | Thấp | Nạp hàng loạt Writing ghi 2 dòng `topics` rác mỗi lần (Tong Quan Bo De 345 và 397), không chống trùng | `_import_topics` duyệt mọi `*.json` trong `writing/` (gồm `tong_quan_bo_de_*.json`), lấy tên file làm tiêu đề, `insert` không chống trùng. | `services/dataset_importer.py` `_import_topics` | Có từ trước | **Đã sửa importer** (đã kiểm: 0 dòng mới); 36 dòng rác cũ chờ bạn cho phép dọn |
| E-33 | Thấp | Editor chỉ có 6 dạng câu hỏi; dữ liệu có thêm `matching_features` (23 nhóm), `table_completion` (10), `diagram_labelling` (1) | Select dạng câu hỏi trong modal viết cứng 6 giá trị theo 5 dạng MVP. | Modal Thêm Nhóm Dạng Bài | Có từ trước (FR-26 ghi 5 dạng MVP) | Chưa sửa |
| E-34 | Thấp | Mục Hệ thống Logs trên sidebar Admin dẫn tới `/admin/logs` trả 404 | Sidebar khai báo `/admin/logs` nhưng thư mục `app/admin/logs` không có; không có commit nào từng thêm trang này. | `components/layout/AdminSidebar.tsx`, không có `app/admin/logs` | Có từ trước (link có từ commit khởi tạo, trang chưa từng có) | **Đã sửa** (gỡ link chết); trang Logs thật chưa xây |
| E-35 | Thấp | Thêm chủ đề với ô Mô tả để trống: API trả 422 (`description` bắt buộc) và modal giữ nguyên, không báo lỗi | Giao diện coi Mô tả là tuỳ chọn và không gửi trường khi trống (`description || undefined`), còn `TopicCreate.description` là bắt buộc. | `schemas/topic.py` `TopicCreate`, `app/admin/topics/page.tsx` | Có từ trước (schema và trang không đổi so với `383b0b3`) | **Đã sửa** |
| E-36 | Thấp | Trang quy đổi band: sau khi lưu bị từ chối (409), ô vẫn hiện giá trị sai (8.7) và nút Tải lại dữ liệu không làm mới ô; tải lại cả trang mới về giá trị đúng (DB không đổi) | Mỗi hàng giữ giá trị người dùng nhập trong state riêng; lệnh Tải lại dữ liệu không đặt lại state này. | `app/admin/settings/page.tsx` | Có từ trước | **Đã sửa** |
| E-38 | Trung bình | Modal Nạp từ Dataset tick sẵn 10 đề đang chờ (và bật ghi đè nếu không còn đề chờ): bấm nạp mà không bỏ chọn thì publish ngay 10 đề cho Learner | `useEffect` sau khi quét gọi `setSelectedIds(pending.slice(0, 10))` và bật `forceOverwrite` khi hết đề chờ; kết hợp với importer tự publish (E-21) nên rất dễ nạp nhầm. | `components/admin/DatasetIngestModal.tsx` | Có từ trước (subagent phát hiện) | **Đã sửa** (không chọn sẵn đề nào) |
| E-39 | Thấp | Trang thống kê: ô chọn thời gian và nút Xuất Báo Cáo không có xử lý nào (không đổi số liệu, không gọi API, không tải tệp) | `<select>` không có `onChange` và `<button>` không có `onClick`; API thống kê không nhận tham số khoảng thời gian. | `app/admin/statistics/page.tsx` | Có từ trước | **Giảm nhẹ**: vô hiệu hoá và ghi chưa hỗ trợ; muốn dùng cần xây mới |

## 8. Chưa sửa: phải xây tính năng mới hoặc cần bạn quyết định

| Mục | Lý do chưa làm |
|---|---|
| E-13 Kiểm nội dung trước publish | Tính năng mới (SD-08). Đề rỗng E-19 đã được lưu trữ bằng tay |
| E-22 ảnh, audio bên thứ ba | Chép tệp về R2 là việc mới; nguồn crawl cần xem lại giấy phép (BR-18). E-21 đã sửa: đề nạp xong ở dạng nháp |
| E-25 Nối `system_settings` vào code | Viết phần đọc cấu hình lúc chạy là tính năng mới |
| E-29 Khoá chống trùng | Cần thêm cột khoá nguồn trong bảng `tests` (đổi schema) |
| E-33 Thêm dạng câu hỏi vào editor | Tính năng mới (34 nhóm dataset dùng) |
| E-16 `trace_id` | `model` đã ghi; `trace_id` cần AI engine có Langfuse tracing (việc mới). E-11 đã sửa bằng đổi nhãn |
| Chạy lại AI, giao lại Expert; trang Logs; xuất báo cáo; lọc thời gian | Endpoint hoặc trang chưa tồn tại, cần xây mới |
| 10 đáp án `N/A` ở Listening Test 1, 3, 5 (E-26) | BR-10 khoá sửa đề đã publish; sửa phải tắt tạm trigger hoặc tạo phiên bản mới, hoặc archive (Test 1 đã có 1 lượt làm bài). Cần bạn quyết định. Reading Test 5 và Listening Cambridge đã archive |
| 36 chủ đề rác `Tong Quan Bo De` (còn hiện ở `/admin/topics`) | Việc ẩn hàng loạt bị chặn khi mình thử; cần bạn cho phép xoá mềm 36 dòng này |

## 9. Chưa test và lý do

| Chức năng | Lý do |
|---|---|
| Tạo Expert, tạo Admin (nhánh thành công), gửi lại lời mời | Tạo tài khoản thật và gửi email; người dùng tự làm |
| Thêm, xoá dòng bảng quy đổi band | Đổi cách chấm điểm toàn hệ thống; lần thử bị chặn |
| Learner hoặc Expert gọi API Admin | Phiên chỉ có token Admin; cần đăng nhập Learner, và cần tài khoản Expert (mình có thể soạn sẵn SQL tạo Expert để bạn chạy) |
| Đồng hồ thi thử (E-08) bằng giao diện Learner | Cần đăng nhập Learner |
| Nạp thật qua giao diện và qua SSE | Ghi hàng loạt và publish tự động |

## 10. Dữ liệu test còn lại

| Đối tượng | Ghi chú |
|---|---|
| Tài khoản `admin@example.com` (mật khẩu yếu) | Xoá sau khi xong: `DELETE FROM auth.users WHERE email = 'admin@example.com';` (dòng xoá trong file SQL ghi email cũ) |
| Tài khoản `uitest_1793711233@gmail.com` | Chưa xác minh email, đang Active; xoá bằng dòng có sẵn trong file SQL |
| Đề `ZZ UI TEST reading A` và `ZZ UI PUBLISH TEST` (archived), bộ `ZZ UI TEST SET (đã đổi tên)` | Không xoá được qua API (BR-10); xoá bằng SQL cần tắt trigger `block_published_edit` |
| Đề Writing và đề Speaking nạp thật | **Đang published** (nạp lúc importer còn tự publish), nội dung khớp file gốc; chỉ archive được |
| Object R2 `ui-test/aedcac65347b.png` | Ảnh 1x1, không có API xoá |
| 3 dòng `topics` ZZ đã ẩn (xoá mềm) | Do test chủ đề; chưa xoá hẳn vì việc xoá bị chặn |
| `audit_logs` do thao tác test | Không xoá được theo thiết kế |

## 11. Việc nên làm và câu hỏi còn mở

1. **Đổi mật khẩu database**: chuỗi kết nối từng hiện trong output phiên test hai lần.
2. Quyết định dữ liệu cũ: 10 đáp án `N/A` và 36 chủ đề rác (cần cho phép từng việc).
3. Quyết định hướng cho nhóm tính năng mới ở mục 8. Nạp đề không còn tự publish (E-21 đã sửa).
4. Cần đăng nhập Learner để test đồng hồ thi thử và test Learner gọi API Admin; Expert cần tài khoản riêng.
5. Hỏi: hai đề thật vừa nạp (Writing và Speaking) giữ hay archive? Có chép bộ test API vào `backend/tests/` để nhóm chạy lại không?
