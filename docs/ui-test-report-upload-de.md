# Báo cáo test chức năng upload đề (Admin)

> **Cập nhật 2026-11-04 (sau khi sửa và chạy lại test):** đã sửa E-20, E-23, E-27, E-28, E-30, E-31 và importer của E-26; E-29 giảm nhẹ (có cảnh báo thay vì bỏ qua âm thầm); thêm E-38 (modal tick sẵn 10 đề, đã sửa). **E-32 được rút lại**: giới hạn thời gian của dataset (Part 1 là 30 s, Part 3 là 45 s) nằm trong mức tối đa của BR-13 (45 s và 90 s), không phải lỗi. Cập nhật vòng 2: E-21 đã sửa (importer chỉ tạo đề nháp); E-18 và E-19 đã xử lý bằng cách lưu trữ đề lỗi. Chưa sửa vì cần xây mới hoặc cần bạn quyết định: E-22, E-33 và 10 đáp án `N/A` cũ. Kết quả cuối: `docs/ui-test-report-admin.md`.


- Ngày test: 2026-11-03
- Nhánh: `LongRevert`, commit `9927c51` cộng các thay đổi chưa commit
- Tài khoản: Admin test (đăng nhập tay), Chrome Playwright
- Bản tổng hợp toàn bộ: `docs/ui-test-report.md`. Mã lỗi E-xx dùng chung với bản tổng hợp.

## 1. Kết luận

- **Nạp đề từ dataset bằng giao diện không dùng được trên máy này** (E-20). Bằng API với đường dẫn đúng thì nạp được và nội dung đúng file gốc (đã nạp thật 1 đề Writing và 1 đề Speaking).
- Cơ chế nạp có **nhiều lỗi báo sai kết quả và không an toàn khi lỗi**: báo thành công khi thất bại, để lại đề nháp dở dang rồi bị kẹt, bỏ qua âm thầm 6 đề khác nội dung chỉ vì trùng tiêu đề, ghi rác vào bảng `topics`, và làm đứng cả API trong lúc nạp.
- **Dữ liệu dataset có vấn đề**: 46/150 đề Speaking thiếu phần, 6 cặp tiêu đề trùng, toàn bộ ảnh và audio nằm ở storage bên thứ ba, giới hạn thời gian Speaking khác BR-13.
- Soạn đề thủ công bằng giao diện (editor) và upload media chạy đúng.
- Tổng: 26 ca test, 11 đạt, 9 lệch, 6 lỗi (mục 3). 13 lỗi hoặc lệch có mã E-xx (mục 4).

## 2. Ba đường "upload đề" đã test

| Đường | Thành phần | Ghi chú |
|---|---|---|
| Nạp từ dataset | `GET /admin/ingest/scan`, `POST /admin/ingest/crawled-test`, `POST /admin/ingest/stream`; modal "Nạp từ Dataset Crawled" | Đọc file JSON trong `dataset_clean/de_bai_clean`, ghi qua các service CMS, **tự publish** |
| Soạn thủ công | Modal "Soạn Đề Thi Mới", trang editor `/admin/tests/{id}/edit`, API section, nhóm câu hỏi, câu hỏi | Đề nháp, Admin tự bấm Xuất bản |
| Upload media | `POST /admin/media/upload` | Ghi file lên Cloudflare R2, trả key và URL |

## 3. Bảng ca test

Ký hiệu: ✅ Đạt, ⚠️ Lệch (chạy được nhưng sai hoặc thiếu so với thiết kế), ❌ Lỗi.

| # | Đường | Ca test | Kết quả | Chi tiết |
|---|---|---|---|---|
| U-01 | Dataset | Quét có `dataset_path` đúng | ✅ | 267 đề (Reading 10, Listening 10, Writing 97, Speaking 150); 31 đã nạp trước test, 236 chờ |
| U-02 | Dataset | Quét qua giao diện (modal) | ❌ | Mọi bộ đếm = 0, không chọn được đề (E-20) |
| U-03 | Dataset | Quét đường dẫn không tồn tại | ⚠️ | 200 với toàn số 0, không báo lỗi (E-20) |
| U-04 | Dataset | Quét với gốc repo, `dataset_clean/`, `de_bai_clean/` | ✅ | Cả ba ra 267 đề (tự dò thư mục lồng). Trỏ vào `writing/` thì ra 0 không báo lỗi |
| U-05 | Dataset | Nạp 1 đề Writing (`selected_tests`) | ⚠️ | 200 trong khoảng 5 s; 1 đề, 2 section, 2 nhóm, 2 câu; nội dung khớp file gốc. Lệch: tự publish, không giấy phép (E-21), ảnh bên thứ ba (E-22) |
| U-06 | Dataset | Nạp lại cùng đề | ✅ | Bỏ qua ("1 đề đã tồn tại"), không tạo trùng |
| U-07 | Dataset | Nạp 1 đề Speaking | ⚠️ | 200 trong khoảng 6 s; 3 section, 7 câu, audio đủ. Lệch: thời gian từ dataset khác BR-13 (E-32), audio bên thứ ba (E-22), đứng API (E-30) |
| U-08 | Dataset | Đề Reading đã publish, `only_pending = true` | ✅ | Bỏ qua |
| U-09 | Dataset | Đề Reading đã publish, `only_pending = false` | ✅ | Từ chối: "đã xuất bản — không ghi đè (BR-10), hãy tạo phiên bản mới" |
| U-10 | Dataset | File JSON sai cú pháp | ✅ | `success = false`, nêu vị trí lỗi, không tạo gì |
| U-11 | Dataset | Lỗi giữa chừng (Task 2 hỏng) | ❌ | Báo `success = true`; để lại đề nháp 1 section (E-27, E-28) |
| U-12 | Dataset | Chạy lại sau lỗi, `only_pending = true` | ❌ | Bị coi "đã tồn tại", đề dở dang kẹt vĩnh viễn (E-28) |
| U-13 | Dataset | Chạy lại sau lỗi, `only_pending = false` | ⚠️ | Xoá section cũ và nạp lại nháp (đúng), nhưng đếm `created = 1` thêm lần nữa dù lại lỗi (E-27) |
| U-14 | Dataset | `selected_tests` trỏ file không tồn tại | ⚠️ | `success = true`, 0 đề, không lỗi: bỏ qua âm thầm (E-27) |
| U-15 | Dataset | Mục thiếu `path` | ⚠️ | Báo "Error importing selected x: 'path'", khó hiểu (E-27) |
| U-16 | Dataset | `skill` lạ ("cooking") | ⚠️ | `success = true`, bỏ qua âm thầm (E-27) |
| U-17 | Dataset | Nạp hàng loạt (không chọn đề), Writing, giới hạn 1 | ❌ | 0 đề mới nhưng **thêm 2 dòng `topics` mỗi lần chạy**, không chống trùng (E-31) |
| U-18 | Dataset | Luồng SSE `ingest/stream` | ✅ | `text/event-stream`, có sự kiện bắt đầu và hoàn tất. Chỉ chạy khi không chọn kỹ năng nào, chưa nạp thật |
| U-19 | Dataset | Chống trùng đề khác nội dung nhưng cùng tiêu đề | ❌ | 6 đề thật sẽ bị bỏ qua (E-29) |
| U-20 | Dataset | API khác trong lúc nạp | ❌ | Lượt gọi trong lúc nạp 6 s phải chờ 7,1 s (bình thường ~0,8 đến 1 s) (E-30) |
| U-21 | Dataset | Kiểm chất lượng 267 file dataset | ⚠️ | Xem mục 5 |
| U-22 | Soạn tay | Modal "Soạn Đề Thi Mới": tiêu đề trống; có tiêu đề | ✅ | Trống bị chặn ở client, không gọi API; có tiêu đề thì tạo đề và 3 section Reading |
| U-23 | Soạn tay | Editor: thêm nhóm True/False/Not Given | ✅ | 201, hiện đúng trong section |
| U-24 | Soạn tay | Editor: thêm câu hỏi + đáp án; nội dung trống | ✅ | Trống bị chặn; hợp lệ: 201, DB có câu 1 và đáp án `{FALSE, F}` |
| U-25 | Soạn tay | Danh sách dạng câu hỏi của editor | ⚠️ | Chỉ có 6 dạng, thiếu các dạng dataset dùng (E-33) |
| U-26 | Media | PNG 1x1 hợp lệ; `.exe`; PDF; 31 MB; thiếu `file` | ✅ | 201; 400; 400; 400 ("tối đa 30MB", xử lý 2,8 s); 422 |

Các ca CMS bằng API (tạo, sửa, publish, archive, BR-10, FR-36) nằm ở `docs/ui-test-report-admin.md`.

## 4. Lỗi và nguyên nhân

| Mã | Mức | Lỗi | Nguyên nhân |
|---|---|---|---|
| E-20 | Cao | Modal nạp đề không dùng được: mọi bộ đếm 0. Đường dẫn sai vẫn trả 200 toàn 0 | Modal gọi `ingest/scan` không kèm `dataset_path` và không có ô nhập. Backend dùng `DEFAULT_DATASET_ROOT = C:\Users\Admin\Downloads\dataset_clean` (máy Windows của tác giả cũ, có từ `383b0b3`). `scan_dataset` không báo lỗi khi thư mục không tồn tại |
| E-21 | Trung bình | Đề nạp xong tự publish: không qua duyệt, không giấy phép (`license` trống ở cả 33 đề published). Đề đã publish thì không xoá được (BR-10) | Cả ba importer gọi `import_writer.publish` ngay sau khi nạp; `set_status` ghi người duyệt chính là Admin chạy nạp. UC-21 bước 6 (kiểm tra trước publish) và BR-18 (nguồn, giấy phép) bị bỏ qua |
| E-22 | Trung bình | Toàn bộ ảnh và audio của đề trỏ vào storage bên thứ ba | Importer giữ nguyên URL trong file dataset. Dataset: 97/97 ảnh Task 1 ở `storage.googleapis.com/prep-storage-service` (49) và `gcss.prepcdn.com` (48); audio Speaking: 777 ở GCS, 368 ở prepcdn, 2 trống. 6 đề Writing nạp trước đã được chép sang R2 bằng script riêng `upload_writing_dataset_to_r2.py`; đề mới thì chưa. Hệ quả: link ngoài chết thì đề hỏng; nguồn ngoài cần xem lại giấy phép |
| E-26 | Cao | 10 câu có đáp án `"N/A"` (Listening Test 1: 4 câu, Test 3: 1 câu, Test 5: 5 câu) | `_answer_key` trả `accepted or ["N/A"]` khi câu không có lời giải. Chấm so khớp nên `N/A` thành đáp án đúng, còn đáp án thật không bao giờ đúng. Cũng có sẵn trong `legacy` (10 dòng), tức lỗi có từ trước |
| E-27 | Trung bình | Phản hồi nạp đề báo sai: lỗi giữa chừng vẫn `success = true`; file không tồn tại hoặc `skill` lạ báo thành công 0 đề không lỗi; chạy lại đếm `created` hai lần | `success = len(errors) == 0 or created > 0 or skipped > 0` (`ingest.py`). `import_single_*` gặp file không tồn tại thì `return` im lặng; `_import_selected` không kiểm `skill`. Bộ đếm tăng ở `begin_test` trước khi nạp nội dung |
| E-28 | Cao | Nạp lỗi giữa chừng để lại đề nháp dở dang (1 section) và kẹt: chạy lại thì báo "đã tồn tại" | Importer không chạy trong một giao dịch, không dọn khi lỗi. `begin_test` tìm đề theo `(title, skill)`; có rồi và `only_pending = true` thì bỏ qua. Phải chạy `only_pending = false` hoặc xoá tay |
| E-29 | Cao | 6 đề thật bị bỏ qua âm thầm (1 Writing, 5 Speaking: khác `test_id` và nội dung, trùng tiêu đề). Quét cũng đếm sai "đã nạp" | Chống trùng chỉ so tiêu đề (tối đa 280 ký tự, không phân biệt hoa thường) ở tầng ứng dụng. DB không có `UNIQUE(title, skill)`: chạy nhiều worker song song có thể tạo trùng. Quét dùng cùng quy tắc nên không thấy Reading Test 5 thiếu câu |
| E-30 | Trung bình | Trong lúc nạp 1 đề (6 s), request khác bị đứng, một lượt chờ 7,1 s | Endpoint `async def` gọi trực tiếp `DatasetImporter.run()` đồng bộ (nhiều lệnh DB tuần tự), làm nghẽn vòng lặp sự kiện. Nên chạy bằng `run_in_threadpool` hoặc tác vụ nền (FastAPI `BackgroundTasks` như đang dùng cho chấm Writing). Mình chỉ đo hai lượt gọi, nên số cụ thể chỉ có giá trị tham khảo |
| E-31 | Thấp | Nạp hàng loạt Writing ghi 2 dòng `topics` rác mỗi lần ("Tong Quan Bo De 345", "Tong Quan Bo De 397"), kể cả khi không nạp được đề nào | `_import_topics` duyệt mọi `*.json` trong `writing/` (gồm file tổng quan bộ đề), lấy tên file làm tiêu đề, `insert` không chống trùng. Đây là nguồn của các mục trùng ở trang `/admin/topics` (E-15). Đã dọn các dòng phát sinh về đúng 42 |
| E-32 | Trung bình | Giới hạn thời gian Speaking lấy từ dataset khác BR-13: Part 1 trả lời 30 s (BR-13: 45 s), Part 3 là 45 s (BR-13: 90 s) | Importer chép `limit_time` và `time_to_think` của câu đầu tiên vào `speaking_parts`. Bảng `system_settings.speaking_time_limits` (45/90) không được code đọc (E-25) nên không có chỗ nào ép BR-13 |
| E-33 | Thấp | Editor chỉ có 6 dạng: Multiple Choice, True/False/Not Given, Yes/No/Not Given, Completion, Matching Headings, Short Answer. Dữ liệu có thêm `matching_features` (23 nhóm), `table_completion` (10) và `diagram_labelling` (1): 34 nhóm không có trong danh sách chọn | Danh sách dạng trong modal "Thêm Nhóm Dạng Bài" cố định, theo "5 dạng MVP" (FR-26) cũ. Admin không soạn lại được các nhóm đã nạp thuộc dạng thiếu |
| E-18 | Cao | Reading Test 5 published chỉ có 15 câu (file gốc 40) | Có sẵn trong `legacy` (cũng 15). Parser hiện tại chạy lại cho đủ 40 câu, nên không phải lỗi của importer hiện tại. Cần nạp lại bằng phiên bản mới (BR-10 không cho ghi đè) |
| E-19 | Trung bình | Đề Listening "Cambridge" 0 câu đang published | Có sẵn trong `legacy`; không có trong dataset. Không có kiểm tra nội dung trước publish (E-13) |

Ghi chú về code của upload media (mình chỉ đọc code, không gửi để khỏi ghi rác lên R2): kiểm tra loại file dựa vào `content_type` do client gửi, và bỏ qua kiểm tra nếu trường này trống; đọc toàn bộ file vào RAM rồi mới kiểm tra giới hạn 30 MB; cho phép SVG; tên thư mục chỉ lọc chuỗi `..` bằng `replace`. Mức thấp vì chỉ Admin dùng.

## 5. Chất lượng dataset (`dataset_clean/de_bai_clean`)

Kiểm bằng script theo đúng trường mà importer đọc, không ghi DB.

| Mục | Kết quả |
|---|---|
| Reading, Listening | Parser của importer cho Reading 1 đến 5, 7, 10 = 40 câu; Reading 6, 8, 9 = 39; Listening 1 đến 6, 9 = 40; Listening 7, 8 = 38; Listening 10 = 37. Đề thiếu câu so với 40 thì không bao giờ có band (BR-03) |
| Writing | 97 đề, đều có đúng 2 phần. 1 cặp trùng tiêu đề khác nội dung. Ảnh Task 1 đều ở 2 host bên thứ ba |
| Speaking | 150 đề: 104 đủ 3 phần, 44 chỉ có Part 2 và 3 (mục "Part 2 + 3" của Forecast), 2 đề chỉ có 1 phần. 5 cặp trùng tiêu đề khác nội dung. 2 câu thiếu audio |
| Đối chiếu DB | DB Reading Test 9 có 40 câu, dataset cho 39 (chưa tra nguyên nhân) |

## 6. Dữ liệu test để lại

| Đối tượng | Ghi chú |
|---|---|
| Đề Writing `WT1: Comparative graph (UK tourists to Spain) + WT2: Opinion essay (Age of leaders)` | Nạp thật, **published**, hiện cho Learner |
| Đề Speaking `Full test 6: Weekends + Describe a time when you needed to search for information` | Nạp thật, **published**, hiện cho Learner |
| Đề nháp `ZZ UPLOAD PARTIAL`, `ZZ UI NEW DRAFT` | Đã xoá (nháp xoá được) |
| 4 dòng `topics` phát sinh khi test | Đã xoá, `topics` về 42 |
| Object R2 `ui-test/aedcac65347b.png` | Ảnh 1x1, không có API xoá |
| Thư mục tạm `tmp_dataset/` | Nằm trong thư mục tạm của phiên, không thuộc repo |

Hai đề thật vừa nạp có nội dung đúng file gốc. Nếu không muốn giữ, chỉ archive được (BR-10).

## 7. Việc nên làm

1. Sửa E-20: modal truyền `dataset_path` (ô nhập hoặc cấu hình) và backend trả lỗi khi thư mục không tồn tại; đổi `DEFAULT_DATASET_ROOT` sang đường dẫn tương đối repo.
2. Sửa E-28 và E-27: nạp trong một giao dịch hoặc dọn đề nháp khi lỗi; phản hồi `success` chỉ đúng khi không có lỗi; báo rõ mục bị bỏ qua.
3. Thêm `UNIQUE(title, skill)` hoặc khoá theo `test_id` gốc của dataset; sửa E-29 bằng cách lấy khoá từ `test_id` trong tên thư mục.
4. Đổi bước kiểm duyệt: importer chỉ tạo đề nháp, Admin duyệt và publish (E-21), kèm điền `license`.
5. Chạy importer ngoài vòng lặp sự kiện (E-30).
6. Sửa `accepted or ["N/A"]`: bỏ qua đề hoặc đánh dấu câu thiếu đáp án (E-26); nạp lại Reading Test 5 (E-18).
7. Chạy `upload_writing_dataset_to_r2.py` cho đề mới, hoặc chép ảnh và audio sang R2 ngay lúc nạp (E-22).

## 8. Câu hỏi còn mở

- Hai đề thật vừa nạp (Writing và Speaking): giữ hay archive?
- Có cho mình sửa các lỗi nạp đề (E-20, E-27, E-28, E-26) không? Các file nằm ngoài `backend/app/ai`.
- Quy ước chống trùng: dùng `test_id` gốc của dataset (trong tên thư mục) hay thêm cột riêng?
- Giới hạn thời gian Speaking: theo BR-13 (45 s, 90 s) hay theo dataset (30 s, 45 s)?
- Nguồn ảnh và audio crawl từ bên thứ ba: nhóm đã có giấy phép sử dụng chưa (BR-18)?
