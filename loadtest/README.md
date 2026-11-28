# Bộ load test (k6 + AI giả lập)

Mục tiêu: đo p95 và tỉ lệ lỗi của Core khi 50 → 300 → 1000 người cùng làm bài, so `WEB_CONCURRENCY=1` với `4`, không tốn tiền LLM.

| Thành phần | Việc |
|---|---|
| `ai-stub/` | AI engine giả (`/grade`, `/grade-speaking`, `/grading-fingerprint`, `/draft-material`, `/health`), điểm cố định, trễ `STUB_DELAY_SECONDS` (mặc định 2 s), kiểm `X-AI-Engine-Secret` như engine thật |
| `scripts/seed_accounts.py` | Tạo N Learner `loadtest+<run>-<i>@<domain>` qua Auth Admin API, đăng nhập, ghi token vào `.tokens.json` |
| `scripts/cleanup_accounts.py` | Xoá các tài khoản đó cùng bài làm/kết quả chấm của chúng |
| `k6/exam-flow.js` | Một VU: danh sách đề → chi tiết đề → bắt đầu → tự lưu 12–18 s/lần → nộp; kiểm không mất dữ liệu |
| `scripts/summary_row.py` | In một dòng bảng từ file `--summary-export` |

Kịch bản dùng **Writing Practice (Task 2)**: nộp bài tạo `grading_run`, đẩy vào hàng đợi ARQ, worker gọi AI engine (stub). Nhờ vậy đo cả đường API → DB → Redis → worker. Reading/Listening chấm đồng bộ ngay trong Core nên không chạm hàng đợi.

Endpoint dùng (tiền tố `/api/v1/test-practice`): `GET /tests`, `GET /tests/{id}/content`, `POST /attempts/start`, `PUT /attempts/{id}/work`, `POST /attempts/{id}/submit-writing`, `GET /attempts/{id}/summary`.

## 1. Chuẩn bị

```bash
# Biến môi trường (không ghi secret vào file nào trong repo). Có thể nạp từ file bằng --env-file backend/.env
export SUPABASE_URL=...  SUPABASE_KEY=<anon>  SUPABASE_JWT_SECRET=...   # hoặc SUPABASE_SERVICE_ROLE_KEY=...
export LOADTEST_EMAIL_DOMAIN=example.com        # tuỳ chọn; dùng tên miền bạn kiểm soát nếu Auth chặn example.com
export LOADTEST_CONFIRM=yes                     # bắt buộc: hai script seed/cleanup từ chối chạy nếu thiếu

backend/.venv/bin/python loadtest/scripts/seed_accounts.py --count 50 --env-file backend/.env
```

- Số tài khoản nên **bằng số VU lớn nhất**. Ít hơn thì các VU dùng chung tài khoản (k6 tự tắt kiểm mất dữ liệu và cảnh báo), vì hai VU cùng tài khoản sẽ ghi đè bài của nhau.
- Token Supabase mặc định sống 1 giờ (hoặc 900 s nếu đã chỉnh): bài đo dài hơn thì seed lại ngay trước khi chạy.
- Seed theo lô (`--batch 10 --pause 2`) và tự lùi khi gặp 429. Gói Free giới hạn số lần đăng nhập/tạo user theo IP; 1000 tài khoản nên seed nhiều đợt (`--run`, `--out` khác nhau) hoặc tạm nâng giới hạn rate limit trong Auth settings.

## 2. Chạy với local

```bash
# Redis: docker (compose) hoặc fakeredis TCP khi không có Docker
# AI giả (cổng 8001), cùng secret với Core và worker
cd loadtest/ai-stub && AI_ENGINE_SECRET=local-stub-secret STUB_DELAY_SECONDS=2 \
  ../../backend/.venv/bin/python -m uvicorn stub_app:app --port 8001

# Core + worker, trỏ vào stub (biến môi trường đè lên backend/.env)
export AI_ENGINE_URL=http://127.0.0.1:8001/grade AI_ENGINE_SPEAKING_URL=http://127.0.0.1:8001/grade-speaking \
       AI_ENGINE_SECRET=local-stub-secret
cd backend && WEB_CONCURRENCY=1 .venv/bin/python -m uvicorn app.main:app --port 8000 --workers 1
cd backend && .venv/bin/arq app.worker.tasks.WorkerSettings

# k6
STAGES=smoke DATALOSS_SAMPLE=1 k6 run -e BASE_URL=http://localhost:8000 \
  --summary-export loadtest/results/smoke.json loadtest/k6/exam-flow.js
```

Worker thật còn chạy cron (nhắc streak, điều phối Expert...) trên DB đang dùng. Chạy trên DB thật thì tắt cron: đặt `cron_jobs = []` trong một lớp con của `WorkerSettings` (chỉ khi đo local; đừng sửa `tasks.py`).

## 3. Chạy với production (stack deploy bằng `compose.prod.yml`)

1. Trong `/srv/ielts/*.env` của worker: `AI_ENGINE_URL=http://ai-stub:8001/grade`, `AI_ENGINE_SPEAKING_URL=http://ai-stub:8001/grade-speaking`, `AI_ENGINE_SECRET=<secret của stub>`; thêm dịch vụ `ai-stub` (image `python:3.12-slim`, mount `loadtest/ai-stub`, `pip install -r requirements.txt`, cùng mạng compose) hoặc chạy stub trên cùng host. **Sau test phải trả lại giá trị thật và khởi động lại worker.**
2. Chọn số tiến trình Core: `WEB_CONCURRENCY=1` hoặc `4` trong env của `fastapi`, `docker compose up -d fastapi`, chờ healthy.
3. Chạy k6 **từ máy khác** (laptop hoặc một VPS nhỏ cùng vùng), không chạy trên chính server đang đo:
   `BASE_URL=https://api.<domain> STAGES=s300 k6 run ...`. k6 đi qua Cloudflare nên rule rate limit có thể chặn: tạm tắt rule hoặc cho IP máy k6 vào danh sách cho phép.
4. Đo từng ô trong bảng: `STAGES` = `s50` → `s300` → `s1000`, mỗi mức với `WEB_CONCURRENCY` = 1 rồi 4. Giữa hai lần chờ hàng đợi trống và Core nguội vài phút.

Mỗi lần chạy:

```bash
STAGES=s300 k6 run -e BASE_URL=https://api.<domain> --summary-export loadtest/results/s300-wc4.json loadtest/k6/exam-flow.js
backend/.venv/bin/python loadtest/scripts/summary_row.py loadtest/results/s300-wc4.json --vu 300 --wc 4
```

Biến của `exam-flow.js`: `STAGES` (`smoke` 5 VU × 1 phút, `s50`, `s300`, `s1000`), `HOLD` (thời gian giữ tải, mặc định 3/5/5 phút), `WORK_SECONDS` (thời gian "làm bài" trước khi nộp, mặc định 45), `DATALOSS_SAMPLE` (tỉ lệ VU kiểm mất dữ liệu, mặc định 0.2), `TEST_ID` (mặc định đề Writing đầu tiên của danh mục), `TOKENS_FILE`, `BASE_URL`.

## 4. Đọc kết quả

- Ngưỡng của k6: `http_req_failed < 1 %`, `p(95) < 1000 ms` (chung và riêng từng loại request), `dataloss_failures = 0`, `checks > 99 %`. Ngưỡng bị vượt thì k6 báo đỏ và thoát mã 99.
- `dataloss_failures`: sau lần tự lưu cuối, mở lại bài (`/attempts/start`) và đọc bài đã nộp (`/summary`); chữ trên server phải bằng đúng chữ lần lưu cuối. Khác = mất dữ liệu.
- Hàng đợi: `grading_runs` ở trạng thái `done` hết chưa; đo thời gian từ lúc nộp tới lúc trống. Stub trả lời sau 2 s nên thời gian này chỉ phản ánh Core + worker, không phản ánh LLM thật.
- Điền vào `report-template.md` (mỗi ô một lần chạy), rồi ghi nút thắt (CPU Core, Supabase, Auth, Redis, Cloudflare, chính máy k6).

## 5. Dọn dẹp

```bash
# Chờ hàng đợi trống trước (worker còn chấm thì xoá evaluation sẽ làm run lỗi)
LOADTEST_CONFIRM=yes backend/.venv/bin/python loadtest/scripts/cleanup_accounts.py --env-file backend/.env [--run <mã>] [--dry-run]   # cần SUPABASE_DB_URL và lệnh psql
```

DB chặn xoá evaluation đã chấm xong và bài đã nộp qua API (trigger BR-08), nên script xoá bằng psql trong một transaction, tắt tạm đúng 5 trigger đó rồi bật lại trước khi COMMIT (lỗi thì rollback). Thứ tự xoá theo khoá ngoại: `evaluations` → `review_requests` → `attempts` (kéo theo essays, answers, grading_runs...) → user Auth (kéo theo profiles, learner_profiles, notifications). Script chỉ đụng email đúng mẫu `loadtest+<run>-<số>@` và in số tài khoản còn lại (phải là 0, nếu không thoát mã 1).

## 6. An toàn

- Chạy ban đêm hoặc lúc không có người học thật; báo trước nếu dùng chung Supabase.
- Chỉ dùng tài khoản test. Không bao giờ đặt `AI_ENGINE_URL` của production trỏ vào stub rồi quên: bài thật sẽ nhận điểm giả.
- Mỗi lượt k6 để lại attempt/essay/evaluation thật trong DB (xoá bằng `cleanup_accounts.py`). 1000 VU × 5 phút tạo hàng nghìn bản ghi: kiểm dung lượng gói Free (500 MB DB) và giới hạn Auth/PostgREST; free-tier có thể trả 429/5xx ngay từ Supabase, đó là kết quả đo hợp lệ nhưng ghi rõ nguồn lỗi.
- `.tokens.json` chứa token sống: đã nằm trong `loadtest/.gitignore`, quyền 600, xoá sau test.
- Không in hoặc commit key; script chỉ đọc key từ biến môi trường lúc chạy.
- Chạy `pytest` cho stub trước mỗi đợt: `backend/.venv/bin/python -m pytest loadtest/ai-stub -q`.
