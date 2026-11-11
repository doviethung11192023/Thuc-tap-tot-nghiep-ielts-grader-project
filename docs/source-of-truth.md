# IELTS Grader: tài liệu gốc (source of truth)

> **Đọc file này trước khi lập kế hoạch hoặc viết code.** Đây là tài liệu gốc về **nghiệp vụ, dữ liệu và kiến trúc** của dự án.
> Nguồn: báo cáo KLTN (Google Doc `1BRyY02zIOvLxWZB40OAMFA_qHxT5pDDkiULd7q55Gbw`, bản ngày 2026-11-02) và bộ sơ đồ `~/Downloads/Tat-ca-so-do-drawio/` (drawio + png).
> Báo cáo mới xong giai đoạn **phân tích và thiết kế**; chương IV (cài đặt, kiểm thử) còn trống. Phần §12 ghi **trạng thái code thực tế** và chỗ lệch so với thiết kế.

---

## 0. Thứ tự ưu tiên khi các nguồn mâu thuẫn

1. **Chỉ thị mới nhất của người dùng trong chat** (đã được lưu vào memory), ví dụ: prompt chỉ lưu trên Langfuse.
2. **File này** (tóm tắt báo cáo + sơ đồ, kèm các quyết định đã chốt ở §11).
3. Nội dung chữ trong báo cáo, rồi đến sơ đồ drawio (khi chữ và sơ đồ lệch nhau thì theo chữ, xem §11).
4. Code hiện có. Code lệch thiết kế thì coi là **nợ chuyển đổi**, không phải chuẩn (xem §12).
5. `ARCHITECTURE.md` và `README.md` cũ: **đã lỗi thời** (còn nhắc LangGraph, Arize Phoenix, bảng `topics`...). Không dùng để ra quyết định.

Khi sửa thiết kế (thêm FR, BR hay bảng mới), cập nhật file này **cùng commit** với code. Mã định danh (FR-xx, UC-xx, BR-xx, ADR-xx) **không bao giờ đánh lại số**; chỗ nhảy số là do đã gộp.

---

> **Cách đọc mã:** FR, NFR, BR, ADR, UC, SD là số hiệu trong báo cáo và sơ đồ, giữ lại ở các bảng định nghĩa để đối chiếu. Ở các mục trạng thái và câu hỏi (§11–§13) và trong tài liệu cho nhóm, quy tắc được gọi bằng tên chức năng.

## 1. Tổng quan

- **Sản phẩm:** web luyện thi **IELTS Academic** (responsive, không có app mobile). AI chấm bài luyện tập; Expert (giáo viên) cho điểm chính thức cho bài thi thử (Mock).
- **Hai khái niệm trung tâm:** mỗi lần làm bài là một **Attempt**; mỗi lần chấm (AI hoặc Expert) là một **Evaluation**. Kết quả **không bao giờ bị ghi đè**: chấm lại sẽ tạo bản ghi mới.
- **Chấm điểm theo kỹ năng:**

| Kỹ năng | Cách chấm |
|---|---|
| Listening, Reading | Tự động so với đáp án (40 câu) |
| Writing | LLM chấm 4 tiêu chí: TA/TR, CC, LR, GRA. Task 1 có đọc ảnh biểu đồ |
| Speaking | Phòng thi có AI examiner phát câu hỏi, ghi âm, rồi xử lý tiếng nói. LLM chấm FC, LR, GRA; P do code tính từ âm thanh, LLM chỉ viết nhận xét (ADR-21) |

- **Practice:** điểm AI là kết quả; người học có thể xin Expert chấm lại. **Mock:** điểm Expert là chính thức; trong lúc chờ, điểm AI hiện kèm nhãn "preliminary".
- **AI không bao giờ tạo đề bài** (BR-19, ADR-16). TTS chỉ đọc câu hỏi do người viết. Tài liệu hỗ trợ theo đề (đáp án số liệu Task 1, dàn ý, bài mẫu Writing) do AI soạn nháp phải được Admin duyệt trước khi dùng (sửa 2026-11-11, ADR-30).

### Phạm vi (MoSCoW)

| Mức | Chức năng |
|---|---|
| Must (MVP) | Đăng ký/đăng nhập, phân quyền theo vai trò; mục tiêu cá nhân; dashboard + lộ trình (luật kết hợp mô hình năng lực, ADR-23); soạn đề (5 dạng câu hỏi), duyệt, publish, archive, import file; bộ đề Mock; L/R Practice + Mock chấm tự động; Writing chấm AI (cả Task 1 có biểu đồ); Speaking trong phòng thi có AI examiner; lịch sử, đáp án, lời giải; Expert chấm Mock và chấm lại theo yêu cầu, có đánh dấu lỗi; dashboard Admin, giám sát chấm AI, audit log |
| Should | (không còn mục nào sau khi bỏ Mock 4 kỹ năng một lượt) |
| Could | Phản hồi phát âm theo từng âm vị; câu hỏi Diagram/Map labelling; MFA cho Admin; audio Listening nhiều giọng bằng TTS từ kịch bản do người viết |
| Later | Thông báo qua email; General Training; AI examiner hỏi thêm câu |
| Won't | Mock đủ 4 kỹ năng trong một lượt (bỏ ngày 2026-11-08: Mock chỉ từng kỹ năng, Learner muốn thi đủ 4 kỹ năng thì tự làm lần lượt 4 bài Mock); AI tạo đề; tự xây video call; buổi Speaking trực tiếp với Expert (FR-25, UC-13, UC-17; bỏ ngày 2026-11-08, báo cáo ghi là hướng phát triển); Learner khiếu nại điểm Expert; kiểm tra trình độ Expert; thanh toán, gói premium; app native; cam kết điểm AI bằng điểm giám khảo |

### Giả định

- Mỗi tài khoản có **đúng một vai trò**: Learner, Expert hoặc Admin.
- LLM là Qwen (DashScope API). Mô hình giọng nói và TTS là mã nguồn mở. Nhóm **không tự huấn luyện** mô hình nào.
- Quy mô: bản demo vài trăm tài khoản; thiết kế cho 1.000 người dùng hoạt động mỗi ngày (DAU).
- Điểm nghẽn là **năng lực của Expert** (3–10 người), không phải máy chủ; điều tiết bằng quota tuần (BR-15, BR-16).

### Vai trò

| Vai trò | Mục tiêu | Số lượng (demo) |
|---|---|---|
| Learner | Luyện 4 kỹ năng; biết band hiện tại, khoảng cách tới mục tiêu và nên luyện gì tiếp | 100–300 |
| Expert | Chấm và nhận xét bài Writing/Speaking được giao | 3–10 |
| Admin | Soạn và duyệt đề, quản lý tài khoản và cấu hình, giám sát chấm AI | 1–2 |

Actor ngoài hệ thống: Supabase Auth, LLM (Qwen), STT, TTS. Guest chỉ được đăng ký. User là actor trừu tượng (đăng nhập, đăng xuất, sửa hồ sơ).

**Nguồn yêu cầu chấm cho Expert:**

| Nguồn | Khi nào tạo yêu cầu | Điểm chính thức |
|---|---|---|
| Mock | Tự động khi nộp bài Mock có W/S (UC-32), trong quota BR-15 | Điểm Expert; trong lúc chờ, điểm AI ghi "preliminary" |
| Practice | Learner xin chấm lại bài đã có điểm AI (UC-12), trong quota BR-16 | Điểm AI cho tới khi có điểm Expert |

Expert **nhận sẵn** đề, bài làm, điểm và nhận xét của AI, rồi sửa lại thay vì chấm từ đầu (áp dụng cho cả Writing và Speaking; chốt 2026-11-08). Expert chấm được mọi kỹ năng, không phân chuyên môn. Điểm Expert không ghi đè điểm AI. Vì Expert thấy điểm AI trước, điểm Expert **không phải phép đo độc lập**: Chương IV đánh giá AI bằng tỉ lệ bài Expert phải sửa, mức sửa trung bình theo tiêu chí và loại lỗi bị sửa, không trình bày như hai người chấm độc lập.

---

## 2. Yêu cầu chức năng (FR)

| Mã | Nhóm | Yêu cầu |
|---|---|---|
| FR-01 | Tài khoản | Learner đăng ký bằng email và xác minh email (Supabase Auth) |
| FR-02 | Tài khoản | Đăng nhập, đăng xuất, quên mật khẩu, đổi mật khẩu cho mọi vai trò |
| FR-03 | Tài khoản | Admin tạo tài khoản Expert; Expert kích hoạt qua link mời |
| FR-04 | Tài khoản | Admin khoá/mở khoá Learner và Expert |
| FR-05 | Tài khoản | Phân quyền theo vai trò và theo quyền sở hữu dữ liệu |
| FR-06 | Mục tiêu | Band mục tiêu tổng, band mục tiêu từng kỹ năng, ngày thi dự kiến |
| FR-07 | Dashboard | Band hiện tại từng kỹ năng, khoảng cách tới mục tiêu, số ngày còn lại, lịch sử, biểu đồ tiến bộ |
| FR-08 | Dashboard | Lộ trình (BR-17, ADR-23): 1 kỹ năng ưu tiên, điểm yếu (dạng câu L/R theo mô hình năng lực Elo; tiêu chí và dạng task W/S), 3 gợi ý bắt đầu được ngay, 1 câu lý do sinh theo mẫu. Chỉ dùng luật và mô hình năng lực, không dùng LLM. **Tính lúc xem, không lưu** |
| FR-09 | Practice | R/L: làm cả đề hoặc chọn phần, không giới hạn giờ, được dừng và tua audio, xem đáp án ngay sau khi nộp |
| FR-10 | Mock | Mock **từng kỹ năng** (mỗi lần 1 bài, 1 attempt); **Learner chỉ chọn kỹ năng, hệ thống chọn ngẫu nhiên một đề trong bộ đề Mock mà Learner chưa từng làm**, hết đề thì từ chối, không lặp đề (chốt 2026-11-09). Hệ thống không có lượt thi 4 kỹ năng liền nhau; Learner muốn thi đủ 4 kỹ năng thì tự làm lần lượt từng bài (chốt 2026-11-08); đồng hồ do server giữ; audio Listening phát 1 lần (server ghi lại lượt phát) |
| FR-11 | Mock | Tự lưu đáp án và bài viết **lên server** (cả Practice); làm tiếp được sau khi mất mạng, tải lại trang, đóng tab hoặc khởi động lại máy, kể cả trên máy khác |
| FR-12 | Mock | Tự nộp khi hết giờ, kể cả khi Learner không còn mở trang (BR-21) |
| FR-13 | Chấm | Chấm R/L bằng so khớp đáp án đã chuẩn hoá (BR-14); chỉ quy ra band khi làm đủ 40 câu (BR-03) |
| FR-14 | Kết quả | Đáp án, lời giải, transcript Listening sau khi nộp; Writing: bài mẫu đã duyệt của đề, và với Task 1 có đáp án đã duyệt thì danh sách ý chính (có nhắc tới, đúng số liệu) (2026-11-11, ADR-30) |
| FR-15 | Writing | Viết và nộp Task 1, Task 2 hoặc cả hai (Practice cho làm 1 task), đếm từ theo thời gian thực |
| FR-16 | Writing | AI chấm 4 tiêu chí mỗi task, có nhận xét, đánh dấu lỗi trong bài và mức chỉ số con mỗi tiêu chí (kẹp theo band); Task 1 chấm theo đáp án số liệu đã duyệt, chưa có thì đọc ảnh biểu đồ; bài nộp trùng y nguyên lần chấm đầu dùng lại kết quả cũ (2026-11-11, ADR-30) |
| FR-17 | Speaking | Phòng thi: phát câu hỏi, ghi âm trong giới hạn thời gian, tự chuyển câu; Part 2 có cue card và 1 phút chuẩn bị |
| FR-18 | Speaking | STT, đo độ trôi chảy và phát âm, AI chấm 4 tiêu chí; kết quả từng câu có lỗi ngữ pháp/từ vựng gạch chân theo vị trí, từ có thể phát âm chưa rõ (nghe lại được), điểm mạnh và bài nâng cấp (spec 007, ADR-31) |
| FR-19 | Chấm | Hiện trạng thái chấm (đang chấm, chờ Expert, xong, lỗi) và cập nhật ngay khi có kết quả |
| FR-20 | Expert | Learner xin Expert chấm lại bài W/S Practice đã có điểm AI, trong quota (BR-16) |
| FR-21 | Expert | Expert bật/tắt trạng thái Available |
| FR-22 | Expert | Tự giao cho Expert Available đang ít việc nhất; Admin giao lại thủ công; giữ lịch sử mọi lần giao |
| FR-23 | Expert | Expert xem đề, bài làm, audio, điểm và nhận xét AI; sửa band, nhận xét và lỗi đã đánh dấu (bản nháp chép sẵn từ bản AI); Speaking có nhận xét gắn vào thời điểm trong audio |
| FR-24 | Expert | Xem lịch sử chấm |
| FR-25 | Expert | (Won't) Lên lịch và tổ chức buổi Speaking trực tiếp |
| FR-26 | CMS | Soạn đề 5 dạng câu hỏi MVP: editor theo từng dạng, bài đọc, audio, ảnh, xem trước như Learner. Writing: tài liệu theo đề (đáp án số liệu Task 1, dàn ý, bài mẫu) AI soạn nháp, Admin sửa và duyệt, làm được cả với đề đã publish; dàn ý hiện khi làm Practice (2026-11-11, ADR-30) |
| FR-27 | CMS | Soạn, duyệt, kiểm tra trước khi publish, quản lý phiên bản, nguồn và giấy phép; archive đề không dùng |
| FR-28 | Admin | Dữ liệu tham chiếu: bảng quy đổi band, tiêu chí và band descriptor, prompt AI, quota Expert. Prompt sửa ngay trong app: tạo phiên bản mới và đổi label `production` (kể cả quay về bản cũ); prompt vẫn chỉ lưu trên Langfuse (chốt 2026-11-11, UC-22) |
| FR-29 | Admin | Dashboard hệ thống: người dùng, attempt, phân bố band, hoạt động Expert, chênh lệch AI–Expert (mặc định 30 ngày gần nhất; trước hết hiện chênh lệch overall, bấm vào xem chênh lệch từng tiêu chí TA/TR, CC, LR, GRA, FC, P để biết AI lệch ở phần nào; chênh lệch = trung bình trị tuyệt đối và trung bình có dấu của band Expert − band AI trên các bài có cả hai điểm, chốt 2026-11-11); (Should) theo từng Expert: số bài, thời gian chấm trung bình, tỉ lệ quá hạn, mức sửa so với AI |
| FR-30 | Admin | Giám sát chấm AI: danh sách lượt chấm có lọc, lượt lỗi và treo, độ trễ, token, chi phí, link trace Langfuse; badge cảnh báo trên dashboard Admin; chạy lại chấm AI cho một bài hoặc hàng loạt, kể cả bài đã chấm thành công (chốt 2026-11-11, UC-24) |
| FR-31 | CMS | Import đề hàng loạt từ mẫu Excel/JSON, báo lỗi theo từng dòng |
| FR-32 | CMS | Sinh audio câu hỏi Speaking bằng TTS lúc soạn đề; nghe lại, sinh lại, hoặc thay bằng bản ghi âm |
| FR-33 | Expert | Bài Mock có W/S tự tạo yêu cầu cho Expert; điểm Expert là chính thức (BR-08, BR-15) |
| FR-35 | CMS | (Could) Audio Listening nhiều giọng bằng TTS từ kịch bản do người viết |
| FR-36 | CMS | Quản lý bộ đề Mock: gom 4 đề kỹ năng thành 1 bộ. Các bộ đề published tạo thành **kho đề Mock**; đề trong bộ chỉ dùng cho Mock (DB tự đặt `allowed_mode = 'mock'`), không hiện ở danh mục Practice và Learner không xem trước được (chốt 2026-11-09). Bộ đề không tạo lượt thi chung |
| FR-37 | Admin | Xem audit log của Admin và tác vụ tự động: lọc theo actor, hành động, entity, khoảng ngày; chỉ đọc (UC-38) |
| FR-38 | Speaking | Xin đồng ý ghi âm trước lần ghi đầu tiên, nói rõ mục đích dùng và thời gian lưu |
| FR-39 | Expert | Expert trả lại bài được giao kèm lý do, trước khi bấm Start và trong 2 giờ làm việc đầu; bài quay lại hàng đợi ngay và không giao lại cho Expert đó |
| FR-40 | Expert | Learner thấy thời điểm dự kiến có điểm Expert: hạn của assignment nếu đã giao, ước tính từ hàng đợi nếu chưa |
| FR-41 | Expert | (Should) Kho nhận xét của từng Expert để chèn lại vào bài khác |
| FR-42 | Expert | (Should) Sửa band lệch AI từ 1 band trở lên thì Expert ghi lý do ngắn; lý do chỉ Expert và Admin thấy |
| FR-43 | Admin | Đặt, sửa, xoá kỳ nghỉ lễ của Expert: trong kỳ nghỉ hệ thống ngừng nhận yêu cầu Expert, ngừng giao bài và lùi hạn của bài đang giao (BR-22) |
| FR-44 | Admin | Theo dõi token và chi phí AI theo ngày, tháng, model, kỹ năng; ngân sách tháng do Admin đặt, đạt 80% và 100% thì hiện badge cảnh báo. Chỉ cảnh báo, không chặn chấm (chốt 2026-11-11) |

## 3. Yêu cầu phi chức năng (NFR)

| Mã | Nhóm | Mục tiêu đo được |
|---|---|---|
| NFR-01 | Hiệu năng | API thường: p95 < 500 ms ở 20 rps; kết quả R/L < 1 s |
| NFR-02 | Hiệu năng AI | Writing ≤ 60 s, Speaking ≤ 120 s (p90, tải bình thường) |
| NFR-03 | Độ tin cậy | Mất mạng không mất bài: tự lưu mỗi 10–15 s và mỗi lần đổi câu |
| NFR-04 | Bảo mật | HTTPS; mật khẩu do Supabase Auth quản lý; Core API kiểm quyền cho mọi thao tác nghiệp vụ; RLS trên mọi bảng; không gửi đáp án xuống client trước khi nộp |
| NFR-05 | Truy vết AI | Mỗi `grading_run` (một task Writing hoặc một bài Speaking) có đúng một trace Langfuse, `session_id = attempt_id`; mỗi lần gọi LLM trong lượt đó (4 tiêu chí, phân loại đề, thử lại, hỏi lại khi JSON sai) là một generation của trace. `grading_runs` lưu model, prompt version, `trace_id`, tổng token và chi phí (tính cả lần thử lại), độ trễ thực (`finished_at − started_at`), lỗi (ADR-29) |
| NFR-06 | Minh bạch | Mọi điểm AI có nhãn "estimate"; điểm AI của bài Mock đang chờ Expert có nhãn "preliminary" |
| NFR-07 | Riêng tư | Xin đồng ý xử lý giọng nói (nói rõ dữ liệu lưu ở nước ngoài); tự xoá audio Speaking sau 180 ngày; trace Langfuse giữ 90 ngày; `output` và `error` của lượt chấm lỗi giữ 180 ngày; `output` của lượt chấm thành công theo vòng đời attempt; số liệu lượt chấm (model, token, chi phí, độ trễ, trạng thái) giữ lâu dài (ADR-29); tuân thủ Nghị định 13/2023/NĐ-CP |
| NFR-08 | Tương thích | Chrome, Edge, Firefox bản mới; ghi âm cần HTTPS và quyền micro |
| NFR-09 | Bảo trì | Test tự động phủ ≥ 60% module chấm điểm và phân quyền; API mô tả bằng OpenAPI |
| NFR-10 | Triển khai | Phần tự host (Core API, worker, AI engine, Redis) chạy bằng Docker Compose; schema dựng từ các file SQL đánh số; dựng môi trường mới từ clone trong < 30 phút |
| NFR-11 | An toàn dữ liệu | Dùng anon key hoặc JWT người dùng thì không ghi được bảng nào và chỉ đọc được dữ liệu được phép; có test tự động |

## 4. Quy tắc nghiệp vụ (BR): bắt buộc tuân thủ trong code và DB

| Mã | Quy tắc |
|---|---|
| BR-01 | Band từ 0 đến 9, bước 0.5 |
| BR-02 | Overall = trung bình 4 kỹ năng, làm tròn: phần lẻ < .25 thì xuống; từ .25 đến < .75 thành .5; từ .75 thì lên band nguyên kế tiếp. Trên dashboard, overall chỉ tính khi cả 4 kỹ năng có band hiện tại (BR-12); thiếu kỹ năng nào thì hiện "chưa đủ dữ liệu" |
| BR-03 | Band L/R quy đổi từ số câu đúng /40 theo bảng Academic lưu trong DB, **chỉ khi đủ 40 câu**; nếu không thì hiển thị "x / y đúng" |
| BR-04 | Writing: mỗi task = trung bình 4 tiêu chí (TA/TR, CC, LR, GRA); **Task 2 nặng gấp đôi Task 1**: (T1 + 2·T2)/3, làm tròn 0.5. Practice làm 1 task thì lấy band của task đó |
| BR-05 | Speaking = trung bình 4 tiêu chí (FC, LR, GRA, P) |
| BR-06 | Task 1 < 150 từ hoặc Task 2 < 250 từ: cảnh báo khi nộp (vẫn cho nộp); số từ được gửi cho AI để trừ điểm TA/TR |
| BR-07 | Giờ Mock: L 30', R 60', W 60', S 11–14'. Server từ chối đáp án đến muộn hơn deadline 30 s. Listening Mock phát 1 lần, không dừng, không tua; Practice thì cho cả hai. Mất kết nối, đóng tab hay khởi động lại máy **không dừng đồng hồ**; quay lại trước hạn thì làm tiếp phần còn lại (chốt 2026-11-08) |
| BR-08 | Điểm Expert không ghi đè điểm AI; lưu và hiện cả hai. Mỗi attempt có **đúng 1 kết quả chính thức**: điểm Expert nếu có, nếu không thì điểm AI (riêng bài Mock đang chờ Expert thì điểm AI chỉ là "preliminary"). Chạy lại AI không thay được điểm Expert |
| BR-09 | Không giới hạn số lần chấm AI mỗi ngày; chống lạm dụng bằng rate limit theo user và bắt buộc xác minh email |
| BR-10 | Đề đã publish không sửa trực tiếp; sửa thì tạo phiên bản mới, attempt cũ vẫn trỏ về phiên bản cũ |
| BR-11 | Mỗi yêu cầu có tối đa 1 assignment đang mở, giao cho Expert Available chưa đạt tải tối đa, không giao lại cho Expert đã trả lại hoặc để quá hạn chính yêu cầu đó. Chỉ giao khi lượt chấm AI đã xong hoặc đã lỗi (lỗi thì Expert chấm từ bản trống). Hạn là **48 giờ làm việc**: chỉ đếm thứ Hai đến thứ Sáu theo giờ Việt Nam, ngày lễ rơi vào ngày thường vẫn tính, trừ giờ nằm trong kỳ nghỉ do Admin đặt (BR-22) (giao 15:00 thứ Sáu thì hạn 15:00 thứ Ba; giao thứ Bảy thì bắt đầu đếm từ 00:00 thứ Hai). Quá hạn thì assignment kết thúc và yêu cầu quay lại hàng đợi |
| BR-12 | Band hiện tại của một kỹ năng = trung bình điểm chính thức của tối đa **3 bài Mock gần nhất** (không tính bài đang chờ Expert). Chưa có Mock: trung bình tối đa 5 bài Practice gần nhất có band. Gắn nhãn "độ tin cậy thấp" khi chưa có Mock hoặc chỉ có 1 bài. Chưa có bài nào có band: "chưa đủ dữ liệu" (từ 2026-11-08 ngưỡng hạ từ 2 bài xuống 1 bài để người mới thấy band sớm). L/R chỉ có band khi làm đủ 40 câu (BR-03); làm từng phần không tính vào band nhưng vẫn cập nhật mô hình năng lực (BR-17). Band Learner tự nhập lúc đặt mục tiêu không phải band hiện tại |
| BR-13 | Speaking: Part 1 mỗi câu tối đa 45 s; Part 2 chuẩn bị 60 s, nói tối đa 120 s; Part 3 mỗi câu tối đa 90 s. Hết giờ thì dừng ghi và sang câu tiếp. Mock: phát 1 lần, không dừng, không ghi lại. Thời gian lưu theo từng part, Admin sửa được |
| BR-14 | Chấm L/R: không phân biệt hoa thường; bỏ khoảng trắng thừa; đúng nếu khớp bất kỳ đáp án nào trong danh sách; từ trong ngoặc là tuỳ chọn ("(the) library" chấp nhận "the library" và "library"); vượt giới hạn số từ thì 0 điểm; nhóm "Choose N letters" mỗi lựa chọn đúng tính 1 lần; 1 điểm/câu, không trừ điểm |
| BR-15 | Mock có W/S tự tạo yêu cầu Expert. Mỗi Learner tối đa **2 bài Mock được Expert chấm mỗi tuần** (cấu hình được). **Đếm theo bài**: mỗi attempt Writing hoặc Speaking là 1 lượt. Tuần là **tuần lịch** (từ 00:00 thứ Hai, giờ Việt Nam), tính theo lúc bắt đầu bài. Lượt được **giữ chỗ khi bắt đầu** attempt W/S nếu còn quota, còn suất chung (BR-20) và không nằm trong kỳ nghỉ lễ của Expert (BR-22); bài bỏ dở (`abandoned`) thì nhả chỗ; nộp bài thì tạo yêu cầu. Đã tạo yêu cầu thì **không hoàn** lượt. Không giữ được chỗ thì bài vẫn làm được nhưng chỉ có điểm AI, và phải báo trước khi bắt đầu |
| BR-16 | Learner xin Expert chấm lại tối đa **3 bài Practice mỗi tuần lịch** (cấu hình được), tính theo lúc gửi yêu cầu; mỗi attempt tối đa 1 yêu cầu đang mở. Yêu cầu đã gửi thì **không hoàn** lượt, kể cả khi Learner huỷ |
| BR-17 | Lộ trình (thuật toán ở §8 "Lộ trình học", ADR-23). **Kỹ năng ưu tiên:** kỹ năng chưa có band xếp đầu (gợi ý bài chẩn đoán), nhiều kỹ năng thiếu thì theo thứ tự L, R, W, S; còn lại chọn khoảng cách (mục tiêu − hiện tại) lớn nhất, hoà thì band thấp hơn, hoà nữa theo thứ tự L, R, W, S; chưa đặt mục tiêu từng kỹ năng thì dùng mục tiêu tổng. **Điểm yếu:** L/R là dạng câu có mức thành thạo Elo thấp nhất trong các dạng đã trả lời ≥ 6 câu (không dạng nào đủ thì không nêu điểm yếu); W/S là tiêu chí có trung bình động thấp nhất, Writing thêm dạng đề có band thấp nhất trong các dạng đã làm ≥ 2 bài. **3 gợi ý:** L/R là các phần đề (section) chứa dạng câu yếu, xếp theo xác suất làm đúng dự đoán gần 70% nhất; không có điểm yếu thì gợi ý cả đề; W/S là đề Practice thuộc dạng đề yếu, không có thì đề Practice bất kỳ của kỹ năng đó. Chỉ lấy đề đã publish, chưa làm trong 14 ngày qua; hết thì lấy đề làm lâu nhất. Còn ≤ 14 ngày tới ngày thi và kỹ năng ưu tiên chưa có bài Mock nào trong 14 ngày qua thì gợi ý đầu tiên là 1 bài Mock của kỹ năng đó (đề do hệ thống chọn ngẫu nhiên khi bắt đầu, chỉ gợi ý khi kỹ năng còn đề Mock chưa làm). Gợi ý Practice chỉ lấy đề `allowed_mode` practice/both. Kỹ năng ưu tiên không có đề nào đã publish thì chuyển sang kỹ năng kế tiếp theo cùng luật. Câu lý do sinh theo mẫu. Tính lại mỗi lần xem dashboard |
| BR-18 | Learner chỉ thấy đề đã publish. Mỗi đề lưu loại nguồn (original, open licence, public domain), tên nguồn, giấy phép, và phải được Admin duyệt trước khi publish |
| BR-19 | Không dùng AI để tạo đề bài (đề, ảnh, câu hỏi). TTS chỉ đọc câu do người viết. Tài liệu hỗ trợ chấm và học theo đề do AI soạn (đáp án số liệu Task 1, dàn ý, bài mẫu) phải được Admin duyệt; chưa duyệt thì không dùng để chấm và không hiện cho Learner (chủ dự án sửa 2026-11-11) |
| BR-20 | **Suất Expert chung cả hệ thống** mỗi tuần lịch (`expert_weekly_capacity`, Admin sửa theo sức chấm của Expert). Lượt Mock giữ chỗ và yêu cầu Practice cùng trừ vào suất này. Hết suất: Mock vẫn làm được nhưng chỉ có điểm AI (báo trước khi bắt đầu); yêu cầu Practice bị từ chối với lý do "hết suất tuần này". Mock được ưu tiên khi giao bài (xem luồng giao yêu cầu Expert) |
| BR-21 | **Hết giờ mà chưa nộp: làm bao nhiêu chấm bấy nhiêu.** Hệ thống tự nộp với những gì server đã lưu: L/R chấm đáp án đã lưu, Writing chấm bài đã lưu, Speaking chấm các câu đã upload (không câu nào thì `no_speech`). Bài Mock W/S tự nộp có lượt Expert giữ chỗ: **Learner chọn** gửi Expert (dùng lượt) hay chỉ chấm AI (nhả lượt); chưa chọn tới hết tuần lịch thì coi là chỉ chấm AI. Speaking: câu đang ghi dở lúc gián đoạn chưa có bản ghi nên được hỏi lại một lần khi quay lại, vẫn trong hạn chung của bài |
| BR-22 | **Kỳ nghỉ lễ của Expert** do Admin tự đặt (bắt đầu, kết thúc theo giờ Việt Nam, lý do), có audit log. Trong kỳ nghỉ: (1) **không nhận yêu cầu mới**: yêu cầu Practice bị từ chối với lý do "Expert nghỉ lễ đến <ngày giờ kết thúc>" và không trừ quota; bài Mock W/S bắt đầu trong kỳ nghỉ không giữ chỗ, chỉ có điểm AI và được báo trước khi bắt đầu; bài Mock đã giữ chỗ trước kỳ nghỉ mà nộp trong kỳ nghỉ vẫn tạo yêu cầu và chờ trong hàng đợi; (2) **không giao bài**, kể cả Admin giao lại; yêu cầu đang chờ được giao sau kỳ nghỉ, Mock trước; (3) **hạn lùi lại**: giờ trong kỳ nghỉ không tính vào hạn 48 giờ làm việc (BR-11) và 2 giờ được trả lại bài (FR-39) của assignment đang mở; Expert vẫn được chấm và nộp nếu muốn; (4) thời điểm dự kiến cho Learner (FR-40) tính cả kỳ nghỉ. Các kỳ nghỉ không chồng nhau; kết thúc phải sau bắt đầu; kỳ đã qua không sửa được; kỳ đang diễn ra chỉ sửa được giờ kết thúc (chốt 2026-11-08) |

---

## 5. Use case (38 UC)

| Mã | Use case | Actor | Ưu tiên | FR |
|---|---|---|---|---|
| UC-01 | Đăng ký và xác minh email | Guest, Supabase Auth | Must | FR-01 |
| UC-02 | Đăng nhập, đăng xuất | User | Must | FR-02 |
| UC-03 | Quên và đặt lại mật khẩu («extend» Log in) | User, Supabase Auth | Must | FR-02 |
| UC-04 | Cập nhật hồ sơ | User | Must | FR-05 |
| UC-05 | Đặt mục tiêu IELTS | Learner | Must | FR-06 |
| UC-06 | Xem dashboard và lộ trình | Learner | Must | FR-07, 08 |
| UC-07 | Practice («include» Take a test) | Learner | Must | FR-09, 13, 14 |
| UC-08 | Thi Mock («include» Take a test) | Learner | Must | FR-10–13 |
| UC-09 | Làm Writing và nhận điểm AI | Learner, LLM | Must | FR-15, 16, 19 |
| UC-10 | Làm Speaking với AI examiner và nhận điểm AI | Learner, STT, LLM | Must | FR-17–19 |
| UC-11 | Xem lịch sử, kết quả, đáp án | Learner | Must | FR-07, 14 |
| UC-12 | Xin Expert chấm lại bài Practice («extend» View results) | Learner | Must | FR-20 |
| UC-13 | Đặt lịch Speaking với Expert | Learner | Won't | FR-25 |
| UC-14 | Cập nhật trạng thái Available | Expert | Must | FR-21 |
| UC-15 | Xem bài được giao | Expert | Must | FR-22, 23 |
| UC-16 | Chấm và nhận xét W/S | Expert | Must | FR-23 |
| UC-17 | Tổ chức Speaking trực tiếp | Expert, Learner | Won't | FR-25 |
| UC-18 | Xem lịch sử chấm | Expert | Must | FR-24 |
| UC-19 | Quản lý tài khoản (tạo Expert, khoá/mở khoá) | Admin, Supabase Auth | Must | FR-03, 04 |
| UC-21 | Soạn, duyệt, publish đề | Admin | Must | FR-26, 27 |
| UC-22 | Cấu hình AI và dữ liệu tham chiếu | Admin | Must | FR-28 |
| UC-23 | Xem dashboard hệ thống | Admin | Must | FR-29 |
| UC-24 | Giám sát và chạy lại chấm AI | Admin, LLM | Must | FR-30, 44 |
| UC-25 | Giao lại yêu cầu chấm | Admin | Must | FR-22 |
| UC-26 | Tự nộp khi hết giờ («extend» Take Mock Test) | System | Must | FR-12 |
| UC-27 | AI chấm và nhận xét («include») | LLM | Must | FR-16, 18 |
| UC-28 | Tự giao cho Expert | System | Must | FR-22 |
| UC-29 | Báo kết quả trong app (Realtime) | System | Must | FR-19 |
| UC-30 | Import đề từ file | Admin | Must | FR-31 |
| UC-31 | Sinh audio câu hỏi Speaking bằng TTS («extend» Compose test) | Admin, TTS | Must | FR-32 |
| UC-32 | Tạo yêu cầu Expert cho bài Mock («extend» Take Mock Test) | System | Must | FR-33 |
| UC-34 | Quản lý bộ đề Mock | Admin | Must | FR-36 |
| UC-35 | Đồng ý ghi âm («extend» Take Speaking) | Learner | Must | FR-38 |
| UC-36 | Archive đề | Admin | Must | FR-27 |
| UC-37 | Đánh dấu lỗi trong bài viết («extend» Grade) | Expert | Must | FR-23 |
| UC-38 | Xem audit log | Admin | Must | FR-37 |
| UC-39 | Upload audio và ảnh («extend» Compose test) | Admin | Must | FR-26 |
| UC-40 | Đặt kỳ nghỉ lễ của Expert | Admin | Must | FR-43 |

### Đặc tả các UC lõi (rút gọn)

**UC-06 Dashboard.** Chưa đặt mục tiêu thì yêu cầu đặt trước. Tính band từng kỹ năng theo BR-12 và overall theo BR-02. Hiện khoảng cách tới mục tiêu, số ngày còn lại tới ngày thi, biểu đồ, lịch sử. Thẻ "Bước tiếp theo" áp dụng BR-17: kỹ năng ưu tiên, điểm yếu, 3 gợi ý có nút bắt đầu ngay và 1 câu lý do (ví dụ "Reading thấp hơn mục tiêu 1.0 band; dạng True/False/Not Given bạn làm đúng khoảng 45%", hoặc "Writing thấp hơn mục tiêu 1.0 band; tiêu chí yếu nhất là CC" kèm nhận xét CC ở bài gần nhất). Người mới hoặc kỹ năng chưa có band thì gợi ý bài chẩn đoán. Hết đề chưa làm trong 14 ngày thì nới điều kiện và gợi ý đề làm lâu nhất. Không ghi dữ liệu.

**UC-08 Mock.** Chọn 1 kỹ năng; hệ thống chọn ngẫu nhiên 1 đề Mock của kỹ năng đó mà Learner chưa từng làm (kể cả bỏ dở). Đang có bài Mock dở của kỹ năng đó thì làm tiếp bài đó. Hết đề chưa làm thì báo "đã làm hết đề thi thử của kỹ năng này", không lặp đề cũ, để band Mock luôn là lần gặp đề đầu tiên (BR-12). Không có lượt thi cả bộ; muốn thi đủ 4 kỹ năng thì Learner tự làm lần lượt. Bài W/S hiện số lượt Expert còn lại trong tuần và báo trước bài này có được Expert chấm không (BR-15, BR-20). Mỗi bài là một Attempt với deadline, không tạo `mock_session`. Trả đề **không kèm đáp án**. Tự lưu 10–15 s. Listening phát 1 lần (server ghi lượt phát, từ chối lần 2). Khi nộp: khoá attempt; L/R chấm ngay; W/S tạo job chấm AI và yêu cầu Expert. Ngoại lệ:
- Nộp hai lần thì chỉ lần đầu có hiệu lực.
- Đáp án muộn hơn deadline 30 s bị từ chối.
- Có attempt dở của cùng đề thì phải chọn làm tiếp hoặc huỷ.
- Gián đoạn (treo máy, đóng tab, khởi động lại): vào lại thấy thông báo "bài Mock đang dở, còn X phút" và làm tiếp; đã quá hạn thì thấy "bài đã được nộp tự động lúc …" (BR-21).
- Không giữ được lượt (hết quota, hết suất chung hoặc đang trong kỳ nghỉ lễ của Expert) thì chỉ chấm AI, và điểm AI là chính thức.

**UC-09 Writing.** Practice: Task 1, Task 2 hoặc cả hai. Mock: cả hai. Task 1 phóng to được biểu đồ. Đếm từ, tự lưu. Nộp xong trả về ngay; worker chấm từng task (1 grading run/task, 4 tiêu chí chạy song song, tìm lỗi). Lưu 4 điểm tiêu chí/task và các lỗi, tính band theo BR-04, đánh dấu chính thức nếu chưa có điểm Expert. Trình duyệt nhận kết quả qua Realtime. Hiện nhãn "estimate". Ngoại lệ:
- LLM timeout hoặc lỗi 429/5xx: thử lại 3 lần có backoff; vẫn lỗi thì attempt chuyển `grading_failed` và Admin chạy lại (UC-24).
- JSON sai: hỏi lại tối đa 2 lần.
- Bài viết chứa lệnh nhắm vào AI (prompt injection): đã có biện pháp chặn.
- Không đọc được ảnh (vision lỗi): chấm Task 1 chỉ bằng mô tả dữ liệu và ghi chú trong kết quả.

**UC-10 Speaking.** Xin đồng ý ghi âm (UC-35), rồi kiểm tra micro, rồi tạo Attempt. Part 1, 2, 3 theo BR-13. Mỗi câu trả lời upload thẳng lên R2 bằng presigned URL ngay sau khi ghi; Core API kiểm kích thước và định dạng. Khi nộp, worker gọi AI engine: STT (có timing từng từ), đo fluency và pronunciation, LLM chấm FC/LR/GRA, code tính P từ độ tin cậy nhận dạng và ngữ điệu (ADR-21), band theo BR-05. Ngoại lệ:
- Mất quyền micro: dừng phòng thi, giữ các câu đã ghi.
- Upload lỗi: tự thử lại.
- Sai định dạng: Practice thì ghi lại; Mock thì tính là không trả lời.
- Mọi câu đều im lặng: trạng thái `no_speech`, không gọi LLM.
- Audio giữ 180 ngày rồi tự xoá, trừ bài đang có yêu cầu Expert mở (xoá sau khi yêu cầu kết thúc).

**UC-15 Xem bài được giao.** Danh sách bài đang giao sắp theo hạn, có nhãn Mock/Practice, kỹ năng và cảnh báo khi còn dưới 6 giờ làm việc. Bài mới hiện ngay qua Realtime. Trước khi bấm Start và trong 2 giờ làm việc đầu, Expert được trả lại bài kèm lý do (FR-39): assignment kết thúc `declined`, request về `waiting` và không giao lại cho Expert đó.

**UC-16 Expert chấm.** Mở bài thấy đề, bài làm (Writing: bài viết; Speaking: audio theo từng Part kèm transcript và số đo tiếng nói), mục tiêu của Learner, cùng điểm và nhận xét AI cho 4 tiêu chí và các lỗi AI đã đánh dấu. Bấm Start thì tạo draft evaluation **chép từ bản AI** (điểm, nhận xét, lỗi); lượt chấm AI lỗi thì draft để trống. Expert sửa band và nhận xét từng tiêu chí (Writing theo từng task), thêm, sửa hoặc xoá lỗi (UC-37); Speaking thêm được nhận xét gắn vào thời điểm trong audio; chèn nhận xét từ kho (Should, FR-41); nháp tự lưu. Sửa band lệch AI từ 1 band trở lên thì ghi lý do (Should, FR-42). Submit trong **một transaction**: lưu điểm và lỗi, hoàn tất assignment, đặt Expert evaluation là chính thức, ghi `agrees_with_ai`, chuyển attempt Mock từ `waiting_expert` sang `scored`. Assignment quá hạn, đã bị trả lại hoặc đã bị giao lại thì từ chối submit. Expert bị khoá thì các assignment đang mở kết thúc. Learner không khiếu nại được điểm Expert.

**UC-21 Soạn đề.** Tạo test (tiêu đề, kỹ năng, mode cho phép, thời lượng, nguồn, giấy phép), rồi thêm các phần:
- L/R: bài đọc hoặc transcript, nhóm câu, câu hỏi, lựa chọn, đáp án, lời giải.
- Writing: đề Task 1/2, loại đề, số từ tối thiểu, biểu đồ và mô tả dữ liệu.
- Speaking: part, chủ đề, thời gian, câu hỏi.

Upload media lên R2, rồi TTS chạy nền, rồi xem trước, rồi Publish. Validate trước khi publish: đủ 40 câu L/R; mọi câu có đáp án; đáp án là nhãn lựa chọn có thật; nhóm "Choose N" hợp lệ; đủ audio; Task 1 có biểu đồ; có nguồn và giấy phép. Publish thì ghi reviewer, thời điểm và audit log. Sửa đề đã publish hoặc đã có attempt thì sao thành bản nháp mới.

**UC-30 Import.** Tải mẫu theo kỹ năng, điền, rồi upload file kèm media. Validate như UC-21, xem trước và danh sách lỗi theo dòng/cột, xác nhận thì tạo đề nháp và xếp TTS. Có lỗi thì **không lưu gì**. Trùng nguồn thì cảnh báo và cho tạo phiên bản mới.

**UC-22 Cấu hình AI (phần prompt, chốt 2026-11-11).** Admin xem danh sách prompt theo `prompt_registry.py`: tên, phiên bản đang gắn `production`, các phiên bản khác, model và tham số trong config. Sửa thì tạo **phiên bản mới** trên Langfuse, chưa gắn `production`; không sửa đè phiên bản cũ. Đổi label `production` sang một phiên bản (kể cả quay về bản cũ) là bước riêng, có hộp xác nhận. Validate trước khi lưu: đủ biến bắt buộc của prompt đó, config là JSON hợp lệ, model nằm trong danh sách cho phép. Mỗi lần tạo phiên bản hoặc đổi label ghi `audit_logs` (tên prompt, phiên bản, label trước và sau). Phiên bản mới có hiệu lực sau tối đa 60 s (cache prompt `langfuse_cache_ttl_seconds`); lượt chấm đang chạy giữ phiên bản đã lấy. Ngoại lệ:
- Langfuse lỗi: báo lỗi, không ghi gì, không ghi audit.
- Hai Admin sửa cùng lúc: mỗi người tạo một phiên bản riêng; label theo lần đổi sau cùng; audit có cả hai.

**UC-24 Giám sát và chạy lại chấm AI (chốt 2026-11-11).** Danh sách `grading_runs` mới nhất, lọc theo trạng thái, kỹ năng, khoảng ngày, model, phiên bản prompt. Mỗi dòng có attempt, task, model, phiên bản prompt, token, chi phí, độ trễ, lỗi và link trace Langfuse (ẩn link khi trace đã quá hạn xem của gói Langfuse hoặc đã xoá sau 90 ngày); trang chi tiết thêm `output` và lỗi đầy đủ. Lượt **treo** là lượt còn `grading` quá lease 25 phút. **Badge trên dashboard Admin** (không gửi email) đếm: attempt `grading_failed`, lượt treo, chi phí tháng đạt 80% hoặc 100% ngân sách (FR-44); bấm vào mở danh sách đã lọc sẵn. Trang chi phí: token và chi phí theo ngày, tháng, model, kỹ năng so với ngân sách. Chạy lại:
- Một bài, hoặc hàng loạt (chọn nhiều dòng hoặc theo bộ lọc, tối đa 50 attempt mỗi lần). Được chạy lại cả bài đã chấm thành công, ví dụ sau khi đổi prompt.
- Trước khi xác nhận hiện số bài và chi phí ước tính (chi phí trung bình mỗi lượt của kỹ năng đó trong 30 ngày gần nhất).
- Bỏ qua attempt đang `grading`, `no_speech`, hoặc bài Speaking đã xoá audio; trả về danh sách bị bỏ qua kèm lý do.
- Mỗi attempt tạo evaluation AI **mới** (bản cũ giữ nguyên), dùng phiên bản `production` lúc chạy, vào hàng đợi chấm thường (Mock trước Practice, không chen hàng).
- Bản mới xong thì thành chính thức nếu chưa có điểm Expert; đã có điểm Expert thì bản mới không chính thức (SD-09). Bản mới lỗi thì bản cũ vẫn là chính thức.
- Audit: mỗi attempt một dòng; chạy hàng loạt thì `after` có `batch_id`.
- Vượt ngân sách vẫn cho chạy lại, chỉ cảnh báo.

**UC-38 Xem audit log.** Danh sách chỉ đọc, mới nhất trước, lọc theo actor (một Admin cụ thể hoặc system), hành động, entity, khoảng ngày; mở một dòng để xem `before` và `after`. Hành động phải ghi: khoá và mở khoá tài khoản, tạo Expert và Admin, publish, archive và tạo phiên bản mới của đề, sửa bộ đề, sửa cấu hình, bảng quy đổi và tiêu chí, tạo phiên bản prompt và đổi label, chạy lại chấm AI, giao lại Expert, kỳ nghỉ lễ; tác vụ tự động ghi với actor system. Không chép bài làm của Learner vào `before`/`after`. Giữ lâu dài (bảng chỉ thêm).

---

## 6. Luồng nghiệp vụ và máy trạng thái

**Nguyên tắc:** chấm AI là **bất đồng bộ**. Core API nhận bài và trả về ngay; worker chấm; trình duyệt nhận kết quả qua Supabase Realtime, có polling dự phòng (ADR-02).

| Sơ đồ | Nội dung chính |
|---|---|
| SD-00 | Luồng tổng: bắt đầu bài, nộp, L/R chấm ngay, W/S đẩy job vào hàng đợi, worker chạy AI và lưu evaluation, Expert chấm (Mock) và lưu bản chính thức, Realtime báo kết quả |
| SD-01 | Đăng ký: Supabase Auth, trigger `handle_new_user` tạo profile Learner, gửi email xác minh. Email đã tồn tại vẫn trả cùng phản hồi để không lộ email |
| SD-02 | Writing: nộp, lưu essays, đóng attempt, enqueue; worker **lặp từng task**: LLM chấm 4 tiêu chí và tìm lỗi, lưu criterion_scores, lỗi và grading_run, tính band (BR-04), đánh dấu chính thức; Realtime; hiện nhãn "AI estimate" |
| SD-03 | Speaking: đồng ý ghi âm; với mỗi câu: phát, ghi, xin presigned URL, upload R2, confirm; nộp, enqueue; worker tải audio, STT, fluency, pronunciation, LLM; lưu điểm (BR-05) |
| SD-04 | L/R: đáp án không bao giờ gửi xuống browser; chấm BR-14; band chỉ khi đủ 40 câu. Xem attempt của người khác trả 404 |
| SD-05 | Mock: server giữ deadline; ARQ cron tự nộp attempt quá hạn; L/R chấm ngay; W/S tạo yêu cầu Expert và job AI; hiện "preliminary, waiting for Expert" |
| SD-06 | Xin chấm lại: kiểm tra chủ sở hữu, AI đã chấm xong, quota BR-16 và suất chung BR-20 (kiểm và tạo trong một transaction có khoá theo Learner), chưa có yêu cầu mở; tạo request `waiting`; cron mỗi 10 phút chọn Expert rảnh, tạo assignment hạn 48 giờ làm việc, báo cho Expert trong app |
| SD-07 | Expert chấm: kiểm assignment, tạo draft chép từ bản AI (điểm, nhận xét, lỗi), Expert sửa, validate band, tính overall; một transaction lưu điểm, hoàn tất assignment và request, đặt bản Expert là chính thức, ghi `agrees_with_ai` (không tiêu chí nào bị đổi band); báo cho Learner |
| SD-08 | Soạn đề: presigned upload lên R2, lưu nháp, job TTS (worker + AI engine, lưu audio vào R2), publish (validate, ghi audit) |
| SD-09 | Admin chạy lại AI (kiểm tra không đang chấm, tạo evaluation **mới**, ghi audit, enqueue; **không chính thức nếu đã có điểm Expert**) hoặc giao lại (kết thúc assignment cũ, tạo assignment 48 h mới, ghi audit, báo Expert mới) |

**Flowchart tạo và giao yêu cầu Expert:**
- Bắt đầu Mock W/S: còn quota BR-15 và suất chung BR-20 thì giữ chỗ (`expert_review_reserved`). Nộp: bài đã giữ chỗ thì tạo request `waiting`; không giữ được thì chỉ chấm AI và điểm AI là chính thức.
- Xin chấm lại Practice: đã chấm AI, chưa có yêu cầu mở, còn quota BR-16 thì tạo request `waiting`; không thì từ chối kèm lý do.
- Có Expert Available dưới tải tối đa thì tạo assignment hạn 48 h, request chuyển `assigned`; không có thì giữ trong hàng đợi, thử lại sau 10 phút.
- Kết thúc assignment: `completed` (Expert nộp, điểm Expert chính thức), `declined` (Expert trả lại, request về `waiting`), `reassigned` (Admin giao lại), hoặc `expired` (quá 48 giờ làm việc, request về `waiting`).
- Yêu cầu Mock được giao **trước** yêu cầu Practice.

**Máy trạng thái.** Tên trạng thái trùng enum trong DB; Core API chỉ được thực hiện các chuyển trạng thái liệt kê dưới đây.

- **attempts.status:** `in_progress` → `submitted` (Learner nộp hoặc hết giờ) → L/R: `scored`; W/S: `grading` → `scored`, hoặc `waiting_expert` (Mock có yêu cầu Expert) → `scored` (Expert nộp). Nhánh phụ:
  - `in_progress` → `abandoned`: **chỉ Mock (thi thử)**; Learner thoát phòng thi giữa chừng thì tính là bỏ dở. Dòng giữ lại, ẩn khỏi lịch sử
  - Practice (luyện tập) `in_progress` mà Learner xoá thì **xoá hẳn dòng attempt** (và `attempt_sections`, `answers` theo); không có trạng thái `abandoned`. Bài đã nộp không xoá được (409)
  - `grading` → `grading_failed` (lỗi sau 3 lần thử, báo Admin) → `grading` (Admin chạy lại)
  - Admin chạy lại bài đã `scored`: attempt giữ `scored`, kết quả cũ vẫn hiện tới khi evaluation mới `done` (UC-24)
  - Speaking im lặng toàn bộ → `no_speech`
  - Practice có điểm Expert về sau: kết quả Expert thành chính thức, trạng thái giữ `scored`.
- **evaluations.status:** AI: `pending` → `done` (tính `overall_band`) hoặc `failed`. Expert: `draft` (lưu nháp) → `done`. Không bao giờ ghi đè; mỗi attempt có đúng 1 evaluation chính thức.
- **review_requests.status:** `waiting` → `assigned` → `completed`. Assignment hết hạn hoặc bị trả lại: quay lại `waiting`. Learner huỷ (chỉ Practice, khi còn `waiting`): `cancelled`, không hoàn lượt.
- **review_assignments:** `assigned` (`due_at` = `assigned_at` + 48 giờ làm việc, BR-11) → `in_review` (ghi `started_at`, lưu nháp) → kết thúc `completed` / `declined` (chỉ từ `assigned`, trong 2 giờ làm việc đầu) / `expired` / `reassigned` (ghi `ended_at`, `end_reason`; lý do trả lại ghi vào `note`). Kết quả do Expert cũ gửi muộn bị từ chối.
- **tests.status:** `draft` → `published` (Admin duyệt, kiểm tra tự động đạt, ghi `reviewer_id` và `reviewed_at`, khoá nội dung) → `archived` (ẩn khỏi danh mục). Sửa đề đã publish thì sao thành `draft` phiên bản mới.
- **Phòng thi Speaking:** `mic_check` (ghi 5 s, phát lại, kiểm âm lượng) → Part 1 [`asking` → `recording` ≤ 45 s]* → Part 2 [`cue_card` → `preparing` 60 s → `recording` ≤ 120 s] → Part 3 [`asking` → `recording` ≤ 90 s]* → `uploading` (chờ mọi file được confirm) → nộp attempt.

---

## 7. Thiết kế cơ sở dữ liệu (đích: 33 bảng, 2 view, 46 FK; bỏ `mock_sessions` ngày 2026-11-09, thêm `writing_task_materials` ngày 2026-11-11)

ERD vẽ theo ký hiệu Chen. Có 4 phép chuyên biệt hoá (specialisation):

| Thực thể cha | Kiểu con | Cách ánh xạ |
|---|---|---|
| USER | LEARNER, EXPERT, ADMIN | 1 bảng cho mỗi kiểu con (`learner_profiles`, `expert_profiles`); ADMIN không có bảng, tham chiếu qua `(id, role='admin')` |
| SECTION | LR_SECTION, WRITING_TASK, SPEAKING_PART | 1 bảng cho mỗi kiểu con, dùng chung khoá với `sections` |
| ATTEMPT | LR, WRITING, SPEAKING | 1 bảng + cột phân loại `skill`, cột riêng của kiểu con cho phép null kèm CHECK |
| EVALUATION | AI, EXPERT | 1 bảng + cột phân loại `evaluator_type` |

Quy tắc ánh xạ:
- Thực thể mạnh: PK UUID.
- Thực thể yếu: UUID riêng + `UNIQUE(owner, partial key)`.
- Thuộc tính đa trị: bảng con hoặc `text[]`.
- Quan hệ M:N có thuộc tính: bảng nối.
- 1:1: FK + UNIQUE.
- Cột ngoài sơ đồ (cố ý): `question_keys.evidence`, `annotations.title`, `grading_runs.output`, `question_groups.subtype/template`, `tests.difficulty`, `questions.diagram_coordinate`.
- Chuẩn 3NF, **có một ngoại lệ cố ý**: các cột phân loại (`role`, `skill`, `kind`, `test_id`, `evaluator_type`) được chép xuống bảng con để FK ghép chặn tổ hợp sai ngay trong DB (quyết định "ràng buộc đúng kiểu bằng khoá ngoại ghép").

### Bảng và cột (theo sơ đồ quan hệ Hình 2.34)

**Người dùng và hệ thống (6)**
- `profiles(id PK, email, full_name, avatar_key, role, is_active, created_at)`
- `learner_profiles(user_id PK/FK, role FK, target_overall, target_listening, target_reading, target_writing, target_speaking, test_date, voice_consent_at)`
- `expert_profiles(user_id PK/FK, role FK, is_available, max_active_reviews, bio, ielts_band)`
- `audit_logs(id PK, admin_id FK, admin_role FK, action, entity, entity_id, before, after, created_at)`. Theo ràng buộc 16 thì còn `actor_type`; khi `actor_type = 'system'` thì actor là null.
- `system_settings(key PK, value, updated_at, updated_by FK, admin_role FK)`
- `band_conversions(skill PK, raw_min PK, raw_max, band, updated_by FK, admin_role FK)`

**Nội dung đề (14)**
- `test_sets(id PK, name, description, status, created_at)`
- `tests(id PK, title, skill, allowed_mode, status, version, previous_version_id FK, duration_minutes, source_type, source_name, license, test_set_id FK, author_id FK, author_role FK, reviewer_id FK, reviewer_role FK, reviewed_at, created_at)`
- `sections(id PK, test_id FK, skill FK, kind, order_no, title)`, `UNIQUE(test_id, order_no)`
- `lr_sections(section_id PK/FK, kind FK, passage, audio_key, transcript)`
- `writing_tasks(section_id PK/FK, kind FK, task_type, prompt_category, task_prompt, chart_image_key, chart_description, min_words)`
- `writing_task_materials(section_id PK/FK, answer_key, answer_key_reviewed_at, answer_key_reviewer_id FK, outline, outline_reviewed_at, sample_essay, sample_reviewed_at, reviewer_id FK, updated_at)`: tài liệu theo đề (ADR-30). Tách khỏi `writing_tasks` vì `writing_tasks` cho mọi người đăng nhập đọc và bị khoá khi publish (BR-10); bảng này chỉ Admin đọc (giống `question_keys`), không có trigger BR-10. `*_reviewed_at` NULL = nháp; sửa trường nào thì trường đó về nháp
- `speaking_parts(section_id PK/FK, kind FK, topic, prep_seconds, answer_seconds)`
- `question_groups(id PK, lr_section_id FK, order_no, question_type, instructions, image_key, select_count, allow_reuse, max_words)`
- `group_options(group_id PK/FK, label PK, text)`
- `questions(id PK, group_id FK, lr_section_id FK, number, prompt)`
- `question_options(question_id PK/FK, label PK, text)`
- `question_keys(question_id PK/FK, accepted_answers text[], explanation)`: **tách riêng, Learner không có quyền đọc**
- `speaking_questions(id PK, speaking_part_id FK, order_no, prompt, audio_key)`
- `criteria(id PK, code, name, skill, task_type)`
- `criterion_descriptors(criterion_id PK/FK, band PK, descriptor)`

**Làm bài (6)** (`mock_sessions` và `attempts.mock_session_id` đã xoá ở migration `20261109130000`: Mock chỉ từng kỹ năng)
- `attempts(id PK, learner_id FK, test_id FK, skill FK, mode, status, started_at, deadline_at, submitted_at, raw_score, question_count, lr_band)`
- `attempt_sections(attempt_id PK/FK, section_id PK/FK, test_id FK, started_at, audio_played_at, finished_at)`
- `answers(attempt_id PK/FK, question_id PK/FK, section_id FK, answer, is_correct, updated_at)`
- `essays(id PK, attempt_id FK, section_id FK, content, word_count (cột generated), updated_at)`, `UNIQUE(attempt_id, section_id)`
- `speaking_responses(id PK, attempt_id FK, speaking_question_id FK, section_id FK, audio_key, duration_ms, transcript, confirmed_at, audio_deleted_at)`
- `speech_metrics(response_id PK/FK, name PK, value)`

**Chấm điểm (4)**
- `evaluations(id PK, attempt_id FK, skill FK, evaluator_type, status, overall_band, feedback, is_official, created_at, agrees_with_ai, submitted_at)`
- `grading_runs(id PK, evaluation_id FK, evaluator_type FK, task_no, status, model, prompt_versions, trace_id, error, input_tokens, output_tokens, latency_ms, started_at, finished_at, input_hash)`: `input_hash` = SHA-256 của (task, section, bài đã bỏ khoảng trắng hai đầu, thời điểm duyệt đáp án, dấu vân tay cấu hình chấm); index một phần trên lượt `done` (ADR-30)
- `criterion_scores(evaluation_id PK/FK, criterion_id PK/FK, task_no PK, skill FK, band, comment)`
- `annotations(id PK, evaluation_id FK, attempt_id FK, essay_id FK, type, category, original_text, corrected_text, explanation, start_pos, end_pos)`

**Expert chấm (2)**
- `review_requests(id PK, attempt_id FK, skill FK, status, requested_at)`, kèm `learner_id` trong FK ghép
- `review_assignments(id PK, request_id FK, attempt_id FK, expert_id FK, assigned_at, started_at, due_at, ended_at, end_reason, note, reassigned_by FK, admin_role FK, evaluation_id FK UNIQUE, evaluator_type FK)`

**Cột thêm ngoài sơ đồ (đã chốt 2026-11-03):**
- `question_groups.subtype`: biến thể giao diện như `summary_completion`, `table_completion`, `matching_headings`, `matching_features`, `yes_no_not_given`, `diagram_labelling`.
- `question_groups.template`: đoạn văn hoặc bảng có chỗ trống `{{n}}` cho dạng completion.
- `question_keys.evidence`: dẫn chứng trong bài đọc.
- `annotations.title`: tiêu đề lỗi hiển thị trên giao diện.
- `grading_runs.output`: JSON AI engine trả về (bài viết đã sửa, strengths/areas, task_subtype).

Ràng buộc `tests UNIQUE(test_set_id, skill)` nghĩa là mỗi bộ đề Mock có 1 đề cho mỗi kỹ năng.

**Thay đổi cho luồng Expert (chốt 2026-11-08, chưa có migration):**
- `assignment_end` thêm giá trị `declined` (FR-39); lý do ghi vào `review_assignments.note`.
- `attempts.expert_review_reserved boolean` (mặc định false): lượt Expert được giữ chỗ lúc bắt đầu bài Mock W/S (BR-15).
- `annotations` dùng được cho Speaking: thêm `response_id`, `start_ms`, `end_ms`; `essay_id` cho phép null, CHECK đúng một trong hai; `category` nhận thêm `FC`, `P`.
- `speaking_responses` thêm `UNIQUE (id, attempt_id)` cho FK ghép từ `annotations`.
- Bài Mock Speaking ra `no_speech` thì không tạo yêu cầu Expert và nhả lượt đã giữ.
- Chi tiết function và trạng thái: `specs/003-expert-review/data-model.md`.
- (Should) `criterion_scores.change_reason`: lý do Expert sửa band lệch AI từ 1 band (FR-42).
- (Should) Bảng mới `expert_comment_snippets(id, expert_id FK, text, created_at)` cho kho nhận xét (FR-41); khi có thì thành 34 bảng.
- `system_settings`: thêm `expert_weekly_capacity` (BR-20) và `review_decline_hours` = 2 (FR-39); `review_due_hours` = 48 nay là giờ làm việc; thêm `expert_pause_periods` (BR-22): mảng JSON `{start, end, reason}`, không cần bảng mới. Tạo hoặc sửa kỳ nghỉ thì tính lại `due_at` của assignment đang mở.
- RLS `expert_eval_read` cho Expert xem bản AI của bài đang được giao (ràng buộc 13).
- Realtime publication thêm `review_assignments` để báo bài mới cho Expert trong app.

**Thay đổi cho giám sát AI (chốt 2026-11-11, chưa có migration):**
- `grading_runs.cost_usd numeric(10,6)`: chi phí tính lúc chạy theo bảng giá hiện hành, nên đổi giá không làm sai số cũ.
- `system_settings`: thêm `ai_model_prices` (JSON `{model: {input_per_1m, output_per_1m}}`, USD) và `ai_monthly_budget_usd` (mặc định 20, Admin sửa được). Ngưỡng cảnh báo cố định 80% và 100%.
- Cron ARQ hằng ngày: đặt `output`, `error` = null cho lượt `failed` quá 180 ngày. Trace Langfuse quá 90 ngày: cron ARQ hằng ngày lấy `trace_id` của các `grading_runs` có `started_at` cách đây 90–97 ngày rồi gọi `DELETE /api/public/traces` (xoá theo lô, lặp lại không sao). Không dùng cài đặt retention của Langfuse vì chỉ gói Pro và Enterprise có (kiểm tra 2026-11-11: project `IELTS Tuitor` trên Langfuse Cloud, `retentionDays` = null). Nếu nâng lên Pro thì đặt Data Retention = 90 ngày và bỏ cron.

**View (2):** `attempt_results` (band của attempt, luôn lấy từ kết quả chính thức), `review_request_details` (completed_at; nguồn lấy từ `attempts.mode`).

**Lưu sẵn hay tính khi đọc:**
- Lưu một lần lúc tạo hoặc lúc chấm, vì không bao giờ đổi: `deadline_at`, `raw_score`, `is_correct`, `evaluations.overall_band`.
- Tính trong view: `ATTEMPT.Band`, `MOCK_SESSION.Overall_band`.
- `word_count`: cột generated.

### 16 ràng buộc nghiệp vụ trong DB

| # | Ràng buộc | Cơ chế |
|---|---|---|
| 1 | Kiểu con của section khớp skill của test | CHECK `sections(skill, kind)` + FK ghép `(test_id, skill)`, `(section_id, kind)` |
| 2 | Attempt chỉ chứa section của chính test đó | FK ghép từ `attempt_sections` tới `attempts(id, test_id)` và `sections(id, test_id)`; answers, essays, recordings trỏ tới `attempt_sections` |
| 3 | (Đã bỏ 2026-11-09 cùng `mock_sessions`.) Thay bằng: Mock chỉ trên đề trong bộ đề Mock mà Learner chưa từng làm | trigger `check_attempt_start`, `sync_test_allowed_mode` |
| 4 | Chỉ attempt W/S mới có evaluation và yêu cầu Expert | CHECK skill + FK ghép `(attempt_id, skill)`; review_requests dùng `(attempt_id, learner_id, skill)` |
| 5 | Đúng 1 kết quả chính thức; Expert ưu tiên hơn AI | `UNIQUE(attempt_id) WHERE is_official`; trigger `check_official_priority` |
| 6 | Tiêu chí khớp skill và task (TA chỉ cho Task 1, TR chỉ cho Task 2) | FK `(criterion_id, skill)`, `(evaluation_id, skill)`; CHECK task_no; trigger `check_criterion_task` |
| 7 | Đáp án là nhãn lựa chọn có thật; nhóm "Choose N" đủ đáp án | Core API kiểm lúc publish |
| 8 | Không lộ đáp án trước khi nộp | Bảng `question_keys` riêng, không có policy đọc cho Learner |
| 9 | Expert evaluation và assignment cùng một attempt | FK ghép `(evaluation_id, attempt_id, evaluator_type)` |
| 10 | Mỗi request tối đa 1 assignment đang mở | `UNIQUE(request_id) WHERE ended_at IS NULL` |
| 11 | Mỗi attempt tối đa 1 request đang mở | `UNIQUE(attempt_id) WHERE status IN ('waiting','assigned')` |
| 12 | Chỉ làm được đề đã publish, ở mode được phép | trigger `check_attempt_start` |
| 13 | Expert chỉ thấy điểm AI của bài đang được giao cho mình hoặc đã chấm | RLS `expert_eval_read` (cần sửa: bản baseline chỉ cho xem sau khi nộp) |
| 14 | 1 essay cho mỗi (attempt, task); 1 recording cho mỗi (attempt, câu hỏi) | `UNIQUE(attempt_id, section_id)`; `UNIQUE(attempt_id, speaking_question_id)` |
| 15 | Các khoảng quy đổi band của cùng skill không chồng nhau | `EXCLUDE (skill WITH =, int4range(raw_min, raw_max) WITH &&)` |
| 16 | Mỗi dòng audit có actor: Admin, hoặc system cho tác vụ tự động | `CHECK ((actor_type='system') = (actor_id IS NULL))`; FK `(actor_id, actor_role)` |

**Trigger:**
- `check_attempt_start`: kiểm ràng buộc 3 (bản mới) và 12.
- `fill_question_section`: điền `section_id` cho câu hỏi.
- `check_criterion_task`: kiểm ràng buộc 6.
- `check_official_priority`: kiểm ràng buộc 5.
- `check_expert_capacity`: không giao vượt `max_active_reviews`.
- `block_published_edit`: chặn sửa mọi bảng nội dung của đề đã publish hoặc archived.
- `handle_new_user`: tạo profile. **Chỉ đọc role từ `app_metadata` do server kiểm soát**, để người dùng không tự cấp quyền Admin.
- (2026-11-09) `block_closed_attempt_work`: `answers`, `essays` chỉ ghi được khi attempt `in_progress`.
- (2026-11-09) `block_finished_evaluation_edit`, `block_finished_evaluation_detail`: evaluation `done`/`failed` chỉ đổi được `is_official`; `criterion_scores`, `annotations` của nó không đổi được (BR-08).
- (2026-11-09) `block_audit_log_change`: `audit_logs` chỉ thêm (chặn UPDATE, DELETE, TRUNCATE).
- (2026-11-09) CHECK `attempts_abandoned_mock_only`, `attempts_auto_submit_mock_only`; quyền đọc `lr_sections` theo cột, không có `transcript`.

**Index:**
- `idx_attempts_history(learner_id, started_at DESC)`
- `idx_attempts_overdue(deadline_at) WHERE status='in_progress'`: phục vụ cron tự nộp mỗi 30 s
- `uq_open_attempt(learner_id, test_id) WHERE status='in_progress'`
- `idx_evaluations_attempt(attempt_id, created_at DESC)`
- `idx_runs_monitor(status, started_at) WHERE status<>'done'`
- `idx_request_queue(status, requested_at)`
- `idx_expert_workload(expert_id) WHERE ended_at IS NULL`
- `idx_assignments_due(due_at) WHERE ended_at IS NULL`
- `idx_responses_retention(confirmed_at) WHERE audio_deleted_at IS NULL`
- `idx_audit_entity(entity, entity_id, created_at DESC)`
- `idx_requests_quota(learner_id, requested_at)`

**RLS chỉ cho đọc; mọi thao tác ghi đi qua Core API (ADR-10):**

| Ai | Được đọc |
|---|---|
| Admin | Mọi bảng |
| Mọi người đã đăng nhập | Đề, bộ đề, section, câu hỏi, lựa chọn đã publish (riêng đề Mock: chỉ khi Learner đã có attempt trên đề đó, 2026-11-09); danh mục tiêu chí. **Không** đọc được `question_keys` |
| Learner | Hồ sơ, mock session, attempt, essay của mình; evaluation chính thức đã xong của attempt của mình |
| Expert | Hồ sơ và assignment của mình; evaluation của mình; AI evaluation của bài được giao, **chỉ sau khi đã nộp** |

Quy tắc cần nhiều dòng dữ liệu hoặc cần đọc cấu hình (chuẩn hoá đáp án, kiểm tra khi publish, quota tuần) đặt trong Core API. Thao tác nhiều bước viết thành PostgreSQL function, do server gọi.

---

## 8. Kiến trúc

```
Browser (Next.js 16: Learner / Expert / Admin portal)
  ├─ sign up / log in ──────────────► Supabase Auth (JWT)
  ├─ HTTPS + Bearer ────────────────► Core API (FastAPI, nghiệp vụ, kiểm quyền) ── supabase-py (service role) ──► PostgreSQL (RLS read-only)
  ├─ upload/download (presigned URL) ► Cloudflare R2 (audio, ảnh)       │ enqueue
  └─◄─ Realtime events ◄── Supabase Realtime (postgres_changes)          ▼
                                                                 Redis 7 (job queue) ─► ARQ Worker (job chấm, cron) ── ghi kết quả ──► PostgreSQL
                                                                                              │ HTTP nội bộ + secret header
                                                                                              ▼
                                                                    AI Engine (FastAPI nội bộ: chấm W/S, STT, TTS; KHÔNG truy cập DB)
                                                                       ├─► Qwen API (DashScope)   ├─► Langfuse (prompt, trace)   └─► R2 (đọc audio)
```

Phần tự host (Core API, worker, AI engine, Redis) chạy bằng Docker Compose trên VPS. Supabase là dịch vụ managed. Ngoài ra có R2, Qwen và Langfuse.

| Khối | Vị trí trong repo | Trách nhiệm |
|---|---|---|
| Core API | `backend/app` (`main.py`, `api/`, `core/`, `db/`) | Toàn bộ nghiệp vụ: tài khoản, đề, attempt, chấm L/R, Expert, dashboard, Admin |
| Worker | `backend/app/worker` (ARQ) | Gọi AI engine, ghi evaluation, tính band; sinh TTS; chạy cron |
| AI engine | `backend/app/ai` | Chấm Writing Task 1/2 và Speaking; TTS; không truy cập DB |
| Frontend | `frontend` (Next.js 16 App Router, React 19, TS 5, Tailwind, TanStack Query, Recharts) | Dùng supabase-js **chỉ** cho auth, đọc dữ liệu được phép, Realtime. **Frontend không ghi trực tiếp** vào DB |

### Công nghệ

- Python 3.11 + FastAPI + Pydantic (có OpenAPI).
- Supabase: PostgreSQL, Auth, Realtime. Media lưu trên Cloudflare R2.
- Redis + ARQ: job chấm AI, job TTS, cron. Hai hàng đợi: Writing chạy song song, Speaking mỗi lần một bài (`SpeakingWorkerSettings`) để bài chờ nằm trong hàng đợi thay vì giữ kết nối HTTP tới AI engine. Cron:
  - cứu lượt chấm bị mất hoặc worker chết (mỗi phút): chạy lại tối đa 2 lần, sau đó `grading_failed`
  - tự nộp bài quá hạn (mỗi 30 s)
  - giao bài cho Expert (mỗi 10 phút)
  - thu hồi assignment quá 48 h
  - xoá audio quá 180 ngày
- LLM: Qwen qua DashScope, gọi bằng OpenAI SDK. Model vision đọc biểu đồ Task 1. Langfuse quản lý prompt có phiên bản và trace mọi lần gọi.
- Speaking: xem mục Pipeline chấm Speaking. Tốc độ chạy trên CPU chưa được kiểm chứng.
- TTS: Piper. Đọc câu hỏi Speaking **một lần lúc soạn đề**.
- **Đích sau khi đổi kiến trúc (ADR-24 đến ADR-28, chốt 2026-11-08):** Cloudflare (CDN, WAF, rate limit) và frontend trên Cloudflare Workers; Traefik trước nhiều bản sao Core API; client Postgres async có pool; Redis Streams cho tự lưu; hàng đợi chấm ưu tiên Mock; AI engine qua Cloudflare Tunnel hoặc GPU thuê theo giờ; OpenTelemetry, Prometheus, Grafana, Sentry; k6; GitHub Actions. Lộ trình ở `docs/project-roadmap.md`.

### Pipeline chấm Writing (AI engine)

| Phase | Việc | Code |
|---|---|---|
| A | Tiền xử lý: tách đoạn và câu, đếm từ | `utils/preprocessor.py` |
| B | Phân loại dạng đề Task 2 (6 dạng) bằng LLM; LanguageTool bắt lỗi ngữ pháp và chính tả; thống kê từ vựng (lặp từ, mật độ, TTR). Task 1: model vision mô tả biểu đồ; song song đó `qwen3.8-flash` đọc ảnh để phân loại 8 dạng (Line, Bar, Pie, Table, Map, Process tự nhiên, Process nhân tạo, Mixed), lỗi thì dùng dạng do bước mô tả trả về | `services/task_type_classifier.py`, `handlers/grammar_checker.py`, `handlers/lexical_stats.py`, `services/chart_describer.py` |
| C | Lấy 4 prompt tiêu chí từ Langfuse (label `production`), chèn các tín hiệu từ phase B | `services/prompt_builder.py`, `services/langfuse/prompt_manager.py` |
| D | Gọi Qwen song song cho 4 tiêu chí, ép JSON, tự sửa JSON sai tối đa 2 lần. Mỗi tiêu chí dùng model ghi trong config prompt, không ghi thì dùng `DEFAULT_LLM_MODEL` (`qwen-flash`). Hiện chỉ `writing/task1/ta` ghi `qwen3.7-plus`: đo 24 bài Task 1 (nhãn chưa kiểm chứng), bài viết sai biểu đồ được TA 2.75 thay vì 5.0, bài đúng biểu đồ gần như không đổi (6.50 so với 6.62), p90 77 s so với 66 s | `services/llm_evaluator.py` |
| Band | Trung bình 4 tiêu chí, làm tròn theo luật IELTS **trong code** | `schemas/llm_output.py` |
| E, F | Prompt rewrite tạo danh sách lỗi kèm bản sửa và bài đã sửa; code định vị lại vị trí ký tự và loại phần chồng lấn | `services/synthesis_service.py`, `utils/char_index_resolver.py`, `utils/annotation_normalizer.py` |

**Đáp án theo đề cho Task 1 (ADR-30):** đề có đáp án đã duyệt thì bỏ bước đọc ảnh ở phase B; đáp án (khối "VERIFIED ANSWER KEY") vào prompt TA và rewrite. Song song phase D, prompt `writing/task1/keycheck` chỉ **trích** ý chính nào được nhắc và con số bài ghi; **code** so con số với đáp án (sai lệch ≤ max(5% giá trị, 5% khoảng giá trị) là đúng) → `key_point_check`; ý sai số được nối vào khối biểu đồ của rewrite để bản sửa dùng số của đáp án. Lỗi trích xuất không làm hỏng lượt chấm, chỉ mất danh sách. Prompt rewrite trả `sub_levels` cho từng chỉ số con; code kẹp mỗi mức không quá 2 bậc trên mức của band (≤4 cần cải thiện, 5 khá, 6 tốt, 7 rất tốt, ≥8 xuất sắc), riêng "data accuracy" Task 1 lấy từ tỉ lệ ý đúng số. Code: `schemas/answer_key.py`, `services/key_point_checker.py`, `services/sub_indicator_levels.py`, `services/material_drafter.py`, `services/grading_fingerprint.py`.

**Luồng Reference cho Task 2 (ADR-22, mặc định):** thay phase C, D của bảng trên cho Task 2. `WRITING_TASK2_PIPELINE=legacy` quay về bảng trên. Task 1 luôn đi bảng trên.

**Bất biến:** mọi bài chấm đều ra 4 feedback theo 4 tiêu chí ở structured output, sau đó một agent tổng hợp 4 feedback và rewrite bài cải thiện. Không bắt buộc 4 agent riêng.

| Bước | Việc | Code |
|---|---|---|
| 1 | Phân loại dạng đề từ title: Jev (TypeSafe, chỉ gửi title), lỗi hoặc thiếu key thì dùng prompt `writing/task2/classify`, vẫn không có đáp án thì `Unknown` | `services/jev_client.py`, `services/task_type_classifier.py` |
| 2 | Chọn thang tham chiếu: mỗi band 5, 6, 7, 8 một bài cùng dạng; cùng bài nộp luôn ra cùng thang; bậc thiếu ghi vào `reference_gaps`, `Cause_Effect` mượn từ `Cause_Solution` | `services/reference_corpus.py` |
| 3 | Một lần gọi `writing/task2/grade` chấm cả 4 tiêu chí; số liệu LanguageTool và thống kê từ vựng chỉ để tham khảo, không có trần band | `services/holistic_grader.py` |
| 4 | Dùng lại bước rewrite; band tổng tính trong code | `services/task2_reference_pipeline.py` |

Kho tham chiếu là file đọc-chỉ `data/reference_corpus/` (2.885 bài, git-ignored), mount vào container vì AI engine không truy cập DB. Clone mới phải tự dựng kho bằng `scripts/build_reference_corpus.py`; thiếu kho thì chấm Task 2 trả 503, không tự về `legacy`. Nhãn band của `chillies/IELTS-writing-task-2-evaluation` **chưa kiểm chứng**: nguồn không nêu người chấm và giấy phép, nên không dùng làm bằng chứng độ chính xác so với giám khảo. Mô tả band trong prompt là bản diễn giải của nhóm, không phải nguyên văn Band Descriptors chính thức.

**Nguyên tắc AI:**
- LLM chỉ chấm **từng tiêu chí**; band tổng tính trong code (ADR-03).
- Chống prompt injection: bọc bài viết trong delimiter và bắt output đúng JSON schema.
- **Chỉ gửi nội dung bài làm** cho LLM, không gửi tên, email hay id tài khoản.
- Mọi điểm AI có nhãn "estimate".

### Pipeline chấm Speaking (AI engine)

ASR đoán ý nên có thể ghi "scool" thành "school": transcript cho biết người học **định nói gì**, không phải **đã phát ra âm gì**. Vì vậy nội dung transcript không bao giờ là bằng chứng phát âm. Band P chỉ lấy **độ tin cậy nhận dạng** của từng từ, là số đo độ dễ hiểu, không phải chữ ASR đã viết ra (ADR-21).

| Lớp | Việc | Dựa vào transcript? | Code |
|---|---|---|---|
| 0. Tín hiệu | Giải mã 16 kHz, SNR, clipping, Silero VAD, phát hiện im lặng | Không | `services/speaking/audio_signal.py` |
| 1. Âm học | Đếm âm tiết theo De Jong & Wempe, tốc độ nói, tốc độ phát âm, khoảng ngắt, F0, nhịp nPVI | Không | `acoustic_features.py` |
| 2. Kênh ý định | Whisper tinh chỉnh để giữ nguyên văn; từ đệm, lặp từ, tự sửa | Là transcript | `speech_transcriber.py` |
| 3. Kênh âm vị | wav2vec2 CTC giải mã không có mô hình ngôn ngữ | Không | `phoneme_recognizer.py` |
| 4. So khớp | Từ định nói → âm vị chuẩn (espeak), căn Needleman-Wunsch, thay thế, mất, thừa theo từng từ; gộp biến thể giọng | Chỉ lấy từ định nói | `phoneme_comparison.py` |
| Band P | Rubric `provisional-2` theo độ tin cậy nhận dạng từ và ngữ điệu; luôn hiện là ước lượng, độ tin cậy thấp. Kênh âm vị không quyết định band, chỉ hỗ trợ gợi ý từ và phát hiện bản ghi hỏng. File ghi kém, quá ít từ, hoặc hai kênh mâu thuẫn (`channels_disagree`): tối đa 6.0 và nhắc thu lại | Chỉ lấy độ tin cậy, không lấy nội dung | `pronunciation_rubric.py` |
| LLM | FC, LR, GRA chấm từ bằng chứng; FC nhận thêm câu hỏi để xét lạc đề (`speaking/common/fc` v3, trần tạm 5 và 4); `speaking/common/pr` (v3) chỉ giải thích band đã có; nhận xét từng Part và báo cáo tổng lỗi thì chỉ thiếu phần nhận xét | Có | `speaking_grading_pipeline.py`, `speaking_feedback.py` |
| Lỗi và điểm mạnh từng câu | GRA và LR (`speaking/common/gra`, `lr` v3, qwen3.7-plus) trả thêm `edits` và `strength_spans` trích nguyên văn, gắn nhãn câu `[R2 · Part 2]`; code tìm đoạn trích trong transcript, so từng từ giữa bản gốc và bản sửa để tách thành chỗ sửa nhỏ nhất (Thay thế / Thừa / Thiếu), bỏ trích không có thật, chỉ khác dấu câu, dài quá 5 từ, chồng lấn hoặc quá 25 lỗi mỗi câu; điểm mạnh chạm lỗi bị bỏ. Từ có thể phát âm chưa rõ lấy theo luật `likely_mispronounced`, kèm thời điểm trong audio, chỉ khi kênh âm vị dùng được. Lưu trong `grading_runs.output.responses[]` (ADR-31) | Trích transcript, vị trí do code | `speaking_feedback_anchoring.py`, `speaking_response_feedback.py`, `speaking_criterion_evidence.py` |

**Giới hạn đã biết:** band P ước lượng độ dễ hiểu, chưa chấm được từng âm, nên lỗi mà ASR đoán lại được vẫn có thể lọt; nhầm sang từ có thật ("ship"/"sheep") không phát hiện được với bài nói tự do; model học từ giọng chuẩn nên dễ coi giọng Việt là lỗi, bảng biến thể chỉ giảm chứ không loại hết; gợi ý từ chỉ hiện "có thể" và bỏ sót phần lớn lỗi; ngưỡng rubric là **tạm** cho tới khi có dữ liệu so với Expert. Số đo ở `docs/speech-eval-report.md`. Whisper `medium.en` còn tự sửa một phần lỗi ngữ pháp (đo 2026-11-11 trên audio demo của Prep: "prepare" → "prepared", "please" → "pleased", bỏ đoạn tự sửa), nên lỗi bị ASR sửa mất không được đánh dấu; CrisperWhisper giữ được lỗi nhưng ảo giác lặp ở mọi cấu hình đã thử nên bị loại.

Ghi âm tắt `noiseSuppression`, `autoGainControl`, `echoCancellation` của trình duyệt vì chúng làm biến dạng tín hiệu cần đo.

### Lộ trình học (Learner Journey, ADR-23)

Luật quyết định **làm gì** (kỹ năng ưu tiên, ngày thi, bài chẩn đoán); mô hình năng lực đo **yếu ở đâu** và **đề nào vừa sức**. Tính lúc xem dashboard từ dữ liệu có sẵn (`answers`, `criterion_scores`, `attempts`, `writing_tasks`), **không thêm bảng, không migration**. Không cache kết quả theo Learner (tính đủ nhanh); chỉ cache độ khó câu hỏi trong bộ nhớ 10 phút. Không gọi LLM.

**Mô hình năng lực L/R (Elo, dạng Rasch 1 tham số):**
- Mỗi Learner có năng lực θ cho mỗi cặp (kỹ năng, dạng câu `question_groups.question_type`: 5 dạng của enum, không tách theo `subtype` để đủ dữ liệu), bắt đầu θ = 0.
- Độ khó câu q: p_q = (số lượt đúng + m·p0) / (số lượt trả lời + m) trên mọi Learner, với p0 = 0,6 và m = 5; b_q = −ln(p_q / (1 − p_q)). Câu ít người làm có độ khó gần mức trung bình b0 = −ln(0,6/0,4). Độ khó tính chung cho mọi Learner.
- Duyệt các câu Learner đã làm trong các bài đã nộp, theo thời gian nộp. Mỗi câu: P = 1 / (1 + e^−(θ − b_q)); θ ← θ + K·(đúng − P), với K = max(0,1; 0,4 / (1 + n/20)) và n là số câu đã tính của dạng đó. Câu bỏ trống trong phần đã làm tính là sai.
- Mức thành thạo hiển thị = P với câu độ khó trung bình (b = b0), dạng phần trăm.
- Một dạng câu chỉ được coi là điểm yếu khi đã trả lời ≥ 6 câu.
- Xác suất làm đúng dự đoán của một phần đề = trung bình P trên các câu của phần đó (dạng chưa có dữ liệu dùng θ = 0). Ưu tiên phần có giá trị gần 0,70 nhất (vùng mục tiêu 0,60–0,75: đủ thử thách mà không nản).

**W/S:**
- Trung bình động theo tiêu chí (FC, LR, GRA, P, TA, TR, CC) trên điểm chính thức, theo thời gian: m ← 0,5·band + 0,5·m.
- Dạng đề Writing: `writing_tasks.prompt_category` (dạng biểu đồ Task 1, dạng đề Task 2); trống thì dùng Task 1 hoặc Task 2. Band trung bình theo dạng, chỉ xét dạng đã làm ≥ 2 bài.
- Kèm `criterion_scores.comment` của tiêu chí yếu nhất ở bài gần nhất (lấy từ kết quả chính thức).

**Câu lý do (mẫu, không dùng LLM):** "{Kỹ năng} thấp hơn mục tiêu {x} band; {dạng câu} bạn làm đúng khoảng {y}%"; "{Kỹ năng} thấp hơn mục tiêu {x} band; tiêu chí yếu nhất là {tiêu chí}"; "Bạn chưa có band {kỹ năng}; làm 1 bài để hệ thống đánh giá"; "Còn {d} ngày tới ngày thi; làm 1 bài Mock {kỹ năng} để kiểm tra".

**Kiểm thử:** unit test cho luật và Elo bằng dữ liệu giả: người mới, thiếu 1 kỹ năng, hoà khoảng cách, dạng câu ít hơn 6 câu, gần ngày thi, hết đề chưa làm trong 14 ngày, đã đạt mục tiêu mọi kỹ năng.

### Hợp đồng API của Core API (đích thiết kế)

| Method | Path | Mô tả | Quyền | UC |
|---|---|---|---|---|
| GET, PUT | `/users/me`, `/users/me/goals` | Hồ sơ; mục tiêu và ngày thi | User; Learner | 04, 05 |
| POST | `/users/me/voice-consent` | Ghi nhận đồng ý ghi âm | Learner | 35 |
| GET | `/users/me/dashboard`, `/recommendations`, `/quotas` | Band hiện tại, khoảng cách, lộ trình (BR-17), quota Expert còn lại. Code hiện dùng `/test-practice/learning-profile` (thêm `current_bands`, `exam`) và `/test-practice/learning-profile/next-step` (spec 005) | Learner | 06, 08, 12 |
| GET | `/tests`, `/test-sets` | Đề và bộ đề đã publish | Learner | 07, 08 |
| POST | `/attempts` | Bắt đầu attempt; trả đề **không kèm đáp án** | Learner | 07–10 |
| PUT | `/attempts/{id}/answers`, `/attempts/{id}/essays/{task_no}` | Tự lưu đáp án L/R hoặc một task Writing | Chủ bài | 07–09 |
| POST | `/attempts/{id}/sections/{sid}/audio-play` | Ghi lượt phát Listening; Mock từ chối lượt 2 | Chủ bài | 08 |
| POST | `/attempts/{id}/speaking-uploads`, `/{rid}/confirm` | Presigned URL lên R2 và xác nhận file | Chủ bài | 10 |
| POST | `/attempts/{id}/submit` | Nộp bài, kèm header `Idempotency-Key` | Chủ bài | 07–10 |
| GET | `/attempts`, `/attempts/{id}/result` | Lịch sử; kết quả, đáp án, điểm tiêu chí, lỗi, điểm AI và Expert | Chủ bài, Expert được giao, Admin | 11 |
| POST, DELETE | `/attempts/{id}/review-requests` | Xin hoặc huỷ yêu cầu Expert chấm lại | Chủ bài | 12 |
| PATCH | `/expert/me/availability` | Bật/tắt Available | Expert | 14 |
| GET | `/expert/assignments` | Bài được giao và lịch sử | Expert | 15, 18 |
| POST | `/expert/assignments/{id}/start`, `/draft`, `/submit` | Mở bài (tạo draft từ bản AI), lưu nháp, nộp điểm, nhận xét và lỗi | Expert được giao | 16, 37 |
| POST | `/expert/assignments/{id}/decline` | Trả lại bài kèm lý do (FR-39) | Expert được giao | 15 |
| CRUD | `/expert/me/comment-snippets` | (Should) Kho nhận xét (FR-41) | Expert | 16 |
| POST, PATCH | `/admin/experts`, `/admin/users/{id}/status` | Tạo Expert và gửi lời mời; khoá/mở khoá | Admin | 19 |
| CRUD, POST | `/admin/tests`, `/admin/test-sets`, `/admin/tests/{id}/publish`, `/archive`, `/new-version` | Soạn đề và bộ đề; publish; archive; tạo phiên bản mới | Admin | 21, 34, 36 |
| POST | `/admin/media-uploads`, `/admin/speaking-questions/{id}/tts`, `/admin/tests/import` | Upload media; sinh lại audio câu hỏi; import đề | Admin | 39, 31, 30 |
| GET, POST | `/admin/grading-runs`, `/admin/grading-runs/{id}`, `/admin/ai-usage`, `/admin/alerts`, `/admin/attempts/{id}/regrade`, `/admin/regrade-batches` | Lượt chấm có lọc và chi tiết kèm link trace; token, chi phí, ngân sách; số đếm cho badge; chạy lại một bài hoặc hàng loạt | Admin | 24 |
| GET, POST, PUT | `/admin/prompts`, `/admin/prompts/{name}/versions`, `/admin/prompts/{name}/production` | Danh sách prompt và phiên bản; tạo phiên bản mới; đổi label `production` | Admin | 22 |
| POST | `/admin/review-requests/{id}/reassign` | Giao lại cho Expert khác | Admin | 25 |
| GET, PUT | `/admin/settings`, `/admin/band-conversions`, `/admin/criteria`, `/admin/statistics`, `/admin/audit-logs` | Cấu hình, dữ liệu tham chiếu, dashboard, audit log | Admin | 22, 23, 38 |

AI engine (nội bộ, chỉ worker được gọi): `POST /grade` (Writing), `POST /grade-speaking`, `/tts`.

### ADR (quyết định kiến trúc)

| Mã | Quyết định | Phương án bị loại / hệ quả |
|---|---|---|
| ADR-01 | Ba khối: Core API, ARQ worker, AI engine | Không gộp AI engine vào Core API (image nặng, khó giới hạn tài nguyên). AI engine chỉ chạy trong mạng nội bộ |
| ADR-02 | Chấm AI bất đồng bộ; Realtime đẩy kết quả, polling dự phòng. `grading_runs` giữ trạng thái thật, hàng đợi ARQ chỉ là tín hiệu kích hoạt; worker nhận lượt chấm bằng lease, cron đẩy lại lượt bị mất hoặc bị bỏ rơi | Không gọi AI ngay trong request (timeout 30–90 s). Không dùng pgmq |
| ADR-03 | Band tổng tính trong code | LLM không thể thổi phồng band tổng |
| ADR-04 | Prompt quản lý trên Langfuse; lưu prompt version và trace id cho mỗi lần chấm | Không hard-code prompt. *(Báo cáo ghi "backup prompt trong repo": **đã bị thay** bằng chỉ thị "không lưu bản sao local", xem §11)* |
| ADR-05 | Audio và ảnh upload thẳng lên R2 bằng presigned URL, server xác nhận | Không upload qua backend, không dùng Supabase Storage |
| ADR-06 | TTS câu hỏi sinh một lần lúc soạn đề | Không dùng Web Speech API hay TTS trong lúc thi |
| ADR-07 | Giữ supabase-py, không dùng ORM | Thao tác cần transaction viết thành PostgreSQL function |
| ADR-09 | Schema thiết kế từ ERD | Không thêm 1 bảng cho mỗi tính năng |
| ADR-10 | RLS trên mọi bảng, chỉ cho đọc; mọi thao tác ghi qua Core API | Đóng lỗ hổng tự nâng quyền |
| ADR-12, 13 | Mọi lần làm bài là Attempt; mọi lần chấm là Evaluation, mỗi tiêu chí 1 dòng | Một luồng attempt duy nhất; chấm lại không ghi đè |
| ADR-16 | Không dùng AI tạo đề bài. Từ 2026-11-11: AI được soạn nháp tài liệu hỗ trợ theo đề, Admin duyệt mới dùng (ADR-30) | Tránh sai đáp án, sai độ khó, vi phạm bản quyền |
| ADR-17 | Ràng buộc "đúng kiểu" bằng FK ghép có cột phân loại | DB tự từ chối dữ liệu sai |
| ADR-18 | Tách assignment khỏi request | Giữ được lịch sử giao, giao lại, hết hạn |
| ADR-19 | Band L/R chỉ khi làm đủ 40 câu | Không cho ra band gây hiểu nhầm |
| ADR-20 | Rate limit thay cho quota chấm AI theo ngày | Practice không bị chặn; chi phí AI theo dõi trên dashboard |
| ADR-21 | Speaking hai kênh; band P tính trong code, LLM chỉ giải thích. Theo cổng quyết định, kênh âm vị không vào band P vì đo trên L2-ARCTIC kém hơn độ tin cậy Whisper (tương quan với nhãn người −0,339 so với −0,441); band dùng độ tin cậy nhận dạng và ngữ điệu, gắn nhãn độ tin cậy thấp | Không dùng nội dung transcript làm bằng chứng phát âm (ASR tự sửa lời nói); không để LLM cho band P vì LLM không nghe được audio; giữ kênh âm vị cho gợi ý từ và để phát hiện bản ghi hỏng |
| ADR-22 | Task 2 mặc định đi luồng Reference: phân loại dạng đề, thang bài mẫu theo band, một lần gọi trả cả 4 tiêu chí, rồi tổng hợp và rewrite như cũ. Chủ dự án chọn ngày 2026-11-07, dùng `qwen3.7-plus` (v5 của `writing/task2/grade`) và chấp nhận hai cổng chưa đạt. Đo trên 44 bài held-out, nhãn chưa kiểm chứng: MAE 1,239 so với 1,227 của `legacy` trên cùng bài, độ phân tán 0,46 (cổng 0,70), **p90 74,4 s, vượt NFR-02**, 1 thay vì 4 lượt gọi LLM chấm điểm | Bốn lượt gọi tiêu chí và trần band từ số liệu công cụ làm điểm dồn về band 6–7; TTR không phân biệt band trong dữ liệu (0,549 ở band 4, 0,555 ở band 8). Không tự rơi về `legacy` khi thiếu kho tham chiếu vì sẽ trộn hai cách chấm dưới một nhãn |
| ADR-23 | Lộ trình học dùng luật kết hợp mô hình năng lực: Elo (Rasch 1 tham số) cho dạng câu L/R, trung bình động cho tiêu chí W/S; tính lúc xem, không thêm bảng. Không dùng collaborative filtering, deep knowledge tracing hay LLM. Chủ dự án chốt 2026-11-08 | Bản demo 100–300 tài khoản: collaborative filtering thiếu dữ liệu và hỏng ở người mới; deep knowledge tracing cần dữ liệu lớn và trái giả định không tự huấn luyện mô hình; LLM chậm, mỗi lần một khác, khó kiểm thử và trái BR-19. Elo cập nhật trực tuyến, không cần huấn luyện, chạy được với ít dữ liệu, giải thích được từng gợi ý và kiểm thử được bằng ca cụ thể |
| ADR-24 | Core API truy cập Postgres bằng client async có pool kết nối (qua pooler của Supabase) cho các đường gọi nhiều (tự lưu, nộp, quota, giao bài); chạy nhiều bản sao sau reverse proxy (Traefik); rate limit ở Cloudflare và theo user trong Redis. Chốt 2026-11-08, chưa code | Client Supabase đồng bộ qua PostgREST chặn event loop; 1 tiến trình không mở rộng được. Không bỏ hẳn supabase-py: các đường ít gọi giữ nguyên để giảm rủi ro |
| ADR-25 | Tự lưu bài theo kiểu write-behind: lượt lưu vào Redis Streams (có số phiên bản), một consumer group gom theo lô và ghi một lệnh xuống Postgres mỗi 1–2 s; nộp bài đọc bản mới nhất trước khi khoá. Redis hỏng thì ghi thẳng DB. Chốt 2026-11-08, chưa code | Ghi thẳng DB với 5.000 người là khoảng 333 lượt ghi/giây. Không dùng Kafka: Redis Streams đủ cho tải này và đã có Redis |
| ADR-26 | Quan sát hệ thống: OpenTelemetry ở Core API, worker, AI engine; Prometheus + Grafana cho metrics (độ dài hàng đợi, p95 tự lưu, thời gian chấm); Sentry cho lỗi; nối `trace_id` với Langfuse. Load test bằng k6, đo trước và sau khi đổi kiến trúc. Chốt 2026-11-08, chưa code | Không có số đo thì không chứng minh được chịu tải hay NFR-02 |
| ADR-27 | Chấm có hàng đợi ưu tiên (Mock trước Practice) và báo vị trí trong hàng. AI engine chạy trên máy có GPU của nhóm qua Cloudflare Tunnel khi phát triển; thuê GPU theo giờ (pod, ngân sách ≤ 500.000 đ) cho ngày load test và ngày bảo vệ, chạy 2 bản để chứng minh mở rộng được. (Should) LiteLLM làm gateway LLM: giới hạn tốc độ chung, thử lại, model dự phòng. Chốt 2026-11-08, chưa code | Cloudflare không chạy được torch và không có GPU. Không dùng GPU serverless vì nạp model mỗi lần khởi động chậm |
| ADR-28 | Không dùng Kubernetes, Kafka, Temporal, hay tách thêm microservice | Nhóm 3 người, 1 tháng, không có người vận hành; Docker Compose, Redis Streams và cron quét bảng có lease đã đủ cho quy mô thiết kế |
| ADR-29 | Truy vết AI: một trace Langfuse cho mỗi `grading_run`, nhóm theo `session_id = attempt_id`; mỗi lần gọi LLM là một generation. Chi phí tính và lưu trong DB (`grading_runs.cost_usd`) làm nguồn cho badge ngân sách. Trace giữ 90 ngày, xoá bằng cron gọi API Langfuse (cài đặt retention chỉ có ở gói Pro trở lên); gói Hobby chỉ cho xem 30 ngày gần nhất, nên link trace cũ hơn 30 ngày không mở được dù dữ liệu còn. `output` lượt lỗi giữ 180 ngày. **Dùng Langfuse Cloud gói Hobby (miễn phí)**: xem trace 30 ngày, 50.000 đơn vị/tháng (ước 6–10 đơn vị mỗi lượt chấm, khoảng 5.000 lượt/tháng). Số liệu lâu dài (token, chi phí, độ trễ, lỗi) lấy từ `grading_runs`, không phụ thuộc Langfuse. Load test bật lấy mẫu trace (`sample_rate`) để không đốt hạn mức. Chuyển sang tự host bằng Docker khi dùng quá 80% hạn mức tháng hoặc cần xem trace cũ hơn 30 ngày. Chốt 2026-11-11, chưa code | Khớp 1:1 với cột `trace_id`; mỗi job ARQ tự mở trace, không phải chuyển trace context giữa các job; chạy lại tạo trace mới, tách khỏi lần cũ. Một trace cho mỗi attempt phải chuyển context qua job và lẫn lần chạy lại; một trace cho mỗi lần gọi thì mất liên kết giữa 4 tiêu chí và các lần thử. Chi phí lưu trong DB để badge không phụ thuộc Langfuse. Trace chứa bài làm nên giữ ngắn (Nghị định 13) |
| ADR-30 | Tài liệu theo đề Writing, lấy Prep làm chuẩn (chủ dự án chốt 2026-11-11): đáp án số liệu Task 1, dàn ý, bài mẫu do AI soạn nháp, Admin sửa và duyệt, lưu ở `writing_task_materials`. Task 1 có đáp án đã duyệt thì chấm theo đáp án thay cho đọc ảnh, có danh sách ý chính mà độ đúng số liệu do code quyết định; mức chỉ số con kẹp theo band; bài nộp trùng y nguyên ở lần chấm đầu dùng lại kết quả (`grading_runs.input_hash` + dấu vân tay prompt và model từ `GET /grading-fingerprint`). Đo 2026-11-11 trên đề "Consumption of Spreads" với đáp án nhập tay: bài đúng số TA 9.0, 8/8 ý đúng; bài cố tình sai số TA 5.0, 7/8 ý có nhắc, 3 ý đúng, cả 4 ý sai số bị chỉ ra kèm số đúng; mỗi bài khoảng 70 s. Cùng bài sai số, Prep cho 18/21 ý "đạt" | Đọc ảnh mỗi lần chấm: mô tả sai thì TA sai mà không ai biết, và chậm. Thêm cột vào `writing_tasks`: lộ đáp án cho Learner (RLS `published_read`) và không điền được cho đề đã publish. Để LLM tự chấm độ đúng số liệu: dễ xuôi theo bài, giống danh sách của Prep chỉ kiểm tra có nhắc tới. Cache Redis có TTL: mất khi khởi động lại, không truy vết được |
| ADR-31 | Kết quả Speaking chi tiết theo chuẩn Prep (2026-11-11): lỗi và điểm mạnh do chính lần chấm GRA/LR trả về dạng trích nguyên văn, vị trí do code tìm và kiểm; lưu trong `grading_runs.output` theo khuôn của `annotations`, chép sang `annotations` khi luồng Expert (spec 003) thêm cột cho Speaking; GRA/LR dùng qwen3.7-plus. Đo trên audio demo Prep (Part 2, 73 s): 11 lỗi, 0 lệch vị trí, khớp 7/9 lỗi Prep còn trong transcript của mình; GRA 7.0 → 6.5, LR 7.0 → 6.5 (Prep 6 và 5); FC vẫn 8 (Prep 6), chưa xử lý; tổng 90 s | Model sửa lỗi (GEC) riêng như Prep: thêm model và GPU, và có thể khen một cụm rồi lại đánh lỗi chính cụm đó (bài demo Prep có "working on" vừa là collocation vừa là lỗi). Để LLM tự cho vị trí ký tự: không tin được. qwen-flash: trích cả câu, có mục "không lỗi", GRA chỉ ra 4 lỗi. Viết migration `annotations` ngay: đổi DB dùng chung khi chưa có luồng Expert dùng tới |

---

## 9. Bảo mật

**Ma trận quyền:**

| Hành động | Learner | Expert | Admin |
|---|---|---|---|
| Xem đề đã publish (không kèm đáp án) | ✓ | ✓ | ✓ |
| Soạn, duyệt, publish, archive đề; quản lý bộ đề | ✗ | ✗ | ✓ |
| Xem đáp án, lời giải, transcript | Attempt của mình, sau khi nộp | ✗ | ✓ |
| Làm, tự lưu, nộp bài | Attempt của mình | ✗ | ✗ |
| Xem attempt và audio | Của mình | Chỉ bài được giao | ✓ |
| Xin Expert chấm lại | Bài Practice của mình, trong quota | ✗ | ✗ |
| Chấm, nhận xét, đánh dấu lỗi | ✗ | Assignment đang mở của mình | ✗ |
| Xem điểm AI của bài đang chấm | ✓ (nhãn estimate/preliminary) | Bài được giao, ngay khi mở bài | ✓ |
| Giao lại, chạy lại chấm AI | ✗ | ✗ | ✓ |
| Quản lý tài khoản | Của mình | Của mình | Tất cả |
| Cấu hình, dữ liệu tham chiếu, audit log | ✗ | ✗ | ✓ |

**Mối đe doạ STRIDE mức cao và cách chặn:**
- Tự đổi role thành admin bằng anon key: không có policy ghi; trigger chỉ đọc `app_metadata`; FK `(id, role)`.
- Đọc attempt của người khác: RLS chỉ cho đọc dòng của mình; endpoint của người không sở hữu trả **404** (không trả 403).
- Đọc đáp án qua DevTools hoặc REST: bảng `question_keys` riêng; DTO trả trước khi nộp không chứa đáp án.
- Gọi thẳng AI engine `/grade` để đốt quota Qwen: chỉ mạng Docker nội bộ, có secret header, không mở CORS.
- Lộ service role key, key Qwen hay Langfuse: chỉ dùng ở server; **không commit `.env`**; bật secret scanning.
- Spam nộp bài để tốn chi phí AI: rate limit theo user trong Redis; bắt buộc xác minh email; mỗi đề chỉ 1 attempt đang mở.
- Audio chỉ truy cập qua signed URL ngắn hạn.
- Dữ liệu cá nhân theo Nghị định 13/2023: đồng ý trước khi ghi âm, cho xuất và xoá khi người dùng yêu cầu, xoá audio sau 180 ngày.

---

## 10. Danh mục sơ đồ

Gốc: `~/Downloads/Tat-ca-so-do-drawio/`. Mỗi sơ đồ có `.drawio` (để sửa) và `.png` (để xem).

| Thư mục | File | Hình trong báo cáo |
|---|---|---|
| `01_UseCase` | `UC0_overview`, `UC1_account`, `UC2_learner_tests`, `UC3_results`, `UC4_expert`, `UC5_admin_content`, `UC6_admin_ops` | 2.1–2.7 |
| `02_Sequence` | `SD00_overview`, `SD01_register`, `SD02_writing`, `SD03_speaking`, `SD04_listening_reading`, `SD05_mock_test`, `SD06_regrading_request`, `SD07_expert_grading`, `SD08_test_authoring`, `SD09_rerun_reassign` | 2.8–2.23 |
| `03_Kien_truc` | `ARCH_system` | 4.1 |
| `04_State_Flow` | `ST_attempt`, `ST_evaluation`, `ST_review_request`, `ST_review_assignment`, `ST_test`, `ST_speaking_room`, `FLOW_expert_request` | 2.12, 2.15, 2.16, 2.19–2.21, 2.24 |
| `05_ERD_Chen` | `Hinh_2.28_ERD_overview` … `Hinh_2.33_ERD_Expert_grading`, `Hinh_B.1_ERD_full` | 2.25–2.30, B.1 |
| `06_Quan_he_CSDL` | `Hinh_2.34_Full_relationship_diagram`, `Hinh_2.35`–`2.38` (theo từng vùng) | 2.31–2.35 |

> Số hình trong tên file (2.28…2.38) lệch với số hình trong báo cáo (2.25…2.35) vì báo cáo đã đánh số lại. Khi đối chiếu thì dựa vào **tên nội dung**.

---

## 11. Mâu thuẫn đã phát hiện và cách xử lý

| # | Mâu thuẫn | Quyết định |
|---|---|---|
| 1 | Sơ đồ SD-00, 02, 03, 05, 08, 09 vẽ "Job Queue (**Supabase pgmq**)"; chữ trong báo cáo (mục 3.4 và quyết định kiến trúc "ba khối Core API, worker, AI engine") và ARCH_system ghi **Redis + ARQ** | Theo **Redis + ARQ**. Sơ đồ SD cần sửa nhãn |
| 2 | Quyết định "prompt quản lý trên Langfuse" ghi "prompts must be backed up in the repository"; người dùng chỉ thị "Quản lý prompt tập trung trên Langfuse, không lưu backup gì ở local" | Theo **chỉ thị người dùng**: prompt chỉ có trên Langfuse; sửa prompt bằng cách tạo version mới trên Langfuse; danh sách tên prompt nằm trong `backend/app/ai/services/langfuse/prompt_registry.py`. Từ 2026-11-11 Admin tạo phiên bản và đổi label ngay trong app (UC-22); app gọi API Langfuse, vẫn không lưu bản sao nào khác. Báo cáo cần sửa quyết định đó |
| 3 | Báo cáo ghi Qwen-VL đọc biểu đồ Task 1 | Code dùng `qwen3.7-plus` (`vision_llm_model`) vì đếm chính xác hơn `qwen3-vl-plus` trong lúc demo. Về bản chất vẫn là "model vision của Qwen" |
| 4 | `ARCHITECTURE.md` nói LangGraph, Arize Phoenix | Lỗi thời. Pipeline thật là asyncio + OpenAI SDK + Langfuse |
| 6 | Báo cáo ghi "P suy ra từ độ chính xác phát âm"; Langfuse có `speaking/common/pr` để LLM cho band | Code tính band P, prompt `pr` v3 chỉ giải thích. Band dựa trên độ tin cậy nhận dạng, không còn dựa trên độ chính xác âm vị, nên báo cáo cần sửa theo ADR-21 |
| 5 | Tài khoản không có quyền sửa Exposed schemas trên Dashboard | Trong lúc test, schema mới tạm được expose bằng `ALTER ROLE authenticator SET pgrst.db_schemas`. Đã **RESET** khi cutover (2026-11-03); chỉ còn `public` |
| 7 | Báo cáo ghi Expert chấm không thấy điểm AI, chỉ xem sau khi nộp; có buổi Speaking trực tiếp (Later) | Theo chỉ thị 2026-11-08: Expert nhận sẵn điểm và nhận xét AI rồi sửa; bỏ buổi Speaking trực tiếp (Won't, ghi là hướng phát triển); không khiếu nại điểm Expert; hạn 48 giờ không tính cuối tuần. Báo cáo, UC-15/16, SD-07 và sơ đồ UC cần sửa |
| 8 | Báo cáo và thiết kế DB có Mock đủ 4 kỹ năng trong một lượt (Should, `mock_sessions`, thứ tự L, R, W, S) | Theo chỉ thị 2026-11-08: Mock chỉ từng kỹ năng; Learner muốn thi đủ 4 kỹ năng thì tự làm lần lượt. Ngày 2026-11-09 đã xoá bảng `mock_sessions`, view `mock_session_results`, cột `attempts.mock_session_id`, ràng buộc 3 cũ (migration `20261109130000`). Báo cáo, UC-08 và sơ đồ (ERD Chen, sơ đồ quan hệ Hình 2.34: 32 bảng, 2 view) cần sửa |

---

## 12. Trạng thái code thực tế (cập nhật 2026-11-11)

**Đã thống nhất một schema duy nhất `public` (từ 2026-11-09: 32 bảng + 2 view) theo §7. Không còn khái niệm v1/v2.** Cutover chạy 2026-11-03: các object `public` cũ chuyển sang schema `legacy` (29 bảng, 19 enum, 5 hàm; chỉ để sao lưu, **chưa xoá**), schema mới đổi tên thành `public`, trigger đăng ký `on_auth_user_created` → `public.handle_new_user` (không nuốt lỗi), Realtime publication gồm `attempts`, `review_requests`, `free_essays`.

| Thành phần | Trạng thái |
|---|---|
| DDL | `supabase/migrations/20261103130000_baseline_schema.sql` là migration gốc (dựng được từ đầu: 38 bảng gồm các bảng ngoài sơ đồ, 3 view, 0 quyền `anon`). `20261107100000_atomic_grading_jobs.sql` thêm các function nộp bài và kết thúc chấm chạy trong một transaction (ADR-07); đã chạy lên Supabase 2026-11-07, Core API và worker cần migration này. Thay đổi sau này: thêm file đánh số lớn hơn |
| Test ràng buộc | `supabase/tests/`: `schema_constraints_test.sql` 46/46, `grading_job_functions_test.sql` 19/19, `saved_work_and_integrity_test.sql` 21/21, `random_mock_selection_test.sql` 14/14 PASS trên Supabase (2026-11-09), tự rollback |
| Migration bỏ mock session | `20261109130000_drop_mock_sessions.sql` (đã chạy 2026-11-09): xoá `mock_sessions`, `session_status`, `mock_session_results`, cột `attempts.mock_session_id`; dựng lại view `attempt_results` (không đổi cột nào khác, `anon` không có quyền). DB thật: 32 bảng, 2 view, 43 FK. `schema_constraints_test.sql` còn 46 test (bỏ 2 test của mock session) |
| Migration Mock ngẫu nhiên | `20261109120000_random_mock_selection.sql` (đã chạy 2026-11-09): trigger `sync_test_allowed_mode` (trong bộ → `mock`, ngoài bộ → `practice`; `block_published_edit` cho đổi `allowed_mode` của đề đã publish vì không phải nội dung); `check_attempt_start` chặn Mock trên đề Learner đã có attempt; function `start_mock_attempt`, `mock_pool_summary`; `test_is_published` ẩn đề Mock với Learner chưa có attempt. Backend: `POST /test-practice/mock/start`, `GET /test-practice/mock/summary`; `POST /attempts/start` với Mock chỉ để làm tiếp; `GET /tests/{id}/content` trả 404 với đề Mock; danh mục Practice bỏ đề Mock. Frontend: mục "Thi thử (Mock) theo kỹ năng" thay mục bộ đề; nội dung đề Mock tải qua `/attempts/{id}/content`. Hệ quả: kho Practice còn 13 đề (Writing 2, Speaking 1) vì 19 đề trong bộ thành đề Mock; muốn thêm đề Practice thì Admin bỏ đề khỏi bộ hoặc import thêm. `random_mock_selection_test.sql` 14/14 PASS |
| Migration 2026-11-09 | `20261109100000_saved_work_auto_submit_and_integrity.sql` (đã chạy lên Supabase): CHECK `abandoned` chỉ cho Mock (xoá 17 dòng Practice `abandoned` cũ); cột `attempts.auto_submitted`; function `save_lr_answers`, `save_writing_essays` (tự lưu, từ chối khi đã nộp hoặc quá hạn + 30 s); `submit_*` nhận `p_auto`, khoá attempt trước rồi ghi bài, `p_tasks NULL` = chấm bài đã lưu, `submit_lr_attempt` tự tính điểm thô, số câu, band; trigger chặn ghi `answers`/`essays` sau khi nộp, chặn sửa evaluation đã kết thúc (trừ `is_official`) cùng `criterion_scores`/`annotations` của nó, `audit_logs` chỉ thêm; thu quyền đọc cột `lr_sections.transcript`; `publish_ai_evaluation`/`fail_ai_evaluation` đưa Mock có yêu cầu Expert mở sang `waiting_expert`, điểm AI không chính thức. `20261107110000` (DROP 5 bảng chấm bài tự do) cũng đã chạy cùng ngày: còn 33 bảng |
| Kết nối psql | `SUPABASE_DB_URL` trong `backend/.env` (Session pooler) |
| Backend | Một đường code duy nhất `app/db/supabase.py: db()`; không còn cờ `DB_SCHEMA`. Services: `practice/`, `writing/`, `listening_reading/`, `speaking/`, `admin/`, `cms/`, `importers/` |
| Role | `learner \| expert \| admin` ở cả backend và frontend. Trạng thái attempt theo tên thiết kế (`grading`, `grading_failed`, `waiting_expert`, `no_speech`) |
| Smoke test | 51/51 PASS trên `public` sau cutover; `pytest` backend 26 pass; `tsc` frontend sạch |

| Spec 006 tài liệu theo đề (2026-11-11) | Migration `20261111120000_writing_task_materials.sql` **đã chạy** lên Supabase 2026-11-11 (quyền giống `question_keys`: `anon` không có quyền, `authenticated` chỉ SELECT qua RLS Admin). Test trên app 2026-11-11 (đề Practice "Museum visitors"): AI soạn đáp án sai 1 điểm (mùa hè 10 giờ: 800, đúng ≈ 650), Admin sửa rồi duyệt; dàn ý hiện trong phòng Practice; bài cố tình sai 3 số chấm theo đáp án trong 59,5 s, TA 6.5, danh sách 5/6 có nhắc, 3/5 đúng số, 2 đỉnh sai hiện kèm số đúng; nộp lại y nguyên dùng cache, 1,8 s, cùng điểm. AI engine: `POST /draft-material`, `GET /grading-fingerprint`, `/grade` nhận `answer_key`; prompt Langfuse mới `writing/task1/answer-key`, `writing/task1/keycheck`, `writing/common/outline`, `writing/common/sample` (v1), bản mới `writing/task1/ta` v4, `writing/task1/rewrite` v5, `writing/task2/rewrite` v4. Core API: `/admin/writing-tasks/{id}/material` (GET, PUT, `/draft`, `/approve`), dàn ý trong nội dung đề Practice, bài mẫu và danh sách ý chính trong `/essays/{id}/results`, cache trong worker. Frontend: thẻ "Tài liệu theo đề" trong SectionEditor Writing, tab "Ý chính" và "Bài mẫu" ở trang kết quả, nhãn mức chỉ số con, nút gợi ý dàn ý khi làm bài. Script `backend/scripts/draft_writing_materials.py` soạn nháp hàng loạt. Test: AI engine 141, backend 162 pass |

**Cột ngoài sơ đồ (cố ý):** `grading_runs.claimed_at` + `recovery_count` (migration `20261107100000`, lease cho job chấm); `grading_runs.input_hash` (migration `20261111120000`, cache bài trùng); trong baseline: `question_keys.evidence`, `annotations.title`, `grading_runs.output`, `question_groups.subtype` + `template`, `tests.difficulty`, `questions.diagram_coordinate`.

**Writing Task 2 (2026-11-07):** luồng Reference (ADR-22) là mặc định, nên điểm Task 2 của bài chấm mới sẽ khác trước; bài đã chấm không đổi. Prompt `writing/task2/grade` v5 dùng `qwen3.7-plus`; p90 toàn luồng 74,4 s, chưa đạt NFR-02 (≤ 60 s). Phân loại dùng Jev (85–86/96 đề có nhãn, Qwen 83/96 khi đo cùng ngày); thiếu `TYPESAFE_API_KEY` hoặc Jev lỗi thì dùng `writing/task2/classify`. Cả hai pipeline Task 2 đều qua bước này, nên title đề được gửi cho TypeSafe.

**Chấm bài tự do đã bỏ (2026-11-07):** đã gỡ `/exam`, `admin/topics` và các API `/topics`, `/essays/evaluate`, `GET /essays`; giữ `GET /essays/{id}/results` vì Writing trong attempt dùng. Migration `20261107110000_drop_free_essay_feature.sql` xoá 5 bảng `topics`, `free_essays`, `evaluation_results`, `essay_annotations`, `evaluation_logs`, **chạy sau khi code mới đã triển khai**. Band bài tự do không còn tính vào hồ sơ học tập và thống kê Admin.

**Legacy đang chờ xoá:** schema `legacy` (bản sao dữ liệu cũ). Xoá bằng `DROP SCHEMA legacy CASCADE` **chỉ sau khi nhóm xác nhận** và đã pull code mới.

**Hành vi thay đổi do schema buộc phải vậy:**
- Đề published/archived không sửa được (luật "đề đã xuất bản không được sửa") → API trả 409.
- Lỗi ràng buộc DB khi soạn đề trả 409 hoặc 400 kèm lý do thay vì 500: tạo đề cùng kỹ năng trong một bộ Mock (FR-36), xoá bộ còn đề archived (BR-10). `POST /attempts/start` trả thêm `server_time`; đồng hồ thi thử ở frontend không được dài hơn hạn `deadline_at` của server (BR-07: nộp trễ quá 30 s bị từ chối).
- Nạp đề từ dataset (`/admin/ingest/*`): thư mục mặc định là `dataset_clean/` ở gốc repo (đổi bằng biến môi trường `DATASET_ROOT`); thư mục không tồn tại → 404. Importer chạy trong luồng riêng (không làm đứng API khác). `success = true` chỉ khi không có lỗi; lỗi giữa chừng thì đề nháp vừa tạo được dọn (chạy lại được); file không tồn tại, `skill` lạ, thiếu `path` được báo lỗi rõ ràng. Câu không có đáp án trong file lời giải để trống (không gán `N/A`). Tiêu đề trùng trong dataset được báo cảnh báo (chống trùng vẫn theo tiêu đề và kỹ năng, vì bảng `tests` chưa có cột khoá nguồn). Đề nạp xong luôn ở trạng thái **nháp** (UC-30); Admin rà soát rồi tự xuất bản ở trình soạn đề, nên Learner chưa thấy đề cho tới lúc đó. Lượt chấm AI thành công ghi `grading_runs.model` (lấy từ AI engine); `trace_id` vẫn trống vì AI engine chưa có Langfuse tracing. Thẻ "Total Essays" ở thống kê Admin là tổng bài Writing trong đề.
- Bảng quy đổi band: `band` phải là bội số của 0.5 (422); khoảng chồng lấn hoặc trùng 409; xoá dòng không tồn tại 404. Cài đặt hệ thống: nhận giá trị JSON bất kỳ (kể cả số); khoá không tồn tại 404. Chủ đề: `description` tuỳ chọn.
- Admin đổi đề, bộ đề, câu hỏi hoặc bảng quy đổi thành công thì cache Redis phía Learner (danh mục, nội dung đề, bài tập theo dạng) mất hiệu lực ngay, nhờ route class `StudentContentMutationRoute` tăng số phiên bản trong khoá. Redis lỗi thì đọc thẳng DB.
- Importer không còn gán `test_set`; bộ Mock (UNIQUE(test_set_id, skill)) tạo riêng: 5 bộ "IELTS Recent Actual Tests – Mock Set 1..5".
- Speaking nộp bài không còn band giả 6.5: trạng thái `grading` hoặc `no_speech`.
- (2026-11-09) Không còn dữ liệu giả ở phòng thi và trang kết quả: tải đề lỗi thì báo lỗi (trước đây hiện đề mẫu, Learner làm đề giả trên attempt thật); nộp lỗi thì báo lỗi và ở lại phòng thi (trước đây chuyển sang trang kết quả mẫu với band giả); nộp mà bài đã được nộp (tab khác, cron tự nộp) thì tới kết quả thật; trang kết quả không có `attemptId` báo "không tìm thấy bài làm". Mở lại bài Mock đã kết thúc: `POST /attempts/start` trả `closed: true` và trang chuyển tới kết quả (bài `abandoned` thì báo không có kết quả). Đồng hồ R/L/W dùng chung `useExamCountdown`: tính từ mốc kết thúc, không đứng khi đang gõ, hết giờ nộp đúng một lần.
- Đáp án mẫu Writing/Speaking từ dataset không được lưu.
- L/R chỉ có band khi đủ 40 câu (luật "band chỉ tính khi đủ 40 câu"); ngược lại `overall_band: null`, frontend hiện "—". `DELETE /student/history/{id}` chỉ áp dụng cho bài chưa nộp: Practice đang dở → xoá hẳn; Mock đang dở (thoát phòng thi) → `abandoned`; bài đã nộp → 409. Frontend gọi endpoint này khi thoát phòng thi Mock và có nút xoá cho bài Practice dở ở trang lịch sử. Xem attempt của người khác → 404.
- Admin cũ `n22dccn050@…`, `test1@gmail.com` thành Learner; attempt của Expert và 53 essay không có attempt không được chuyển.
- Cột `is_activated` bỏ: "đã kích hoạt" = có `last_sign_in_at` trong Supabase Auth.

**Điểm lệch còn lại so với thiết kế:**
- Chấm Writing và Speaking chạy qua ARQ (`app/services/grading/`), nên cần Redis và worker. Không có Redis thì API vẫn chạy bằng `NullRedisCache`, bài được lưu nhưng chờ chấm tới khi Redis và worker hoạt động.
- Mock chưa tự tạo yêu cầu Expert chấm (luật quota Mock cho Expert), nên điểm AI vẫn là chính thức. DB đã sẵn: có yêu cầu Expert mở thì điểm AI chỉ là preliminary và attempt sang `waiting_expert` (migration 2026-11-09). Thiết kế luồng Expert chốt ngày 2026-11-08 (mục Expert bên dưới), chưa code.
- Tự lưu và tự nộp (spec 004, làm 2026-11-09): L/R và Writing tự lưu lên server (`PUT /test-practice/attempts/{id}/work`, hook `useServerAutosave`, nhãn trạng thái lưu); `POST /attempts/start` trả `saved_work` để làm tiếp trên máy khác. Cron `auto_submit_mocks_task` (worker, mỗi phút) nộp Mock quá hạn + 30 s bằng bài đã lưu; nộp tay sau hạn cũng chấm bài đã lưu thay vì 409. Writing Mock không có chữ nào thì thành `abandoned`, `auto_submitted = true`. **Chưa làm:** thông báo "bài Mock đang dở, còn X phút" khi quay lại (US2), Speaking hỏi lại câu dở (US4), lựa chọn gửi Expert cho bài tự nộp (FR-013, chờ luồng Expert), hiện nhãn "nộp tự động" ở trang kết quả (FR-014), load test 5.000 người.
- Core API chạy 1 tiến trình uvicorn; endpoint `async` gọi client Supabase đồng bộ nên mỗi lượt gọi DB chặn event loop. Phải sửa trước khi chịu tải lớn (mục tiêu load test 5.000 người ở spec 004; phương án ở `docs/defense-highlights.md` §8).
- AI engine chưa trả model/prompt version/trace id → các cột truy vết mỗi lần chấm (model, phiên bản prompt, mã trace) trong `grading_runs` còn trống.
- Transcript Listening dữ liệu cũ nằm trong `passage_text`, hiện trước khi nộp (trái yêu cầu "transcript Listening chỉ hiện sau khi nộp"). Cột `lr_sections.transcript` đã bị thu quyền đọc với `authenticated` (2026-11-09); dữ liệu cần chuyển sang cột đó.
- Frontend polling 5 s cho Writing (`useWritingAttemptSummary.ts`), chưa dùng Realtime.
- Đề Writing: 97 đề trên R2 (`ielts-learning`, prefix `dataset/writing/`), mới nhập 6; 91 đề còn lại import sau.
- Expert workflow: làm một phần.
- Lộ trình học (spec 005, làm 2026-11-11): band hiện tại theo BR-12, overall BR-02, khoảng cách, số ngày tới ngày thi (giờ VN) trong `GET /test-practice/learning-profile` (`current_bands`, `exam`); thẻ "Bước tiếp theo" ở `GET /test-practice/learning-profile/next-step` (package `backend/app/services/learner_journey/`, luật thuần + Elo, không LLM, không bảng mới). 58 unit test (`backend/tests/test_learner_journey_*.py`). Mỗi endpoint ~1,4 s gồm xác thực (đo từ máy dev tới Supabase; các lượt đọc chạy song song). Overview cache 30 s, xoá khi nộp L/R; W/S chấm ở worker nên có thể trễ tới 30 s. Band tự nhập (`input_band`) không còn dùng làm band; banner "Đầu vào" vẫn hiện giá trị mặc định 4.0 vì `learner_profiles` không có cột này. Bài L/R nộp trống (40 câu, 0 đúng, band 0.0) vẫn tính vào band hiện tại như mọi kết quả chính thức (chủ dự án chốt 2026-11-11).

**Speaking (2026-11-06):** đã có phòng thi Practice và Mock (đồng ý ghi âm, mic check, ghi âm thật, upload presigned, hết giờ tự chuyển câu, Mock không ghi lại và tự nộp), pipeline chấm hai kênh, màn kết quả thật, job xoá audio 180 ngày trong ARQ. Không cần migration.
- Cần `R2_PRIVATE_BUCKET_NAME`: bucket không public, có CORS cho `PUT` từ origin frontend. Chưa cấu hình thì API upload trả 503.
- Chấm chạy qua hàng đợi Speaking, mỗi lần một bài. Worker chết giữa lúc chấm thì cron tự chạy lại sau khi hết lease (25 phút). Attempt `grading_failed` chạy lại bằng `backend/scripts/regrade_speaking_attempt.py`.
- Job xoá audio chỉ chạy khi có tiến trình `arq app.worker.tasks.WorkerSettings`.
- Audio câu hỏi vẫn là link bên thứ ba; Piper TTS (FR-32), sửa CMS Speaking, kiểm tra khi publish để đợt sau.
- Mock chưa có Expert nên điểm AI là chính thức; chưa có nhãn "preliminary".
- `grading_runs.trace_id` vẫn trống. `model` và `prompt_versions` đã ghi cho cả Writing và Speaking. Writing luồng cũ (Task 1): `model` là một tên nếu 4 tiêu chí cùng model, khác nhau thì ghi theo nhóm (ví dụ `ta=qwen3.7-plus; cc,lr,gra=qwen-flash`); `prompt_versions` là phiên bản Langfuse của 4 prompt tiêu chí. Luồng Reference ghi model và phiên bản của `writing/task2/grade`.
- Bộ đếm âm tiết đếm thiếu ở lời nói nối âm (mẫu thử: 11 so với 14–15 âm tiết thật); cần kiểm chứng ở bộ đo thử.
- Giấy phép: `praat-parselmouth` là GPLv3; L2-ARCTIC là CC BY-NC 4.0; trọng số CrisperWhisper chỉ cho phi thương mại. Dùng được cho KLTN, cần xem lại nếu thương mại hoá.

**Expert (thiết kế chốt 2026-11-08, chưa code):** đã có `GET /expert/me`, `PATCH /expert/me/availability` và trang `expert/profile`. Chưa có giữ chỗ quota, suất chung, job giao bài, trả lại bài, màn chấm, nhãn "preliminary", thời điểm dự kiến cho Learner. Đặc tả ở `specs/003-expert-review/spec.md`. Kỳ nghỉ lễ do Admin đặt trong app (BR-22, chốt 2026-11-08); Learner biết qua lý do từ chối và thông báo trước khi thi Mock, app không có chức năng thông báo chung.

**Admin giám sát AI (thiết kế chốt 2026-11-11, chưa code):** hiện có `GET /admin/evaluations/logs` (sẽ đổi thành `/admin/grading-runs`); `trace_id` còn trống (đã có `get_trace_id()` trong `app/ai/services/langfuse/tracing.py` nhưng chưa nối); chưa có API chạy lại (Speaking dùng `backend/scripts/regrade_speaking_attempt.py`), API audit log, sửa prompt trong app, chi phí và badge; `app/schemas/admin.py` còn trường cũ `phoenix_trace_id`.

**Bảo mật đã sửa:** JWT fallback verify HS256 + `aud=authenticated`; không còn mượn user đầu tiên khi chưa đăng nhập; xoá lịch sử kiểm tra chủ sở hữu.

**Khi viết code mới:**
1. Bám **tên khái niệm và quy tắc** trong file này (BR, trạng thái, quyền).
2. Đổi schema bằng migration đánh số trong `supabase/migrations/`, cập nhật §7/§12 cùng commit.
3. Chỉ migrate DB, không thêm tính năng ngoài yêu cầu.
4. Không commit secret; `.env` nằm trong gitignore.

---

## 13. Câu hỏi còn mở

- LiteLLM hỗ trợ DashScope (Qwen) tới mức nào; nếu không đủ thì tự viết bộ giới hạn tốc độ trong Redis (ADR-27).
- Frontend Next.js 16 chạy trên Cloudflare Workers qua OpenNext: cần thử trước khi chuyển.

- Spec 006: Admin duyệt đáp án cho 96 đề Task 1 (đã soạn nháp hàng loạt 2026-11-11); đo lại độ chính xác danh sách ý chính trên nhiều đề và Expert kiểm tra. Bài mẫu AI soạn còn sai so sánh và dài hơn mức 170–200 từ: Admin phải đọc kỹ trước khi duyệt. Ý chính sai mốc thời gian (ví dụ "về 0 lúc 5 giờ" thay vì 3 giờ) đang bị tính là "chưa nhắc tới" thay vì "sai số liệu". Phòng làm bài Writing báo "Maximum update depth exceeded" và rơi ký tự khi gõ rất nhanh (công cụ tự động); lỗi có trong `WritingWorkspace.tsx`, không thuộc spec 006, chưa rõ gặp với người gõ thật không.
- Task 2 chưa đạt NFR-02 (p90 74,4 s) và cổng độ phân tán (0,46 so với 0,70): giữ luồng Reference và nới cổng, hay tối ưu tiếp (ADR-22)?
- Khi nào xoá schema `legacy` (cần nhóm xác nhận đã pull code mới)?
- Import 91 đề Writing còn lại từ R2 vào `public`.
- Chuyển `backend/app/ai` ra `ai-engine/` ở gốc repo để tách khỏi package Core API (`pytest` trần trong `backend/` đang lỗi vì quét vào đó). Làm sau khi spec 002 xong; cần kiểm tra thư mục gốc trong cấu hình deploy.
- Chương IV (triển khai, giao diện, kiểm thử, đánh giá AI) chưa viết. Vì Expert sửa từ bản AI nên không đo MAE như hai người chấm độc lập; dùng tỉ lệ và mức Expert sửa (§1).
- Host AI engine ở đâu: Cloudflare Workers không chạy được torch, Cloudflare Containers chưa có GPU. Lựa chọn: máy có GPU nối qua Cloudflare Tunnel, VPS chỉ CPU (chưa đo tốc độ), hoặc thuê GPU. Core API, worker và Redis cần chỗ chạy liên tục.
- Quyết định "prompt quản lý trên Langfuse" trong báo cáo cần sửa cho khớp quyết định "chỉ Langfuse".
- Banner "Đầu vào" ở dashboard luôn hiện 4.0 (không có cột `input_band`): giữ nguyên, bàn sau (2026-11-11).
- Tham số lộ trình (K, p0, m, vùng 0,60–0,75, ngưỡng 6 câu và 2 bài, cửa sổ 14 ngày) là giá trị khởi đầu; hiệu chỉnh khi có dữ liệu Learner thật.
- Hiệu chuẩn ngưỡng rubric phát âm bằng bộ đo thử (`docs/speech-eval-recording-script.md`) và sau đó bằng dữ liệu Expert.
