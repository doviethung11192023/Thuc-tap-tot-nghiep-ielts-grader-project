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
- **AI chỉ dùng để chấm, không bao giờ dùng để tạo đề** (BR-19, ADR-16). TTS chỉ đọc câu hỏi do người viết.

### Phạm vi (MoSCoW)

| Mức | Chức năng |
|---|---|
| Must (MVP) | Đăng ký/đăng nhập, phân quyền theo vai trò; mục tiêu cá nhân; dashboard + lộ trình theo luật; soạn đề (5 dạng câu hỏi), duyệt, publish, archive, import file; bộ đề Mock; L/R Practice + Mock chấm tự động; Writing chấm AI (cả Task 1 có biểu đồ); Speaking trong phòng thi có AI examiner; lịch sử, đáp án, lời giải; Expert chấm Mock và chấm lại theo yêu cầu, có đánh dấu lỗi; dashboard Admin, giám sát chấm AI, audit log |
| Should | Mock đủ 4 kỹ năng trong một lượt |
| Could | Phản hồi phát âm theo từng âm vị; câu hỏi Diagram/Map labelling; MFA cho Admin; audio Listening nhiều giọng bằng TTS từ kịch bản do người viết |
| Later | Thông báo qua email; General Training; buổi Speaking trực tiếp với Expert (FR-25, UC-13, UC-17); AI examiner hỏi thêm câu |
| Won't | AI tạo đề; tự xây video call; thanh toán, gói premium; app native; cam kết điểm AI bằng điểm giám khảo |

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

Expert chấm **mà không thấy điểm AI** và chỉ được xem điểm AI **sau khi đã nộp điểm của mình**. Điểm Expert không ghi đè điểm AI; các cặp điểm AI–Expert được dùng để đo độ chính xác của AI.

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
| FR-08 | Dashboard | Lộ trình theo luật (BR-17): kỹ năng ưu tiên, tiêu chí hoặc dạng câu yếu nhất, gợi ý 3 đề. **Tính lúc xem, không lưu** |
| FR-09 | Practice | R/L: làm cả đề hoặc chọn phần, không giới hạn giờ, được dừng và tua audio, xem đáp án ngay sau khi nộp |
| FR-10 | Mock | Mock 1 kỹ năng hoặc cả 4; đồng hồ do server giữ; audio Listening phát 1 lần (server ghi lại lượt phát) |
| FR-11 | Mock | Tự lưu đáp án và bài viết; làm tiếp được sau khi mất mạng hoặc tải lại trang |
| FR-12 | Mock | Tự nộp khi hết giờ |
| FR-13 | Chấm | Chấm R/L bằng so khớp đáp án đã chuẩn hoá (BR-14); chỉ quy ra band khi làm đủ 40 câu (BR-03) |
| FR-14 | Kết quả | Đáp án, lời giải, transcript Listening sau khi nộp |
| FR-15 | Writing | Viết và nộp Task 1, Task 2 hoặc cả hai (Practice cho làm 1 task), đếm từ theo thời gian thực |
| FR-16 | Writing | AI chấm 4 tiêu chí mỗi task, có nhận xét và đánh dấu lỗi trong bài; Task 1 chấm cùng ảnh biểu đồ và mô tả dữ liệu |
| FR-17 | Speaking | Phòng thi: phát câu hỏi, ghi âm trong giới hạn thời gian, tự chuyển câu; Part 2 có cue card và 1 phút chuẩn bị |
| FR-18 | Speaking | STT, đo độ trôi chảy và phát âm, AI chấm 4 tiêu chí |
| FR-19 | Chấm | Hiện trạng thái chấm (đang chấm, chờ Expert, xong, lỗi) và cập nhật ngay khi có kết quả |
| FR-20 | Expert | Learner xin Expert chấm lại bài W/S Practice đã có điểm AI, trong quota (BR-16) |
| FR-21 | Expert | Expert bật/tắt trạng thái Available |
| FR-22 | Expert | Tự giao cho Expert Available đang ít việc nhất; Admin giao lại thủ công; giữ lịch sử mọi lần giao |
| FR-23 | Expert | Expert xem bài, nghe audio, chấm theo tiêu chí, đánh dấu lỗi, viết nhận xét; điểm AI chỉ hiện sau khi nộp |
| FR-24 | Expert | Xem lịch sử chấm |
| FR-25 | Expert | (Later) Lên lịch và tổ chức buổi Speaking trực tiếp |
| FR-26 | CMS | Soạn đề 5 dạng câu hỏi MVP: editor theo từng dạng, bài đọc, audio, ảnh, xem trước như Learner |
| FR-27 | CMS | Soạn, duyệt, kiểm tra trước khi publish, quản lý phiên bản, nguồn và giấy phép; archive đề không dùng |
| FR-28 | Admin | Dữ liệu tham chiếu: bảng quy đổi band, tiêu chí và band descriptor, prompt AI, quota Expert |
| FR-29 | Admin | Dashboard hệ thống: người dùng, attempt, phân bố band, hoạt động Expert, chênh lệch AI–Expert |
| FR-30 | Admin | Giám sát chấm AI: lượt chạy lỗi, độ trễ, token; chạy lại chấm AI |
| FR-31 | CMS | Import đề hàng loạt từ mẫu Excel/JSON, báo lỗi theo từng dòng |
| FR-32 | CMS | Sinh audio câu hỏi Speaking bằng TTS lúc soạn đề; nghe lại, sinh lại, hoặc thay bằng bản ghi âm |
| FR-33 | Expert | Bài Mock có W/S tự tạo yêu cầu cho Expert; điểm Expert là chính thức (BR-08, BR-15) |
| FR-35 | CMS | (Could) Audio Listening nhiều giọng bằng TTS từ kịch bản do người viết |
| FR-36 | CMS | Quản lý bộ đề Mock: gom 4 đề kỹ năng thành 1 bộ |
| FR-37 | Admin | Xem audit log của Admin |
| FR-38 | Speaking | Xin đồng ý ghi âm trước lần ghi đầu tiên, nói rõ mục đích dùng và thời gian lưu |

## 3. Yêu cầu phi chức năng (NFR)

| Mã | Nhóm | Mục tiêu đo được |
|---|---|---|
| NFR-01 | Hiệu năng | API thường: p95 < 500 ms ở 20 rps; kết quả R/L < 1 s |
| NFR-02 | Hiệu năng AI | Writing ≤ 60 s, Speaking ≤ 120 s (p90, tải bình thường) |
| NFR-03 | Độ tin cậy | Mất mạng không mất bài: tự lưu mỗi 10–15 s và mỗi lần đổi câu |
| NFR-04 | Bảo mật | HTTPS; mật khẩu do Supabase Auth quản lý; Core API kiểm quyền cho mọi thao tác nghiệp vụ; RLS trên mọi bảng; không gửi đáp án xuống client trước khi nộp |
| NFR-05 | Truy vết AI | Mỗi lần gọi AI lưu model, prompt version, Langfuse trace id, token, độ trễ, lỗi (bảng `grading_runs`) |
| NFR-06 | Minh bạch | Mọi điểm AI có nhãn "estimate"; điểm AI của bài Mock đang chờ Expert có nhãn "preliminary" |
| NFR-07 | Riêng tư | Xin đồng ý xử lý giọng nói (nói rõ dữ liệu lưu ở nước ngoài); tự xoá audio Speaking sau 180 ngày; tuân thủ Nghị định 13/2023/NĐ-CP |
| NFR-08 | Tương thích | Chrome, Edge, Firefox bản mới; ghi âm cần HTTPS và quyền micro |
| NFR-09 | Bảo trì | Test tự động phủ ≥ 60% module chấm điểm và phân quyền; API mô tả bằng OpenAPI |
| NFR-10 | Triển khai | Phần tự host (Core API, worker, AI engine, Redis) chạy bằng Docker Compose; schema dựng từ các file SQL đánh số; dựng môi trường mới từ clone trong < 30 phút |
| NFR-11 | An toàn dữ liệu | Dùng anon key hoặc JWT người dùng thì không ghi được bảng nào và chỉ đọc được dữ liệu được phép; có test tự động |

## 4. Quy tắc nghiệp vụ (BR): bắt buộc tuân thủ trong code và DB

| Mã | Quy tắc |
|---|---|
| BR-01 | Band từ 0 đến 9, bước 0.5 |
| BR-02 | Overall = trung bình 4 kỹ năng, làm tròn: phần lẻ < .25 thì xuống; từ .25 đến < .75 thành .5; từ .75 thì lên band nguyên kế tiếp |
| BR-03 | Band L/R quy đổi từ số câu đúng /40 theo bảng Academic lưu trong DB, **chỉ khi đủ 40 câu**; nếu không thì hiển thị "x / y đúng" |
| BR-04 | Writing: mỗi task = trung bình 4 tiêu chí (TA/TR, CC, LR, GRA); **Task 2 nặng gấp đôi Task 1**: (T1 + 2·T2)/3, làm tròn 0.5. Practice làm 1 task thì lấy band của task đó |
| BR-05 | Speaking = trung bình 4 tiêu chí (FC, LR, GRA, P) |
| BR-06 | Task 1 < 150 từ hoặc Task 2 < 250 từ: cảnh báo khi nộp (vẫn cho nộp); số từ được gửi cho AI để trừ điểm TA/TR |
| BR-07 | Giờ Mock: L 30', R 60', W 60', S 11–14'. Server từ chối đáp án đến muộn hơn deadline 30 s. Listening Mock phát 1 lần, không dừng, không tua; Practice thì cho cả hai |
| BR-08 | Điểm Expert không ghi đè điểm AI; lưu và hiện cả hai. Mỗi attempt có **đúng 1 kết quả chính thức**: điểm Expert nếu có, nếu không thì điểm AI (riêng bài Mock đang chờ Expert thì điểm AI chỉ là "preliminary"). Chạy lại AI không thay được điểm Expert |
| BR-09 | Không giới hạn số lần chấm AI mỗi ngày; chống lạm dụng bằng rate limit theo user và bắt buộc xác minh email |
| BR-10 | Đề đã publish không sửa trực tiếp; sửa thì tạo phiên bản mới, attempt cũ vẫn trỏ về phiên bản cũ |
| BR-11 | Mỗi yêu cầu có tối đa 1 assignment đang mở, giao cho Expert Available chưa đạt tải tối đa; sau **48 h** chưa xong thì assignment kết thúc và yêu cầu quay lại hàng đợi |
| BR-12 | Band hiện tại của một kỹ năng = trung bình điểm chính thức của **3 bài Mock gần nhất** (không tính bài đang chờ Expert). Chưa có Mock: trung bình 5 bài Practice gần nhất có band, kèm nhãn độ tin cậy thấp. Ít hơn 2 bài: "chưa đủ dữ liệu" |
| BR-13 | Speaking: Part 1 mỗi câu tối đa 45 s; Part 2 chuẩn bị 60 s, nói tối đa 120 s; Part 3 mỗi câu tối đa 90 s. Hết giờ thì dừng ghi và sang câu tiếp. Mock: phát 1 lần, không dừng, không ghi lại. Thời gian lưu theo từng part, Admin sửa được |
| BR-14 | Chấm L/R: không phân biệt hoa thường; bỏ khoảng trắng thừa; đúng nếu khớp bất kỳ đáp án nào trong danh sách; từ trong ngoặc là tuỳ chọn ("(the) library" chấp nhận "the library" và "library"); vượt giới hạn số từ thì 0 điểm; nhóm "Choose N letters" mỗi lựa chọn đúng tính 1 lần; 1 điểm/câu, không trừ điểm |
| BR-15 | Mock có W/S tự tạo yêu cầu Expert. Mỗi Learner tối đa **2 bài Mock được Expert chấm mỗi tuần** (cấu hình được); vượt quota vẫn làm được nhưng chỉ có điểm AI, và phải báo trước khi bắt đầu |
| BR-16 | Learner xin Expert chấm lại tối đa **3 bài Practice mỗi tuần** (cấu hình được); mỗi attempt tối đa 1 yêu cầu đang mở |
| BR-17 | Lộ trình: kỹ năng ưu tiên là kỹ năng có khoảng cách (mục tiêu − hiện tại) lớn nhất; hoà thì chọn band thấp hơn; kỹ năng chưa đủ dữ liệu xếp đầu để làm bài chẩn đoán. L/R: dạng câu có độ chính xác thấp nhất trong 5 bài gần nhất; W/S: tiêu chí thấp nhất. Gợi ý 3 đề Practice đã publish của kỹ năng đó, ưu tiên dạng câu hoặc task liên quan, chưa làm trong 14 ngày qua. Tính lại mỗi lần xem dashboard |
| BR-18 | Learner chỉ thấy đề đã publish. Mỗi đề lưu loại nguồn (original, open licence, public domain), tên nguồn, giấy phép, và phải được Admin duyệt trước khi publish |
| BR-19 | Không dùng AI để tạo nội dung đề. TTS chỉ đọc câu do người viết; AI chỉ dùng để chấm |

---

## 5. Use case (37 UC)

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
| UC-13 | Đặt lịch Speaking với Expert | Learner | Later | FR-25 |
| UC-14 | Cập nhật trạng thái Available | Expert | Must | FR-21 |
| UC-15 | Xem bài được giao | Expert | Must | FR-22, 23 |
| UC-16 | Chấm và nhận xét W/S | Expert | Must | FR-23 |
| UC-17 | Tổ chức Speaking trực tiếp | Expert, Learner | Later | FR-25 |
| UC-18 | Xem lịch sử chấm | Expert | Must | FR-24 |
| UC-19 | Quản lý tài khoản (tạo Expert, khoá/mở khoá) | Admin, Supabase Auth | Must | FR-03, 04 |
| UC-21 | Soạn, duyệt, publish đề | Admin | Must | FR-26, 27 |
| UC-22 | Cấu hình AI và dữ liệu tham chiếu | Admin | Must | FR-28 |
| UC-23 | Xem dashboard hệ thống | Admin | Must | FR-29 |
| UC-24 | Giám sát và chạy lại chấm AI | Admin, LLM | Must | FR-30 |
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

### Đặc tả các UC lõi (rút gọn)

**UC-06 Dashboard.** Chưa đặt mục tiêu thì yêu cầu đặt trước. Tính band từng kỹ năng theo BR-12 và overall theo BR-02. Hiện khoảng cách tới mục tiêu, số ngày còn lại, biểu đồ, lịch sử. Áp dụng BR-17 để ra kỹ năng ưu tiên, điểm yếu, 3 đề gợi ý và 1 câu lý do (ví dụ "Writing thấp hơn mục tiêu 1.0 band; tiêu chí yếu nhất là CC"). Kỹ năng thiếu dữ liệu thì gợi ý bài chẩn đoán. Hết đề chưa làm trong 14 ngày thì nới điều kiện và gợi ý đề cũ nhất. Không ghi dữ liệu.

**UC-08 Mock.** Chọn 1 kỹ năng hoặc cả bộ. Hiện số lượt Expert còn lại trong tuần (BR-15). Bộ đầy đủ tạo `mock_session`; mỗi kỹ năng có một Attempt với deadline. Trả đề **không kèm đáp án**. Tự lưu 10–15 s. Listening phát 1 lần (server ghi lượt phát, từ chối lần 2). Khi nộp: khoá attempt; L/R chấm ngay; W/S tạo job chấm AI và yêu cầu Expert. Thứ tự L, R, W, S. Ngoại lệ:
- Nộp hai lần thì chỉ lần đầu có hiệu lực.
- Đáp án muộn hơn deadline 30 s bị từ chối.
- Có attempt dở của cùng đề thì phải chọn làm tiếp hoặc huỷ.
- Hết quota thì chỉ chấm AI, và điểm AI là chính thức.

**UC-09 Writing.** Practice: Task 1, Task 2 hoặc cả hai. Mock: cả hai. Task 1 phóng to được biểu đồ. Đếm từ, tự lưu. Nộp xong trả về ngay; worker chấm từng task (1 grading run/task, 4 tiêu chí chạy song song, tìm lỗi). Lưu 4 điểm tiêu chí/task và các lỗi, tính band theo BR-04, đánh dấu chính thức nếu chưa có điểm Expert. Trình duyệt nhận kết quả qua Realtime. Hiện nhãn "estimate". Ngoại lệ:
- LLM timeout hoặc lỗi 429/5xx: thử lại 3 lần có backoff; vẫn lỗi thì attempt chuyển `grading_failed` và Admin chạy lại (UC-24).
- JSON sai: hỏi lại tối đa 2 lần.
- Bài viết chứa lệnh nhắm vào AI (prompt injection): đã có biện pháp chặn.
- Không đọc được ảnh (vision lỗi): chấm Task 1 chỉ bằng mô tả dữ liệu và ghi chú trong kết quả.

**UC-10 Speaking.** Xin đồng ý ghi âm (UC-35), rồi kiểm tra micro, rồi tạo Attempt. Part 1, 2, 3 theo BR-13. Mỗi câu trả lời upload thẳng lên R2 bằng presigned URL ngay sau khi ghi; Core API kiểm kích thước và định dạng. Khi nộp, worker gọi AI engine: STT (có timing từng từ), đo fluency và pronunciation, LLM chấm FC/LR/GRA, P suy ra từ độ chính xác phát âm, band theo BR-05. Ngoại lệ:
- Mất quyền micro: dừng phòng thi, giữ các câu đã ghi.
- Upload lỗi: tự thử lại.
- Sai định dạng: Practice thì ghi lại; Mock thì tính là không trả lời.
- Mọi câu đều im lặng: trạng thái `no_speech`, không gọi LLM.
- Audio giữ 180 ngày rồi tự xoá.

**UC-16 Expert chấm.** Danh sách bài sắp theo hạn, có nhãn Mock/Practice. Mở bài thấy đề, bài làm hoặc audio kèm transcript, và mục tiêu của Learner (không thấy điểm AI). Bấm Start thì tạo draft evaluation. Nhập band và nhận xét từng tiêu chí (Writing thì theo từng task), đánh dấu lỗi (UC-37), lưu nháp được. Submit trong **một transaction**: lưu điểm và lỗi, hoàn tất assignment, đặt Expert evaluation là chính thức, chuyển attempt Mock từ `waiting_expert` sang `scored`. Sau đó mới thấy điểm AI và đánh dấu đồng ý hay không (`agrees_with_ai`). Assignment quá 48 h hoặc đã bị giao lại thì từ chối submit. Expert bị khoá thì các assignment đang mở kết thúc.

**UC-21 Soạn đề.** Tạo test (tiêu đề, kỹ năng, mode cho phép, thời lượng, nguồn, giấy phép), rồi thêm các phần:
- L/R: bài đọc hoặc transcript, nhóm câu, câu hỏi, lựa chọn, đáp án, lời giải.
- Writing: đề Task 1/2, loại đề, số từ tối thiểu, biểu đồ và mô tả dữ liệu.
- Speaking: part, chủ đề, thời gian, câu hỏi.

Upload media lên R2, rồi TTS chạy nền, rồi xem trước, rồi Publish. Validate trước khi publish: đủ 40 câu L/R; mọi câu có đáp án; đáp án là nhãn lựa chọn có thật; nhóm "Choose N" hợp lệ; đủ audio; Task 1 có biểu đồ; có nguồn và giấy phép. Publish thì ghi reviewer, thời điểm và audit log. Sửa đề đã publish hoặc đã có attempt thì sao thành bản nháp mới.

**UC-30 Import.** Tải mẫu theo kỹ năng, điền, rồi upload file kèm media. Validate như UC-21, xem trước và danh sách lỗi theo dòng/cột, xác nhận thì tạo đề nháp và xếp TTS. Có lỗi thì **không lưu gì**. Trùng nguồn thì cảnh báo và cho tạo phiên bản mới.

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
| SD-06 | Xin chấm lại: kiểm tra chủ sở hữu, AI đã chấm xong, quota BR-16, chưa có yêu cầu mở; tạo request `waiting`; cron mỗi 10 phút chọn Expert rảnh, tạo assignment 48 h, báo cho Expert |
| SD-07 | Expert chấm: kiểm assignment, tạo draft, chấm, validate band, tính overall; một transaction lưu điểm, hoàn tất assignment và request, đặt bản Expert là chính thức; báo cho Learner; hiện điểm AI để so sánh |
| SD-08 | Soạn đề: presigned upload lên R2, lưu nháp, job TTS (worker + AI engine, lưu audio vào R2), publish (validate, ghi audit) |
| SD-09 | Admin chạy lại AI (kiểm tra không đang chấm, tạo evaluation **mới**, ghi audit, enqueue; **không chính thức nếu đã có điểm Expert**) hoặc giao lại (kết thúc assignment cũ, tạo assignment 48 h mới, ghi audit, báo Expert mới) |

**Flowchart tạo và giao yêu cầu Expert:**
- Nộp Mock W/S: còn quota BR-15 thì tạo request `waiting`; hết quota thì chỉ chấm AI và điểm AI là chính thức.
- Xin chấm lại Practice: đã chấm AI, chưa có yêu cầu mở, còn quota BR-16 thì tạo request `waiting`; không thì từ chối kèm lý do.
- Có Expert Available dưới tải tối đa thì tạo assignment hạn 48 h, request chuyển `assigned`; không có thì giữ trong hàng đợi, thử lại sau 10 phút.
- Kết thúc assignment: `completed` (Expert nộp, điểm Expert chính thức), `reassigned` (Admin giao lại), hoặc `expired` (quá 48 h, request về `waiting`).
- Yêu cầu Mock được giao **trước** yêu cầu Practice.

**Máy trạng thái.** Tên trạng thái trùng enum trong DB; Core API chỉ được thực hiện các chuyển trạng thái liệt kê dưới đây.

- **attempts.status:** `in_progress` → `submitted` (Learner nộp hoặc hết giờ) → L/R: `scored`; W/S: `grading` → `scored`, hoặc `waiting_expert` (Mock có yêu cầu Expert) → `scored` (Expert nộp). Nhánh phụ:
  - `in_progress` → `abandoned`: **chỉ Mock (thi thử)**; Learner thoát phòng thi giữa chừng thì tính là bỏ dở. Dòng giữ lại, ẩn khỏi lịch sử
  - Practice (luyện tập) `in_progress` mà Learner xoá thì **xoá hẳn dòng attempt** (và `attempt_sections`, `answers` theo); không có trạng thái `abandoned`. Bài đã nộp không xoá được (409)
  - `grading` → `grading_failed` (lỗi sau 3 lần thử, báo Admin) → `grading` (Admin chạy lại)
  - Speaking im lặng toàn bộ → `no_speech`
  - Practice có điểm Expert về sau: kết quả Expert thành chính thức, trạng thái giữ `scored`.
- **evaluations.status:** AI: `pending` → `done` (tính `overall_band`) hoặc `failed`. Expert: `draft` (lưu nháp) → `done`. Không bao giờ ghi đè; mỗi attempt có đúng 1 evaluation chính thức.
- **review_requests.status:** `waiting` → `assigned` → `completed`. Assignment hết hạn: quay lại `waiting`. Learner huỷ (chỉ Practice): `cancelled`.
- **review_assignments:** `assigned` (`due_at` = `assigned_at` + 48 h) → `in_review` (ghi `started_at`, lưu nháp) → kết thúc `completed` / `expired` / `reassigned` (ghi `ended_at`, `end_reason`). Kết quả do Expert cũ gửi muộn bị từ chối.
- **tests.status:** `draft` → `published` (Admin duyệt, kiểm tra tự động đạt, ghi `reviewer_id` và `reviewed_at`, khoá nội dung) → `archived` (ẩn khỏi danh mục). Sửa đề đã publish thì sao thành `draft` phiên bản mới.
- **Phòng thi Speaking:** `mic_check` (ghi 5 s, phát lại, kiểm âm lượng) → Part 1 [`asking` → `recording` ≤ 45 s]* → Part 2 [`cue_card` → `preparing` 60 s → `recording` ≤ 120 s] → Part 3 [`asking` → `recording` ≤ 90 s]* → `uploading` (chờ mọi file được confirm) → nộp attempt.

---

## 7. Thiết kế cơ sở dữ liệu (đích: 33 bảng, 3 view, 45 FK)

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
- `speaking_parts(section_id PK/FK, kind FK, topic, prep_seconds, answer_seconds)`
- `question_groups(id PK, lr_section_id FK, order_no, question_type, instructions, image_key, select_count, allow_reuse, max_words)`
- `group_options(group_id PK/FK, label PK, text)`
- `questions(id PK, group_id FK, lr_section_id FK, number, prompt)`
- `question_options(question_id PK/FK, label PK, text)`
- `question_keys(question_id PK/FK, accepted_answers text[], explanation)`: **tách riêng, Learner không có quyền đọc**
- `speaking_questions(id PK, speaking_part_id FK, order_no, prompt, audio_key)`
- `criteria(id PK, code, name, skill, task_type)`
- `criterion_descriptors(criterion_id PK/FK, band PK, descriptor)`

**Làm bài (7)**
- `mock_sessions(id PK, learner_id FK, test_set_id FK, status, started_at)`
- `attempts(id PK, learner_id FK, test_id FK, skill FK, mode, status, mock_session_id FK, started_at, deadline_at, submitted_at, raw_score, question_count, lr_band)`
- `attempt_sections(attempt_id PK/FK, section_id PK/FK, test_id FK, started_at, audio_played_at, finished_at)`
- `answers(attempt_id PK/FK, question_id PK/FK, section_id FK, answer, is_correct, updated_at)`
- `essays(id PK, attempt_id FK, section_id FK, content, word_count (cột generated), updated_at)`, `UNIQUE(attempt_id, section_id)`
- `speaking_responses(id PK, attempt_id FK, speaking_question_id FK, section_id FK, audio_key, duration_ms, transcript, confirmed_at, audio_deleted_at)`
- `speech_metrics(response_id PK/FK, name PK, value)`

**Chấm điểm (4)**
- `evaluations(id PK, attempt_id FK, skill FK, evaluator_type, status, overall_band, feedback, is_official, created_at, agrees_with_ai, submitted_at)`
- `grading_runs(id PK, evaluation_id FK, evaluator_type FK, task_no, status, model, prompt_versions, trace_id, error, input_tokens, output_tokens, latency_ms, started_at, finished_at)`
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

**View (3):** `attempt_results` (band của attempt, luôn lấy từ kết quả chính thức), `mock_session_results` (overall theo cách làm tròn IELTS), `review_request_details` (completed_at; nguồn lấy từ `attempts.mode`).

**Lưu sẵn hay tính khi đọc:**
- Lưu một lần lúc tạo hoặc lúc chấm, vì không bao giờ đổi: `deadline_at`, `raw_score`, `is_correct`, `evaluations.overall_band`.
- Tính trong view: `ATTEMPT.Band`, `MOCK_SESSION.Overall_band`.
- `word_count`: cột generated.

### 16 ràng buộc nghiệp vụ trong DB

| # | Ràng buộc | Cơ chế |
|---|---|---|
| 1 | Kiểu con của section khớp skill của test | CHECK `sections(skill, kind)` + FK ghép `(test_id, skill)`, `(section_id, kind)` |
| 2 | Attempt chỉ chứa section của chính test đó | FK ghép từ `attempt_sections` tới `attempts(id, test_id)` và `sections(id, test_id)`; answers, essays, recordings trỏ tới `attempt_sections` |
| 3 | Mỗi skill tối đa 1 attempt trong một mock session; test phải thuộc bộ đề của session | `UNIQUE(mock_session_id, skill)`; FK `(mock_session_id, learner_id)`; trigger `check_attempt_start` |
| 4 | Chỉ attempt W/S mới có evaluation và yêu cầu Expert | CHECK skill + FK ghép `(attempt_id, skill)`; review_requests dùng `(attempt_id, learner_id, skill)` |
| 5 | Đúng 1 kết quả chính thức; Expert ưu tiên hơn AI | `UNIQUE(attempt_id) WHERE is_official`; trigger `check_official_priority` |
| 6 | Tiêu chí khớp skill và task (TA chỉ cho Task 1, TR chỉ cho Task 2) | FK `(criterion_id, skill)`, `(evaluation_id, skill)`; CHECK task_no; trigger `check_criterion_task` |
| 7 | Đáp án là nhãn lựa chọn có thật; nhóm "Choose N" đủ đáp án | Core API kiểm lúc publish |
| 8 | Không lộ đáp án trước khi nộp | Bảng `question_keys` riêng, không có policy đọc cho Learner |
| 9 | Expert evaluation và assignment cùng một attempt | FK ghép `(evaluation_id, attempt_id, evaluator_type)` |
| 10 | Mỗi request tối đa 1 assignment đang mở | `UNIQUE(request_id) WHERE ended_at IS NULL` |
| 11 | Mỗi attempt tối đa 1 request đang mở | `UNIQUE(attempt_id) WHERE status IN ('waiting','assigned')` |
| 12 | Chỉ làm được đề đã publish, ở mode được phép | trigger `check_attempt_start` |
| 13 | Expert chỉ thấy điểm AI sau khi nộp điểm của mình | RLS `expert_eval_read` |
| 14 | 1 essay cho mỗi (attempt, task); 1 recording cho mỗi (attempt, câu hỏi) | `UNIQUE(attempt_id, section_id)`; `UNIQUE(attempt_id, speaking_question_id)` |
| 15 | Các khoảng quy đổi band của cùng skill không chồng nhau | `EXCLUDE (skill WITH =, int4range(raw_min, raw_max) WITH &&)` |
| 16 | Mỗi dòng audit có actor: Admin, hoặc system cho tác vụ tự động | `CHECK ((actor_type='system') = (actor_id IS NULL))`; FK `(actor_id, actor_role)` |

**Trigger:**
- `check_attempt_start`: kiểm ràng buộc 3 và 12.
- `fill_question_section`: điền `section_id` cho câu hỏi.
- `check_criterion_task`: kiểm ràng buộc 6.
- `check_official_priority`: kiểm ràng buộc 5.
- `check_expert_capacity`: không giao vượt `max_active_reviews`.
- `block_published_edit`: chặn sửa mọi bảng nội dung của đề đã publish hoặc archived.
- `handle_new_user`: tạo profile. **Chỉ đọc role từ `app_metadata` do server kiểm soát**, để người dùng không tự cấp quyền Admin.

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
| Mọi người đã đăng nhập | Đề, bộ đề, section, câu hỏi, lựa chọn đã publish; danh mục tiêu chí. **Không** đọc được `question_keys` |
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

### Pipeline chấm Writing (AI engine)

| Phase | Việc | Code |
|---|---|---|
| A | Tiền xử lý: tách đoạn và câu, đếm từ | `utils/preprocessor.py` |
| B | Phân loại dạng đề Task 2 (6 dạng) bằng LLM; LanguageTool bắt lỗi ngữ pháp và chính tả; thống kê từ vựng (lặp từ, mật độ, TTR). Task 1: model vision mô tả biểu đồ | `services/task_type_classifier.py`, `handlers/grammar_checker.py`, `handlers/lexical_stats.py`, `services/chart_describer.py` |
| C | Lấy 4 prompt tiêu chí từ Langfuse (label `production`), chèn các tín hiệu từ phase B | `services/prompt_builder.py`, `services/langfuse/prompt_manager.py` |
| D | Gọi Qwen song song cho 4 tiêu chí, ép JSON, tự sửa JSON sai tối đa 2 lần | `services/llm_evaluator.py` |
| Band | Trung bình 4 tiêu chí, làm tròn theo luật IELTS **trong code** | `schemas/llm_output.py` |
| E, F | Prompt rewrite tạo danh sách lỗi kèm bản sửa và bài đã sửa; code định vị lại vị trí ký tự và loại phần chồng lấn | `services/synthesis_service.py`, `utils/char_index_resolver.py`, `utils/annotation_normalizer.py` |

**Luồng Reference cho Task 2 (ADR-22, mặc định tắt):** bật bằng `WRITING_TASK2_PIPELINE=reference`; mặc định `legacy` là bảng trên. Task 1 luôn đi bảng trên.

| Bước | Việc | Code |
|---|---|---|
| 1 | Phân loại dạng đề từ title: Jev (TypeSafe, chỉ gửi title), lỗi hoặc thiếu key thì dùng prompt `writing/task2/classify`, vẫn không có đáp án thì `Unknown` | `services/jev_client.py`, `services/task_type_classifier.py` |
| 2 | Chọn thang tham chiếu: mỗi band 5, 6, 7, 8 một bài cùng dạng; cùng bài nộp luôn ra cùng thang; bậc thiếu ghi vào `reference_gaps`, `Cause_Effect` mượn từ `Cause_Solution` | `services/reference_corpus.py` |
| 3 | Một lần gọi `writing/task2/grade` chấm cả 4 tiêu chí; số liệu LanguageTool và thống kê từ vựng chỉ để tham khảo, không có trần band | `services/holistic_grader.py` |
| 4 | Dùng lại bước rewrite; band tổng tính trong code | `services/task2_reference_pipeline.py` |

Kho tham chiếu là file đọc-chỉ `data/reference_corpus/` (2.885 bài, git-ignored), mount vào container vì AI engine không truy cập DB. Nhãn band của `chillies/IELTS-writing-task-2-evaluation` **chưa kiểm chứng**: nguồn không nêu người chấm và giấy phép, nên không dùng làm bằng chứng độ chính xác so với giám khảo. Mô tả band trong prompt là bản diễn giải của nhóm, không phải nguyên văn Band Descriptors chính thức.

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

**Giới hạn đã biết:** band P ước lượng độ dễ hiểu, chưa chấm được từng âm, nên lỗi mà ASR đoán lại được vẫn có thể lọt; nhầm sang từ có thật ("ship"/"sheep") không phát hiện được với bài nói tự do; model học từ giọng chuẩn nên dễ coi giọng Việt là lỗi, bảng biến thể chỉ giảm chứ không loại hết; gợi ý từ chỉ hiện "có thể" và bỏ sót phần lớn lỗi; ngưỡng rubric là **tạm** cho tới khi có dữ liệu so với Expert. Số đo ở `docs/speech-eval-report.md`.

Ghi âm tắt `noiseSuppression`, `autoGainControl`, `echoCancellation` của trình duyệt vì chúng làm biến dạng tín hiệu cần đo.

### Hợp đồng API của Core API (đích thiết kế)

| Method | Path | Mô tả | Quyền | UC |
|---|---|---|---|---|
| GET, PUT | `/users/me`, `/users/me/goals` | Hồ sơ; mục tiêu và ngày thi | User; Learner | 04, 05 |
| POST | `/users/me/voice-consent` | Ghi nhận đồng ý ghi âm | Learner | 35 |
| GET | `/users/me/dashboard`, `/recommendations`, `/quotas` | Band hiện tại, khoảng cách, lộ trình (BR-17), quota Expert còn lại | Learner | 06, 08, 12 |
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
| POST | `/expert/assignments/{id}/start`, `/draft`, `/submit` | Mở bài, lưu nháp, nộp điểm, nhận xét và lỗi | Expert được giao | 16, 37 |
| POST, PATCH | `/admin/experts`, `/admin/users/{id}/status` | Tạo Expert và gửi lời mời; khoá/mở khoá | Admin | 19 |
| CRUD, POST | `/admin/tests`, `/admin/test-sets`, `/admin/tests/{id}/publish`, `/archive`, `/new-version` | Soạn đề và bộ đề; publish; archive; tạo phiên bản mới | Admin | 21, 34, 36 |
| POST | `/admin/media-uploads`, `/admin/speaking-questions/{id}/tts`, `/admin/tests/import` | Upload media; sinh lại audio câu hỏi; import đề | Admin | 39, 31, 30 |
| GET, POST | `/admin/grading-runs`, `/admin/attempts/{id}/regrade` | Lượt chấm lỗi hoặc treo kèm trace id; chạy lại chấm AI | Admin | 24 |
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
| ADR-16 | Không dùng AI tạo đề | Tránh sai đáp án, sai độ khó, vi phạm bản quyền |
| ADR-17 | Ràng buộc "đúng kiểu" bằng FK ghép có cột phân loại | DB tự từ chối dữ liệu sai |
| ADR-18 | Tách assignment khỏi request | Giữ được lịch sử giao, giao lại, hết hạn |
| ADR-19 | Band L/R chỉ khi làm đủ 40 câu | Không cho ra band gây hiểu nhầm |
| ADR-20 | Rate limit thay cho quota chấm AI theo ngày | Practice không bị chặn; chi phí AI theo dõi trên dashboard |
| ADR-21 | Speaking hai kênh; band P tính trong code, LLM chỉ giải thích. Theo cổng quyết định, kênh âm vị không vào band P vì đo trên L2-ARCTIC kém hơn độ tin cậy Whisper (tương quan với nhãn người −0,339 so với −0,441); band dùng độ tin cậy nhận dạng và ngữ điệu, gắn nhãn độ tin cậy thấp | Không dùng nội dung transcript làm bằng chứng phát âm (ASR tự sửa lời nói); không để LLM cho band P vì LLM không nghe được audio; giữ kênh âm vị cho gợi ý từ và để phát hiện bản ghi hỏng |
| ADR-22 | Task 2 có luồng Reference: phân loại dạng đề, thang bài mẫu theo band, một lần gọi chấm cả 4 tiêu chí. Giữ `legacy` làm mặc định vì đo trên 120 bài held-out: MAE 1,216 so với 1,271, p90 57,6 s nhưng độ phân tán chỉ 0,44 so với cổng 0,70 và 2/120 bài lỗi JSON. Nhãn đo chưa kiểm chứng | Bốn lượt gọi tiêu chí và trần band từ số liệu công cụ làm điểm dồn về band 6–7; TTR không phân biệt band trong dữ liệu (0,549 ở band 4, 0,555 ở band 8). Không tự rơi về `legacy` khi thiếu kho tham chiếu vì sẽ trộn hai cách chấm dưới một nhãn |

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
| Xem điểm AI của bài đang chấm | ✓ (nhãn estimate/preliminary) | Chỉ sau khi đã nộp điểm | ✓ |
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
| 2 | Quyết định "prompt quản lý trên Langfuse" ghi "prompts must be backed up in the repository"; người dùng chỉ thị "Quản lý prompt tập trung trên Langfuse, không lưu backup gì ở local" | Theo **chỉ thị người dùng**: prompt chỉ có trên Langfuse; sửa prompt bằng cách tạo version mới trên Langfuse; danh sách tên prompt nằm trong `backend/app/ai/services/langfuse/prompt_registry.py`. Báo cáo cần sửa quyết định đó |
| 3 | Báo cáo ghi Qwen-VL đọc biểu đồ Task 1 | Code dùng `qwen3.7-plus` (`vision_llm_model`) vì đếm chính xác hơn `qwen3-vl-plus` trong lúc demo. Về bản chất vẫn là "model vision của Qwen" |
| 4 | `ARCHITECTURE.md` nói LangGraph, Arize Phoenix | Lỗi thời. Pipeline thật là asyncio + OpenAI SDK + Langfuse |
| 6 | Báo cáo ghi "P suy ra từ độ chính xác phát âm"; Langfuse có `speaking/common/pr` để LLM cho band | Code tính band P, prompt `pr` v3 chỉ giải thích. Band dựa trên độ tin cậy nhận dạng, không còn dựa trên độ chính xác âm vị, nên báo cáo cần sửa theo ADR-21 |
| 5 | Tài khoản không có quyền sửa Exposed schemas trên Dashboard | Trong lúc test, schema mới tạm được expose bằng `ALTER ROLE authenticator SET pgrst.db_schemas`. Đã **RESET** khi cutover (2026-11-03); chỉ còn `public` |

---

## 12. Trạng thái code thực tế (cập nhật 2026-11-07)

**Đã thống nhất một schema duy nhất `public` (33 bảng + 3 view) theo §7. Không còn khái niệm v1/v2.** Cutover chạy 2026-11-03: các object `public` cũ chuyển sang schema `legacy` (29 bảng, 19 enum, 5 hàm; chỉ để sao lưu, **chưa xoá**), schema mới đổi tên thành `public`, trigger đăng ký `on_auth_user_created` → `public.handle_new_user` (không nuốt lỗi), Realtime publication gồm `attempts`, `review_requests`, `free_essays`.

| Thành phần | Trạng thái |
|---|---|
| DDL | `supabase/migrations/20261103130000_baseline_schema.sql` là migration gốc (dựng được từ đầu: 38 bảng gồm các bảng ngoài sơ đồ, 3 view, 0 quyền `anon`). `20261107100000_atomic_grading_jobs.sql` thêm các function nộp bài và kết thúc chấm chạy trong một transaction (ADR-07); đã chạy lên Supabase 2026-11-07, Core API và worker cần migration này. Thay đổi sau này: thêm file đánh số lớn hơn |
| Test ràng buộc | `supabase/tests/schema_constraints_test.sql`: 48/48 PASS trên Supabase, tự rollback |
| Kết nối psql | `SUPABASE_DB_URL` trong `backend/.env` (Session pooler) |
| Backend | Một đường code duy nhất `app/db/supabase.py: db()`; không còn cờ `DB_SCHEMA`. Services: `practice/`, `writing/`, `listening_reading/`, `speaking/`, `admin/`, `cms/`, `importers/` |
| Role | `learner \| expert \| admin` ở cả backend và frontend. Trạng thái attempt theo tên thiết kế (`grading`, `grading_failed`, `waiting_expert`, `no_speech`) |
| Smoke test | 51/51 PASS trên `public` sau cutover; `pytest` backend 26 pass; `tsc` frontend sạch |

**Cột ngoài sơ đồ (cố ý):** `grading_runs.claimed_at` + `recovery_count` (migration `20261107100000`, lease cho job chấm); trong baseline: `question_keys.evidence`, `annotations.title`, `grading_runs.output`, `question_groups.subtype` + `template`, `tests.difficulty`, `questions.diagram_coordinate`.

**Writing Task 2 (2026-11-07):** luồng Reference (ADR-22) đã có trong code nhưng tắt; `WRITING_TASK2_PIPELINE` mặc định `legacy`, nên điểm người học chưa đổi. Prompt `writing/task2/grade` dùng `qwen-flash`. Phân loại dùng Jev (85–86/96 đề có nhãn, Qwen 83/96 khi đo cùng ngày); thiếu `TYPESAFE_API_KEY` hoặc Jev lỗi thì dùng `writing/task2/classify`. Cả hai pipeline Task 2 đều qua bước này, nên title đề được gửi cho TypeSafe.

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
- Đáp án mẫu Writing/Speaking từ dataset không được lưu.
- L/R chỉ có band khi đủ 40 câu (luật "band chỉ tính khi đủ 40 câu"); ngược lại `overall_band: null`, frontend hiện "—". `DELETE /student/history/{id}` chỉ áp dụng cho bài chưa nộp: Practice đang dở → xoá hẳn; Mock đang dở (thoát phòng thi) → `abandoned`; bài đã nộp → 409. Frontend gọi endpoint này khi thoát phòng thi Mock và có nút xoá cho bài Practice dở ở trang lịch sử. Xem attempt của người khác → 404.
- Admin cũ `n22dccn050@…`, `test1@gmail.com` thành Learner; attempt của Expert và 53 essay không có attempt không được chuyển.
- Cột `is_activated` bỏ: "đã kích hoạt" = có `last_sign_in_at` trong Supabase Auth.

**Điểm lệch còn lại so với thiết kế:**
- Chấm Writing và Speaking chạy qua ARQ (`app/services/grading/`), nên cần Redis và worker. Không có Redis thì API vẫn chạy bằng `NullRedisCache`, bài được lưu nhưng chờ chấm tới khi Redis và worker hoạt động.
- Mock chưa tự tạo yêu cầu Expert chấm (luật quota Mock cho Expert); điểm AI tạm là chính thức.
- AI engine chưa trả model/prompt version/trace id → các cột truy vết mỗi lần chấm (model, phiên bản prompt, mã trace) trong `grading_runs` còn trống.
- Transcript Listening dữ liệu cũ nằm trong `passage_text`, hiện trước khi nộp (trái yêu cầu "transcript Listening chỉ hiện sau khi nộp").
- Frontend polling 5 s cho Writing (`useWritingAttemptSummary.ts`), chưa dùng Realtime.
- Đề Writing: 97 đề trên R2 (`ielts-learning`, prefix `dataset/writing/`), mới nhập 6; 91 đề còn lại import sau.
- Expert workflow, dashboard lộ trình học: làm một phần.

**Speaking (2026-11-06):** đã có phòng thi Practice và Mock (đồng ý ghi âm, mic check, ghi âm thật, upload presigned, hết giờ tự chuyển câu, Mock không ghi lại và tự nộp), pipeline chấm hai kênh, màn kết quả thật, job xoá audio 180 ngày trong ARQ. Không cần migration.
- Cần `R2_PRIVATE_BUCKET_NAME`: bucket không public, có CORS cho `PUT` từ origin frontend. Chưa cấu hình thì API upload trả 503.
- Chấm chạy qua hàng đợi Speaking, mỗi lần một bài. Worker chết giữa lúc chấm thì cron tự chạy lại sau khi hết lease (25 phút). Attempt `grading_failed` chạy lại bằng `backend/scripts/regrade_speaking_attempt.py`.
- Job xoá audio chỉ chạy khi có tiến trình `arq app.worker.tasks.WorkerSettings`.
- Audio câu hỏi vẫn là link bên thứ ba; Piper TTS (FR-32), sửa CMS Speaking, kiểm tra khi publish để đợt sau.
- Mock chưa có Expert nên điểm AI là chính thức; chưa có nhãn "preliminary".
- `grading_runs.trace_id` vẫn trống. `model` và `prompt_versions` đã ghi.
- Bộ đếm âm tiết đếm thiếu ở lời nói nối âm (mẫu thử: 11 so với 14–15 âm tiết thật); cần kiểm chứng ở bộ đo thử.
- Giấy phép: `praat-parselmouth` là GPLv3; L2-ARCTIC là CC BY-NC 4.0; trọng số CrisperWhisper chỉ cho phi thương mại. Dùng được cho KLTN, cần xem lại nếu thương mại hoá.

**Bảo mật đã sửa:** JWT fallback verify HS256 + `aud=authenticated`; không còn mượn user đầu tiên khi chưa đăng nhập; xoá lịch sử kiểm tra chủ sở hữu.

**Khi viết code mới:**
1. Bám **tên khái niệm và quy tắc** trong file này (BR, trạng thái, quyền).
2. Đổi schema bằng migration đánh số trong `supabase/migrations/`, cập nhật §7/§12 cùng commit.
3. Chỉ migrate DB, không thêm tính năng ngoài yêu cầu.
4. Không commit secret; `.env` nằm trong gitignore.

---

## 13. Câu hỏi còn mở

- Có chuyển Task 2 sang luồng Reference không? Cần chốt cổng độ phân tán (đang 0,44, yêu cầu 0,70) và lỗi JSON 2/120 của `qwen-flash` (ADR-22).
- Khi nào xoá schema `legacy` (cần nhóm xác nhận đã pull code mới)?
- Import 91 đề Writing còn lại từ R2 vào `public`.
- Chuyển `backend/app/ai` ra `ai-engine/` ở gốc repo để tách khỏi package Core API (`pytest` trần trong `backend/` đang lỗi vì quét vào đó). Làm sau khi spec 002 xong; cần kiểm tra thư mục gốc trong cấu hình deploy.
- Chương IV (triển khai, giao diện, kiểm thử, đánh giá AI bằng MAE) chưa viết; cần bộ dữ liệu so điểm AI với Expert.
- Quyết định "prompt quản lý trên Langfuse" trong báo cáo cần sửa cho khớp quyết định "chỉ Langfuse".
- Hiệu chuẩn ngưỡng rubric phát âm bằng bộ đo thử (`docs/speech-eval-recording-script.md`) và sau đó bằng dữ liệu Expert.
