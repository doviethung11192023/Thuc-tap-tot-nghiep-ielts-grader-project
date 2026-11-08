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

## 2. Writing: chấm theo bài mẫu từng band (✅)

- Task 2 phân loại dạng đề, đưa cho model một bài mẫu cùng dạng ở mỗi band, chấm 4 tiêu chí trong một lần gọi (ADR-22).
- Có so sánh với cách cũ trên 44 bài held-out: MAE 1,239 so với 1,227, số lượt gọi LLM chấm điểm giảm từ 4 xuống 1.
- Task 1 đọc ảnh biểu đồ bằng model vision.
- Band tổng luôn tính trong code (ADR-03); LLM không thổi phồng được điểm.
- Prompt có phiên bản trên Langfuse; mỗi lượt chấm lưu model và phiên bản prompt.

**Tự nêu giới hạn:** nhãn của bộ đo chưa kiểm chứng; p90 74,4 s, vượt mục tiêu 60 s.

## 3. Dữ liệu không bao giờ bị ghi đè, không bao giờ treo (✅)

- Mỗi lần làm bài là một Attempt, mỗi lần chấm là một Evaluation. Chấm lại tạo bản mới; đúng 1 kết quả chính thức, điểm Expert ưu tiên hơn AI.
- Nộp bài và kết thúc chấm chạy trong **một transaction** (function SQL). Trước đây lỗi giữa chừng làm bài kẹt ở trạng thái "đang chấm" (ADR-07).
- Job chấm dùng **lease**: worker chết giữa chừng thì cron nhận lại sau khi hết hạn; bảng `grading_runs` là trạng thái thật, hàng đợi chỉ là tín hiệu (ADR-02).
- Hai hàng đợi: Writing chạy song song, Speaking mỗi lần một bài trên GPU.

## 4. Thiết kế CSDL tự bảo vệ (✅)

- 33 bảng, 16 ràng buộc nghiệp vụ do **DB tự chặn**: FK ghép "đúng kiểu" (ADR-17), unique có điều kiện, trigger.
- Ví dụ: một bài chỉ có một kết quả chính thức; một yêu cầu chỉ có một Expert đang giữ; khoảng quy đổi band không chồng nhau.
- 48 test ràng buộc chạy trên Supabase, tự rollback.

## 5. Bảo mật và dữ liệu cá nhân (✅)

- RLS trên mọi bảng, **chỉ đọc**; mọi thao tác ghi qua Core API. Người khác xem bài trả 404 thay vì 403 để không lộ bài có tồn tại.
- Đáp án L/R nằm ở bảng riêng, không bao giờ gửi xuống trình duyệt trước khi nộp.
- AI engine chỉ chạy trong mạng nội bộ, có secret header, không truy cập DB.
- Giọng nói theo Nghị định 13/2023: xin đồng ý trước lần ghi đầu, bucket riêng tư, link ký ngắn hạn, tự xoá sau 180 ngày.

## 6. Luồng Expert sát thực tế vận hành (🔧, spec 003)

- **Điểm nghẽn là con người, không phải máy:** 3–10 Expert. Điều tiết bằng quota từng Learner **và** suất chung cả hệ thống theo sức chấm của Expert.
- Expert nhận sẵn điểm và nhận xét AI rồi sửa, rút ngắn thời gian chấm. Hệ thống ghi tiêu chí nào bị sửa và lý do khi lệch từ 1 band, làm dữ liệu đánh giá AI.
- Hạn 48 **giờ làm việc**, không tính cuối tuần; Expert được trả lại bài trong 2 giờ đầu.
- Quota kiểm và ghi trong một transaction có khoá, nên hai yêu cầu cùng lúc không vượt được (có test chạy đồng thời).

## 7. Bài thi bị gián đoạn (🔧, spec 004)

- Treo máy, đóng tab, khởi động lại: bài đã lưu trên server, làm tiếp được trên máy khác; đồng hồ do server giữ nên không gian lận được bằng cách tắt trang.
- Hết giờ chưa nộp: tự nộp "làm bao nhiêu chấm bấy nhiêu", hai lớp: cron của worker và nộp ngay khi Learner quay lại (chạy được cả khi worker tắt).
- Speaking: câu đang ghi dở được hỏi lại **một lần**; server ghi lại để không ai cố tắt trang nhiều lần để được trả lời lại.

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

## 9. Lộ trình học: luật kết hợp mô hình năng lực (🔧, ADR-23)

- **Luật** quyết định làm gì: kỹ năng cách mục tiêu xa nhất, người mới làm bài chẩn đoán, còn ≤ 14 ngày tới ngày thi thì ưu tiên Mock.
- **Mô hình năng lực Elo** (dạng Rasch 1 tham số, nền tảng của IRT trong khảo thí) đo yếu ở dạng câu nào và chọn phần đề **vừa sức**: xác suất làm đúng dự đoán gần 70%, đủ thử thách mà không nản.
- Độ khó từng câu suy ra từ tỉ lệ đúng của mọi Learner, có làm mượt cho câu ít người làm. Dạng câu dưới 6 câu chưa bị coi là điểm yếu, tránh kết luận từ dữ liệu quá ít.
- Không cần huấn luyện, không thêm bảng, mỗi gợi ý kèm 1 câu lý do giải thích được.
- **Bằng chứng cần có (📏):** unit test theo từng ca (người mới, hoà, gần ngày thi, hết đề); trình diễn một Learner làm vài bài và lộ trình đổi theo.

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
| Sao không để LLM cho điểm phát âm? | LLM không nghe được audio; điểm phải dựa trên tín hiệu đo được |
| Nhiều người dùng cùng lúc thì sao? | Mục 8: tách tải lưu bài (giải được) và tải chấm (giới hạn bởi GPU/LLM, xử lý bằng hàng đợi); có số load test |
| Mất điện giữa giờ thi? | Mục 7 |
| Học viên gian lận bằng cách tắt trang? | Đồng hồ ở server; Speaking chỉ hỏi lại một lần và server ghi lại |
| Dữ liệu giọng nói có an toàn không? | Mục 5 và Nghị định 13 |
| Sao lộ trình không dùng recommendation system hay deep learning? | Collaborative filtering cần nhiều người dùng và hỏng ở người mới; deep knowledge tracing cần hàng triệu lượt trả lời để huấn luyện; LLM mỗi lần một khác và khó kiểm thử. Elo chạy được với ít dữ liệu, giải thích được, kiểm thử được (mục 9, ADR-23) |
| Sao Expert thấy điểm AI, không sợ bị ảnh hưởng? | Chủ ý để Expert làm nhanh hơn; vì vậy báo cáo không coi điểm Expert là phép đo độc lập mà đo tỉ lệ và mức Expert sửa |

## Giới hạn nên tự nói trước

- Band P là ước lượng độ dễ hiểu, ngưỡng tạm.
- Writing Task 2 chưa đạt mục tiêu 60 s.
- Chưa đo tốc độ chấm Speaking trên máy không có GPU.
- Chưa có số load test (mục 8) cho tới khi chạy xong.
- Tham số lộ trình (Elo, ngưỡng, vùng 60–75%) là giá trị khởi đầu, chưa hiệu chỉnh bằng dữ liệu người học thật; chưa chứng minh được lộ trình làm tăng band.
