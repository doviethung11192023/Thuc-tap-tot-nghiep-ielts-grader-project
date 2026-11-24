# Merge LongRevert (29e381c) vào Sinh_AI-Dev — plan resolve conflict

Base chung: `5b1b325`. 29 file conflict (13 backend, 16 frontend). Merge đang dở, chưa commit.

## Nguyên tắc

- **Backend:** giữ cơ chế lõi của Sinh_AI-Dev (đã ghi trong SoT): ADR-32 auth, BR-03, BR-04 mới, BR-12, FR-11 autosave, Mock random (UC-08), spec 006/007. Ghép thêm tính năng mới của LongRevert (Expert FR-33/UC-32, notifications, chấm câu chọn nhiều đáp án, retry AI).
- **Frontend:** **giao diện và tính năng của LongRevert là nền.** Chỉ ghép lại các điểm mà backend bắt buộc phải có, thiếu thì sai band hoặc vỡ luồng:
  1. Writing gửi `parts` khi autosave và khi nộp (BR-04). Thiếu thì Practice 1 task bị tính task kia = 0.
  2. Tự lưu lên server, khôi phục `savedWork`, xử lý `closedAttempt`/`isAlreadySubmitted` (FR-11, spec 004). Mock nộp muộn chấm bản đã lưu.
  3. Mock bắt đầu bằng `startRandomMock` (UC-08). Bắt đầu bằng test_id thì backend trả 409.
  4. Đếm ngược Mock theo `deadlineMs` của server (`useExamCountdown`, BR-21).
  5. Hiển thị dữ liệu spec 006/007 mà backend trả về: dàn ý Writing, bài mẫu và key point check, lỗi gạch chân/từ phát âm chưa rõ ở Speaking, ghi chú trần điểm BR-23/24/25.
  6. Mock không có nút "Làm lại bài".
- **Bỏ** localStorage draft (đã thay bằng tự lưu lên server) và banner in sẵn tài khoản `test1@gmail.com / Password123!` (lộ mật khẩu ra UI).

## Backend

| File | Quyết định |
|---|---|
| core/security.py | Giữ bản Sinh (JWKS ES256). Bỏ HS256, GoTrue lock, `_token_cache`. Giữ `invalidate_auth_profile_cache` làm alias gọi `forget_profile`. |
| writing/writing_bands.py, writing_evaluation_finalizer.py, tests/test_writing_bands.py | Giữ bản Sinh (`expected_tasks`); bản này đã bao luôn Mock bỏ trống = 0. |
| writing/writing_result_views.py | Khung LongRevert (Expert, chart, task_prompt) + `approved_sample`, `section_id` trong `_ESSAY_SELECT`, `sample_essay`/`key_point_check`/`chart_source`, status `not_attempted`; bỏ lọc `non_empty`. |
| speaking/speaking_result_views.py | Giữ cả annotations (Expert) lẫn edits/strengths/pronunciation_hints (spec 007); dùng `_run_output(attempt_id, evaluation)`. |
| ai/.../speech_transcriber.py | Giữ `load_model()` và thêm `_resolve_device_and_compute` + `_get_model(force_cpu)`. |
| submissions_ai.py | Giữ `essays` rỗng được và `status` thật + khối Expert của LongRevert + `has_expert_review`. |
| lr_grading_service.py | Giữ late/auto + `saved_lr_answers`; lấy `load_lr_question_keys` + `grade_lr_sections`. **Band chỉ khi đủ 40 câu (BR-03/ADR-19)**, không quy đổi tỉ lệ. |
| practice_attempt_lifecycle.py | Giữ bản Sinh. Không xoá attempt quá hạn (làm mất bài đã lưu). |
| analytics.py | Giữ cả hai import. |
| learning_profile/overview_aggregator.py | Giữ bản Sinh (BR-12). |
| admin/system_statistics.py | Giữ VN_TZ, gom theo ngày bằng 1 query (key ngày theo giờ VN). |

## Frontend (nền LongRevert)

| File | Ghép lại từ Sinh |
|---|---|
| test-practice/{listening,reading}/[testId]/page.tsx | autosave + `initialAnswers`/`onAnswersChange` + `AutosaveStatusBadge` + `closedAttempt`/`isAlreadySubmitted`; giữ `time_spent_sec` và cách hiện lỗi của LongRevert |
| test-practice/writing/[testId]/page.tsx | autosave kèm `parts`, nộp kèm `parts`, `closedAttempt`; giữ toast, notification, invalidate cache của LongRevert; bỏ banner tài khoản |
| Listening/Reading/WritingWorkspace | `useExamCountdown` + khôi phục từ server; giữ cờ đánh dấu câu và highlight của LongRevert; bỏ localStorage |
| TestPrepModal | `startRandomMock` + `startError`; giữ badge quota Expert |
| SpeakingResultsView + speaking-detail-* | layout LongRevert + `SpeakingAnswerFeedback` và cảnh báo `phoneme_usable` |
| SpeakingSummaryResult | UI LongRevert + 3 ghi chú trần điểm |
| WritingSummaryResult, useWritingAttemptSummary, types/index.ts | UI LongRevert + `gradingFailed`, `mode` (ẩn Làm lại khi Mock), các type spec 006 |
| WritingPromptColumn | UI LongRevert + `WritingOutlineHint` |
| GoalSetterModal | LongRevert (dùng `input_band`); ngày thi để trống thay vì `2026-12-31` |
| admin/users, admin/statistics | LongRevert + `active_count`/`locked_count` |

## Migration

5 migration mới của LongRevert giữ nguyên file (có thể đã chạy trên remote). `20261114220000` làm RPC `submit_lr_attempt` tin `p_band` của caller và tự quy đổi tỉ lệ khi NULL, ngược BR-03 và ngược nguyên tắc "DB tự tính, không tin số caller" của `20261109100000`. → Thêm migration `20261116100000_restore_submit_lr_attempt_br03.sql` đưa RPC về bản `20261109100000` (chỉ band khi đủ 40 câu). Constraint đã nới (`lr_band IS NULL OR question_count > 0`) giữ nguyên, vì là điều kiện lỏng hơn và không phá dữ liệu đã có. Đề Reading 39 câu (Test 6, Test 8) là lỗi dữ liệu đề, sửa đề chứ không đổi BR.

## Kiểm tra

`pytest backend/tests`, `npx tsc --noEmit`, `npm run lint`. Cập nhật source-of-truth (Expert đã làm, notifications).

## Trạng thái remote (kiểm 2026-11-16 qua PostgREST)

| Migration | Remote |
|---|---|
| 20261111000000_expert_workflow_core | Đã chạy 2026-11-16 |
| 20261114190000_add_learner_input_band | Đã có cột |
| 20261114210000 / 20261114220000 (L/R tỉ lệ) | Đã chạy từ trước |
| 20261115143000_create_notifications_table | Đã có bảng |
| 20261116100000_restore_submit_lr_attempt_br03 | Đã chạy 2026-11-16 |

`input_band`: giữ (user chốt). Chỉ dùng cho GoalSetter/thanh tiến độ; band hiện tại vẫn theo BR-12.

13 bài L/R cũ có band quy đổi tỉ lệ (12–39 câu): giữ nguyên (user chốt). Constraint giữ bản nới; BR-03 cho bài mới do RPC giữ. Test SQL BR-03 đổi sang ca `question_count = 0`.

`frontend/src/lib/expert-snippets.ts` chưa từng commit (`.gitignore` `lib/` chặn). Đã đổi thành `/lib/`; file gốc đã nhận và commit 2026-11-17. `tsc` sạch, `next build` thành công.
