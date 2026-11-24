# IELTS Grader

Hệ thống luyện thi IELTS 4 kỹ năng: Learner làm bài Practice/Mock, AI chấm Writing và Speaking, Expert chấm lại khi được yêu cầu, Admin quản lý đề, người dùng và Service AI.

📌 Thiết kế, nghiệp vụ, DB và ADR: [`docs/source-of-truth.md`](docs/source-of-truth.md). Cây thư mục và quy ước đặt code mới: [`docs/codebase-summary.md`](docs/codebase-summary.md).

## 1. Cấu trúc repo

| Thư mục | Là gì | Công nghệ |
|---|---|---|
| `frontend/` | Giao diện Learner, Expert, Admin | Next.js, React, Tailwind |
| `backend/` | **Core API** + worker chấm bài (hàng đợi arq trên Redis) | FastAPI, Supabase (Postgres) |
| `ai-engine/` | **AI engine**: chấm Writing Task 1/2 và Speaking; không truy cập DB | FastAPI, Qwen (DashScope), Langfuse, faster-whisper |
| `supabase/` | Migration và test SQL | Postgres |
| `docs/` | Nguồn sự thật thiết kế, ghi chú bảo vệ | |
| `plans/`, `specs/` | Kế hoạch và đặc tả theo từng đợt | |
| `scripts/manual-checks/` | Script kiểm thủ công cũ, không thuộc bộ test | |
| `tools/` | Tự động hoá trình duyệt cho kiểm thử | |

```
frontend ──HTTP──▶ backend (Core API, :8000) ──hàng đợi──▶ worker ──HTTP──▶ ai-engine (:8001)
                         │                                                    │
                     Supabase                                          DashScope, Langfuse
```

![Kiến trúc hệ thống](docs/diagrams/system-architecture.drawio.png)

Sáu sơ đồ lõi (kiến trúc, luồng chấm Writing và Speaking, luồng Expert, trạng thái bài làm, ERD) và bản chữ cho agent: [`docs/diagrams/README.md`](docs/diagrams/README.md).

## 2. Chạy local

Cần: Python 3.11+, Node.js, [uv](https://docs.astral.sh/uv/) (cho AI engine), Redis, một project Supabase.

⚠️ **`AI_ENGINE_SECRET` phải giống nhau** trong `backend/.env` và `ai-engine/.env` (tạo bằng `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`). Thiếu thì AI engine trả 503 cho mọi lượt chấm. Đổi secret thì khởi động lại AI engine, Core API và cả hai worker. Các biến khác: xem `backend/.env.example` và `ai-engine/.env.example`.

```bash
# 1. Redis
docker compose up -d redis

# 2. Core API
cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000

# 3. Worker (2 terminal riêng, cùng thư mục backend/)
.venv/bin/arq app.worker.tasks.WorkerSettings          # Writing + cron (cứu lượt chấm treo, xoá audio quá hạn, đồng bộ giá model)
.venv/bin/arq app.worker.tasks.SpeakingWorkerSettings  # Speaking, mỗi lần một bài

# 4. AI engine
cd ai-engine && uv sync && uv run python serve.py      # :8001

# 5. Frontend
cd frontend && npm install && npm run dev               # http://localhost:3000
```

⚠️ Thiếu Redis hoặc worker thì bài vẫn được lưu nhưng nằm ở trạng thái đang chấm; cron đẩy lại khi worker chạy.

Chạy bằng Docker: `docker compose --profile cpu up -d` (hoặc `--profile gpu` cho máy có GPU NVIDIA). Dịch vụ `phoenix` trong compose là phần giám sát cũ; trace AI hiện nằm trên Langfuse.

## 3. Kiểm thử

```bash
cd backend && .venv/bin/python -m pytest tests -q      # Core API (không chạm dịch vụ thật)
cd ai-engine && .venv/bin/python -m pytest tests -q    # AI engine
cd frontend && npx tsc --noEmit && npm run build
```

🔴 `backend/integration_tests/` gọi Supabase và R2 thật; chỉ chạy tay khi cần (xem README trong thư mục đó). Test SQL: `psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/<file>.sql`.
