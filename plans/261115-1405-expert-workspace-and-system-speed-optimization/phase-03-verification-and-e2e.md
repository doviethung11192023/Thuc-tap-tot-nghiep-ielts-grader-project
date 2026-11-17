---
phase: 3
title: "Verification: TypeScript, Backend API & Browser E2E"
status: pending
priority: P0
effort: "1h"
dependencies: ["01", "02"]
---

# Phase 03: Kiểm thử Toàn diện & Xác minh E2E

## Overview
Chạy kiểm thử toàn diện sau khi hoàn tất Phase 01 & 02 để đảm bảo không có hồi quy và giao diện Expert + tốc độ điều hướng đạt chuẩn.

## Implementation Steps
1. Backend: `py_compile` + test `PUT /draft`, `GET /assignments`, `GET /workspace`.
2. Frontend: `npx tsc --noEmit` + `npm run build` check.
3. Browser E2E (`/ck:agent-browser`) với tài khoản `expert_9497@ieltsgrader.edu.vn`:
   - Mở `/expert/assignments` -> vào bài `#166dde56` -> kiểm tra không còn sticky bar đè màn hình.
   - Sửa 1 annotation có sẵn + Thêm 1 annotation mới + kiểm tra Kho nhận xét mẫu chỉ hiện Writing (`TA/TR/CC/LR/GRA`).
   - Bấm "Lưu và thoát" -> mở lại bài -> xác minh bản nháp được giữ nguyên.
   - Test bấm qua lại `/expert/assignments` ↔ `/expert/profile` ↔ workspace và xác minh tốc độ chuyển trang tức thì, 0 lỗi console/network.
