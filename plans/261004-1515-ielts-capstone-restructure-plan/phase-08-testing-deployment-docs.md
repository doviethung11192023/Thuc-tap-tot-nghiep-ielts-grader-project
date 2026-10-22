---
phase: 8
title: "Testing, Deployment & Capstone Defense Preparation"
status: pending
priority: P0
effort: "10 days"
dependencies: ["1", "2", "3", "4", "5", "6", "7"]
---

# Phase 08: Testing, Deployment & Capstone Defense Preparation

## Overview
Giai đoạn nước rút đảm bảo chất lượng và chuẩn bị bảo vệ đồ án tốt nghiệp: kiểm thử tự động các module chấm điểm, kiểm thử tải và bảo mật cơ bản, đóng gói hoàn chỉnh hệ thống bằng Docker Compose cho môi trường demo/production, hoàn thiện tài liệu kỹ thuật (SRS, ERD, API specs) và chuẩn bị kịch bản thuyết trình/demo.

## Requirements
- Functional:
  - Kiểm thử đơn vị (Unit Test) bao phủ các logic tính điểm quan trọng: Reading/Listening raw-to-band conversion, Writing/Speaking JSON parsing, Fuzzy text anchoring.
  - Kiểm thử tích hợp API (Integration Test) cho luồng thi từ bắt đầu làm bài đến khi nhận kết quả.
  - Triển khai toàn bộ hệ thống (Frontend + Backend + AI Engine + Redis + Phoenix) lên máy chủ demo hoặc VPS thông qua 1 lệnh Docker duy nhất.
  - Chuẩn bị sẵn bộ dữ liệu mẫu (Seed Data) phong phú: ít nhất 3 đề full test cho mỗi kỹ năng, 10 bài làm mẫu có sẵn feedback.
  - Bộ tài liệu bàn giao đầy đủ:
    - Báo cáo đồ án tốt nghiệp (Capstone Final Report)
    - Tài liệu đặc tả yêu cầu phần mềm (SRS)
    - Tài liệu thiết kế hệ thống & kiến trúc cơ sở dữ liệu (Architecture & ERD Document)
    - Hướng dẫn cài đặt và sử dụng (User & Deployment Guide)
- Non-functional:
  - Hệ thống vận hành ổn định trong suốt buổi bảo vệ demo (30-45 phút) không xảy ra crash hoặc 500 error.
  - Giao diện có loading state và thông báo lỗi thân thiện khi API AI phản hồi chậm.

## Architecture
```
[Production / Demo Server]
       ├── Docker Compose Stack
       │     ├── [Container: nextjs-frontend :3000]
       │     ├── [Container: fastapi-backend :8000]
       │     ├── [Container: ai-engine :8001]
       │     ├── [Container: redis :6379]
       │     └── [Container: phoenix-tracing :6006]
       ├── Managed Supabase Project (PostgreSQL + Auth + Storage)
       └── External AI Endpoints (OpenAI API / Gemini API)
```

## Related Code Files
- Create:
  - `backend/tests/test_reading_grader.py`
  - `backend/tests/test_speaking_pipeline.py`
  - `backend/tests/test_rbac_permissions.py`
  - `docker-compose.prod.yml`
  - `docs/capstone/SRS_document.md`
  - `docs/capstone/API_specifications.md`
  - `docs/capstone/DEMO_script_and_slides.md`
  - `backend/scripts/seed_demo_data.py`
- Modify:
  - `README.md` (Cập nhật hướng dẫn chạy demo 1-click)

## Implementation Steps
1. **Viết Bộ Kiểm thử Tự động (Pytest):**
   - Viết các test cases kiểm tra quy đổi điểm Reading & Listening: 40/40 = 9.0; 23/40 = 6.0...
   - Viết test case giả lập (Mock) gọi API AI để kiểm tra hàm parse JSON điểm Speaking và Writing xử lý trơn tru khi LLM trả về định dạng bất thường.
2. **Kịch bản Khởi tạo Dữ liệu Mẫu (Seed Script):**
   - Tạo script `seed_demo_data.py` nạp sẵn 3 tài khoản demo:
     - `learner@demo.com` (Đã có sẵn lịch sử 10 bài thi và tiến độ học tập đẹp mắt)
     - `expert@demo.com` (Đang có sẵn 2 bài viết chờ chấm)
     - `admin@demo.com` (Có toàn quyền quản trị ngân hàng đề)
3. **Cấu hình Docker Production:**
   - Hoàn thiện file `docker-compose.prod.yml` tối ưu hóa build multi-stage cho Next.js và FastAPI.
   - Thiết lập biến môi trường production an toàn.
4. **Kiểm thử Toàn diện & Rà soát Lỗi (Dry Run):**
   - Đội 3 sinh viên thực hiện thử nghiệm chéo: SV1 đóng vai Learner thi cả 4 kỹ năng; SV2 theo dõi logs trên Arize Phoenix; SV3 đóng vai Expert chấm bài và nghiệm thu kết quả.
5. **Soạn thảo Báo cáo & Slide Thuyết trình:**
   - Biên soạn tài liệu kỹ thuật, sơ đồ kiến trúc hệ thống, kết quả đo lường độ chính xác của AI so với giám khảo thật.
   - Chuẩn bị slide thuyết trình và video quay sẵn (Backup Demo Video) đề phòng sự cố đường truyền mạng trong buổi bảo vệ.

## Success Criteria
- [ ] Chạy `pytest` đạt 100% pass cho tất cả các bài test logic tính điểm và xác thực quyền.
- [ ] Lệnh `docker-compose -f docker-compose.prod.yml up -d` khởi động toàn bộ hệ thống trơn tru trên máy sạch.
- [ ] Thực hiện trọn vẹn kịch bản demo 4 kỹ năng trong 15 phút mà không phát sinh lỗi giao diện hay nghẽn hàng đợi.
- [ ] Bàn giao đủ 4 tài liệu đồ án theo quy chuẩn của hội đồng chấm tốt nghiệp.

## Risk Assessment
- *Nguy cơ:* Mạng Internet tại phòng bảo vệ đồ án chập chờn hoặc API OpenAI bị nghẽn (Rate Limit / Timeout).
- *Giải pháp:*
  - Chuẩn bị sẵn bộ phát Wi-Fi 4G dự phòng.
  - Cài đặt cơ chế Mock Fallback trong Backend: nếu gọi API AI thất bại sau 3 lần retry, hệ thống tự động trả về một kết quả mẫu được định dạng chuẩn xác để buổi demo không bị gián đoạn.
  - Quay sẵn một video demo chất lượng cao (1080p) quay lại toàn bộ thao tác hệ thống từ A-Z.
