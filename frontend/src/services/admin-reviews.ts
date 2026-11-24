import apiClient from "@/lib/api-client";
import type { ExpertPenaltyItem } from "@/types";

export interface AdminExpertWorkload {
  user_id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_available: boolean;
  max_active_reviews: number;
  active_open: number;
}

export interface AdminReviewAssignmentInfo {
  id: string;
  expert_id: string;
  expert_email: string;
  expert_name: string;
  assigned_at?: string | null;
  due_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  end_reason?: string | null;
}

export interface AdminReviewItem {
  request_id: string;
  attempt_id: string;
  status: string;
  source: string;
  skill: string;
  requested_at: string;
  test_title: string;
  learner: {
    id: string;
    email: string;
    full_name: string;
  };
  current_assignment: AdminReviewAssignmentInfo | null;
  reassigned_count: number;
}

export interface AdminReviewsSummary {
  total: number;
  waiting: number;
  assigned: number;
  completed: number;
  available_experts: number;
}

export interface AdminReviewsResponse {
  items: AdminReviewItem[];
  total: number;
  page: number;
  limit: number;
  summary: AdminReviewsSummary;
  experts: AdminExpertWorkload[];
}

export interface AdminExpertPerformanceRow {
  expert_id: string;
  full_name: string;
  email: string;
  is_available: boolean;
  active_reviews: number;
  max_active_reviews: number;
  completed_total: number;
  completed_period?: number;
  on_time_rate: number | null;
  early_sla_rate?: number | null;
  completeness_first_pass_rate?: number | null;
  decline_rate?: number;
  expired_count: number;
  avg_turnaround_hours: number | null;
  tier?: string;
  tier_max_reviews?: number;
  rubber_stamp_count?: number;
  helpfulness_rate?: number | null;
  helpfulness_count?: number;
  active_penalties_30d?: number;
  active_penalties?: ExpertPenaltyItem[];
  cooldown_until?: string | null;
  is_suspended_by_penalty?: boolean;
  rps_score?: number;
  rps_tier?: string;
  overdue_30d?: number;
  penalty_level?: number;
}

export interface AdminExpertPerformanceResponse {
  period: string;
  available_periods: string[];
  items: AdminExpertPerformanceRow[];
  summary: {
    total: number;
    flagged_rubber_stamp: number;
    active_penalties: number;
    tier_counts: Record<string, number>;
  };
}

export async function getAdminReviews(params?: {
  page?: number;
  limit?: number;
  status?: string;
  skill?: string;
  expert_id?: string;
  search?: string;
}): Promise<AdminReviewsResponse> {
  const res = await apiClient.get("/api/v1/admin/reviews", { params });
  return res.data.data;
}

export async function adminAssignReview(
  requestId: string,
  payload: { expert_id: string; note?: string },
) {
  const res = await apiClient.post(`/api/v1/admin/reviews/${requestId}/assign`, payload);
  return res.data;
}

export async function adminAutoDispatchReviews() {
  const res = await apiClient.post("/api/v1/admin/reviews/auto-dispatch");
  return res.data;
}

export async function getAdminExpertsPerformance(params?: {
  period?: string;
  tier?: string;
  flagged_only?: boolean;
}): Promise<AdminExpertPerformanceResponse> {
  const res = await apiClient.get("/api/v1/admin/experts/performance", { params });
  return res.data.data;
}

export async function waiveExpertPenalty(penaltyId: string, waiveReason: string) {
  const res = await apiClient.post(`/api/v1/admin/penalties/${penaltyId}/waive`, {
    waive_reason: waiveReason,
  });
  return res.data;
}
