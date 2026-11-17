import apiClient from "@/lib/api-client";

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
  payload: { expert_id: string; note?: string }
) {
  const res = await apiClient.post(`/api/v1/admin/reviews/${requestId}/assign`, payload);
  return res.data;
}

export async function adminAutoDispatchReviews() {
  const res = await apiClient.post("/api/v1/admin/reviews/auto-dispatch");
  return res.data;
}
