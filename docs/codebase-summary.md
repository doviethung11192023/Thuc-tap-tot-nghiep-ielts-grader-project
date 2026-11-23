# Cây thư mục và quy ước đặt code

Cập nhật 2026-11-23, sau đợt cấu trúc lại (`plans/261123-1130-source-code-restructure/plan.md`). Thiết kế và nghiệp vụ: [`source-of-truth.md`](source-of-truth.md).

## 1. Ba phần chạy độc lập

| Phần | Thư mục | Nói chuyện với | Không được |
|---|---|---|---|
| Frontend | `frontend/` | Core API qua HTTP; Supabase Auth | Gọi thẳng AI engine |
| Core API + worker | `backend/` (package `app.*`) | Supabase, Redis, R2, AI engine | Import code từ `ai-engine/` |
| AI engine | `ai-engine/` (import gốc: `services.*`, `settings.*`...) | DashScope, Langfuse, Jev; kéo cấu hình từ Core qua endpoint nội bộ có secret | Truy cập DB |

📌 AI engine là service riêng: Dockerfile, `pyproject.toml`/`uv.lock`, venv và test riêng. Lý do tách thư mục: trước đây nó nằm trong `backend/app/ai` nên image Core chép cả engine, và người đọc tưởng hai phần dùng chung package.

## 2. Core API (`backend/app/`)

```
api/
├── api_router.py               gắn mọi router và prefix URL (URL công khai nằm ở đây)
└── endpoints/
    ├── admin/                  route Admin: users_reviews_statistics, ai_services, ai_monitoring, content/ (đề, section, câu hỏi, media, nạp dataset)
    ├── internal/ai_engine.py   route nội bộ engine gọi (secret, không cho trình duyệt)
    ├── student_practice/       route Learner: danh mục, attempt, nộp bài, kết quả, upload Speaking
    └── auth, users, expert, notifications, essays
clients/ai_engine/              gọi AI engine: grading_client (chấm), admin_client (quản trị), run_usage
core/                           cấu hình, bảo mật (JWT Supabase), lỗi miền, cache
services/<chủ đề>/              logic nghiệp vụ, không còn file .py rời ở gốc services/
    admin  ai_monitoring  ai_services  cms  datasets  expert  grading  learner_journey
    learning_profile  listening_reading  notifications  practice  speaking  storage  writing
worker/tasks.py                 2 cấu hình worker arq (Writing + cron, Speaking)
backend/tests/                  test đơn vị (DB giả), chạy trong mọi lần kiểm
backend/integration_tests/      🔴 chạm Supabase và R2 thật, chỉ chạy tay
backend/scripts/                script một lần: nạp dataset, chấm lại, sinh tài liệu Writing, upload R2
```

## 3. AI engine (`ai-engine/`)

```
main.py, serve.py               FastAPI: /grade, /grade-speaking, /draft-material, /health
admin_routes.py                 /admin/* (luôn đòi secret): prompt, trace, sức khoẻ service, gọi thử
services/                       pipeline chấm Writing; services/speaking/ (ASR, phát âm, phản hồi)
services/langfuse/              prompt manager, trace, đo token
services/runtime_config/        lấy cấu hình model/key từ Core, cache 60 s
handlers/, utils/, schemas/     kiểm ngữ pháp, thống kê từ vựng, làm tròn band, schema đầu ra LLM
scripts/                        đánh giá, hiệu chỉnh, dựng corpus tham chiếu (chạy tay)
data/                           corpus tham chiếu, dữ liệu hiệu chỉnh (không track trong git)
```

## 4. Frontend (`frontend/src/`)

```
app/                            route Next.js; URL = đường dẫn thư mục; (student)/ là nhóm route Learner
components/
├── exam/<kỹ năng>/             listening, reading, speaking, writing: trang làm bài, kết quả, thành phần riêng
├── exam/shared/                modal, badge, skeleton dùng chung khi làm bài
├── exam/result-detail/         chi tiết kết quả Listening/Reading (giải thích, bằng chứng, transcript)
├── exam/student-practice/      trang Luyện đề (danh mục, bộ đề, lịch sử)
├── admin/<màn hình>/           tests, test-editor, dataset-ingest, users, settings, reviews, statistics, ai-services...
└── expert/  learning-profile/  layout/  guards/  notifications/  workspace/
services/                       hàm gọi Core API (1 file / nhóm route) và cache phía client
types/                          🔴 mọi kiểu dữ liệu dùng chung; không khai báo kiểu trong data/
data/fallback/                  dữ liệu dự phòng đang được màn hình dùng khi API thiếu dữ liệu (xem §6)
hooks/  lib/  stores/           hook React, hàm tiện ích (đã gộp utils/), state toàn cục
```

## 5. Code mới đặt ở đâu

| Loại code | Đặt ở | 🔴 Không đặt ở |
|---|---|---|
| Route Core mới | `api/endpoints/<vai trò>/`; gắn prefix trong `api_router.py` | File route rời ở gốc `endpoints/` cho nhóm đã có thư mục |
| Logic nghiệp vụ Core | `services/<chủ đề>/` | File rời ở gốc `services/` |
| Gọi service ngoài từ Core | `clients/<service>/` | Trong `services/` |
| Code chấm AI | `ai-engine/` | `backend/` |
| Kiểu dữ liệu frontend | `types/` | File dữ liệu, file component |
| Component | `components/<khu vực>/<kỹ năng hoặc màn hình>/` | File rời ở gốc `components/exam/` hoặc `components/admin/` |
| Hàm tiện ích frontend | `lib/` | Thư mục `utils/` (đã gộp) |
| Test chạm dịch vụ thật | `backend/integration_tests/` | `backend/tests/` |

⚠️ Dời file Python có dùng `Path(__file__).parents[N]` thì phải sửa `N`. Ví dụ `services/datasets/dataset_path_resolver.py` tìm `dataset_clean/` ở gốc repo bằng `parents[4]`, và đã có test khoá.

## 6. Việc còn để sau

- `data/fallback/`: khi API thiếu dữ liệu, màn hình làm bài và kết quả đang hiện đề mẫu (Cambridge 18, Reading/Listening Test 1) thay vì báo lỗi. Bỏ phần này là đổi hành vi, cần làm riêng và kiểm giao diện.
- File dài nên tách (ưu tiên thấp): `app/(student)/profile/page.tsx` 652 dòng, `components/expert/WritingAnnotationWorkspace.tsx` 575 dòng, `api/endpoints/expert.py` 415 dòng, `services/expert/dispatcher.py` 435 dòng.
- `frontend` có 207 lỗi eslint có sẵn từ trước; tiêu chí hiện tại là không tăng.
