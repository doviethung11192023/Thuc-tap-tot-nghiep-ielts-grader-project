# Điểm mạnh để trình bày khi bảo vệ KLTN

> **Dùng để làm gì:** gom các chức năng, cách xử lý và số đo có thể ghi điểm trước hội đồng, kèm câu hỏi giảng viên dễ hỏi và cách trả lời.
> **Nguyên tắc:** chỉ khoe cái **đã làm và đo được**. Mỗi mục có trạng thái: ✅ đã làm, 🔧 đã thiết kế chưa code, 📏 cần đo trước khi nói số. Hội đồng đánh giá cao việc tự nêu giới hạn hơn là nói quá.
> **Nguồn:** `docs/source-of-truth.md`, `docs/speech-eval-report.md`, `specs/00*`. Cập nhật file này mỗi khi có quyết định hoặc số đo mới.

---

## 1. Speaking: không để AI "nghe hộ" lời sai (✅)

**Vấn đề:** ASR như Whisper đoán ý người nói nên tự sửa lỗi phát âm ("scool" ghi thành "school"). Chấm phát âm dựa trên transcript là chấm sai bản chất.

**Cách xử lý:**
- Hai kênh tách biệt: kênh ý định (Whisper, transcript có timing từng từ) và kênh âm vị (wav2vec2 espeak, giải mã không có mô hình ngôn ngữ, căn Needleman-Wunsch với âm vị chuẩn).
- Lớp âm học không dùng transcript: đếm âm tiết theo De Jong & Wempe, tốc độ nói, khoảng ngắt, F0, nhịp nPVI.
- Ghi âm tắt khử ồn, tự chỉnh âm lượng, khử vọng của trình duyệt vì chúng làm méo tín hiệu cần đo.
- Band P do **code** tính; LLM không nghe được audio nên chỉ viết nhận xét (ADR-21).

**Ghi điểm vì:** quyết định dựa trên **đo đạc**, không dựa trên cảm tính. Có cổng quyết định viết trước khi đo: kênh âm vị chỉ được vào band nếu thắng mốc so sánh.
- Đo trên L2-ARCTIC: 4 người Việt, 600 câu, 5.693 từ có nhãn tay.
- Trong điều kiện chấm thật, tương quan với tỉ lệ lỗi do người gán: Whisper −0,441, âm vị −0,339. Chênh lệch có khoảng tin cậy 95% là 0,02–0,19 (bootstrap).
- Kết quả: kênh âm vị **thua**, nên không vào band. Nhóm giữ nó cho việc nó làm tốt: gợi ý từ có thể sai (precision 0,964) và phát hiện bản ghi hỏng.

**Bằng chứng thật:** một bài thử phát video qua loa. Hai kênh lệch nhau, hệ thống gắn nhãn `channels_disagree`, giới hạn P và nhắc thu lại thay vì kết luận người học phát âm kém.

**Tự nêu giới hạn:** band P ước lượng độ dễ hiểu, chưa chấm từng âm; ngưỡng là tạm, chưa hiệu chuẩn với giám khảo.

## 1b. So sánh với cách PREP chấm Speaking (📏 suy luận, 2026-11-11)

**Nguồn:** bài chấm mẫu công khai trên `prepedu.com/vi/ielts/lab#demo` (Part 2, 73 s, "Describe a time you gave advice to someone") và mã JS công khai của trang. **Chưa chạy lượt chấm thật**: phòng thi nằm trong iframe khác domain nên không đưa audio thử vào được. Mọi điểm dưới đây là **suy luận từ bằng chứng**, nói rõ như vậy khi trình bày.

**Bằng chứng:**
- Bài mẫu: P 6.0, FC 6.0, LR 5.0, GRA 6.0, Overall **5.5**.
- Transcript gần nguyên văn: giữ lặp từ và tự sửa, không có um/uh.
- 11 lỗi ngữ pháp và 1 lỗi từ vựng. Mỗi lỗi có dạng Thay thế / Thừa từ / Thiếu từ kèm nhãn: chia thì, số nhiều, giới từ, mạo từ, liên từ, chọn tính từ.
- Lời giải thích luôn đúng một khuôn: "'X' phù hợp hơn 'Y' trong bối cảnh này".
- Điểm mạnh gồm 12 "cụm từ cố định", là các cặp từ như `in-weeks`, `stay-in`, `working-on`, và 1 "cấu trúc phức".
- Mã JS có các trường `original_text`, `corrected_text`, `start_index`, `end_index`, `error_category`, `num_word_bad_pronun`, `num_word_bad_stress`, `stress_table`, `user_stressed`, cùng các mục upgraded answer và nhận xét từng câu.
- Ghi âm xuất WAV, upload theo từng câu.

**Suy luận về pipeline PREP:**
- ASR (gần nguyên văn) rồi chạy song song nhiều module:
  - model sửa lỗi ngữ pháp (GEC), phân loại lỗi kiểu ERRANT, giải thích bằng template;
  - rule trên cây cú pháp để tìm collocation, linking devices và câu phức;
  - engine phát âm dùng transcript làm văn bản chuẩn, chấm từng từ và trọng âm;
  - model chấm band huấn luyện trên dữ liệu riêng (họ nói "hơn 18 triệu câu trả lời");
  - LLM viết upgraded answer và nhận xét.

| | PREP (suy luận) | Hệ thống của nhóm |
|---|---|---|
| Lỗi GRA/LR | GEC đánh dấu từng chỗ sửa, giải thích bằng template | LLM chấm từ bằng chứng (grammar checker, thống kê từ vựng) |
| Band | Model huấn luyện trên dữ liệu lớn | LLM cho FC/LR/GRA, code tính P (ADR-21) |
| Phát âm | Từng từ và trọng âm | Độ tin cậy nhận dạng và ngữ điệu, gắn nhãn ước lượng |
| Lạc đề | Không thấy bằng chứng trong bài mẫu | FC nhận câu hỏi để xét lạc đề, có trần điểm |
| Overall | 5.5 từ 6/6/5/6 (trung bình 5.75; làm tròn kiểu IELTS phải ra 6.0) | Trung bình 4 tiêu chí, làm tròn theo IELTS (BR-05) |

**Ghi điểm vì:**
- Nhóm khảo sát sản phẩm thương mại bằng bằng chứng, không dựa vào quảng cáo.
- Bài mẫu của PREP để lộ hai module mâu thuẫn nhau: `working on` vừa được khen là cụm từ cố định, vừa bị đánh lỗi `on → for`. Pipeline của nhóm đưa mọi bằng chứng của một tiêu chí vào **cùng một lần chấm**, nên không có hai kết luận trái ngược cho cùng một chỗ.
- Overall của PREP lệch cách làm tròn của IELTS; hệ thống của nhóm làm tròn đúng theo IELTS.

**Tự nêu giới hạn:**
- PREP mạnh hơn ở chỗ chấm phát âm theo từng từ và trọng âm, và có dữ liệu lớn để huấn luyện model chấm band.
- Hệ thống của nhóm chưa chấm trọng âm.
- Chưa so điểm hai hệ thống trên cùng một bản ghi.

## 2. Writing: chấm theo bài mẫu từng band (✅)

- Task 2 phân loại dạng đề, đưa cho model một bài mẫu cùng dạng ở mỗi band, chấm 4 tiêu chí trong một lần gọi (ADR-22).
- Có so sánh với cách cũ trên 44 bài held-out: MAE 1,239 so với 1,227, số lượt gọi LLM chấm điểm giảm từ 4 xuống 1.
- Task 1 đọc ảnh biểu đồ bằng model vision.
- Band tổng luôn tính trong code (ADR-03); LLM không thổi phồng được điểm.
- Prompt có phiên bản trên Langfuse; mỗi lượt chấm lưu model và phiên bản prompt.

**Tự nêu giới hạn:** nhãn của bộ đo chưa kiểm chứng; p90 74,4 s, vượt mục tiêu 60 s.

## 2b. Writing Task 1: chấm theo đáp án đã duyệt, đo được hơn PREP ở số liệu (✅ code, 📏 cần đo nhiều đề, ADR-30)

**Vấn đề:** model đọc ảnh mô tả biểu đồ ở mỗi lần chấm. Đọc sai một con số thì TA chấm sai mà không ai biết, và bước này chậm.

**Đã test PREP thật ngày 2026-11-11** (đề "Graphs with a trend 1", 3 lượt chấm):
- Mỗi đề có dàn ý viết sẵn và bài mẫu, nên PREP có dữ liệu chuẩn theo đề.
- TA có danh sách 21 ý chính theo khuôn. Bài cố tình sai số được **18/21 "đạt"**, cao hơn bài đúng (17/21): danh sách chỉ kiểm tra có nhắc tới, không kiểm tra số đúng. TA vẫn tụt 8 → 5 ở một bước khác.
- Nộp lại y nguyên thì có kết quả trong ≤ 10 s, giống từng chữ: có cache.

**Cách xử lý của nhóm:**
- AI soạn nháp đáp án số liệu từ ảnh **một lần**, Admin sửa và duyệt. Lúc chấm dùng đáp án thay cho đọc ảnh.
- LLM chỉ **trích** ý nào được nhắc và con số bài ghi; **code** so con số với đáp án (sai lệch ≤ 5%). Độ đúng số liệu có thể kiểm thử, không phụ thuộc phán đoán của LLM.
- Mức chỉ số con bị code kẹp theo band (PREP để TA 5.0 vẫn hiện "Excellent").
- Bài mẫu và dàn ý theo đề, cache bài nộp trùng: ngang PREP.

**Số đo thật (2026-11-11, đáp án nhập tay, cùng 2 bài đã nộp cho PREP):**

| | PREP | Hệ thống của nhóm |
|---|---|---|
| Bài đúng số | TA 8.0, 17/21 ý | TA 9.0, 8/8 ý có nhắc, 8/8 đúng số |
| Bài cố tình sai số | TA 5.0, **18/21 ý "đạt"** | TA 5.0, 7/8 có nhắc, **3/7 đúng số**, cả 4 ý sai số bị chỉ ra kèm số đúng |

**Tự nêu giới hạn:** mới đo trên 1 đề, 2 bài, đáp án do nhóm nhập; mỗi lượt khoảng 70 s. Bài mẫu AI soạn thử có câu so sánh sai ("more than double") và dài hơn mức đặt ra, nên bắt buộc Admin duyệt.

## 3. Dữ liệu không bao giờ bị ghi đè, không bao giờ treo (✅)

- Mỗi lần làm bài là một Attempt, mỗi lần chấm là một Evaluation. Chấm lại tạo bản mới; đúng 1 kết quả chính thức, điểm Expert ưu tiên hơn AI.
- Nộp bài và kết thúc chấm chạy trong **một transaction** (function SQL). Trước đây lỗi giữa chừng làm bài kẹt ở trạng thái "đang chấm" (ADR-07).
- Job chấm dùng **lease**: worker chết giữa chừng thì cron nhận lại sau khi hết hạn; bảng `grading_runs` là trạng thái thật, hàng đợi chỉ là tín hiệu (ADR-02).
- Hai hàng đợi: Writing chạy song song, Speaking mỗi lần một bài trên GPU.
- **"Không ghi đè" do DB chặn, không phải do code tự giác** (migration `20261109100000`): evaluation đã `done`/`failed` chỉ được đổi cờ chính thức; điểm tiêu chí và lỗi đánh dấu của nó không thêm, sửa, xoá được; đáp án và bài viết không sửa được sau khi nộp; audit log chỉ được thêm, kể cả với service_role.
- Điểm L/R do DB tự tính lại từ các dòng đáp án vừa ghi và bảng quy đổi, không tin số Core API truyền vào.

## 4. Thiết kế CSDL tự bảo vệ (✅)

- 32 bảng, 16 ràng buộc nghiệp vụ do **DB tự chặn**: FK ghép "đúng kiểu" (ADR-17), unique có điều kiện, trigger.
- Ví dụ: một bài chỉ có một kết quả chính thức; một yêu cầu chỉ có một Expert đang giữ; khoảng quy đổi band không chồng nhau.
- 100 test SQL chạy trên Supabase, tự rollback: 46 ràng buộc, 14 chọn đề Mock, 19 function nộp/chấm, 21 lưu bài, tự nộp và bất biến (2026-11-09).
- Bài Mock có yêu cầu Expert đang mở: điểm AI tự động chỉ là "preliminary" (không chính thức), attempt chờ Expert. Luật nằm trong function công bố điểm, nên luồng Expert làm sau không phải sửa lại.

## 5. Bảo mật và dữ liệu cá nhân (✅)

- RLS trên mọi bảng, **chỉ đọc**; mọi thao tác ghi qua Core API. Người khác xem bài trả 404 thay vì 403 để không lộ bài có tồn tại.
- Đáp án L/R nằm ở bảng riêng, không bao giờ gửi xuống trình duyệt trước khi nộp. Transcript Listening (chứa đáp án) bị thu quyền đọc theo **cột**: Learner gọi thẳng Supabase cũng không đọc được (rà soát 2026-11-09 phát hiện lỗ này).
- AI engine chỉ chạy trong mạng nội bộ, có secret header, không truy cập DB.
- Giọng nói theo Nghị định 13/2023: xin đồng ý trước lần ghi đầu, bucket riêng tư, link ký ngắn hạn, tự xoá sau 180 ngày.

## 6. Luồng Expert sát thực tế vận hành (🔧, spec 003)

- **Điểm nghẽn là con người, không phải máy:** 3–10 Expert. Điều tiết bằng quota từng Learner **và** suất chung cả hệ thống theo sức chấm của Expert.
- Expert nhận sẵn điểm và nhận xét AI rồi sửa, rút ngắn thời gian chấm. Hệ thống ghi tiêu chí nào bị sửa và lý do khi lệch từ 1 band, làm dữ liệu đánh giá AI.
- Hạn 48 **giờ làm việc**, không tính cuối tuần; Expert được trả lại bài trong 2 giờ đầu.
- **Kỳ nghỉ lễ do Admin đặt:** hệ thống ngừng nhận yêu cầu mới, ngừng giao bài và tự lùi hạn của bài đang giao, nên không Expert nào bị tính quá hạn vì nghỉ lễ. Learner được báo trước khi thi Mock rằng bài chỉ có điểm AI.
- Quota kiểm và ghi trong một transaction có khoá, nên hai yêu cầu cùng lúc không vượt được (có test chạy đồng thời).

## 6b. Điểm Mock là lần gặp đề đầu tiên (✅, 2026-11-09)

- Learner chỉ chọn kỹ năng; **server** chọn ngẫu nhiên một đề trong bộ đề Mock mà Learner chưa từng làm. Không lặp đề; hết đề thì từ chối.
- Đề Mock không làm Practice được, không hiện ở danh mục, không đọc trước được kể cả gọi thẳng Supabase (RLS) hay API nội dung đề. Trước đây sửa URL `?mode=exam` là thi Mock được trên đề vừa luyện và xem đáp án: DB thật có 7 lượt như vậy.
- Luật nằm trong DB: trigger chặn Mock trên đề đã làm kể cả khi INSERT trực tiếp; khoá theo (Learner, kỹ năng) để bấm hai lần không ra hai bài. 14 test SQL.

## 7. Bài thi bị gián đoạn (✅ lưu bài + tự nộp; 🔧 Speaking hỏi lại, spec 004)

- ✅ Treo máy, đóng tab, khởi động lại: bài L/R/Writing tự lưu lên server (~2–3,5 s sau khi ngừng gõ, gõ liên tục thì ít nhất mỗi 12 s, có độ trễ ngẫu nhiên để không dồn cùng giây), làm tiếp được trên máy khác; đồng hồ do server giữ nên không gian lận được bằng cách tắt trang. Mất mạng thì giữ bài trên màn hình và thử lại với thời gian chờ tăng dần.
- ✅ Hết giờ chưa nộp: tự nộp "làm bao nhiêu chấm bấy nhiêu", hai lớp: cron của worker mỗi phút, và Learner nộp muộn thì server chấm bản đã lưu trước hạn (bỏ chữ gõ sau hạn) thay vì từ chối. Lưu sau hạn + 30 s bị DB từ chối. Nộp tay và cron cùng giây: DB khoá dòng attempt, chỉ một lần có hiệu lực (có test). Chạy thật 2026-11-09: 2 bài Mock kẹt từ 2026-11-02 đã được đóng.
- 🔧 Speaking: câu đang ghi dở được hỏi lại **một lần**; server ghi lại để không ai cố tắt trang nhiều lần để được trả lời lại.

## 8. Chịu tải khi 5.000 người cùng làm bài (🔧 thiết kế, 📏 phải đo)

**Bài toán:** tự lưu mỗi 15 s, 5.000 người cùng làm, tức tối đa **≈ 333 lượt lưu/giây** nếu ai cũng lưu đều. Đến hạn nộp, cả 5.000 bài nộp gần như cùng lúc.

**Hiện trạng (phát hiện khi rà code):** Core API chạy 1 tiến trình uvicorn; các endpoint `async` gọi client Supabase **đồng bộ**, nên mỗi lượt gọi DB chặn cả event loop. Ở mức này API phục vụ được khoảng vài chục request/giây (📏 cần đo). Phải sửa trước khi nói chuyện 5.000 người.

**Giải pháp theo lớp:**

| Lớp | Cách làm | Tác dụng |
|---|---|---|
| Trình duyệt | Chỉ lưu khi có thay đổi; chờ ngừng gõ 3 s; tối đa 15 s; **lệch ngẫu nhiên** 12–18 s; L/R chỉ gửi câu vừa đổi | Người không gõ không tạo tải; tránh 5.000 người lưu cùng một giây |
| Trình duyệt | Luôn giữ bản trong `localStorage`; server bận (429/503) thì lùi lại theo `Retry-After` | Quá tải không làm mất bài, chỉ lưu chậm hơn |
| Core API | Endpoint gọi DB chạy trong thread pool; nhiều worker uvicorn; Core API không giữ trạng thái nên nhân bản được sau load balancer | Bỏ nút cổ chai event loop; mở rộng ngang |
| Redis (write-behind) | Lượt lưu ghi vào Redis (dưới 1 ms); một tiến trình gom lại mỗi 1–2 s và ghi **một lệnh** xuống Postgres cho cả lô. Nộp bài đọc Redis trước. Redis hỏng thì ghi thẳng DB | Từ hàng trăm lượt ghi/giây xuống vài lệnh ghi theo lô mỗi giây |
| Bảo vệ | Mỗi bài tối đa 1 lượt lưu / 3 s; giới hạn kích thước; số phiên bản để bỏ lượt lưu cũ đến muộn | Client lỗi không làm sập hệ thống; lưu lại nhiều lần vẫn an toàn |

**Lúc hết giờ:** nộp bài chỉ là một transaction nhỏ nên nhận 5.000 bài được ngay. Phần chậm là **chấm**: Writing gọi LLM, Speaking cần GPU. Hệ thống nhận và lưu hết, xếp hàng đợi, ưu tiên Mock, báo vị trí và thời gian chờ ước tính. Đây là điểm cần nói thẳng: một GPU chấm khoảng 30 bài Speaking/giờ (📏), nên 5.000 bài cần nhiều GPU hoặc chờ.

**Bằng chứng cần có trước khi bảo vệ:** load test (k6 hoặc Locust) tăng dần tới 5.000 người ảo, đo p95 thời gian lưu, tỉ lệ lỗi, và **kiểm không mất dữ liệu**: bản cuối ở client trùng bản trong DB. Đưa biểu đồ vào Chương IV.

## 9. Lộ trình học: luật kết hợp mô hình năng lực (✅ 2026-11-11, ADR-23)

- **Luật** quyết định làm gì: kỹ năng cách mục tiêu xa nhất, người mới làm bài chẩn đoán, còn ≤ 14 ngày tới ngày thi thì ưu tiên Mock.
- **Mô hình năng lực Elo** (dạng Rasch 1 tham số, nền tảng của IRT trong khảo thí) đo yếu ở dạng câu nào và chọn phần đề **vừa sức**: xác suất làm đúng dự đoán gần 70%, đủ thử thách mà không nản.
- Độ khó từng câu suy ra từ tỉ lệ đúng của mọi Learner, có làm mượt cho câu ít người làm. Dạng câu dưới 6 câu chưa bị coi là điểm yếu, tránh kết luận từ dữ liệu quá ít.
- Không cần huấn luyện, không thêm bảng, mỗi gợi ý kèm 1 câu lý do giải thích được.
- **Bằng chứng đã có:** 58 unit test theo từng ca (người mới, hoà gap/band, dạng câu < 6 câu, gần ngày thi có/không Mock, hết đề trong 14 ngày, đạt mục tiêu, bài chờ Expert, bài làm phần đề, band tự nhập) chạy < 0,2 s, không cần DB; đã test trên trình duyệt (thẻ, link 1 click, Mock). API ~1,4 s gồm xác thực.
- **Đã diễn thử SC-007 (2026-11-11, qua API thật, tài khoản Learner test):** làm đề chẩn đoán Listening được gợi ý (31/40, band 7.0) → ưu tiên chuyển sang Reading (thiếu 7.0 band), điểm yếu Matching thành thạo 27% (25 câu). Làm 3 phần Reading được gợi ý: Matching 27% → 30% → 33%, phần vừa làm rời khỏi danh sách (luật 14 ngày), sau phần thứ 3 điểm yếu chuyển sang True/False/Not Given 30%. Script: trả lời đúng theo xác suất cố định, seed 7.
- **Giới hạn nói trước:** Learner yếu thì mọi phần đề đều dưới vùng 60–75%, hệ thống chọn phần gần 70% nhất (≈ 0,33–0,42), chưa có đề dễ hơn để đưa vào vùng mục tiêu.

## 8b. Kiến trúc tiến hoá theo số đo (🔧, ADR-24 đến ADR-28)

- Đo hiện trạng bằng k6 **trước** khi đổi, rồi đo lại **sau**: biểu đồ trước và sau là bằng chứng mạnh nhất.
- Mỗi thành phần thêm vào gắn với một vấn đề cụ thể: client Postgres async có pool (event loop bị chặn), Redis Streams (tải ghi tự lưu), Traefik và nhiều bản sao Core API (mở rộng ngang), hàng đợi ưu tiên (bài Mock đến dồn), GPU thuê theo giờ (mở rộng chấm Speaking), OpenTelemetry + Prometheus + Grafana + Sentry (thấy và chứng minh).
- Demo: chạy k6 và mở dashboard Grafana cùng lúc; bật thêm một pod GPU và cho thấy hàng đợi Speaking giảm nhanh hơn.
- **Biết khi nào không dùng:** không Kubernetes, Kafka, Temporal (ADR-28) vì nhóm 3 người, 1 tháng, quy mô thiết kế không cần. Pattern đã có sẵn: `grading_runs` + cron quét lại chính là **transactional outbox**.
- Chi phí: GPU thuê theo giờ, dự kiến dưới 200.000 đ cho load test và ngày bảo vệ.

## 10. Quy trình làm phần mềm (✅)

- Spec-driven development (GitHub Spec Kit): spec, plan, tasks, rồi mới code; mỗi tính năng có tiêu chí thành công đo được.
- Một tài liệu gốc (`docs/source-of-truth.md`) cho yêu cầu, quy tắc, CSDL, ADR; sửa thiết kế thì sửa tài liệu cùng commit.
- Mỗi quyết định kiến trúc ghi lý do và phương án bị loại (ADR).

---

## Câu hỏi hội đồng dễ hỏi

| Câu hỏi | Ý chính để trả lời |
|---|---|
| AI chấm có chính xác không? | Có số đo cho từng phần (mục 1, 2); nói rõ nhãn chưa kiểm chứng và chưa hiệu chuẩn với giám khảo; Expert sửa điểm AI là nguồn dữ liệu để đo tiếp |
| Sao không dùng Whisper để chấm phát âm luôn? | Whisper tự sửa lời; trình bày phép đo và cổng quyết định ở mục 1 |
| Hệ thống khác gì PREP / ELSA đang có trên thị trường? | Mục 1b: dựa trên bằng chứng từ bài mẫu công khai; nói rõ là suy luận; nêu chỗ PREP hơn (trọng âm, dữ liệu lớn) và chỗ nhóm làm khác (một lần chấm cho mỗi tiêu chí, xét lạc đề, làm tròn theo IELTS) |
| Sao không để LLM cho điểm phát âm? | LLM không nghe được audio; điểm phải dựa trên tín hiệu đo được |
| Nhiều người dùng cùng lúc thì sao? | Mục 8: tách tải lưu bài (giải được) và tải chấm (giới hạn bởi GPU/LLM, xử lý bằng hàng đợi); có số load test |
| Mất điện giữa giờ thi? | Mục 7 |
| Học viên gian lận bằng cách tắt trang? | Đồng hồ ở server; Speaking chỉ hỏi lại một lần và server ghi lại |
| Học viên luyện trước đề rồi thi thử để lấy band cao? | Mục 6b: đề Mock do server chọn ngẫu nhiên, chưa từng làm, không xem trước được; DB chặn |
| DB đảm bảo "không ghi đè" thế nào, hay chỉ do code? | Trigger trong DB (mục 3): kể cả service_role cũng không sửa được điểm đã chấm, bài đã nộp, audit log; có test chứng minh |
| Learner tự gọi Supabase bằng anon key thì đọc được gì? | Chỉ dữ liệu RLS cho phép; không ghi được bảng nào; không đọc được đáp án và transcript (quyền theo cột); có test (NFR-11) |
| Dữ liệu giọng nói có an toàn không? | Mục 5 và Nghị định 13 |
| Sao lộ trình không dùng recommendation system hay deep learning? | Collaborative filtering cần nhiều người dùng và hỏng ở người mới; deep knowledge tracing cần hàng triệu lượt trả lời để huấn luyện; LLM mỗi lần một khác và khó kiểm thử. Elo chạy được với ít dữ liệu, giải thích được, kiểm thử được (mục 9, ADR-23) |
| Sao không dùng Kubernetes hay Kafka? | Mục 8b: quy mô và nhân lực không cần; nêu thứ đang dùng thay thế và vì sao đủ |
| Sao Expert thấy điểm AI, không sợ bị ảnh hưởng? | Chủ ý để Expert làm nhanh hơn; vì vậy báo cáo không coi điểm Expert là phép đo độc lập mà đo tỉ lệ và mức Expert sửa |

## Giới hạn nên tự nói trước

- Band P là ước lượng độ dễ hiểu, ngưỡng tạm.
- Writing Task 2 chưa đạt mục tiêu 60 s.
- Chưa đo tốc độ chấm Speaking trên máy không có GPU.
- Chưa có số load test (mục 8) cho tới khi chạy xong.
- Kho đề Mock nhỏ (4–5 đề mỗi kỹ năng): Learner làm hết thì không thi thử được nữa cho tới khi có đề mới; kho Practice cũng mỏng đi (Writing 2, Speaking 1 đề).
- "Đúng 1 kết quả chính thức" thực tế DB chặn "tối đa 1"; "ít nhất 1" do function công bố điểm bảo đảm.
- Bảng quy đổi band chặn khoảng chồng nhau nhưng chưa chặn khoảng hở; suất Expert chung (BR-20) và kỳ nghỉ lễ (BR-22) chưa có ràng buộc DB (luồng Expert chưa code).
- Tham số lộ trình (Elo, ngưỡng, vùng 60–75%) là giá trị khởi đầu, chưa hiệu chỉnh bằng dữ liệu người học thật; chưa chứng minh được lộ trình làm tăng band.
