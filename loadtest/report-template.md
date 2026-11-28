# Mẫu điền kết quả load test — <ngày>

- Commit: `<sha>` · Máy chủ: DigitalOcean 4 vCPU / 8 GB (hoặc local: `<cấu hình>`) · Qua Cloudflare: có / không
- Đề dùng: `<TEST_ID>` (Writing Practice, Task 2) · `WORK_SECONDS=<n>` · stub trễ `STUB_DELAY_SECONDS=<n>` · số tài khoản test: `<n>`
- Ngưỡng: lỗi < 1 %, p95 < 1000 ms, mất dữ liệu = 0. Số liệu lấy từ `k6 --summary-export`; `scripts/summary_row.py` in sẵn từng dòng bảng.

## Kết quả

p50 / p95 / p99 là mili giây của mọi request; `rps` là số request mỗi giây trung bình; `lỗi %` là `http_req_failed`.
Cột "mất dữ liệu" = `dataloss_failures/dataloss_checks` (phải là 0).

| VU | WEB_CONCURRENCY | p50 | p95 | p99 | rps | lỗi % | mất dữ liệu | Đạt ngưỡng? |
|---:|:---:|---:|---:|---:|---:|---:|:---:|:---:|
| 50 | 1 | | | | | | | |
| 50 | 4 | | | | | | | |
| 300 | 1 | | | | | | | |
| 300 | 4 | | | | | | | |
| 1000 | 1 | | | | | | | |
| 1000 | 4 | | | | | | | |

p95 riêng từng loại request (ms):

| VU | WEB_CONCURRENCY | list_tests | test_content | start_attempt | autosave | submit_writing | summary |
|---:|:---:|---:|---:|---:|---:|---:|---:|
| | | | | | | | |

## Hàng đợi chấm (stub)

| VU | WEB_CONCURRENCY | Số bài nộp | Thời gian tới khi hàng đợi trống | Run `failed` |
|---:|:---:|---:|---:|---:|
| | | | | |

## Điểm gãy

- Mức VU đầu tiên vượt ngưỡng p95 hoặc lỗi: `<…>` với WEB_CONCURRENCY = `<1/4>`.
- Dấu hiệu: `<429 từ Supabase / 5xx từ Core / timeout / p95 tăng dần theo thời gian>`.

## Nút thắt (điền sau khi xem `docker stats`, log Core, dashboard Supabase)

| Hướng nghi ngờ | Bằng chứng cần xem | Kết luận |
|---|---|---|
| CPU của Core (một tiến trình Python bị GIL) | `docker stats` fastapi ≈ 100 % một lõi ở WC=1; nhiều lõi ở WC=4 | |
| Supabase PostgREST / giới hạn kết nối gói Free | lỗi 5xx hoặc timeout trong log Core; Reports trên dashboard Supabase | |
| Supabase Auth (xác thực token mỗi request) | `start_attempt`, `autosave` chậm hơn `list_tests` (không cần đăng nhập) | |
| Redis / hàng đợi | `submit_writing` chậm; hàng đợi dài | |
| Cloudflare (rate limit rule) | HTTP 429/403 trước khi tới Core | |
| Máy chạy k6 | CPU k6 ≈ 100 %, `dropped_iterations` > 0 | |

## Kết luận cho hội đồng

- Với WEB_CONCURRENCY = 4, hệ thống giữ được `<N>` người làm bài đồng thời trong ngưỡng p95 < 1 s.
- So với 1 tiến trình: `<tăng x lần / không đổi>`; nút thắt chính: `<…>`.
- Hạn chế: `<tài khoản dùng chung nếu thiếu, stub không phản ánh độ trễ LLM thật, k6 chạy từ cùng vùng mạng với server, …>`.

## Dọn dữ liệu sau test

- [ ] Hàng đợi ARQ đã trống, rồi `cleanup_accounts.py` báo "Còn lại sau khi xoá: 0 tài khoản loadtest"
- [ ] Stub đã tắt, worker đã trỏ lại AI engine thật (`AI_ENGINE_URL`)
