---
phase: 1
title: "Technical Debt & Docker Containerization"
status: pending
priority: P0
effort: "5 days"
dependencies: []
---

# Phase 01: Technical Debt & Docker Containerization

## Overview
Xử lý toàn bộ nợ kỹ thuật (Technical Debt) từ đồ án thực tập: đóng gói AI Engine thành Docker container nội bộ (loại bỏ ngrok), hợp nhất cấu hình môi trường, bảo mật API keys và tái cấu trúc code testing.

## Requirements
- Functional:
  - Backend Core API gọi trực tiếp AI Engine qua mạng nội bộ Docker (`http://ai-engine:8001`) thay vì ngrok tunnel.
  - ARQ Worker thực thi với cơ chế retry tự động và exponential backoff có kiểm soát.
  - Phân tách môi trường cấu hình development và production chuẩn hóa.
- Non-functional:
  - Không để lộ secret credentials trong repo Git.
  - Thời gian khởi động hệ thống qua Docker Compose $< 60$ giây.

## Architecture
```
[Client] ──> [Next.js :3000]
                  │
                  ▼
[FastAPI Core :8000] ──HTTP──> [AI Engine Container :8001]
       │                              ▲
       ▼                              │
[Redis 7 :6379] ──Queue──> [ARQ Worker]
```

## Related Code Files
- Create:
  - `backend/app/ai/Dockerfile` (Image riêng cho AI Engine chạy FastAPI)
  - `backend/.env.example`
  - `frontend/.env.example`
  - `backend/tests/test_ai_pipeline.py`
- Modify:
  - `docker-compose.yml` (Bổ sung service `ai-engine`, cấu hình network bridge)
  - `backend/app/core/config.py` (Chuẩn hóa URL nội bộ cho AI Engine)
  - `backend/app/worker/tasks.py` (Thay vòng lặp sleep thủ công bằng thư viện `tenacity` retry)
  - `backend/app/ai/main.py` (Bỏ code test hardcoded, đóng gói hàm gọi chuẩn)
- Delete:
  - `backend/app/ai/serve.py` (Xóa bỏ logic mở ngrok tunnel)

## Implementation Steps
1. **Docker hóa AI Engine:** Tạo Dockerfile cho module `backend/app/ai/` cài đặt các package `langchain`, `langgraph`, `langfuse`.
2. **Cập nhật Docker Compose:** Định nghĩa service `ai-engine` lắng nghe tại port 8001, liên kết vào network nội bộ cùng `fastapi`, `redis`, `phoenix`.
3. **Cấu hình mạng nội bộ Backend:** Đổi `AI_ENGINE_URL` từ URL ngrok sang `http://ai-engine:8001/evaluate`.
4. **Tái cấu trúc Worker Retry:** Tích hợp `tenacity` để tự động retry khi gọi AI Engine với cơ chế backoff (2s, 4s, 8s), xử lý timeout gracefully.
5. **Dọn dẹp mã nguồn & Bảo mật:** Đưa các test cases trong `main.py` ra thư mục `backend/tests/`; thêm `.env` vào `.gitignore` và tạo file `.env.example`.

## Success Criteria
- [ ] Lệnh `docker-compose up -d` khởi động thành công 4 container: `fastapi`, `ai-engine`, `redis`, `phoenix`.
- [ ] Gửi thử 1 bài viết Writing Task 2 qua API và Worker hoàn thành chấm bài thành công qua mạng nội bộ mà không cần ngrok.
- [ ] Không còn bất kỳ file nhạy cảm nào chứa API key trong Git staging.

## Risk Assessment
- *Nguy cơ:* AI Engine container tốn nhiều RAM do tải các mô hình hoặc thư viện NLP (spaCy / transformers).
- *Giải pháp:* Giới hạn tài nguyên trong `docker-compose.yml` (memory limit 2GB), chỉ tải model cần thiết lúc khởi động.
