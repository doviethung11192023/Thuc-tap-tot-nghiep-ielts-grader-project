// Định dạng hiển thị dùng chung cho các trang giám sát AI (tiếng Việt, giờ VN).
import type { PromptVersions } from "@/types/admin-ai-monitoring";

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Chi phí USD; null/undefined hiện "chưa rõ" (lượt chưa có giá model, FR-016). */
export function formatCost(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "chưa rõ";
  const n = Number(value);
  if (!Number.isFinite(n)) return "chưa rõ";
  return `$${n.toFixed(n !== 0 && Math.abs(n) < 0.01 ? 5 : 4)}`;
}

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toLocaleString("vi-VN");
}

export function formatLatency(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export function shortId(id: string | null | undefined): string {
  return id ? id.slice(0, 8) : "—";
}

/** "ta@v3, grade@v7" từ prompt_versions của lượt chấm. */
export function formatPromptVersions(versions: PromptVersions | undefined): string {
  if (!versions || typeof versions !== "object") return "—";
  const parts = Object.entries(versions).map(([key, v]) => `${key}@v${v}`);
  return parts.length ? parts.join(", ") : "—";
}

export function formatBand(band: number | null | undefined): string {
  return band === null || band === undefined ? "—" : Number(band).toFixed(1);
}

/** Hiệu có dấu: +1.0, -0.5 */
export function formatSigned(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${Number(value).toFixed(2)}`;
}

export const SKILL_LABEL: Record<string, string> = { writing: "Writing", speaking: "Speaking", listening: "Listening", reading: "Reading" };

/** Trạng thái attempt (enum attempt_status) bằng lời cho Admin. */
export const ATTEMPT_STATUS_LABEL: Record<string, string> = {
  in_progress: "Đang làm", submitted: "Đã nộp", grading: "Đang chấm", grading_failed: "Chấm lỗi", no_speech: "Không có giọng nói",
  waiting_expert: "Chờ Expert", scored: "Đã có điểm", abandoned: "Bỏ dở",
};

/** Trạng thái evaluation (enum evaluation_status) bằng lời. */
export const EVALUATION_STATUS_LABEL: Record<string, string> = {
  pending: "Đang chấm", draft: "Bản nháp", done: "Hoàn tất", failed: "Lỗi",
};

export const MODE_LABEL: Record<string, string> = { practice: "Practice", mock: "Mock" };

/** Lý do một bài bị bỏ qua khi chạy lại (backend: regrade_service). */
export const SKIP_REASON_LABEL: Record<string, string> = {
  grading: "Đang chấm",
  no_speech: "Không có tiếng nói",
  audio_deleted: "Đã xoá audio",
  not_submitted: "Chưa nộp bài",
  not_ai_graded: "Không chấm bằng AI",
  duplicate: "Trùng trong danh sách",
  not_found: "Không tìm thấy bài",
};

export const BUDGET_STATE_LABEL: Record<string, { label: string; cls: string }> = {
  ok: { label: "Trong ngân sách", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  warning: { label: "Sắp vượt ngân sách", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  exceeded: { label: "Vượt ngân sách", cls: "bg-red-50 text-red-700 border-red-200" },
  off: { label: "Chưa đặt ngân sách", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

export const CRITERION_LABEL: Record<string, string> = {
  TA: "TA (Task Achievement)",
  TR: "TR (Task Response)",
  CC: "CC (Coherence & Cohesion)",
  LR: "LR (Lexical Resource)",
  GRA: "GRA (Grammar)",
  FC: "FC (Fluency & Coherence)",
  P: "P (Pronunciation)",
};

export function currentMonth(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}`;
}
