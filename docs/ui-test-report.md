# Báo cáo UI test sau khi thống nhất DB (public 33 bảng)


- Ngày test: 2026-11-03 và 2026-11-04 (hai vòng: test và sửa, rồi sửa thêm và chạy lại)
- Nhánh: `LongRevert`, từ commit `be69d73`; các thay đổi ở mục 5 nằm trong commit kèm báo cáo này
- Vai trò đã test: Learner và Admin. Expert chưa test (không có tài khoản)
- Công cụ: Playwright (Chrome riêng, CDP), gọi API bằng token phiên, psql đọc DB
- Báo cáo chi tiết từng vai trò: `docs/ui-test-report-db-cutover.md` (Learner), `docs/ui-test-report-admin.md` (Admin)

## 1. Kết luận

- **DB mới hoạt động đúng, không có xung đột ở tầng dữ liệu.** Dữ liệu, ràng buộc, phân quyền và trạng thái đều đúng thiết kế.
- **Tổng cộng 71 chức năng: 45 đạt, 17 lệch (chạy được nhưng sai hoặc thiếu so với thiết kế), 2 lỗi, 7 chưa test.**
- **Lỗi do đổi DB: 3, đều đã sửa** (E-08 đồng hồ Listening thi thử, E-09 ràng buộc 1 đề/kỹ năng trong bộ Mock, E-12 xoá bộ đề có đề archived). Các lỗi còn lại đều có từ trước (đã đối chiếu code commit `383b0b3` và dữ liệu `legacy`).
- **Đã sửa không xây chức năng mới:** E-14, E-15, E-17, E-20, E-21, E-23, E-24, E-26 (phần importer), E-27 đến E-31, E-34 đến E-36, E-38; E-11 (đổi nhãn thẻ), E-16 (ghi `model`); E-18 và E-19 xử lý dữ liệu bằng cách lưu trữ đề lỗi.
- **Chưa sửa, vì phải xây tính năng mới:** kiểm nội dung trước publish (E-13), thêm dạng câu hỏi vào editor (E-33), nối `system_settings` vào code (E-25), chép ảnh và audio về R2 (E-22), cột khoá nguồn chống trùng (E-29), `trace_id` cho nhật ký chấm AI (E-16), chạy lại AI và giao lại Expert, trang Logs, xuất báo cáo, lọc thời gian thống kê (E-39).
- **Chưa sửa, cần quyết định hoặc cho phép:** E-01 chấm sai câu matching (lỗi nặng nhất còn lại, ảnh hưởng điểm thật), 10 đáp án `N/A` ở Listening Test 1, 3, 5 (BR-10 khoá), 36 chủ đề rác `Tong Quan Bo De` (xoá hàng loạt bị chặn khi mình thử).
- **Nhận định đã rút lại:** E-32 (giới hạn Speaking của dataset nằm trong mức tối đa BR-13, không phải lỗi) và E-37 (trang cài đặt báo lỗi bằng `alert`, trang chủ đề bằng toast; script test trước đó bỏ sót).
- **Kết quả chạy lại sau khi sửa:** bộ test code (API + DB) 86/86 và 10/12 (2 ca là endpoint chưa có: regrade, reassign), giao diện 61/61 (subagent chạy Playwright), `tsc` sạch.
- Phép so "trước và sau" là so sánh tĩnh (đọc code, dữ liệu `legacy`) vì app cũ không chạy lại được trên dữ liệu cũ.

## 2. Bảng chức năng và trạng thái

Ký hiệu: ✅ Đạt (đúng thiết kế), ⚠️ Lệch (chạy được nhưng thiếu hoặc sai so với thiết kế), ❌ Lỗi (hỏng, 500 hoặc chấm sai), ⬜ Chưa test.

| Vai trò | Chức năng | Cách test | Trạng thái | Lỗi hoặc ghi chú |
|---|---|---|---|---|
| Learner | Đăng ký (FR-01) | API sign_up; xem user trong trang Admin | ✅ Đạt | Tạo user, trigger tạo profile learner, chưa xác minh email thì chưa có phiên (đúng thiết kế) |
| Learner | Đăng nhập, đăng xuất, quên mật khẩu | Người dùng tự đăng nhập | ⬜ Chưa test | Mình không nhập mật khẩu; phiên đăng nhập hoạt động bình thường |
| Learner | Learning Profile `/learning-profile` | Playwright + đối chiếu API | ⚠️ Lệch | E-02 Overall sai; E-04 số cứng |
| Learner | Hồ sơ cá nhân `/profile` | Playwright | ⚠️ Lệch | Tải được; "Tổng bài đã viết 5" lệch "6" ở Learning Profile (chưa tra nguyên nhân) |
| Learner | Mục tiêu band (đọc) | API GET goals | ✅ Đạt | Chỉ đọc; chưa test lưu mục tiêu |
| Learner | Danh mục đề `/test-practice` | So với DB | ✅ Đạt | 32 đề published khớp DB; lọc theo kỹ năng chạy |
| Learner | Bắt đầu bài, làm tiếp bài dở | UI + API | ✅ Đạt | `attempts/start` idempotent, không tạo trùng |
| Learner | Reading: làm và nộp đủ 40 câu | UI | ✅ Đạt | Có band (BR-03), 0/40 |
| Learner | Reading: làm lẻ một Passage | UI | ✅ Đạt | Band `null`, hiện "x / y đúng" (BR-03) |
| Learner | Chấm đáp án L/R (BR-14) | UI + đối chiếu DB | ❌ Lỗi | E-01 chấm sai câu matching (chữ cái vs nội dung) |
| Learner | Nộp lần hai | API | ✅ Đạt | Trả kết quả lần đầu (SD-04) |
| Learner | Listening: mở bài, audio, timer | UI | ⚠️ Lệch | E-07 lộ transcript trước nộp; chưa làm đáp án Listening bằng UI |
| Learner | Speaking: mở trang | UI | ✅ Đạt | Chỉ trang giới thiệu |
| Learner | Speaking: ghi âm, nộp, chấm | — | ⬜ Chưa test | Cần micro; chưa test |
| Learner | Writing: soạn, đếm từ | UI | ✅ Đạt | 68 + 64 = 132 từ khớp server |
| Learner | Writing: nộp và AI chấm bất đồng bộ | UI + DB | ⚠️ Lệch | Đúng: 1 evaluation chính thức, 8 điểm tiêu chí, 15 lỗi. Lệch: E-10 ~75 s, mục tiêu NFR-02 ≤ 60 s |
| Learner | Writing: tính band (BR-04) | Tính tay + DB | ✅ Đạt | (7 + 2×7)/3 = 7.0 |
| Learner | Writing: cảnh báo thiếu từ (BR-06) | UI | ⚠️ Lệch | E-06 không có cảnh báo |
| Learner | Tự lưu bài (NFR-03, FR-11) | UI | ⚠️ Lệch | E-05 không tự lưu, tải lại mất chữ |
| Learner | Thi thử: deadline do server giữ | API + psql | ✅ Đạt | Nộp trễ 10 s nhận, trễ 60 s trả 409 (BR-07) |
| Learner | Thi thử: hết giờ tự nộp | Đọc code + API | ⚠️ Lệch | E-08 đồng hồ Listening lệch 32/30 phút, đã sửa, chưa test lại bằng UI |
| Learner | Thi thử: thoát chủ động → abandoned | UI + DB | ✅ Đạt | Đã làm và test (sau yêu cầu bổ sung) |
| Learner | Luyện tập: không giới hạn giờ (FR-09) | Đọc code | ✅ Đạt | Chốt: không áp dụng tự nộp cho luyện tập |
| Learner | Xoá bài luyện tập đang dở | UI + DB | ✅ Đạt | Xoá hẳn dòng, không còn `answers` mồ côi |
| Learner | Xoá bài đã nộp | API | ✅ Đạt | 409 như thiết kế |
| Learner | Lịch sử Test Practice | UI + API | ⚠️ Lệch | E-03 trả band 0 cho bài chưa có band; E-04 số cứng |
| Learner | Phân quyền: bài người khác, không token | API | ✅ Đạt | 404 và 401. Quyền ghi trên bài người khác chỉ kiểm bằng đọc code |
| Learner | Xin Expert chấm lại (UC-12), dashboard BR-17 | — | ⬜ Chưa test | Theo source-of-truth §12 mới làm một phần |
| Learner | Chấm bài tự do (`free_essays`) | — | ⬜ Chưa test | Ngoài thiết kế, chờ nhóm quyết định |
| Expert | Toàn bộ chức năng Expert | — | ⬜ Chưa test | Chưa có tài khoản Expert để đăng nhập |
| Admin | Thống kê hệ thống `/admin/statistics` | UI + đối chiếu DB | ⚠️ Lệch | Số liệu khớp DB; ô chọn thời gian và nút Xuất Báo Cáo chưa có chức năng nên đã vô hiệu hoá (không xây mới); E-11 đã sửa (thẻ Total Essays ghi rõ nguồn bài viết) |
| Admin | Danh sách, lọc, tìm người dùng | UI + API | ✅ Đạt | Expert 10, Admin 10, Learner 8 khớp DB |
| Admin | Khoá, mở khoá user (FR-04) | API + DB | ✅ Đạt | Tự khoá 400, user lạ 404, ghi audit, đồng bộ ban Auth |
| Admin | Tạo Expert, tạo Admin, gửi lại lời mời | — | ⬜ Chưa test | Nhánh bị từ chối đã test và đạt (email sai, tên ngắn, đã có vai trò, user lạ; HTML5 chặn ở modal, không tạo gì); nhánh thành công tạo tài khoản và gửi email nên người dùng tự làm |
| Admin | Danh sách đề `/admin/tests` | UI | ✅ Đạt | Tải được, 32 đề |
| Admin | Soạn đề nháp (tạo, sửa, xoá) | API | ✅ Đạt | Gồm kiểm 422 và BR-19; tạo đề với bộ không tồn tại hoặc thời lượng quá lớn trả 400 (đã sửa, trước đó 500) |
| Admin | Soạn section, nhóm câu hỏi, câu hỏi, đáp án | API | ✅ Đạt | Trùng số câu trả 400 |
| Admin | Publish đề (BR-18) | API + DB | ⚠️ Lệch | Publish bằng editor và API đúng, ghi người duyệt; E-13 không kiểm nội dung trước publish (cần xây thêm) |
| Admin | Archive, bulk status | API | ✅ Đạt | E-17 đã sửa: archive có hiệu lực ngay trong danh mục Learner (đã kiểm bằng UI) |
| Admin | BR-10: đề published/archived không sửa được | API | ✅ Đạt | 5 ca đều 409 |
| Admin | Xoá đề đã archive | API | ✅ Đạt | 409 theo BR-10, thông báo đã sửa cho đúng ngữ cảnh (E-14); không xoá được là theo thiết kế |
| Admin | Bộ đề Mock: tạo bộ, thêm đề khác kỹ năng | API | ✅ Đạt | 201 |
| Admin | Bộ đề Mock: đề thứ hai cùng kỹ năng (FR-36) | API | ✅ Đạt | E-09 đã sửa: trả 409 có lý do (trước đó 500) |
| Admin | Bộ đề Mock: xoá bộ có đề archived | API | ✅ Đạt | E-12 đã sửa: trả 409 có lý do (trước đó 500); bộ vẫn không xoá được vì BR-10 |
| Admin | Bảng quy đổi band: xem | UI + API | ✅ Đạt | 17 dòng Reading và Listening, đúng thang Cambridge |
| Admin | Bảng quy đổi band: sửa | API (ghi lại đúng giá trị cũ) | ✅ Đạt | E-23 và E-36 đã sửa: band sai bước 0.5 trả 422, thông báo đúng, ô về giá trị thật. Thêm, xoá dòng chưa test vì đổi cách chấm thật |
| Admin | Cài đặt hệ thống: xem | API | ✅ Đạt | Có các khoá cấu hình |
| Admin | Cài đặt hệ thống: lưu tham số | UI + API | ✅ Đạt | E-24 đã sửa: lưu tham số kiểu số 200; khoá không tồn tại 404. E-25 vẫn còn: không code nào đọc giá trị |
| Admin | Upload media lên R2 | API | ✅ Đạt | PNG 1x1 hợp lệ: 201, có key và URL; file `.exe` bị từ chối 400 |
| Admin | Dữ liệu đề đã nạp từ `dataset_clean/` | So file JSON với DB | ⚠️ Lệch | E-18 và E-19 đã xử lý bằng cách lưu trữ (archived) Reading Test 5 (15/40 câu) và Listening "Cambridge" (rỗng), Learner không còn thấy. Còn 10 đáp án N/A ở Listening Test 1, 3, 5 (E-26, có sẵn trong `legacy`; BR-10 khoá sửa). Importer đã sửa cho lần nạp sau |
| Admin | Quét dataset (`ingest/scan`) bằng API | API | ✅ Đạt | E-20 đã sửa: không đường dẫn ra 267 đề, thư mục sai → 404; đề trùng tiêu đề được đánh dấu |
| Admin | Nạp đề từ dataset bằng giao diện (modal) | UI | ✅ Đạt | E-20 đã sửa: modal hiện 267 đề, 234 chờ nạp; mặc định không chọn sẵn đề nào (trước tick sẵn 10 đề, dễ nạp nhầm); nạp thật qua giao diện chưa chạy |
| Admin | Nạp 1 đề Writing từ dataset (API `selected_tests`) | API + DB + so file gốc | ⚠️ Lệch | Nội dung khớp file gốc; E-30 đã sửa; E-21 đã sửa (đề nạp xong ở dạng nháp); còn E-22 ảnh bên thứ ba |
| Admin | Nạp 1 đề Speaking từ dataset (API) | API + DB + so file gốc | ⚠️ Lệch | Nội dung khớp file gốc; E-30 đã sửa; E-21 đã sửa; còn E-22. Giới hạn thời gian dataset nằm trong tối đa của BR-13, không phải lỗi |
| Admin | Nạp đề: xử lý lỗi và báo kết quả | Dataset tạm do mình dựng | ✅ Đạt | E-27, E-28 đã sửa: success đúng, dọn đề dở dang, báo lỗi rõ cho file lạ, skill lạ, thiếu path |
| Admin | Nạp đề: chống trùng | Phân tích dataset + code | ⚠️ Lệch | E-29 giảm nhẹ: đề trùng tiêu đề giờ có cảnh báo thay vì bỏ qua âm thầm; sửa hẳn cần thêm cột khoá nguồn vào `tests` |
| Admin | Soạn đề thủ công bằng giao diện (modal + editor) | UI + DB | ✅ Đạt | Tạo đề, nhóm, câu hỏi, đáp án, xuất bản, lưu trữ đều đúng; trường trống bị chặn ở client |
| Admin | Editor: danh sách dạng câu hỏi | UI | ⚠️ Lệch | E-33 chỉ 6 dạng, thiếu dạng dataset dùng (34 nhóm) |
| Admin | Nạp theo luồng SSE (`ingest/stream`) | API (không chọn kỹ năng) | ✅ Đạt | Trả `text/event-stream`, có sự kiện bắt đầu và hoàn tất; chưa nạp thật qua luồng |
| Admin | Nạp hàng loạt không chọn đề | API (giới hạn 1) | ✅ Đạt | E-31 đã sửa: 2 lần chạy không thêm dòng `topics` nào |
| Admin | Bộ đề Mock: đổi tên, gán, gỡ đề | API | ✅ Đạt | Đổi tên 200; gỡ đề archived 409 có lý do; danh sách rỗng 400 |
| Admin | Quản lý chủ đề `/admin/topics`: xem, tìm, sửa, xoá | UI + API | ⚠️ Lệch | Chạy đúng (xoá mềm); E-15 đã sửa nhãn trang; còn 36/42 chủ đề đang hiện là rác `Tong Quan Bo De` do lần nạp cũ, chờ bạn cho phép dọn |
| Admin | Quản lý chủ đề: thêm mới | UI | ✅ Đạt | E-35 đã sửa: thêm không cần mô tả thành công (201) |
| Admin | Trang Hệ thống Logs `/admin/logs` | UI | ✅ Đạt | E-34 đã sửa: gỡ mục sidebar dẫn tới trang 404. Trang Logs thật chưa có (cần xây mới) |
| Admin | Trang Dữ liệu Lõi & Cài đặt: quy đổi band (UI) | UI + DB | ✅ Đạt | 17 dòng mỗi kỹ năng; lưu, từ chối 8.7 với alert và ô quay về 9; DB không đổi |
| Admin | Điều hướng Admin: Trải nghiệm Học viên, Đăng xuất | UI | ✅ Đạt | Mở Learning Profile bằng tài khoản Admin không lỗi API |
| Admin | Nhật ký chấm AI (`/evaluations/logs`) | UI + DB | ⚠️ Lệch | E-16 lượt chấm lỗi không có error, model, trace |
| Admin | Chạy lại chấm AI, giao lại Expert | — | ❌ Lỗi | Đã test: endpoint không tồn tại (404), SD-09 chưa triển khai; cần xây mới nên ngoài phạm vi |
| Admin | Phân quyền Admin: không token, Expert gọi API Admin | API + đọc code | ✅ Đạt | 401 và 403; mọi route `admin*.py` có `require_admin` |
| Admin | Learner gọi API Admin | Đọc code | ⬜ Chưa test | Phiên test chỉ có token Admin |
| Admin | Admin làm bài | API | ✅ Đạt | 403 đúng hiện trạng; yêu cầu mở rộng của nhóm đã có đánh giá riêng |

### Đếm theo vai trò

| Vai trò | Đạt | Lệch | Lỗi | Chưa test | Tổng |
|---|---|---|---|---|---|
| Learner | 16 | 8 | 1 | 4 | 29 |
| Expert | 0 | 0 | 0 | 1 | 1 |
| Admin | 29 | 8 | 2 | 2 | 41 |
| **Cộng** | 45 | 16 | 3 | 7 | 71 |

## 3. Danh sách lỗi

| Mã | Mức | Mô tả | Vị trí | Nguồn gốc | Tình trạng |
|---|---|---|---|---|---|
| E-01 | Cao | Câu matching bị chấm sai: UI lưu chữ cái (`B`), đáp án lưu nội dung (`"the beta wolf"`), so thẳng chuỗi nên không bao giờ khớp | `listening_reading/lr_answer_matching.py`, `lr_grading_service.py` | Có từ trước (code cũ so y hệt) | Chưa sửa |
| E-02 | Trung bình | Overall dashboard 5.5 chỉ từ Writing 7.0: kỹ năng chưa có điểm bị thay bằng band đầu vào, band 0 bị lọc (BR-02, BR-12) | `learning_profile/overview_aggregator.py` | Có từ trước | Chưa sửa |
| E-03 | Thấp | Lịch sử trả `band = 0` cho bài chưa có band (BR-03) | `practice/practice_history.py:42` | Có từ trước | Chưa sửa |
| E-04 | Thấp | Số liệu cứng hiện khi chưa có dữ liệu (30/40, Speaking 4.0, ngày thi 2026-12-31) | `PracticeQuestionTypeAccuracyCard.tsx:21`, `OverviewChartsSection.tsx:37`, `GoalSetterModal.tsx:24` | Có từ trước | Chưa sửa |
| E-05 | Trung bình | Không tự lưu bài viết (NFR-03, FR-11) | Frontend và backend | Có từ trước | Chưa sửa |
| E-06 | Thấp | Không cảnh báo thiếu từ khi nộp Writing (BR-06) | `WritingWorkspace.tsx` | Có từ trước | Chưa sửa |
| E-07 | Trung bình | Listening lộ transcript trước khi nộp (FR-14) | `GET /tests/{id}/content`, `passage_text` | Đã ghi §12 | Chưa sửa |
| E-08 | Cao | Đồng hồ Listening thi thử 32 phút, deadline server 30 phút: tự nộp lúc hết giờ bị 409 và mất bài | `ListeningWorkspace.tsx`, `useExamWorkspaceContent.ts` | **Lộ ra sau đổi DB**: đồng hồ 32 phút có từ trước, nhưng server cũ không từ chối nộp muộn; kiểm tra BR-07 mới (`lock_for_submit`) làm bài bị 409 | **Đã sửa**: Listening 30 phút; đồng hồ giới hạn theo hạn server khi làm tiếp bài. Chờ test lại bằng UI Learner |
| E-09 | Thấp | Tạo đề thứ hai cùng kỹ năng trong cùng bộ Mock trả 500 thay vì 409 (FR-36) | `cms/cms_tests.py` `create_test` không bắt lỗi DB | **Lộ ra sau đổi DB**: ràng buộc `UNIQUE(test_set_id, skill)` (FR-36) là của schema mới, code không bắt lỗi | **Đã sửa** (409 có lý do; còn sửa luôn tạo đề với bộ không tồn tại, thời lượng quá lớn) |
| E-10 | Thấp | AI chấm Writing mất ~75 s (mục tiêu NFR-02 ≤ 60 s), gồm khởi động nguội | AI engine | Chưa rõ | Chưa xử lý |
| E-11 | Thấp | "Tổng bài viết" cộng `essays` và `free_essays`; biểu đồ xu hướng đếm mọi kỹ năng | `admin/system_statistics.py` | Có từ trước | **Đã sửa** (đổi nhãn thẻ) |
| E-12 | Thấp | Xoá bộ đề có đề archived trả 500 (trigger BR-10 chặn bước gỡ liên kết, lỗi không được bắt) | `admin_content/test_sets.py` | **Lộ ra sau đổi DB**: code cũ vẫn gỡ liên kết bằng `UPDATE`, trigger BR-10 mới chặn lệnh này | **Đã sửa** (409 có lý do) |
| E-13 | Trung bình | Publish không kiểm nội dung: đề trống publish được (đọc code, chưa chạy) | `cms/cms_tests.py` `set_status` | Chưa rõ | Chưa sửa |
| E-14 | Thấp | Đề đã archive không xoá được qua API; thông báo lỗi sai ngữ cảnh | Trigger `block_published_edit` | Theo thiết kế BR-10 | **Đã sửa** thông báo; không xoá được là theo thiết kế BR-10 |
| E-15 | Thấp | `/admin/topics` quản lý bảng `topics`, không phải đề Writing/Speaking | `frontend/src/app/admin/topics` | Có từ trước | **Đã sửa** nhãn trang |
| E-16 | Trung bình | Nhật ký chấm AI: 6 lượt lỗi không có nguyên nhân, và cột `model`, `trace_id` luôn trống nên Admin không chẩn đoán được (FR-30, NFR-05) | `grading_runs`, `writing_grading_service.py`, AI engine | Dữ liệu cũ do bước chuyển dữ liệu; phần model, trace đã ghi §12 | Sửa một phần: `model` đã ghi; `trace_id` chờ AI engine có tracing |
| E-17 | Trung bình | Danh mục Learner cache RAM 60 s, publish và archive của Admin không xoá cache: đề vừa archive vẫn hiện tối đa 60 s | `student_practice/catalog.py` `_CATALOG_TTL_SECONDS` | Có từ trước (TTL 60 s đã có ở `383b0b3`) | **Đã sửa** (middleware xoá cache; đã kiểm bằng UI: archive có hiệu lực ngay) |
| E-18 | Cao | Đề Reading `Test 5` published chỉ có 15 câu (số 1 đến 15) trong khi file gốc `reading_de_bai.json` có 40 mục; Learner làm đề này không bao giờ có band | Bảng `questions` (nạp từ `dataset_clean/de_bai_clean`) | Có từ trước: schema `legacy` cũng 15 câu; parser hiện tại cho đủ 40 | **Đã xử lý dữ liệu**: đề đã lưu trữ (archived) ngày 2026-11-04, Learner không còn thấy; chưa bổ sung 25 câu thiếu |
| E-19 | Trung bình | Đề Listening tên "Cambridge" có 0 câu nhưng đang `published`, không có trong dataset; Learner thấy đề rỗng | Bảng `tests` | Có từ trước: `legacy` cũng có đề này 0 câu, published; không có trong dataset | **Đã xử lý dữ liệu**: đề rỗng đã lưu trữ (archived) ngày 2026-11-04 |
| E-20 | Cao | Giao diện 'Nạp từ Dataset Crawled' không gửi `dataset_path` và không có ô nhập, nên backend dùng đường dẫn Windows mặc định `C:\Users\Admin\Downloads\dataset_clean`: mọi bộ đếm 0, không nạp được; đường dẫn sai cũng trả 200 toàn số 0 thay vì lỗi | `dataset_path_resolver.py`, `DatasetIngestModal.tsx`, `ingest/scan` | Có từ trước (đường dẫn mặc định có ở `383b0b3`) | **Đã sửa** (mặc định trỏ `dataset_clean/` trong repo, thư mục sai → 404, modal không tick sẵn đề) |
| E-21 | Trung bình | Importer publish ngay đề vừa nạp: không qua bước Admin duyệt và kiểm tra (UC-21 bước 6), `license` luôn trống (33/33 đề published chưa có giấy phép, BR-18); đề đã publish thì không xoá được (BR-10) | `importers/import_writer.py` `publish` | Có từ trước | **Đã sửa** (importer chỉ tạo đề nháp) |
| E-22 | Thấp | Đề Writing nạp mới trỏ ảnh biểu đồ tới `storage.googleapis.com/prep-storage-service` (bên thứ ba), trong khi 6 đề nạp trước dùng khoá R2 của dự án: phụ thuộc link ngoài và cần xem lại giấy phép nguồn | `writing_importer.py`, `upload_writing_dataset_to_r2.py` | Quy trình nạp tách hai bước (nạp rồi mới chép ảnh lên R2) | Chưa sửa |
| E-23 | Thấp | Sửa dòng quy đổi band với `band = 8.7` (không phải bước 0.5) trả 409 'bị chồng lấn hoặc trùng': thông báo sai, nguyên nhân là vi phạm BR-01. Schema Pydantic không kiểm bước 0.5; xoá dòng không kiểm bảng còn phủ đủ 0 đến 40 (đọc code) | `admin_content/core.py` | Có từ trước | **Đã sửa** (422, thông báo đúng, xoá dòng không có → 404) |
| E-24 | Cao | Lưu tham số hệ thống kiểu số trả 422: 6 trong 9 khoá lưu dạng số (ví dụ `mock_expert_weekly_quota = 2`) nhưng API PUT chỉ nhận object. Giao diện gửi `{value: 2}`; chỉ 3 khoá dạng object (`min_words`, `mock_duration_minutes`, `speaking_time_limits`) lưu được | `core.py` `SystemSettingUpdate`, seed `system_settings` | Có từ trước: `SystemSettingUpdate` đã là `Dict` ở `383b0b3` và `legacy.system_settings` cũng lưu số | **Đã sửa** (`value` nhận JSON bất kỳ; khoá lạ → 404) |
| E-25 | Cao | Không có code nào đọc `system_settings`: `late_answer_grace_seconds`, giờ Mock, hạn mức Expert, giới hạn thời gian Speaking... đều là hằng số cứng, nên Admin đổi trên trang cài đặt không có tác dụng (FR-28) | Backend (không có chỗ đọc), `practice_attempt_lifecycle.py` `LATE_GRACE_SECONDS` | Có từ trước | Chưa sửa |
| E-26 | Cao | 10 câu có đáp án `N/A` (Listening Test 1: 4, Test 3: 1, Test 5: 5): gõ `N/A` thì được điểm, đáp án thật không bao giờ đúng | `importers/rl_importer.py` `_answer_key` | Có từ trước (`legacy` cũng 10 dòng, code `383b0b3` cũng vậy) | **Đã sửa importer** (không gán N/A nữa); dữ liệu cũ 10 dòng chưa sửa (BR-10 khoá) |
| E-27 | Trung bình | Phản hồi nạp đề báo sai: lỗi giữa chừng vẫn `success = true`; file không tồn tại, `skill` lạ báo thành công 0 đề không lỗi; chạy lại đếm `created` hai lần | `admin_content/ingest.py`, `importers/*` | Chưa rõ | **Đã sửa** |
| E-28 | Cao | Nạp lỗi giữa chừng để lại đề nháp dở dang (1 section) và kẹt: chạy lại với `only_pending = true` thì báo đã tồn tại | `importers/import_writer.py` `begin_test` | Chưa rõ | **Đã sửa** (dọn đề nháp dở dang) |
| E-29 | Cao | Chống trùng chỉ theo tiêu đề: 6 đề thật (1 Writing, 5 Speaking) khác nội dung nhưng trùng tiêu đề bị bỏ qua âm thầm; DB không có `UNIQUE(title, skill)` | `import_writer.begin_test`, `dataset_scanner.py` | Có từ trước (cùng cách chống trùng ở `383b0b3`) | **Giảm nhẹ**: có cảnh báo, không còn âm thầm; sửa hẳn cần cột khoá nguồn trong DB |
| E-30 | Trung bình | Nạp 1 đề mất 5 đến 6 s và trong lúc đó mọi API khác bị đứng (đo được một lượt chờ 7,1 s) | `ingest.py` (async def gọi code đồng bộ) | Chưa rõ | **Đã sửa** (chạy luồng riêng; đo: API khác vẫn ~200 ms khi nạp) |
| E-31 | Thấp | Nạp hàng loạt Writing ghi 2 dòng `topics` rác mỗi lần (Tong Quan Bo De 345 và 397), không chống trùng | `services/dataset_importer.py` `_import_topics` | Có từ trước | **Đã sửa importer** (đã kiểm: 0 dòng mới); 36 dòng rác cũ chờ bạn cho phép dọn |
| E-33 | Thấp | Editor chỉ có 6 dạng câu hỏi; dữ liệu có thêm `matching_features` (23 nhóm), `table_completion` (10), `diagram_labelling` (1) | Modal Thêm Nhóm Dạng Bài | Có từ trước (FR-26 ghi 5 dạng MVP) | Chưa sửa |
| E-34 | Thấp | Mục Hệ thống Logs trên sidebar Admin dẫn tới `/admin/logs` trả 404 | `components/layout/AdminSidebar.tsx`, không có `app/admin/logs` | Có từ trước (link có từ commit khởi tạo, trang chưa từng có) | **Đã sửa** (gỡ link chết); trang Logs thật chưa xây |
| E-35 | Thấp | Thêm chủ đề với ô Mô tả để trống: API trả 422 (`description` bắt buộc) và modal giữ nguyên, không báo lỗi | `schemas/topic.py` `TopicCreate`, `app/admin/topics/page.tsx` | Có từ trước (schema và trang không đổi so với `383b0b3`) | **Đã sửa** |
| E-36 | Thấp | Trang quy đổi band: sau khi lưu bị từ chối (409), ô vẫn hiện giá trị sai (8.7) và nút Tải lại dữ liệu không làm mới ô; tải lại cả trang mới về giá trị đúng (DB không đổi) | `app/admin/settings/page.tsx` | Có từ trước | **Đã sửa** |
| E-38 | Trung bình | Modal Nạp từ Dataset tick sẵn 10 đề đang chờ (và bật ghi đè nếu không còn đề chờ): bấm nạp mà không bỏ chọn thì publish ngay 10 đề cho Learner | `components/admin/DatasetIngestModal.tsx` | Có từ trước (subagent phát hiện) | **Đã sửa** (không chọn sẵn đề nào) |
| E-39 | Thấp | Trang thống kê: ô chọn thời gian và nút Xuất Báo Cáo không có xử lý nào (không đổi số liệu, không gọi API, không tải tệp) | `app/admin/statistics/page.tsx` | Có từ trước | **Giảm nhẹ**: vô hiệu hoá và ghi chưa hỗ trợ; muốn dùng cần xây mới |

Mô tả chi tiết, cách tái hiện và đề xuất sửa: xem báo cáo Admin mục 3 và báo cáo Learner mục 4.

### Kết quả test nạp đề (upload đề)

| Bước | Kết quả |
|---|---|
| Quét có `dataset_path` | 267 đề (Reading 10, Listening 10, Writing 97, Speaking 150); 31 đã nạp; 236 chờ nạp |
| Quét qua giao diện (không có đường dẫn) | 0 ở mọi bộ đếm (E-20) |
| Nạp 1 đề Writing (`selected_tests`) | 200 trong khoảng 5 s: 1 đề, 2 section, 2 nhóm, 2 câu hỏi, 0 lỗi |
| So với file gốc `de_bai.json` | Tiêu đề, 2 task, `min_words` 150 và 250, `task_prompt`, ảnh Task 1 đều khớp; trạng thái `published`, có người duyệt, độ khó medium, không gán bộ đề (đúng FR-36) |
| Nạp lại cùng đề | Bỏ qua (1 đề đã tồn tại), không tạo trùng |
| Số bộ đề và `topics` sau nạp | Không đổi (6 và 42): đường `selected_tests` không ghi `topics` |
| Ảnh biểu đồ | Trỏ `storage.googleapis.com/prep-storage-service`, tải được (200, 131 KB) nhưng là bên thứ ba (E-22) |
| Sau nạp | Đề published, không xoá được; không có `license` (E-21) |

### Nguyên nhân gốc của từng lỗi

| Mã | Loại nguyên nhân | Nguyên nhân cụ thể |
|---|---|---|
| E-01 | Dữ liệu và định dạng không khớp giữa các tầng | UI lưu chữ cái của lựa chọn (`B`). Đáp án trong DB là nội dung lựa chọn (`"the beta wolf"`), do dữ liệu dataset và importer lưu như vậy (`legacy.question_answer_keys` cũng thế). Hàm chấm chỉ so chuỗi, không tra `options_pool` để đổi chữ cái sang nội dung. Code chấm cũ không đổi nên lỗi có từ trước. |
| E-02 | Logic tổng hợp chưa theo luật BR | `overview_aggregator.py` lấp kỹ năng thiếu bằng band đầu vào và lọc band 0 để số hiển thị không bị 0. Viết trước khi có BR-02 và BR-12 ("chưa đủ dữ liệu"); file không đổi qua lần đổi DB. |
| E-03 | Logic cũ chưa theo BR-03 | `practice_history.py` đổi `null` thành `0.0` cho đủ kiểu số của frontend. Code cũ cũng làm vậy; BR-03 cần trả `null`. |
| E-04 | Dữ liệu mẫu cứng trong frontend | Component dựng sẵn giá trị mặc định khi API trả rỗng (`displayItems`, `?? 5.0`, `"2026-12-31"`), phục vụ demo lúc chưa có backend. |
| E-05 | Tính năng chưa làm | Chưa có endpoint lưu nháp ở backend; frontend chỉ lưu nháp Listening vào `localStorage` khi bấm nút. Code cũ cũng chưa có. |
| E-06 | Tính năng chưa làm | `WritingWorkspace.tsx` chỉ hiện bộ đếm và cờ `isWordCountMet`; không có hộp thoại xác nhận khi nộp thiếu từ. |
| E-07 | Dữ liệu cũ và API chưa lọc | Transcript Listening dữ liệu cũ nằm trong `passage_text` (§12). `lr_test_content.py` trả nguyên `passage_text` cho client, không giấu transcript đến khi nộp. |
| E-08 | Code cũ chưa thích nghi schema mới | Frontend tính giờ 8 phút mỗi section (32 phút cho 4 section) trong khi `tests.duration_minutes = 30`. Server cũ chỉ đặt `deadline_at`, không từ chối nộp muộn; server mới (`lock_for_submit`, BR-07) từ chối nộp trễ quá 30 s, nên bài tự nộp lúc 32 phút bị 409. |
| E-09 | Code cũ chưa thích nghi schema mới | Schema mới thêm `UNIQUE(test_set_id, skill)` (FR-36). `create_test` insert không bắt lỗi, trong khi hàm `db_error` đã có sẵn thông điệp 409. |
| E-10 | Thiết kế pipeline | Worker chấm lần lượt từng task (SD-02). Log AI engine ghi Task 1 mất 53,2 s và Task 2 mất 43,0 s (mỗi task gọi LLM nhiều bước); tổng thời gian đo được ~75 s. |
| E-11 | Chỉ số không cùng đơn vị | `system_statistics.py` cộng `essays` (bài Writing trong attempt) với `free_essays` (Chấm bài tự do); biểu đồ đếm `attempts` mọi kỹ năng. |
| E-12 | Code cũ chưa thích nghi schema mới | `delete_admin_test_set` gỡ liên kết bằng `UPDATE tests SET test_set_id = NULL`. Trigger `block_published_edit` (BR-10) của schema mới chặn lệnh này với đề archived, và lỗi không được bắt. |
| E-13 | Tính năng chưa làm | SD-08 yêu cầu validate trước publish nhưng `set_status` chỉ đặt `status` và người duyệt; DB chỉ bắt buộc có `reviewer_id` (BR-18). |
| E-14 | Theo thiết kế BR-10, thiếu thông điệp đúng | Trigger chặn mọi sửa, kể cả xoá, với đề published hoặc archived. Thông báo "hãy tạo phiên bản mới" dùng chung cho cả ca xoá nên không hợp ngữ cảnh. |
| E-15 | Tính năng cũ chưa gỡ | Trang `/admin/topics` quản lý bảng `topics` của tính năng Chấm bài tự do (ngoài thiết kế, đang chờ nhóm quyết định) nhưng tiêu đề trang nói về đề Writing và Speaking. |
| E-16 | Dữ liệu chuyển và AI engine chưa trả đủ | 6 lượt lỗi (và hầu hết lượt `done` ngày 01 và 02/11) do bước chuyển dữ liệu cũ tạo ra, không có `error` và `latency_ms`. Code chấm hiện tại có ghi `error`, `output`, `latency_ms`, nên lượt lỗi mới sẽ có nguyên nhân. `model` và `trace_id` luôn trống vì AI engine chưa trả về (§12). Hệ quả: tỉ lệ lỗi AI 28,57% trên trang thống kê chủ yếu đến từ dữ liệu cũ. |
| E-17 | Cache không đồng bộ | Catalog giữ cache RAM 60 s trong tiến trình; thao tác publish, archive của Admin không xoá cache. TTL này đã có ở code cũ. |
| E-18 | Importer chưa nạp đủ | Importer đọc `reading_de_bai.json` nhưng DB chỉ có câu 1 đến 15 của Test 5, và chưa có kiểm tra tổng số câu sau khi nạp (đề L/R phải đủ 40 theo BR-03). Cũng có đề lệch 1 câu (Reading Test 9: gốc 39, DB 40); chưa tra nguyên nhân. |
| E-19 | Không có kiểm tra trước publish (E-13) | Không có bước validate nên đề rỗng publish được; đề này không nằm trong `dataset_clean/` nên do tạo thủ công. |
| E-20 | Mặc định gắn với máy một người | `DEFAULT_DATASET_ROOT` là đường dẫn Windows của tác giả cũ; modal không có ô nhập và `scan_dataset` không báo lỗi khi thư mục không tồn tại. |
| E-21 | Quy trình nạp thiếu bước duyệt | Cả ba importer gọi `import_writer.publish` ngay sau khi nạp; `set_status` chỉ ghi người duyệt là chính Admin chạy nạp. Importer không đặt `license`. |
| E-22 | Quy trình nạp tách hai bước | Importer giữ nguyên `image_url` trong file dataset (link crawl từ bên thứ ba); chép ảnh lên R2 là script riêng (`upload_writing_dataset_to_r2.py`) chưa chạy cho đề mới. |
| E-23 | Kiểm tra dữ liệu và thông báo lỗi | Pydantic chỉ kiểm `0 ≤ band ≤ 9`; bước 0.5 do domain `band` của DB chặn, và `except` chung gắn nhãn 'chồng lấn' cho mọi lỗi DB. |
| E-24 | Kiểu dữ liệu API và dữ liệu cấu hình không khớp | `system_settings.value` là `jsonb` nên lưu được số trần (10, 180, 30...), nhưng `SystemSettingUpdate.value` khai báo `Dict[str, Any]`. Có từ trước: schema cũ cũng khai báo `Dict` và `legacy.system_settings` cũng lưu số. |
| E-25 | Tính năng chưa nối | Phần đọc cấu hình lúc chạy chưa được viết; code dùng hằng số (`LATE_GRACE_SECONDS`, `DEFAULT_MINUTES`...). Trang cài đặt chỉ ghi vào bảng. |
| E-26 | Giá trị mặc định sai | `_answer_key` điền `N/A` khi không có lời giải 4 bước; hàm chấm coi `N/A` là một đáp án bình thường. `legacy` cũng có đúng 10 dòng này nên bước chuyển DB chỉ sao chép. |
| E-27 | Điều kiện thành công và nhánh bỏ qua | `success = len(errors) == 0 or created > 0 or skipped > 0`; `import_single_*` gặp file không tồn tại thì `return` im lặng; `_import_selected` không kiểm `skill`; bộ đếm `created` tăng ở `begin_test`, trước khi nạp nội dung. |
| E-28 | Không có giao dịch | Importer ghi từng lệnh riêng, không rollback; `begin_test` coi đề đã có (theo tiêu đề) là đã tồn tại nên đề dở dang bị bỏ qua mãi. |
| E-29 | Khoá chống trùng quá yếu | So `(title.lower()[:280], skill)` ở tầng ứng dụng; không có ràng buộc DB; dataset có 6 cặp trùng tiêu đề khác `test_id`. |
| E-30 | Chặn vòng lặp sự kiện | Endpoint `async def` gọi `DatasetImporter.run()` đồng bộ (nhiều lệnh DB tuần tự) nên không nhường cho request khác. |
| E-31 | Duyệt nhầm file | `_import_topics` duyệt mọi `*.json` trong `writing/` (gồm `tong_quan_bo_de_*.json`), lấy tên file làm tiêu đề, `insert` không chống trùng. |
| E-33 | Danh sách cố định | Select dạng câu hỏi trong modal viết cứng 6 giá trị theo 5 dạng MVP. |
| E-34 | Link chết | Sidebar khai báo `/admin/logs` nhưng thư mục `app/admin/logs` không có; không có commit nào từng thêm trang này. |
| E-35 | Form và schema lệch nhau | Giao diện coi Mô tả là tuỳ chọn và không gửi trường khi trống (`description || undefined`), còn `TopicCreate.description` là bắt buộc. |
| E-36 | Trạng thái ô nhập cục bộ | Mỗi hàng giữ giá trị người dùng nhập trong state riêng; lệnh Tải lại dữ liệu không đặt lại state này. |
| E-38 | Mặc định chọn sẵn | `useEffect` sau khi quét gọi `setSelectedIds(pending.slice(0, 10))` và bật `forceOverwrite` khi hết đề chờ; kết hợp với importer tự publish (E-21) nên rất dễ nạp nhầm. |
| E-39 | Giao diện chưa nối | `<select>` không có `onChange` và `<button>` không có `onClick`; API thống kê không nhận tham số khoảng thời gian. |

## 4. Dữ liệu test còn lại

| Đối tượng | Ghi chú |
|---|---|
| Tài khoản `admin@example.com` (mật khẩu yếu) | Xoá: `DELETE FROM auth.users WHERE email = 'admin@example.com';` (dòng xoá trong file SQL ghi email cũ) |
| Tài khoản `uitest_1793711233@gmail.com` | Chưa xác minh email; xoá bằng dòng có sẵn trong file SQL |
| Đề `ZZ UI TEST reading A`, `ZZ UI PUBLISH TEST (archive sau test)` (archived), bộ `ZZ UI TEST SET (đã đổi tên)` | Không xoá được qua API (E-12, E-14); xoá bằng SQL cần tắt trigger `block_published_edit` |
| Bài làm của `sinhdangphuoctruong@gmail.com` | 2 bài Reading, 1 bài Writing đã chấm, 2 bài Listening thi thử (1 nộp, 1 abandoned), vài bài đã huỷ; làm lệch thống kê tài khoản này |
| Đề Writing `WT1: Comparative graph (UK tourists to Spain) + WT2: Opinion essay (Age of leaders)` và đề Speaking `Full test 6: Weekends + Describe a time when you needed to search for information` | Do test nạp đề lúc importer còn tự publish nên **đang published** và hiện cho Learner. Nội dung thật từ dataset, khớp file gốc: giữ hoặc archive tuỳ bạn. Từ giờ đề nạp xong ở dạng nháp |
| Đề Reading `Test 5` (15/40 câu) và Listening `Cambridge` (rỗng) | Đã archived ngày 2026-11-04 theo yêu cầu; 0 lượt làm bài |
| 36 chủ đề `Tong Quan Bo De N` trong `topics` | Còn `is_active = true`. Dọn bằng xoá mềm: `update topics set is_active=false where title ilike 'Tong Quan Bo De%'` (đúng 36 dòng, đảo lại được) hoặc xoá tay ở `/admin/topics` |
| Object R2 `ui-test/aedcac65347b.png` | Ảnh PNG 1x1 do test upload media; không có API xoá |
| `audit_logs` do thao tác test | Không xoá được theo thiết kế |

## 5. Thay đổi code trong phiên

| Nhóm | Thay đổi | File chính |
|---|---|---|
| Học viên | Huỷ bài làm dở: Practice xoá hẳn, Mock thoát chủ động thành `abandoned`; nút xoá ở lịch sử | `practice_history.py`, `analytics.py`, 4 workspace, 4 page, trang lịch sử, `student-test-practice.ts` |
| Học viên | Sửa `attemptId` luôn `null` ở dev (StrictMode); đồng hồ thi thử bám hạn server (E-08) | `useExamWorkspaceContent.ts`, `ListeningWorkspace.tsx`, `practice_attempt_lifecycle.py` (trả `server_time`) |
| CMS | Bắt lỗi DB trả 409/400 thay vì 500 (E-09, E-12, E-23, E-24); cài đặt hệ thống nhận JSON bất kỳ | `cms_tests.py`, `test_sets.py`, `core.py`, `schemas/system_settings.py`, `schemas/topic.py` |
| CMS | Xoá cache Learner sau mọi thao tác ghi của Admin (E-17) | `cache_control.py` (mới), `main.py` |
| Nạp đề | Thư mục dataset mặc định theo repo, báo 404 khi sai; chạy importer trong luồng riêng (E-20, E-30) | `dataset_path_resolver.py`, `dataset_scanner.py`, `ingest.py` |
| Nạp đề | Báo lỗi đúng, dọn đề nháp dở dang, không gán `N/A`, cảnh báo trùng tiêu đề, không ghi `topics` rác (E-26 đến E-29, E-31) | `import_writer.py`, `*_importer.py`, `dataset_importer.py` |
| Nạp đề | Đề nạp xong luôn ở dạng nháp, Admin tự xuất bản (E-21, UC-30) | `*_importer.py`, `import_writer.py` |
| Thống kê và AI | Đổi nhãn thẻ Total Essays (E-11); ghi `grading_runs.model` (E-16) | `statistics/page.tsx`, `grading_pipeline.py`, `writing_grading_service.py` |
| Giao diện Admin | Gỡ link Logs chết, vô hiệu hoá điều khiển chưa nối, sửa nhãn trang chủ đề, không chọn sẵn đề khi nạp, nạp lại trang cài đặt sau lỗi (E-34 đến E-36, E-38, E-39) | `AdminSidebar.tsx`, `settings/page.tsx`, `topics/page.tsx`, `statistics/page.tsx`, `DatasetIngestModal.tsx` |
| Dữ liệu | Lưu trữ đề Reading Test 5 và Listening Cambridge (E-18, E-19), qua API của ứng dụng | không đổi code |
| Tài liệu | Máy trạng thái, hành vi huỷ, hành vi nạp đề, cài đặt, cache, mã 409 | `docs/source-of-truth.md` §6, §12 |

## 6. Chưa test và việc nên làm

- Expert: đăng nhập, nhận bài, chấm. Cần tài khoản Expert.
- Learner hoặc Expert gọi API Admin (kỳ vọng 403): cần đăng nhập bằng tài khoản đó. Kiểm lại đồng hồ Listening thi thử (E-08) bằng giao diện cũng cần đăng nhập Learner.
- Tạo Expert/Admin nhánh thành công, sửa cấu hình chấm điểm, upload media hợp lệ: thao tác ghi thật, người dùng tự làm hoặc cho phép từng ca.
- Chấm một bài Writing thật để kiểm `grading_runs.model` (chưa chạy vì tốn chi phí AI).
- Dữ liệu gốc `dataset_clean/` cũng thiếu câu: Reading Test 6, 8, 9 (39 câu), Listening Test 7, 8 (38 câu), Test 10 (37 câu) nên làm đủ đề cũng không có band theo BR-03.
- Kết quả chạy lại toàn bộ Admin (code rồi UI): `docs/ui-test-report-admin.md` mục 10. Chi tiết nạp đề (26 ca, E-18 đến E-33): `docs/ui-test-report-upload-de.md`.
- Thứ tự ưu tiên sửa tiếp: E-01, 36 chủ đề rác, 10 đáp án `N/A`, E-13, E-25, E-02, E-05.

## 7. Câu hỏi còn mở

- Có cho sửa E-01 (chấm matching, tra `options_pool` để đổi chữ cái sang nội dung) không? Đây là lỗi làm sai điểm thật.
- Dọn 36 chủ đề rác bằng cách nào (SQL một dòng, xoá tay, hay thêm quy tắc cho phép gọi API xoá mềm)?
- Listening Test 1, 3, 5 còn 10 đáp án `N/A`: archive hay chấp nhận? Test 1 đã có 1 lượt làm bài.
- Hai đề nạp từ lúc importer còn tự publish (Writing "UK tourists to Spain", Speaking "Full test 6"): giữ published hay archive?
- E-02, E-03, E-04, E-06: sửa hay ghi vào `source-of-truth.md` §12 như điểm lệch đã biết?
- Bạn có đăng nhập lại Learner hoặc cung cấp tài khoản Expert để test phần còn thiếu không?
- Nhãn "pie_chart" trên kết quả Writing Task 1 có đúng với ảnh đề không? Chưa đối chiếu.

