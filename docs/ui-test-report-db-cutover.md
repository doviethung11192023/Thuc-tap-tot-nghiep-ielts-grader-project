# Báo cáo UI test sau khi thống nhất DB (public 33 bảng)

> **Bản tổng hợp mới nhất:** `docs/ui-test-report.md` (bảng chức năng, trạng thái, danh sách lỗi E-01 đến E-17). Kết luận ở đó thay cho kết luận "đều có sẵn từ trước" trong file này: có 3 chỗ code cũ chưa thích nghi với ràng buộc của schema mới (E-08, E-09, E-12).

- Ngày test: 2026-11-03
- Nhánh: `LongRevert`, commit `9927c51`
- Vai trò đã test: Learner (`sinhdangphuoctruong@gmail.com`). Expert, Admin chưa test
- Công cụ: Playwright (Chrome riêng, attach qua CDP) + gọi API bằng token phiên đăng nhập + psql đọc DB
- Môi trường: backend `:8000`, frontend `:3000`, AI engine `:8001`, Supabase thật; không có Redis (backend chạy `NullRedisCache`)

## 1. Kết luận

- **Không thấy xung đột nào do đổi DB** trong các luồng đã test. Learner chạy bình thường, các luồng cốt lõi đúng nghiệp vụ.
- Có **7 lỗi hoặc lệch nghiệp vụ**. Cái nào đối chiếu được với code cũ (`383b0b3`) đều **có sẵn từ trước**, không phải do cutover.
- Lỗi nặng nhất: **chấm sai câu matching** (mục 4.1), làm sai điểm thật.

### Hạn chế của phép so "trước và sau"

Schema cũ đã nằm trong `legacy`, PostgREST chỉ expose `public`, nên **không chạy lại được app cũ trên dữ liệu cũ**. Cách làm:

1. Chạy UI test trên bản hiện tại.
2. Đối chiếu bản cũ bằng đọc code ở `383b0b3` và so dữ liệu trong schema `legacy`.

Đây là so sánh tĩnh, không phải chạy UI hai lần.

## 2. Phạm vi và kết quả

| # | Luồng | Cách test | Kết quả |
|---|---|---|---|
| 1 | Các trang Learner (learning-profile, test-practice, history, profile) | Mở từng trang, bắt lỗi API và console | Đạt: không có lỗi 4xx/5xx, không có lỗi console |
| 2 | Danh mục đề | So số đề với DB | Đạt: 32 đề published (L 11, R 10, W 6, S 5) |
| 3 | Nội dung đề Reading | Đọc khoá JSON của payload | Đạt: không có đáp án hay lời giải (NFR-04, SD-04) |
| 4 | Reading đủ 40 câu | Chọn bừa 6 câu, nộp | Đạt: `raw 0/40`, có band (BR-03). Xem lỗi 4.1 về chấm sai |
| 5 | Reading làm lẻ (Passage 1) | Nộp 3 câu | Đạt: band `null`, UI "—", hiện "0/13 câu đúng · band chỉ tính khi làm đủ 40 câu" (BR-03) |
| 6 | Nộp lần hai | POST submit lại cùng attempt | Đạt: trả lại kết quả lần đầu (SD-04) |
| 7 | Bắt đầu / làm tiếp bài | `attempts/start` gọi hai lần | Đạt: trả cùng attempt, không tạo trùng; bài Writing dở từ hôm qua được làm tiếp |
| 8 | Phân quyền | GET attempt của người khác; không token | Đạt: summary/detail trả 404, không token trả 401 |
| 9 | Huỷ lịch sử | DELETE bài dở của mình; DELETE bài đã nộp của mình | Đạt: bài dở 200 (abandoned), bài đã nộp 409 |
| 10 | Writing end to end | Gõ Task 1 và Task 2, nộp, chờ AI | Đạt: xem 2.1 |
| 11 | Listening, Speaking mở được | Mở trang phòng thi | Đạt: Listening có audio và timer, Speaking hiện trang giới thiệu. Chưa test ghi âm |

Quyền ghi trên bài của người khác (POST nộp, DELETE) **không test live** vì nếu kiểm quyền hỏng thì thao tác đó sửa hoặc xoá dữ liệu thật. Mới xác nhận bằng đọc code: `practice_attempt_lifecycle.py:61` kiểm `learner_id`.

### 2.1 Chi tiết Writing

| Hạng mục | Quan sát | Kỳ vọng | Kết quả |
|---|---|---|---|
| Đếm từ | 68 + 64 = 132 (`word_count` server trả 132) | Khớp bộ đếm UI | Đạt |
| Trạng thái sau nộp | `grading` | SD-02 | Đạt |
| Thời gian chấm | ~75 s từ lúc nộp (có khởi động nguội) | ≤ 60 s (NFR-02) | Hơi vượt |
| Điểm Task 1 | TA 5, CC 7, LR 8, GRA 8, trung bình 7.0 | Trung bình 4 tiêu chí | Đạt |
| Điểm Task 2 | 7, 7, 7, 7, trung bình 7.0 | Như trên | Đạt |
| Overall | 7.0 | (T1 + 2·T2)/3 (BR-04) | Đạt |
| DB `evaluations` | 1 dòng, `evaluator_type=ai`, `status=done`, `is_official=true`, `overall_band=7.0` | Đúng 1 kết quả chính thức (BR-08) | Đạt |
| DB `criterion_scores` | 8 dòng | 4 tiêu chí × 2 task | Đạt |
| DB `annotations` | 15 dòng | Có lỗi được đánh dấu | Đạt |
| Trang kết quả | Hiện band, 8 điểm, nhận xét, "Đã chấm" | FR-16, FR-19 | Đạt |

## 3. So sánh trước và sau khi đổi DB

| Hành vi | Trước (`383b0b3`) | Sau (HEAD) | Đánh giá |
|---|---|---|---|
| So khớp đáp án | So thẳng chuỗi, không map chữ cái ↔ nội dung | Giống, thêm xử lý `"C. text"` và dấu ngoặc tuỳ chọn (BR-14) | Lỗi matching (4.1) có từ trước |
| Band L/R | Luôn có band | Chỉ khi đủ 40 câu (BR-03) | Đổi có chủ đích, đạt |
| Nộp lần hai | Chưa kiểm | Trả kết quả lần đầu | Cải thiện |
| Xem bài người khác | 403 | 404 (không lộ sự tồn tại) | Đổi có chủ đích, đạt |
| Lịch sử, band rỗng | `band = 0.0` | `band = 0.0` (`practice_history.py:42`) | Không đổi (lỗi 4.3) |
| Tổng hợp dashboard | `overview_aggregator.py` | Cùng file, không có thay đổi | Không đổi (lỗi 4.2) |
| Tự lưu bài viết | Không có phía backend | Không có | Không đổi (lỗi 4.5) |

## 4. Lỗi và lệch nghiệp vụ

Cả 7 mục đều **có sẵn từ trước** hoặc đã ghi trong `source-of-truth.md` §12, trừ khi ghi chú khác.

### 4.1 Chấm sai câu matching (nghiêm trọng)

- **Triệu chứng:** bài Reading "Test 10", câu 1 và 4 chọn B và C, đúng với "the beta wolf" và "the tester wolf", nhưng `is_correct = false`.
- **Nguyên nhân:** UI lưu chữ cái option (`B`). `question_keys.accepted_answers` lưu nội dung (`{"the beta wolf"}`). `lr_answer_matching.is_correct` so thẳng chuỗi nên không bao giờ khớp. Dữ liệu `legacy.question_answer_keys` cũng lưu nội dung, và code cũ so y hệt.
- **Phạm vi:** mọi câu matching dạng `matching_features`; dạng True/False/Not Given thì đáp án có cả `B` lẫn `"B. False"` nên không bị. Chưa kiểm matching headings và multiple choice.
- **Đề xuất:** khi chấm, nếu câu có `options_pool` và đáp án người dùng là một `key` thì đổi sang `text` tương ứng trước khi so (`lr_grading_service.py`). Hoặc importer lưu thêm chữ cái vào `accepted_answers`. Thêm test.

### 4.2 Dashboard tính Overall sai

- **Triệu chứng:** Overall 5.5 trong khi chỉ có Writing 7.0. Overall không đổi sau khi thêm bài Reading 0.
- **Nguyên nhân:** `overview_aggregator.py` thay kỹ năng chưa có điểm bằng band đầu vào (Speaking → 4.0) và lọc band 0 ra khỏi trung bình. Kết quả (7.0 + 4.0)/2 = 5.5.
- **Vi phạm:** BR-02 (Overall = trung bình 4 kỹ năng), BR-12 (ít hơn 2 bài thì "chưa đủ dữ liệu").

### 4.3 Lịch sử trả `band = 0` cho bài chưa có band

- **Triệu chứng:** `/student/history` trả `band: 0` cho bài Reading lẻ (DB `lr_band = null`) và bài Speaking đang làm dở.
- **Vị trí:** `practice_history.py:42` (`float(band) if band is not None else 0.0`).
- **Vi phạm:** BR-03. Nên trả `null` để UI hiện "—".

### 4.4 Số liệu cứng trong frontend

Hiện cho account chưa có dữ liệu thật, trông như số thật:

| Nội dung | Vị trí |
|---|---|
| "Sentence Completion 30/40", "MCQ 18/25"... | `components/exam/history/PracticeQuestionTypeAccuracyCard.tsx:21` |
| Speaking 4.0 trên biểu đồ (`?? 5.0`) | `components/learning-profile/OverviewChartsSection.tsx:37` |
| Ngày thi mặc định 2026-12-31 | `components/learning-profile/GoalSetterModal.tsx:24` |

### 4.5 Không tự lưu bài viết

- Gõ nháp, đợi 16 s, tải lại thì mất chữ; không có request ghi nào lên server.
- Frontend chỉ lưu nháp Listening vào `localStorage`; backend không có endpoint lưu nháp.
- Vi phạm NFR-03 và FR-11 (tự lưu mỗi 10–15 s).

### 4.6 Không cảnh báo thiếu từ khi nộp

- Task 1 mới 68/150 từ, Task 2 mới 64/250 từ vẫn nộp thẳng, không có cảnh báo.
- BR-06 yêu cầu cảnh báo (vẫn cho nộp).

### 4.7 Listening lộ transcript trước khi nộp

- API `GET /tests/{id}/content` trả `passage_text` chứa toàn bộ `transcripts` của Listening ngay khi vào bài.
- Vi phạm FR-14. Đã ghi trong `source-of-truth.md` §12.

### Ghi chú khác (không phải lỗi DB)

- AI chấm Task 1 chỉ 68 từ vẫn cho LR 8.0 và GRA 8.0. Đây là chất lượng prompt chấm của AI engine.
- Chưa dùng Realtime, frontend polling 5 s (đã ghi §12).
- Trang kết quả hiện "Task 1 · pie_chart". Đề chỉ ghi "chart" nên chưa biết loại biểu đồ thật; chưa đối chiếu với ảnh đề.

## 5. Dữ liệu test đã tạo trên DB

| Đối tượng | Chi tiết |
|---|---|
| Reading "Test 10" đủ 40 câu | attempt `2384fa4e…`, scored, 0/40 |
| Reading "Test 10" Passage 1 | attempt `eb5d2d0a…`, scored, 0/13 |
| Writing "Social media usage by age" | attempt `5dfcfec7…` (bài dở từ 2026-11-02 được ghi đè bằng bài test), scored, band 7.0 |
| Writing "Industrial area" | attempt đã huỷ (abandoned) |

Các bài trên làm lệch thống kê của account `sinhdangphuoctruong@gmail.com`. Chưa xoá.

## 6. Tái chạy test

Script Playwright nằm trong thư mục scratchpad của phiên (`/tmp/claude-1000/.../scratchpad/uitest/`), không nằm trong repo. Chrome mở bằng profile riêng, cổng 9411, cần đăng nhập tay một lần.

## 7. Câu hỏi còn mở

- Có sửa lỗi 4.1 ngay không? File nằm ngoài `backend/app/ai`, cần được phép.
- Test tiếp Expert và Admin bằng cách nào: bạn cung cấp tài khoản, hay tạo user test qua psql?
- Lỗi 4.2, 4.3, 4.4, 4.6: sửa hay ghi vào `source-of-truth.md` §12 như điểm lệch đã biết?
- Cách xử lý dữ liệu test ở mục 5: giữ, hay dọn?
- Nhãn "pie_chart" ở mục 4 có đúng với ảnh đề Task 1 không? Cần xem ảnh đề để biết.

## 8. Thay đổi sau báo cáo: huỷ bài làm dở

Yêu cầu: Practice làm dở thì xoá được; Mock làm dở mà thoát ra thì tính là abandon.

| Phần | Thay đổi |
|---|---|
| Backend `practice_history.py` | `abandon_attempt` → `discard_attempt`. Practice `in_progress`: xoá hẳn dòng (cascade `attempt_sections`, `answers`). Mock `in_progress`: `abandoned`. Bài đã nộp: 409. Chỉ xoá khi vẫn `in_progress` và đúng chủ |
| Backend `analytics.py` | `DELETE /student/history/{id}` trả thêm `data.outcome` = `deleted` hoặc `abandoned` |
| Frontend `discardAttempt()` | Service mới, nuốt lỗi để thoát phòng thi không bị kẹt |
| Frontend 4 workspace + 4 page | Mode `exam`: nút "Hủy bài & Thoát" gọi `onAbandon` trước khi rời trang |
| Frontend trang lịch sử | Nút thùng rác ở bài Practice đang làm dở, hỏi xác nhận, ẩn ngay rồi nạp lại |
| Frontend `useExamWorkspaceContent.ts` | Sửa lỗi: StrictMode (dev) làm `attemptId` luôn `null` vì chặn theo `mounted` |
| `source-of-truth.md` | §6 máy trạng thái, §12 hành vi |

Đã kiểm tra: API (practice xoá hẳn trong DB, không còn `answers` mồ côi; mock `abandoned`, gọi lại vẫn 200; đã nộp 409), UI (thoát phòng thi Mock → DELETE → `abandoned`; thùng rác ở lịch sử → dòng biến mất), `tsc` sạch, pytest 23 pass.

### 8.1 Quy tắc hết giờ (đã chốt)

| Chế độ | Thoát chủ động | Hết giờ |
|---|---|---|
| Thi thử (mock) | `abandoned` | Tự nộp (frontend đếm lùi; server nhận nếu trễ ≤ 30 s, từ chối 409 nếu trễ hơn, BR-07) |
| Luyện tập (practice) | Xoá hẳn nếu đang dở (người học tự xoá ở lịch sử) | **Không áp dụng**: không giới hạn giờ (FR-09), `deadline_at = null` |

Đã kiểm tra server: nộp trễ 10 s → 200, trễ 60 s → 409.

Lỗi tìm thấy khi kiểm tra: đồng hồ Listening thi thử ở frontend là 4 section × 8 phút = 32 phút, nhưng deadline server là 30 phút, nên bài tự nộp lúc hết giờ bị 409 và mất bài. Đã sửa `ListeningWorkspace.tsx` thành 30 phút cho 4 section (chưa test lại bằng UI). Reading (60) và Writing (60) vốn khớp.

Giới hạn còn lại:

- Đóng tab hoặc mất mạng giữa phòng thi Mock thì không gọi được API, bài vẫn `in_progress` (chưa có cron tự nộp hoặc tự abandon quá hạn như SD-05).
- `attempts/start` vẫn trả lại bài `in_progress` cùng đề dù khác mode: Practice dở rồi vào Mock sẽ nhận lại bài Practice (không có deadline).
- Bài đã `abandoned` trước thay đổi này vẫn giữ nguyên, chưa dọn.

## 9. Test chức năng Admin (2026-11-03)

> Bản đầy đủ và các lần test bổ sung (CMS, publish, archive, BR-10, quy đổi band, lỗi 500): xem `docs/ui-test-report-admin.md`.

Tài khoản: Admin test do người dùng tạo bằng SQL (`admin@example.com`), đăng nhập tay trong Chrome Playwright.

| Chức năng | Kết quả |
|---|---|
| 5 trang `/admin/statistics`, `users`, `tests`, `topics`, `settings` | Đạt: tải được, không lỗi API hay console |
| Thống kê | Đạt: 28 user = `profiles`; 74 bài viết = 21 `essays` + 53 `free_essays`; lỗi AI 28,57% = 6 failed / 21 `grading_runs` |
| Bảng quy đổi band Reading | Đạt: 17 dòng, đúng thang Cambridge (39–40 = 9 … 0 = 0) |
| Người dùng: lọc role, tìm kiếm | Đạt: Expert 10, Admin 10, Learner 8 khớp DB; tìm "sinhdang" ra 1 dòng |
| Khoá, mở khoá user | Đạt: 200, `profiles.is_active` đổi, đồng bộ ban Supabase Auth OK, ghi `audit_logs` (`lock_user`, `unlock_user`) |
| Tự khoá chính mình | Đạt: 400. User không tồn tại: 404 |
| Soạn đề nháp | Đạt: title ngắn 422; tạo 201; sửa 200; nháp hiện trong danh sách; xoá 200, sau đó 404 |
| BR-19 | Đạt: `origin = ai_generated` → 400 |
| Admin bắt đầu làm bài | Đạt theo thiết kế hiện tại: 403 (chỉ Learner làm bài) |
| Không token | Đạt: 401 ở 4 endpoint thử; kiểm tĩnh mọi route trong `admin*.py` đều có `require_admin` |

Chưa test: publish và archive đề, tạo Expert hoặc Admin, import đề, upload media, chạy lại AI, giao lại Expert, và Learner gọi API Admin (lúc test chỉ có token Admin; mới kiểm tĩnh).

Điểm lệch và lưu ý:

1. **`/admin/topics` quản lý bảng `topics`** (tính năng Chấm bài tự do, 42 mục, có mục trùng như "Technology and Social Isolation"), không phải đề Writing/Speaking như tiêu đề trang. Nút "Thêm đề thi mới" tạo topic, không tạo đề trong `tests`. Liên quan câu hỏi mở "bỏ hay giữ topics".
2. **6 lượt chấm lỗi không có nguyên nhân**: `grading_runs` có `error`, `model`, `trace_id` đều trống, nên Admin không chẩn đoán được (FR-30, NFR-05; đã ghi §12).
3. **"Tổng bài viết" lẫn hai nguồn** (`essays` + `free_essays`); biểu đồ "xu hướng nộp bài" đếm mọi kỹ năng. Hai chỉ số không cùng đơn vị.
4. Dữ liệu test để lại: Admin `admin@example.com` (mật khẩu yếu), user `uitest_1793711233@gmail.com`, các dòng `audit_logs` do thao tác test. Dòng xoá Admin ở cuối file SQL còn ghi email cũ `ui_test_admin@example.com`.
