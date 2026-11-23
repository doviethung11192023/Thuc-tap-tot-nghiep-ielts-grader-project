import apiClient from "@/lib/api-client";
import type {
  AdminAlerts,
  AuditLogDetail,
  AuditLogFilters,
  AuditLogItem,
  GapCaseDetail,
  GapCaseFilters,
  GapCaseItem,
  GapGroupBy,
  GapOverview,
  GradingRunDetail,
  GradingRunFilters,
  GradingRunItem,
  Paged,
  PricingConfig,
  PricingUpdate,
  RegradePreview,
  RegradeResult,
  UsageGroupBy,
  UsageReport,
} from "@/types/admin-ai-monitoring";

const BASE = "/api/v1/admin";

/** Bỏ tham số rỗng để không gửi `?status=` lên backend. */
function clean<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  ) as Partial<T>;
}

// ---- Lượt chấm ----
export async function getGradingRuns(
  params: GradingRunFilters & { page?: number; limit?: number },
): Promise<Paged<GradingRunItem>> {
  const res = await apiClient.get(`${BASE}/grading-runs`, { params: clean(params) });
  return res.data.data;
}

export async function getGradingRun(runId: string): Promise<GradingRunDetail> {
  const res = await apiClient.get(`${BASE}/grading-runs/${runId}`);
  return res.data.data;
}

export async function getAdminAlerts(): Promise<AdminAlerts> {
  const res = await apiClient.get(`${BASE}/alerts`);
  return res.data.data;
}

// ---- Chạy lại ----
export async function previewRegrade(attemptIds: string[]): Promise<RegradePreview> {
  const res = await apiClient.post(`${BASE}/regrade/preview`, { attempt_ids: attemptIds });
  return res.data.data;
}

export async function runRegrade(attemptIds: string[]): Promise<RegradeResult> {
  const res = await apiClient.post(`${BASE}/regrade`, { attempt_ids: attemptIds });
  return res.data.data;
}

// ---- Chi phí ----
export async function getAiUsage(month: string | undefined, groupBy: UsageGroupBy): Promise<UsageReport> {
  const res = await apiClient.get(`${BASE}/ai-usage`, { params: clean({ month, group_by: groupBy }) });
  return res.data.data;
}

export async function getAiPricing(): Promise<PricingConfig> {
  const res = await apiClient.get(`${BASE}/ai-pricing`);
  return res.data.data;
}

export async function updateAiPricing(body: PricingUpdate): Promise<PricingConfig> {
  const res = await apiClient.put(`${BASE}/ai-pricing`, body);
  return res.data.data;
}

/** Kiểm ngay giá model với trang giá của nhà cung cấp; giá đổi thì server lưu và ghi audit. */
export async function syncAiPricing(): Promise<PricingConfig> {
  const res = await apiClient.post(`${BASE}/ai-pricing/sync`);
  return res.data.data;
}

// ---- Chênh lệch AI–Expert ----
export async function getAiExpertGap(days: number, groupBy: GapGroupBy): Promise<GapOverview> {
  const res = await apiClient.get(`${BASE}/ai-expert-gap`, { params: { days, group_by: groupBy } });
  return res.data.data;
}

export async function getGapCases(params: GapCaseFilters): Promise<Paged<GapCaseItem>> {
  const res = await apiClient.get(`${BASE}/ai-expert-gap/cases`, { params: clean(params) });
  return res.data.data;
}

export async function getGapCaseDetail(attemptId: string, aiEvaluationId?: string): Promise<GapCaseDetail> {
  const res = await apiClient.get(`${BASE}/ai-expert-gap/cases/${attemptId}`, {
    params: clean({ ai_evaluation_id: aiEvaluationId }),
  });
  return res.data.data;
}

// ---- Audit log ----
export async function getAuditLogs(params: AuditLogFilters): Promise<Paged<AuditLogItem>> {
  const res = await apiClient.get(`${BASE}/audit-logs`, { params: clean(params) });
  return res.data.data;
}

export async function getAuditLog(id: string): Promise<AuditLogDetail> {
  const res = await apiClient.get(`${BASE}/audit-logs/${id}`);
  return res.data.data;
}

/** Lấy thông báo lỗi tiếng Việt từ response backend ({"detail": ...}); detail của 422 pydantic là mảng. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0] as { msg?: string };
    if (first?.msg) return first.msg;
  }
  return fallback;
}
