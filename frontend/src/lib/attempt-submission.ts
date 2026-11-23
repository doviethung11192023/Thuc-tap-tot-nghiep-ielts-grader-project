import { isAxiosError } from "axios";
import type { ClosedAttempt } from "@/hooks/useExamWorkspaceContent";

/** Thông điệp backend trả khi bài đã được nộp (nộp ở tab khác, hoặc cron tự nộp khi hết giờ). */
export const ALREADY_SUBMITTED_DETAIL = "Bài thi đã được nộp trước đó";

export function apiErrorDetail(err: unknown): string | null {
  const detail = isAxiosError(err) ? err.response?.data?.detail : null;
  return typeof detail === "string" ? detail : null;
}

export function isAlreadySubmitted(err: unknown): boolean {
  return apiErrorDetail(err) === ALREADY_SUBMITTED_DETAIL;
}

/** Nộp lỗi: không bao giờ chuyển sang trang kết quả giả; nói rõ bài vẫn còn trên máy chủ. */
export function submitFailureMessage(err: unknown): string {
  return apiErrorDetail(err)
    || "Chưa nộp được bài (có thể do mất kết nối). Bài làm vẫn được lưu trên máy chủ, hãy thử nộp lại.";
}

export function closedAttemptMessage(closed: ClosedAttempt): string {
  const at = closed.submitted_at ? new Date(closed.submitted_at).toLocaleString("vi-VN") : null;
  if (closed.status === "abandoned") {
    return closed.auto_submitted
      ? "Bài thi thử này đã hết giờ mà chưa có bài làm nào được lưu, nên không có kết quả."
      : "Bạn đã thoát khỏi bài thi thử này.";
  }
  return closed.auto_submitted
    ? `Bài thi thử đã được nộp tự động${at ? ` lúc ${at}` : ""}. Đang chuyển tới kết quả…`
    : "Bài thi thử này đã được nộp. Đang chuyển tới kết quả…";
}
