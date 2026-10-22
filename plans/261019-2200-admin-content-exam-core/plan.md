---
title: "Triển Khai Phân Hệ Quản Trị Viên: Nội Dung 4 Kỹ Năng, Ngân Hàng Câu Hỏi & Dữ Liệu Lõi (Cloudflare R2 & Crawled Dataset)"
plan_id: "261019-2200-admin-content-exam-core"
date: "2026-10-19"
status: "pending"
priority: "P1"
total_effort: "5 Sprints (R2 Storage, Data Contracts, Modular APIs, Dataset Importer, Frontend UI)"
dataset_source: "C:/Users/Admin/Downloads/prep_crawled_dataset/prep_crawled_dataset"
media_storage: "Cloudflare R2 (S3-compatible API via boto3)"
dependencies: ["261004-1515-ielts-capstone-restructure-plan"]
authors: ["Capstone Team", "Antigravity AI"]
---

# KẾ HOẠCH TỔNG THỂ (MASTER PLAN)
## PHÂN HỆ QUẢN TRỊ VIÊN: NỘI DUNG 4 KỸ NĂNG, NGÂN HÀNG CÂU HỎI & DỮ LIỆU LÕI HỆ THỐNG
### TÍCH HỢP CLOUDFLARE R2 & BỘ DỮ LIỆU THỰC TẾ PREP_CRAWLED_DATASET

---

## 1. DỮ KIỆN KỸ THUẬT CỐT LÕI (TECHNICAL REALITIES)

1. **Lưu trữ Media Cloudflare R2:**
   - Hệ thống chuyển đổi toàn bộ pipeline lưu trữ file âm thanh và hình ảnh sang **Cloudflare R2**.
   - Thư viện: `boto3` (AWS S3 SDK cho Python).
   - Biến môi trường: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_DOMAIN`.
   - CSDL lưu trữ: các trường `audio_key` và `image_key` trong `test_sections`, `topics`, `questions`.
2. **Bộ Dữ Liệu Thực Tế (`prep_crawled_dataset`):**
   - Đường dẫn: `C:\Users\Admin\Downloads\prep_crawled_dataset\prep_crawled_dataset`.
   - Reading & Listening: 10 đề Full Test chuẩn (`445_Recent_Actual_Test`), mỗi đề 40 câu R + 40 câu L. Đầy đủ **Lời giải chi tiết 4 bước** (`loi_giai_chi_tiet_4_buoc.json`) và transcript gỡ băng kèm timestamp từng câu nói của nhân vật.
   - Writing: 5 bộ đề theo quý 2025-2026, Task 1 (ảnh biểu đồ, hướng dẫn) + Task 2 (bài mẫu Band 8+, dàn ý và gợi ý viết).
   - Speaking: 3 bộ dự đoán 2025-2026, Part 1, Part 2 (Cue Card), Part 3, audio giám khảo đọc câu hỏi (`examiner_audio_url`) và bài mẫu tham khảo.

---

## 2. LỘ TRÌNH 5 GIAI ĐOẠN TRIỂN KHAI (SPRINT BREAKDOWN)

### Phase 1: Dịch Vụ Lưu Trữ Cloudflare R2 (`boto3`)
- Cài đặt `boto3` trong backend.
- Tạo `backend/app/services/r2_storage.py`: Các hàm `upload_file`, `delete_file`, `get_file_url` kèm fallback an toàn.
- Cập nhật `backend/app/core/config.py` với các biến R2.

### Phase 2: Schema Pydantic Toàn Diện (`exam_content.py`)
- Xây dựng `backend/app/schemas/exam_content.py`: Đầy đủ models cho Test Sets, Tests, Sections, Question Groups, Questions, Answer Keys, Band Conversions, System Settings, Batch Ingestion.

### Phase 3: Hệ Thống APIs Quản Trị Modular (< 200 dòng/file)
Tổ chức package `backend/app/api/endpoints/admin/`:
- `admin_tests.py`: CRUD bộ đề & bài thi (`tests`, `test_sets`), lọc kỹ năng, chế độ, xuất bản.
- `admin_sections.py`: Quản lý bài đọc Reading, audio Listening, đề Writing & Speaking.
- `admin_questions.py`: Quản lý Question Groups (dạng bài, hướng dẫn) và Questions (câu hỏi, options, đáp án, giải thích 4 bước).
- `admin_media.py`: Tải lên và đồng bộ file sang Cloudflare R2.
- `admin_core.py`: Quản lý bảng quy đổi điểm và tham số hệ thống.
- `admin_ingest.py`: API tiếp nhận nạp dữ liệu từ crawled dataset.
- Đăng ký toàn bộ router vào `backend/app/api/api_router.py` với bảo vệ `require_admin`.

### Phase 4: Script Nạp Dữ Liệu Tự Động (Dataset Importer)
- Xây dựng `backend/scripts/import_crawled_dataset.py`:
  - Đọc thư mục `prep_crawled_dataset`.
  - Phân tích và nhập tự động 10 bộ đề Reading & Listening kèm lời giải 4 bước.
  - Phân tích và nhập đề Writing Task 1 (ảnh biểu đồ) & Task 2.
  - Phân tích và nhập đề Speaking Part 1, 2, 3 kèm audio câu hỏi.
  - Tự động nạp vào CSDL Supabase và upload media sang Cloudflare R2.

### Phase 5: Giao Diện Frontend Admin Console & Kiểm Thử E2E
- `frontend/src/services/admin-content.ts`: Service client API.
- Trang `/admin/tests/page.tsx`: Danh sách đề thi, lọc 4 kỹ năng & Mock test, phân trang.
- Trang `/admin/tests/[testId]/edit/page.tsx`: Exam Builder trực quan với cây phân cấp và bộ soạn thảo câu hỏi/đáp án 4 bước.
- Trang `/admin/settings/page.tsx`: Quản lý quy đổi điểm và cấu hình R2/tham số.
- Cập nhật Sidebar trong `AdminPageLayout.tsx`.
- Viết test suite E2E `backend/test_e2e_admin_content_flow.py` và chạy `npm run build`.
