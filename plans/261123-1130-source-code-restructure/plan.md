---
title: "Cấu trúc lại source code (chỉ dời và đổi tên, không đổi hành vi)"
plan_id: "261123-1130-source-code-restructure"
date: "2026-11-23"
version: "1.0"
status: "draft — chờ duyệt §9"
branch: "Sinh_AI-Dev (commit gốc 445771f)"
người làm: "Sinh (Claude hỗ trợ)"
người duyệt: "Sinh + nhóm (Hungdo, Long) cho phần frontend/Core"
thời lượng: "≈ 3,5 ngày làm việc, chia 6 giai đoạn, mỗi giai đoạn một commit chạy được"
---

# Cấu trúc lại source code

**Mục tiêu một câu:** người mới mở repo biết ngay code của một chức năng nằm ở đâu và code mới phải đặt ở đâu, mà **không đổi bất kỳ hành vi nào** của hệ thống.

## 0. Đọc cái này trước

### 0.1 Việc này là gì

Dời file, gom thư mục, đổi tên, xoá file rác và code chết, sửa import cho khớp. Kết quả đo được ở §4: mọi test và build vẫn xanh như trước khi bắt đầu.

Bảy vấn đề chính đo được trên `Sinh_AI-Dev` ngày 2026-11-23:

| # | Vấn đề | Số liệu | Hệ quả |
|---|---|---|---|
| V1 | **AI engine nằm lồng trong package Core** (`backend/app/ai`) dù là service riêng: Dockerfile, `pyproject.toml`, `uv.lock`, venv và test riêng | Core không import gì từ engine (0 file) | Người đọc tưởng engine là một phần của Core; dễ chạy nhầm venv, nhầm thư mục test |
| V2 | **Kiểu dữ liệu nghiệp vụ nằm trong file mock** | 33 import `@/mocks/...` từ code chạy thật; `student-test-practice.ts` còn dùng `mockExamCollections` | Sửa mock là vỡ type cả app; dữ liệu giả có thể lọt vào màn hình thật |
| V3 | **Gốc repo lẫn file tạm** | 21 file/thư mục được track ở gốc, gồm `test_fuzzy.py`, `test_register.ts/.mjs`, `run_e2e_verification.py`, `pytest_output.txt`, `auth-account-management-plan.md` | Khó biết file nào còn dùng |
| V4 | **File rời ở gốc `backend/app/services/`** cạnh thư mục cùng chủ đề | `dataset_importer.py`, `dataset_scanner.py`, `dataset_path_resolver.py` cạnh `importers/`; `learning_profile_aggregator.py` cạnh `learning_profile/`; `notification_service.py`, `r2_storage.py`, `catalog_formatter.py` | Cùng một chủ đề nằm 2 chỗ |
| V5 | **Endpoint Admin rải 4 nơi**: `admin.py`, `admin_ai_monitoring.py`, `admin_ai_services.py`, `admin_content/`; 3 file client engine rời ở `clients/` | `expert.py` dài 415 dòng | Khó tìm route |
| V6 | **`components/exam/` 99 file, 15 file rời ở gốc, trộn hai kiểu**: `ListeningWorkspace.tsx` ở gốc nhưng còn có thư mục `listening/`; thư mục `clean/` (24 file) có tên không nói lên chức năng; `lib/` và `utils/` cùng tồn tại | 99 file | Một kỹ năng nằm ở 3 chỗ |
| V7 | **Tài liệu kiến trúc lệch code**: README còn nói Arize Phoenix, LangGraph; `ARCHITECTURE.md` đã bị `docs/source-of-truth.md` thay; `backend/docker-compose.yml` cũ (sửa lần cuối 2026-07-27) khác bản ở gốc | 2 bản compose | Làm theo README là chạy sai |

### 0.2 Việc này KHÔNG phải là gì

| Không làm | Vì sao |
|---|---|
| Viết lại logic, tối ưu, đổi thuật toán | Trộn đổi hành vi với dời file thì không biết lỗi do đâu. Việc nào phát hiện cần sửa logic thì ghi vào §9, làm sau ở commit riêng |
| Đổi URL API, URL trang, tên bảng DB, tên prompt Langfuse | Đó là hợp đồng giữa các phần (frontend ↔ Core ↔ engine ↔ Supabase ↔ Langfuse); đổi là phải sửa và test cả hai đầu |
| Đổi tên package Python `app.*` của Core | Lệnh worker (`arq app.worker.tasks.WorkerSettings`), docker-compose, script đều dùng tên này |
| Tách file dài của frontend (`profile/page.tsx` 652 dòng, `WritingAnnotationWorkspace.tsx` 575 dòng) | Tách component là đổi cấu trúc render, cần test giao diện. Ghi là việc riêng, ưu tiên C (§4, GĐ6) |
| Gom mọi thứ theo một kiến trúc "chuẩn" mới (feature-sliced, clean architecture...) | Repo đang chạy, gần bảo vệ; chỉ sửa chỗ đang rối, giữ phần đã ổn |

### 0.3 Đầu vào và giới hạn

- Code: nhánh `Sinh_AI-Dev`, commit `445771f`. Lệnh test đang xanh: Core 399 test, AI engine 314 test, frontend `tsc` + `eslint` + `next build` sạch.
- ⚠️ Repo có 3 người cùng code (`Sinh-GoTrust`, `tommy`/Hungdo, `Vũ Kim Long`) và còn nhánh khác đang mở (`LongRevert`). Dời file trên `Sinh_AI-Dev` sẽ làm các nhánh đó conflict khi merge.
- ⚠️ Theo thoả thuận trước, Sinh chỉ chủ động sửa `backend/app/ai`; frontend và Core thuộc phần của bạn cùng nhóm. **Các giai đoạn GĐ3–GĐ5 cần nhóm đồng ý** (§9, câu 1).

## 1. Ràng buộc bắt buộc

| # | Ràng buộc | Lý do |
|---|---|---|
| 🔴 R1 | **Commit dời file tách khỏi commit sửa nội dung.** Mỗi giai đoạn: commit 1 = `git mv` thuần; commit 2 = sửa import, đường dẫn | Git nhận ra file bị dời (rename) nên `git log --follow` và `git blame` vẫn giữ lịch sử; người review thấy rõ commit nào chỉ dời |
| 🔴 R2 | **Không đổi hành vi.** Không sửa dòng logic nào trong lúc dời | Để mọi lỗi sau khi dời chỉ có một nguyên nhân: import/đường dẫn |
| 🔴 R3 | **Hết mỗi giai đoạn phải xanh** đủ bộ kiểm ở §4 rồi mới sang giai đoạn sau | Lỗi phát hiện trễ một giai đoạn thì phải lần ngược qua hàng trăm file |
| 🔴 R4 | **Merge các nhánh đang mở vào `Sinh_AI-Dev` trước GĐ3**, và nhóm tạm không commit vào thư mục đang dời trong lúc làm | Dời file trên nhánh này trong khi người khác sửa file cũ trên nhánh khác là conflict khó gỡ |
| ⚠️ R5 | Không xoá file khi chưa chứng minh không ai dùng: `git grep` tên file/tên export ra 0 kết quả, build và test vẫn xanh | Next.js và FastAPI nạp một số file qua tên chuỗi (route, `arq` settings), grep import thường bỏ sót |
| ⚠️ R6 | Commit theo quy ước của repo: `(Sinh)refactor/<mô tả bằng lời>` | Thống nhất với lịch sử commit hiện có |

## 2. Cấu trúc đích

📌 Phần đánh dấu `←` là chỗ thay đổi; còn lại giữ nguyên.

```
ielts-grader-project/
├── frontend/                       Next.js (URL trang giữ nguyên)
├── backend/                        Core API FastAPI + worker arq (package app.*)
├── ai-engine/                   ← dời từ backend/app/ai (service riêng, imports nội bộ không đổi)
├── supabase/                       migrations + test SQL
├── docs/                           source-of-truth, defense-highlights, codebase-summary (mới)
├── plans/  specs/  tools/
├── scripts/                     ← thêm manual-checks/ chứa test_*.py|ts|mjs, run_e2e_verification.py từ gốc
├── docker-compose.yml  README.md  CLAUDE.md
```

**Core (`backend/app/`)**

```
api/endpoints/
├── admin/                       ← gom: admin.py → users_stats.py, admin_ai_monitoring.py → ai_monitoring.py,
│                                   admin_ai_services.py → ai_services.py, admin_content/ → content/
├── expert/                      ← (S) tách expert.py 415 dòng theo nhóm route: assignments.py, scoring.py, profile.py
├── student_practice/               giữ
├── internal/ai_engine.py        ← từ internal_ai_engine.py
└── auth.py  users.py  notifications.py  essays.py
clients/ai_engine/               ← client.py, admin_client.py, run_usage.py (từ 3 file ai_engine_* rời)
services/                           không còn file .py rời ở gốc (trừ __init__.py)
├── datasets/                    ← dataset_importer, dataset_scanner, dataset_path_resolver + importers/*
├── learning_profile/            ← + learning_profile_aggregator.py
├── notifications/               ← notification_service.py
├── storage/                     ← r2_storage.py
├── practice/                    ← + catalog_formatter.py
└── admin  ai_monitoring  ai_services  cms  expert  grading  learner_journey
    listening_reading  speaking  writing          giữ nguyên
tests/                              giữ; thêm 2 file rời ở gốc backend/ vào đây (test_admin_test_sets.py,
                                    test_e2e_admin_content_flow.py) hoặc xoá nếu không còn chạy được
```

**Frontend (`frontend/src/`)**

```
app/                                giữ nguyên (URL không đổi)
types/                           ← nhận các kiểu đang nằm trong mocks: exam-listening.ts, exam-writing.ts,
                                    exam-speaking.ts, exam-result-detail.ts (từ clean-dataset)
mocks/                           ← xoá; dữ liệu mẫu còn cần cho dev thì dời sang src/fixtures/ và không import từ code chạy thật
lib/                             ← gộp utils/ vào lib/ (4 file)
components/
├── exam/
│   ├── listening/ reading/ speaking/ writing/   ← dời *Workspace.tsx, *ResultsView.tsx vào đúng kỹ năng
│   ├── result-detail/           ← đổi tên từ clean/ (24 file, bỏ tiền tố Clean ở tên file: S)
│   └── shared/                  ← modal, badge, skeleton dùng chung (ExitConfirmModal, AutosaveStatusBadge...)
├── admin/
│   ├── tests/ users/ dataset-ingest/ settings/  ← gom 39 file rời theo màn hình
│   └── ai-services/ answer-editors/ writing-material/   giữ
└── expert/ learning-profile/ layout/ guards/ notifications/ workspace/   giữ
```

## 3. Quy ước đặt chỗ cho code mới (sau khi xong, ghi vào `docs/codebase-summary.md`)

| Loại code | Đặt ở | Ví dụ |
|---|---|---|
| Route Core | `api/endpoints/<vai trò hoặc nhóm>/` | Route Admin mới → `api/endpoints/admin/` |
| Logic nghiệp vụ Core | `services/<chủ đề>/`, không đặt file rời ở gốc `services/` | Thông báo mới → `services/notifications/` |
| Gọi service ngoài | `clients/<tên service>/` | |
| Code AI engine | `ai-engine/` | |
| Kiểu dữ liệu frontend | `types/` | 🔴 Không định nghĩa kiểu trong mock |
| Component frontend | `components/<khu vực>/<kỹ năng hoặc màn hình>/` | Component Writing của bài thi → `components/exam/writing/` |
| Hàm tiện ích frontend | `lib/` | |

## 4. Các giai đoạn

Bộ kiểm dùng chung (gọi là **"bộ kiểm xanh"**), chạy hết mỗi giai đoạn:

```bash
# Xoá cache import cũ trước khi test, tránh test pass nhờ file .pyc của đường dẫn cũ
find backend -name __pycache__ -type d -prune -exec rm -rf {} +
cd backend && .venv/bin/python -m pytest tests -q            # Core: 399 passed
cd ai-engine && .venv/bin/python -m pytest tests -q          # engine: 314 passed (trước GĐ2: backend/app/ai)
cd frontend && npx tsc --noEmit && npx eslint src && npm run build
docker compose config -q                                     # compose hợp lệ, đường dẫn build/volume đúng
```

| GĐ | Mục tiêu | Việc | Đầu ra | Nghiệm thu | Ưu tiên | Thời lượng |
|---|---|---|---|---|---|---|
| **GĐ1** | Gốc repo sạch | Dời `test_fuzzy.py`, `test_register.ts/.mjs`, `run_e2e_verification.py` → `scripts/manual-checks/`; xoá `pytest_output.txt`; dời `auth-account-management-plan.md` → `plans/`; xoá `backend/docker-compose.yml` cũ; `ARCHITECTURE.md` thay bằng 3 dòng trỏ tới `docs/source-of-truth.md` | 2 commit | Gốc repo còn ≤ 15 mục được track (hiện 21); bộ kiểm xanh | M | 0,5 ngày |
| **GĐ2** | Tách AI engine thành thư mục ngang hàng Core | `git mv backend/app/ai ai-engine`; sửa `docker-compose.yml` (build, env_file, volume `reference_corpus`), `.gitignore`, 6 script trong `scripts/` của engine, README, `docs/`, `.claude/` và memory nói tới đường dẫn cũ; tạo lại venv engine ở chỗ mới | 2 commit | `git grep 'backend/app/ai'` chỉ còn trong `plans/` cũ; engine chạy được từ `ai-engine/` (`curl :8001/health` = 200); chấm thật 1 bài Writing qua Core thành công; bộ kiểm xanh | M | 0,5 ngày |
| **GĐ3** | Core gom theo chủ đề | Dời file rời ở `services/` vào thư mục chủ đề (§2); gom endpoint Admin vào `api/endpoints/admin/`; gom 3 client engine vào `clients/ai_engine/`; sửa `api_router.py`; dời 2 file test ở gốc `backend/` | 2 commit | Gốc `services/` chỉ còn `__init__.py`; `GET /openapi.json` trước và sau **giống hệt** (so bằng `diff`, chứng minh không đổi URL nào); bộ kiểm xanh | M | 1 ngày |
| **GĐ4** | Frontend: kiểu ra khỏi mock | Dời kiểu từ `mocks/*` sang `types/`; bỏ dữ liệu mock khỏi code chạy thật (`mockWritingExamDataset` trong `exam-content-mapper.ts`, `mockExamCollections` trong `student-test-practice.ts`: xem §9 câu 4); xoá mock không ai dùng (`exam-reading`, `exam.ts`, `learning-profile`, `test-practice`, `data/mock_essays.json`); gộp `utils/` vào `lib/` | 2–3 commit | `git grep '@/mocks' frontend/src` = 0; build xanh; mở lại 4 trang làm bài + 4 trang kết quả trên trình duyệt, không lỗi console | M | 1 ngày |
| **GĐ5** | Frontend: components theo kỹ năng | Dời `*Workspace.tsx`, `*ResultsView.tsx` vào thư mục kỹ năng; `clean/` → `result-detail/`; gom file rời của `components/admin/` theo màn hình | 2 commit | Không còn file `.tsx` rời ở gốc `components/exam/` ngoài thư mục; build xanh; mở lại các trang Admin chính không lỗi | S | 0,5 ngày |
| **GĐ6** | Tài liệu và bàn giao | Viết lại phần cấu trúc và cách chạy trong README; ⭐ tạo `docs/codebase-summary.md` (cây thư mục + quy ước §3); cập nhật đường dẫn trong `docs/source-of-truth.md` | 1 commit | Người khác chạy được stack chỉ bằng README; mọi đường dẫn trong `docs/` tồn tại (script kiểm) | M | 0,5 ngày |
| GĐ7 | Tách file dài (ngoài phạm vi đợt này) | `profile/page.tsx`, `WritingAnnotationWorkspace.tsx`, `expert.py`, `dispatcher.py` (435 dòng) | — | — | C | Để sau |

📌 Có thể dừng sau GĐ2: chỉ riêng GĐ1–GĐ2 đã gỡ được vấn đề lớn nhất (V1, V3, V7) mà gần như không đụng code của người khác.

## 5. Quy định làm việc

| Điều | Yêu cầu |
|---|---|
| Nhánh | Làm trên nhánh con `refactor/source-structure` tách từ `Sinh_AI-Dev`; merge lại sau mỗi giai đoạn xanh |
| Báo nhóm | Trước GĐ3 và GĐ4: báo thư mục sắp dời và khung giờ; nhóm merge việc đang làm trước |
| Khi gặp file không rõ còn dùng không | Không xoá; ghi vào §9 và hỏi |
| Phát hiện lỗi logic trong lúc dời | Không sửa trong đợt này (R2); ghi lại, sửa ở commit riêng sau |

## 6. Bẫy đã biết

| # | Bẫy | Cách xử |
|---|---|---|
| 1 | Python giữ file `.pyc` của đường dẫn cũ, test có thể vẫn pass dù import đã vỡ | Xoá `__pycache__` trước mỗi lần chạy test (lệnh ở §4) |
| 2 | Venv của engine (`backend/app/ai/.venv`) có đường dẫn tuyệt đối bên trong, dời thư mục là venv hỏng | Tạo lại venv ở `ai-engine/` (`uv sync`), không dời venv |
| 3 | Đổi tên chỉ khác hoa/thường (`Clean...` → `clean...`) không được Git ghi nhận đúng trên một số máy | Đổi qua tên trung gian: `git mv A tmp && git mv tmp a` |
| 4 | Next.js giữ cache `.next/` cũ, build có thể dùng lại module đã xoá | Xoá `.next/` trước `npm run build` ở GĐ4–GĐ5 |
| 5 | Đường dẫn nằm trong chuỗi, grep import không bắt được: lệnh `arq` trong compose, volume `reference_corpus`, `serve.py`, đường dẫn trong script | `git grep` cả tên thư mục cũ, không chỉ câu lệnh `import` |
| 6 | `pkill -f <mẫu>` trong cùng lệnh shell tự kill chính shell đó khi khởi động lại stack | Dừng server theo cổng (`ss -ltnp "sport = :8000"`) |
| 7 | Nhánh khác vẫn sửa file ở chỗ cũ sau khi đã dời | R4: merge trước, khoá thư mục trong lúc làm; nếu vẫn conflict, Git thường tự theo file đã dời khi commit dời là thuần (R1) |

## 7. Lịch và mốc

```
Ngày 1  ████ GĐ1 + GĐ2     mốc: engine chạy từ ai-engine/, chấm thật 1 bài
Ngày 2  ████ GĐ3           mốc: openapi.json trước = sau
Ngày 3  ████ GĐ4 + ½ GĐ5   mốc: 0 import @/mocks, 8 trang làm bài/kết quả mở được
Ngày 4  ██   GĐ5 + GĐ6     mốc: README mới chạy được trên máy sạch
```

## 8. Cần chuẩn bị trước

| # | Việc | Ai |
|---|---|---|
| 1 | Đồng ý phạm vi GĐ3–GĐ5 (đụng frontend và Core) | Nhóm |
| 2 | Merge các nhánh đang mở (`LongRevert`...) vào `Sinh_AI-Dev` | Long, Hungdo |
| 3 | Chốt các câu hỏi ở §9 | Sinh |

## 9. Câu hỏi mở

1. **Nhóm đã đồng ý cho dời code frontend và Core chưa?** Nếu chưa: chỉ làm GĐ1, GĐ2, GĐ6 (phần của Sinh) và đề xuất GĐ3–GĐ5 cho nhóm.
2. **Tên thư mục engine**: `ai-engine/` ở gốc (đề xuất, ngang hàng `backend/` vì là service riêng) hay `backend/ai_engine/` (ít đổi docker-compose hơn)?
3. **`AGENTS.md`, `GEMINI.md` ở gốc** còn ai dùng không? Giữ thì để nguyên; không thì xoá ở GĐ1.
4. **Bỏ dữ liệu mock dự phòng** trong `student-test-practice.ts` (`mockExamCollections`) và `exam-content-mapper.ts` đổi hành vi khi API lỗi: màn hình sẽ báo lỗi thay vì hiện đề giả. Đồng ý đổi, hay giữ lại và chỉ dời sang `fixtures/`?
5. **`backend/uploads/` đang track 1 file mp3** (`ae2493ee15e8.mp3`): xoá khỏi git hay giữ làm dữ liệu test?
6. **Thời điểm làm**: trước hay sau buổi bảo vệ? Làm trước thì cần đủ 3,5 ngày không chen tính năng mới.

## Phụ lục tham chiếu

- `docs/source-of-truth.md` — nguồn sự thật về kiến trúc; cập nhật đường dẫn ở GĐ6.
- `plans/261004-1515-ielts-capstone-restructure-plan/` — kế hoạch tính năng cũ (tháng 10), không trùng việc này.
- Số liệu ở §0.1 lấy bằng `git ls-tree`, `git grep -c` trên `Sinh_AI-Dev` ngày 2026-11-23.
