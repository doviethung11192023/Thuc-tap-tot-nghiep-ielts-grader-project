# IELTS Grader Project

Dự án Hệ thống hỗ trợ chấm điểm và hướng dẫn cải thiện kỹ năng viết IELTS.
Kiến trúc Multi-Agent AI kết hợp với FastAPI, Redis, và Next.js.

## Cấu trúc thư mục (Monorepo)

- `frontend/`: Ứng dụng Next.js (React) + Tailwind CSS + Shadcn UI.
- `backend/`: API FastAPI (Python), Background Worker (ARQ) và Lõi AI (LangGraph).
- `docker-compose.yml`: Cấu hình Docker để chạy Redis, Arize Phoenix và FastAPI.

## Hướng dẫn khởi chạy (Local Development)

### 1. Khởi chạy Backend & AI Services
Yêu cầu: Đã cài đặt Docker và Python 3.11+.

```bash
# Bật Redis và Phoenix (AI Observability)
docker-compose up -d redis phoenix

# Khởi chạy FastAPI Backend (cần cài đặt virtualenv trước)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Mở một terminal khác, khởi chạy ARQ Worker (Background Tasks)
cd backend
arq app.worker.tasks.WorkerSettings
```

### 2. Khởi chạy Frontend
Yêu cầu: Đã cài đặt Node.js.

```bash
cd frontend
npm install
npm run dev
```

Truy cập hệ thống tại `http://localhost:3000`.
Giao diện giám sát AI (Arize Phoenix) tại `http://localhost:6006`.
