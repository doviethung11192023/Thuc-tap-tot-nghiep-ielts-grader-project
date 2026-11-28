# Cây thư mục và quy ước đặt code

Cập nhật 2026-11-25, sau đợt cấu trúc lại lần 2 (gom code mới gộp từ nhóm, tách lớp route/service; `plans/261125-0100-codebase-restructure-v2/plan.md`). Lần 1: `plans/261123-1130-source-code-restructure/plan.md`. Thiết kế và nghiệp vụ: [`source-of-truth.md`](source-of-truth.md).

📌 Sơ đồ kiến trúc, luồng chấm, trạng thái và ERD: [`diagrams/README.md`](diagrams/README.md).

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
├── responses.py                ok() / created(): dựng envelope {"meta", "data"} dùng chung, không viết tay
└── endpoints/                  🔴 chỉ có thư mục, không file route rời ở gốc
    ├── account/                auth (đăng nhập mật khẩu), users (hồ sơ, mục tiêu), notifications
    ├── admin/                  users_reviews_statistics, ai_services, ai_monitoring, tutor, content/ (đề, section, câu hỏi, media, nạp dataset, bộ đề, cài đặt)
    ├── expert/                 profile, assignments, workspace (chấm bài)
    ├── internal/ai_engine.py   route nội bộ engine gọi (secret, không cho trình duyệt)
    └── student_practice/       route Learner: danh mục, attempt, nộp bài, kết quả (cả essay_results), upload Speaking, tutor
clients/ai_engine/              gọi AI engine: grading_client (chấm), admin_client (quản trị), run_usage
core/                           cấu hình, bảo mật (JWT Supabase), lỗi miền (DomainError), cache, logging_config
services/<chủ đề>/              logic nghiệp vụ + truy vấn Supabase; không còn file .py rời ở gốc services/
    account  admin  ai_monitoring  ai_services  cms  datasets  expert  grading  learner_journey
    learning_profile  listening_reading  notifications  practice  speaking  storage  tutor  writing
worker/tasks.py                 2 cấu hình worker arq (Writing + cron, Speaking); log qua logging_config
backend/tests/                  test đơn vị (DB giả), chạy trong mọi lần kiểm; test_architecture.py khoá quy ước
backend/integration_tests/      🔴 chạm Supabase và R2 thật, chỉ chạy tay
backend/scripts/                script một lần: nạp dataset, chấm lại, sinh tài liệu Writing, upload R2
```

**Một request đi qua 3 lớp** (Service Layer):

| Lớp | Làm gì | 🔴 Không làm |
|---|---|---|
| Route (`api/endpoints/…`) | Nhận tham số, `Depends` lấy user/quyền, gọi service, trả `ok(...)` | Gọi `db()`/Supabase, chứa luật nghiệp vụ |
| Service (`services/<chủ đề>/`) | Luật nghiệp vụ, đọc/ghi Supabase, ném `DomainError(msg, status)` khi lỗi nghiệp vụ | Biết tới `Request`, `HTTPException` |
| Client (`clients/…`) | Gọi HTTP sang service ngoài (AI engine) | Truy vấn DB |

- Handler gọi hàm đồng bộ (supabase-py) phải là `def` để FastAPI chạy trong threadpool. Handler `async def` chỉ khi có `await` thật; phần đồng bộ bên trong bọc `run_in_threadpool`. Lý do: `async def` gọi DB đồng bộ chặn cả server (đo 2026-11-24: 6 request song song xếp hàng 0,4 → 2,0 s).
- Log: `logger = logging.getLogger(__name__)`, không `print`.

## 3. AI engine (`ai-engine/`)

```
main.py                         app factory: env, logging, lifespan (nạp NLP/speech model), CORS, gắn router; vẫn export `app`
serve.py                        chạy uvicorn khi dev
api/                            grading_routes (/grade, /grade-speaking, /draft-material, /health…), admin_routes (/admin/*, luôn đòi secret), auth (kiểm secret)
services/                       🔴 chỉ có package, không file rời ở gốc
├── writing/                    pipeline chấm Writing Task 1/2: phân loại, bài mẫu theo band, key point, tổng hợp, Jev, soạn tài liệu. Bỏ LanguageTool và Java 2026-11-29: LLM tự bắt lỗi chính tả, ngữ pháp
├── speaking/                   ASR, phát âm, trần band, phản hồi Speaking
├── llm/                        llm_client, prompt_builder, llm_evaluator (dùng chung Writing/Speaking/tutor)
├── tutor/                      AI tutor: prompt, chống lộ đáp án, streaming, đo token
├── langfuse/                   prompt manager, trace, đo token
├── runtime_config/             lấy cấu hình model/key từ Core, cache 60 s
└── service_admin/              sức khoẻ service, gọi thử, cấu hình hiệu lực
handlers/, utils/, schemas/     kiểm ngữ pháp, thống kê từ vựng, làm tròn band, schema đầu ra LLM
scripts/                        đánh giá, hiệu chỉnh, dựng corpus tham chiếu (chạy tay)
data/                           corpus tham chiếu, dữ liệu hiệu chỉnh (không track trong git)
tests/test_architecture.py      khoá: không file rời ở gốc services/, không print, đường dẫn data/
```

## 4. Frontend (`frontend/src/`)

```
app/                            route Next.js; URL = đường dẫn thư mục; (student)/ là nhóm route Learner
components/
├── exam/<kỹ năng>/             listening, reading, speaking, writing: trang làm bài, kết quả, thành phần riêng
├── exam/shared/                modal, badge, skeleton dùng chung khi làm bài
├── exam/result-detail/         chi tiết kết quả Listening/Reading (giải thích, bằng chứng, transcript)
├── exam/student-practice/      trang Luyện đề (danh mục, bộ đề, lịch sử)
├── admin/<màn hình>/           tests, test-editor, dataset-ingest, users, settings, reviews, statistics, ai-services, ai-tutor, expert-governance (dùng ở nhiều màn hình)...
├── exam/tutor/                 AI tutor trong phòng luyện tập
└── expert/  learning-profile/  layout/  guards/  notifications/  workspace/
services/                       hàm gọi Core API (1 file / nhóm route) và cache phía client
types/                          🔴 mọi kiểu dữ liệu dùng chung; không khai báo kiểu trong data/
data/fallback/                  dữ liệu dự phòng đang được màn hình dùng khi API thiếu dữ liệu (xem §6)
hooks/  lib/  stores/           hook React, hàm tiện ích (đã gộp utils/), state toàn cục
scripts/check-structure.mjs     `npm run check:structure`: chặn file rời ở gốc components/admin, components/exam và import @/utils, @/mocks
```

## 5. Code mới đặt ở đâu

| Loại code | Đặt ở | 🔴 Không đặt ở |
|---|---|---|
| Route Core mới | `api/endpoints/<vai trò>/`; gắn prefix trong `api_router.py`; trả `ok(...)` | File route rời ở gốc `endpoints/`; gọi `db()` trong route; envelope viết tay |
| Logic nghiệp vụ Core | `services/<chủ đề>/`, lỗi nghiệp vụ ném `DomainError` | File rời ở gốc `services/`; `HTTPException` trong service |
| Gọi service ngoài từ Core | `clients/<service>/` | Trong `services/` |
| Code chấm AI | `ai-engine/services/<miền>/`, route ở `ai-engine/api/` | `backend/`; file rời ở gốc `ai-engine/services/`; route trong `main.py` |
| Kiểu dữ liệu frontend | `types/` | File dữ liệu, file component |
| Component | `components/<khu vực>/<kỹ năng hoặc màn hình>/` | File rời ở gốc `components/exam/` hoặc `components/admin/` |
| Hàm tiện ích frontend | `lib/` | Thư mục `utils/` (đã gộp) |
| Test chạm dịch vụ thật | `backend/integration_tests/` | `backend/tests/` |

✅ Quy ước được test tự kiểm: `backend/tests/test_architecture.py`, `backend/tests/test_api_hardening.py`, `ai-engine/tests/test_architecture.py`, `npm run check:structure`. Vi phạm là test đỏ.

⚠️ Dời file Python có dùng `Path(__file__).parents[N]` thì phải sửa `N`. Ví dụ `services/datasets/dataset_path_resolver.py` tìm `dataset_clean/` ở gốc repo bằng `parents[4]`, và đã có test khoá.

## 6. Việc còn để sau

- `data/fallback/`: khi API thiếu dữ liệu, màn hình làm bài và kết quả đang hiện đề mẫu (Cambridge 18, Reading/Listening Test 1) thay vì báo lỗi. Bỏ phần này là đổi hành vi, cần làm riêng và kiểm giao diện.
- File dài nên tách (ưu tiên thấp): `components/expert/WritingAnnotationWorkspace.tsx` 575 dòng, `app/expert/assignments/[assignmentId]/page.tsx` 554 dòng, `components/expert/SpeakingAudioWorkspace.tsx` 474 dòng.
- Truy vấn Supabase vẫn viết thẳng trong service (chưa có lớp repository); làm khi có lý do cụ thể (vd. đổi sang client Postgres async).
- 46 chỗ route tự ném `HTTPException` cho lỗi tham số (không kèm truy vấn DB): chấp nhận được, có thể chuyển dần sang `DomainError`.
- `frontend` có lỗi eslint có sẵn từ trước; tiêu chí hiện tại là không tăng.
