# Lộ trình tới ngày bảo vệ

> **Phạm vi:** 3 người, khoảng 4 tuần code (09/11 → 06/12/2026) và 1 tuần cho báo cáo, slide, tập dượt. Ngân sách GPU ≤ 500.000 đ.
> **Căn cứ:** ADR-24 đến ADR-28 trong `docs/source-of-truth.md`, spec `specs/003-expert-review`, `specs/004-mock-recovery`. Điểm trình bày gom ở `docs/defense-highlights.md`.
> **Quy tắc:** đo trước khi đổi (để có số "trước và sau"), mỗi tuần kết thúc bằng bản chạy được trên `Sinh_AI-Dev`, merge vào `LongRevert` cuối tuần.

## Chia việc

| Vai | Phụ trách | Ai |
|---|---|---|
| **A. Hạ tầng và tải** | Client Postgres async có pool, nhiều bản sao Core API sau Traefik, rate limit, Redis Streams cho tự lưu, k6, Prometheus/Grafana/OpenTelemetry/Sentry, GitHub Actions | ? |
| **B. Frontend** | Tự lưu và màn làm tiếp (spec 004), màn Expert (spec 003), quota và thời điểm dự kiến cho Learner, cài Sentry phía trình duyệt | ? |
| **C. Nghiệp vụ và dữ liệu** | Migration và function SQL của spec 003 và 004, cron tự nộp, giao bài Expert, hàng đợi ưu tiên, thu bài nói của teammate và đo ASR, thuê GPU | ? |

**Đang làm riêng:** lộ trình học bằng luật kết hợp mô hình năng lực Elo (ADR-23), Sinh làm ở phiên khác, không nằm trong bảng dưới.

## Theo tuần

| Tuần | A | B | C | Xong khi |
|---|---|---|---|---|
| **1** (09–15/11) | k6 đo hiện trạng (số "trước"); Prometheus + Grafana; client Postgres async cho đường tự lưu và nộp | Tự lưu phía trình duyệt (lưu khi đổi, chờ 3 s, lệch ngẫu nhiên, giữ `localStorage`, lùi lại khi 429) | Migration spec 004 (nguồn nộp, lựa chọn Expert, ghi câu Speaking đã bắt đầu); cron tự nộp và nộp khi quay lại; teammate làm bài Speaking thật | Có số tải "trước"; bài Mock không còn kẹt khi quá hạn |
| **2** (16–22/11) | Redis Streams + bộ gom ghi theo lô; nhiều bản sao Core API sau Traefik; rate limit | Màn làm tiếp, thông báo "đã tự nộp", hỏi lại câu Speaking; bắt đầu màn Expert (danh sách) | Migration và function SQL spec 003 (giữ chỗ, quota, suất chung, giao bài, giờ làm việc) + test SQL | Spec 004 xong; quota Expert chạy được bằng API |
| **3** (23–29/11) | OpenTelemetry nối `trace_id` Langfuse; Sentry; GitHub Actions | Màn chấm của Expert (sửa từ bản AI, lỗi Writing, nhận xét theo thời điểm Speaking, trả lại bài); quota và thời điểm dự kiến cho Learner | Endpoint Expert; hàng đợi ưu tiên; dựng GPU thuê và Cloudflare Tunnel; transcript chuẩn cho bài nói teammate | Một bài Mock đi trọn: thi, AI chấm, Expert sửa, Learner thấy điểm chính thức |
| **4** (30/11–06/12) | Load test 5.000 người ảo, số "sau"; sửa nghẽn | Sửa lỗi giao diện, hoàn thiện Should (kho nhận xét, lý do lệch) | Đo ASR trên bài nói thật; số liệu Expert sửa AI; (Should) LiteLLM | **Đóng băng code 06/12.** Có đủ số cho Chương IV |
| **5** (07–13/12) | Báo cáo Chương IV, slide, tập dượt demo (có dashboard Grafana lúc chạy k6) | | | |

## Ngân sách GPU (≤ 500.000 đ)

- Phát triển hằng ngày: máy có GPU của nhóm qua Cloudflare Tunnel, không tốn tiền.
- Thuê pod theo giờ, tắt ngay khi xong. Giá tham khảo tháng 11/2026 trên RunPod: pod RTX 4090 từ khoảng 0,34 USD/giờ, A4000 khoảng 0,17 USD/giờ (giá thay đổi, xem lại trước khi thuê).
- Dự kiến khoảng 20 giờ: load test 2 pod × 4 giờ, tập dượt 4 giờ, ngày bảo vệ 2 pod × 4 giờ. Ước khoảng 7 USD (dưới 200.000 đ), phần còn lại để dự phòng.
- Không dùng GPU serverless: mỗi lần khởi động phải nạp lại Whisper và wav2vec2.

## Nếu trễ, cắt theo thứ tự

1. LiteLLM (thay bằng bộ giới hạn tốc độ tự viết trong Redis, hoặc bỏ).
2. Sentry.
3. Các mục Should của spec 003 (kho nhận xét, lý do lệch, số liệu từng Expert).
4. Frontend trên Cloudflare Workers (giữ cách chạy hiện tại).
5. GPU thuê (demo bằng máy nhóm qua Tunnel).

**Không cắt:** tự lưu và tự nộp (spec 004), luồng Expert cơ bản (spec 003), load test có số trước và sau.

## Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Đổi tầng truy cập DB làm hỏng chức năng đang chạy | Chỉ đổi các đường gọi nhiều; giữ supabase-py cho phần còn lại; chạy lại toàn bộ test trước khi merge |
| Load test 5.000 người vượt giới hạn gói Supabase | Đọc giới hạn kết nối của gói trước; đo mức chịu được thật và nói thẳng con số |
| Thiếu bài nói thật để đo ASR | Thu ngay tuần 1; mỗi người ít nhất 2 bài, có đồng ý bằng văn bản cho việc đo |
| Ba người sửa cùng file | Chia theo vai như bảng trên; merge nhỏ, thường xuyên |
