---
title: "Master Plan: Tái Cấu Trúc & Nâng Cấp Hệ Thống IELTS Grader Thành Đồ Án Tốt Nghiệp"
plan_id: "261004-1515-ielts-capstone-restructure-plan"
date: "2026-10-04"
status: "pending"
priority: "P1"
total_effort: "10 weeks (3 team members)"
source_codebase: "E:/Thuc tap tot nghiep/ielts-grader-project"
authors: ["Capstone Team", "Antigravity AI"]
---

# KẾ HOẠCH TỔNG THỂ (MASTER PLAN)
## TÁI CẤU TRÚC & NÂNG CẤP DỰ ÁN IELTS THỰC TẬP THÀNH ĐỒ ÁN TỐT NGHIỆP

---

## 1. TỔNG QUAN & BỐI CẢNH (EXECUTIVE CONTEXT)

- **Đồ án tốt nghiệp:** AI-BASED ENGLISH LEARNING AND ASSESSMENT SYSTEM (Hệ thống luyện thi & đánh giá IELTS tích hợp AI).
- **Quy mô:** Đội 3 sinh viên, lộ trình 10 tuần.
- **Hiện trạng source gốc (`E:/Thuc tap tot nghiep/ielts-grader-project`):**
  - Đã có Frontend Next.js 16 (React 19), Tailwind CSS v4, Zustand, Supabase client.
  - Đã có Backend FastAPI, ARQ Worker (Redis queue), Supabase PostgreSQL.
  - Đã hoàn thiện module **Writing Task 2**: Pipeline AI 7 bước, 4 Agent song song (Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy) chạy trên LangChain + LangGraph + Langfuse.
  - Tái sử dụng được xấp xỉ **60% nền tảng kỹ thuật**.
- **Mục tiêu tái cấu trúc:** Giữ nguyên kiến trúc FastAPI + Next.js + Python AI Engine; mở rộng toàn diện sang hệ thống 4 kỹ năng (Reading, Listening, Writing, Speaking), bổ sung 3 phân quyền (Learner, Expert, Admin), Dashboard theo dõi tiến độ và workflow chấm điểm.

---

## 2. QUYẾT ĐỊNH KIẾN TRÚC THEN CHỐT (ARCHITECTURAL DECISIONS)

```
                            [HỌC VIÊN / GIÁO VIÊN / QUẢN TRỊ VIÊN]
                                              │
                                              ▼
                        ┌───────────────────────────────────────────┐
                        │       FRONTEND: Next.js 16 (App Router)   │
                        │  - Student Workspace & 4 Skill Test UI    │
                        │  - Expert Review & Scoring Workspace      │
                        │  - Admin Operational Dashboard            │
                        └─────────────────────┬─────────────────────┘
                                              │ HTTP / Supabase Realtime
                                              ▼
                        ┌───────────────────────────────────────────┐
                        │       BACKEND CORE: FastAPI (Python 3.11) │
                        │  - Auth & RBAC (Learner / Expert / Admin) │
                        │  - Exam Management (Practice vs Mock Test)│
                        │  - Automated Grader (Reading & Listening) │
                        │  - Task Dispatcher (ARQ / Redis Queue)    │
                        └──────────────┬──────────────────┬─────────┘
                                       │                  │
                      ┌────────────────┘                  └────────────────┐
                      ▼                                                    ▼
       ┌──────────────────────────────┐                   ┌──────────────────────────────────┐
       │     ASYNCHRONOUS WORKER      │                   │           DATA LAYER             │
       │   - Audio Pipeline (Whisper) │                   │  - Supabase PostgreSQL (Core DB) │
       │   - AI Multi-Agent Grader    │                   │  - Redis 7 (Queue & Cache)       │
       │   - Fuzzy Text Annotation    │                   │  - Supabase Storage (Audio/Docs) │
       │   - Task 1 Multimodal Vision │                   │  - Arize Phoenix (Observability) │
       └──────────────────────────────┘                   └──────────────────────────────────┘
```

1. **Giữ nguyên Python FastAPI & LangGraph cho Backend:** Không đổi sang NestJS. Việc giữ FastAPI bảo toàn 100% pipeline Writing Task 2 đã chạy ổn định và tạo điều kiện tích hợp Whisper STT / OpenCV / Multimodal LLM trực tiếp trong hệ sinh thái Python.
2. **Khắc phục Technical Debt hạ tầng (P0):** Đóng gói AI Engine thành Docker container nội bộ, loại bỏ hoàn toàn việc phụ thuộc ngrok tunnel (`serve.py`).
3. **Mở rộng Data Schema trên Supabase:** Bổ sung thực thể phân quyền `expert`, bảng quản lý bài thi chuẩn (`tests`, `test_attempts`), ngân hàng câu hỏi Reading/Listening (`questions`, `passages`, `audio_tracks`), bảng ghi nhận kỹ năng Nói (`speaking_submissions`) và tiến độ (`skill_progress`).
4. **Phân chia 3 Tier phạm vi phát triển:**
   - **Tier 1 (Bắt buộc bảo vệ đồ án):** Auth RBAC, Writing Task 2 (đã có), Reading auto-score, Listening auto-score, Speaking STT + AI scoring, Dashboard tiến độ cơ bản.
   - **Tier 2 (Nên có để đạt điểm xuất sắc):** Writing Task 1 Multimodal, Quy trình Teacher/Expert chấm bài async, Mục tiêu cá nhân hóa (Goal Setting).
   - **Tier 3 (Mở rộng nếu dư thời gian):** Đánh giá ngữ điệu chuyên sâu (Azure Pronunciation Assessment), Chatbot cố vấn học tập, Mock test thời gian thực.

---

## 3. DANH SÁCH CÁC PHASE THI CÔNG (PHASE BREAKDOWN)

Chi tiết triển khai được phân rã thành 8 Phase độc lập theo cấu trúc chuẩn:

| Phase | Tên Phase | Độ ưu tiên | Thời lượng | Tài liệu chi tiết | Phụ trách chính |
|-------|-----------|------------|------------|-------------------|-----------------|
| **01** | Technical Debt & Docker Containerization | P0 | Tuần 1 | [phase-01-core-refactor-cleanup.md](./phase-01-core-refactor-cleanup.md) | SV2 (DevOps/BE) |
| **02** | Database Schema Expansion & 3-Role RBAC | P0 | Tuần 2 | [phase-02-database-rbac-migration.md](./phase-02-database-rbac-migration.md) | SV2 (BE) + SV1 (FE) |
| **03** | Reading Module (Practice & Mock Test) | P1 | Tuần 3 | [phase-03-reading-module.md](./phase-03-reading-module.md) | SV1 (FE) + SV2 (BE) |
| **04** | Listening Module & Audio Auto-Scoring | P1 | Tuần 4 | [phase-04-listening-module.md](./phase-04-listening-module.md) | SV1 (FE) + SV2 (BE) |
| **05** | Speaking Module (Audio, Whisper STT & AI Scoring) | P0 | Tuần 5 - 6 | [phase-05-speaking-module-stt-ai.md](./phase-05-speaking-module-stt-ai.md) | SV3 (AI) + SV1 (FE) |
| **06** | Writing Task 1 Multimodal & Expert Review Workflow | P1 | Tuần 6 - 7 | [phase-06-writing-task1-expert-review.md](./phase-06-writing-task1-expert-review.md) | SV3 (AI) + SV2 (BE) |
| **07** | Learning Dashboard, Goals & Band Analytics | P1 | Tuần 8 | [phase-07-dashboard-analytics-goals.md](./phase-07-dashboard-analytics-goals.md) | SV1 (FE) + SV3 (Data) |
| **08** | Testing, Deployment & Capstone Defense Preparation | P0 | Tuần 9 - 10 | [phase-08-testing-deployment-docs.md](./phase-08-testing-deployment-docs.md) | Cả 3 SV |

---

## 4. MA TRẬN PHÂN CÔNG 3 THÀNH VIÊN (RESPONSIBILITY MATRIX)

- **SV1 (Frontend & UX Lead):**
  - Chịu trách nhiệm toàn bộ UI/UX hệ thống trên Next.js 16.
  - Phát triển giao diện phòng thi Reading (chia cột bài đọc/câu hỏi), Listening (trình phát audio kèm thanh tiến độ), Speaking (ghi âm Web Audio API), và Writing Task 1.
  - Xây dựng Dashboard học tập cá nhân hóa, biểu đồ tiến độ Recharts, và màn hình chấm bài dành riêng cho Expert.
- **SV2 (Backend & Database Lead):**
  - Mở rộng kiến trúc FastAPI, viết endpoint RESTful cho 4 kỹ năng và phân quyền RBAC.
  - Quản lý cơ sở dữ liệu Supabase PostgreSQL: migrations, index, RLS (Row Level Security).
  - Tối ưu hóa hàng đợi ARQ Redis Worker, bảo mật hệ thống, cấu hình Docker Compose môi trường production.
- **SV3 (AI Engine & Scoring Pipeline Lead):**
  - Mở rộng hệ thống Multi-Agent: Viết pipeline chấm Speaking (Whisper STT -> Prompt FC/LR/GRA/P -> JSON output).
  - Xây dựng Task 1 Grader tích hợp Multimodal LLM (Gemini 1.5 Flash / GPT-4o) đọc hình ảnh biểu đồ.
  - Giám sát độ chính xác bằng Arize Phoenix & Langfuse; chuẩn bị bộ dữ liệu đánh giá (Benchmark Evaluation Dataset) phục vụ bảo vệ đồ án.

---

## 5. KẾ HOẠCH BẢO VỆ & TIÊU CHÍ HOÀN THÀNH (SUCCESS CRITERIA)

- [ ] Hoạt động trơn tru 4 kỹ năng: Reading, Listening, Writing, Speaking ở cả 2 chế độ (Luyện tập & Thi thử).
- [ ] Chấm điểm tự động Reading & Listening trả kết quả ngay lập tức kèm đáp án/giải thích.
- [ ] Pipeline AI Writing & Speaking trả kết quả cấu trúc JSON chuẩn barem IELTS trong $< 45$ giây với đầy đủ feedback chi tiết từng tiêu chí.
- [ ] Phân quyền 3 role hoạt động độc lập (Learner nộp bài, Expert chấm bài phụ trợ, Admin quản lý đề & người dùng).
- [ ] Triển khai thành công trên Docker Compose kèm báo cáo kết quả kiểm thử và tài liệu đặc tả SRS đầy đủ.

---

## 6. CÂU HỎI MỞ CẦN THỐNG NHẤT (UNRESOLVED QUESTIONS)

1. **Khả năng chi trả API AI:** Đội ngũ có ngân sách cố định cho OpenAI API (Whisper + GPT-4o) trong giai đoạn demo hay cần cấu hình fallback sang Google Gemini API (bản miễn phí/giá rẻ hơn)?
2. **Nguồn đề Reading & Listening:** Nhóm đã có sẵn file JSON/CSV ngân hàng đề thi IELTS chuẩn (Cambridge) để import vào hệ thống chưa, hay cần viết thêm công cụ cào/chuyển đổi đề tự động?
3. **Phạm vi chấm Speaking:** Thầy cô hướng dẫn có yêu cầu bắt buộc chấm ngữ điệu/phát âm từng âm vị (Phoneme-level) hay chấp nhận chấm Speaking qua bản gỡ băng văn bản (Transcript-based) kết hợp thời lượng độ trễ âm thanh?
