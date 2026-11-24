import apiClient from "@/lib/api-client";
import type {
  CriterionScoreDetail,
  ExpertAssignment,
  ExpertPerformanceDetail,
  ExpertProfile,
  ExpertWorkspaceData,
  LearnerQuota,
  WorkspaceAnnotation,
} from "@/types";

export interface ExpertReviewPayload {
  overall_band: number;
  criterion_scores: Array<{
    criterion_id: string;
    task_no?: number;
    skill?: string;
    band: number;
    comment?: string;
  }>;
  annotations?: WorkspaceAnnotation[];
  feedback?: string;
  change_reason?: string;
  ai_agreement_confirmed?: boolean;
  study_tip_note?: string;
}

export interface ExpertHelpfulnessRatingResponse {
  rated: boolean;
  rating: {
    id: string;
    is_helpful: boolean;
    tags: string[];
    created_at: string;
  } | null;
}

export async function getExpertProfile(): Promise<ExpertProfile> {
  const res = await apiClient.get("/api/v1/expert/me");
  return res.data;
}

export async function getExpertPerformance(): Promise<ExpertPerformanceDetail> {
  const res = await apiClient.get("/api/v1/expert/me/performance");
  return res.data;
}

export async function updateExpertAvailability(payload: {
  is_available?: boolean;
  max_active_reviews?: number;
  bio?: string;
}): Promise<ExpertProfile> {
  const res = await apiClient.patch("/api/v1/expert/me/availability", payload);
  return res.data;
}

export async function getExpertAssignments(
  statusFilter: "active" | "completed" | "all" = "active",
): Promise<ExpertAssignment[]> {
  const res = await apiClient.get(`/api/v1/expert/assignments?status_filter=${statusFilter}`);
  return res.data;
}

export async function declineAssignment(assignmentId: string, note: string): Promise<{ status: string }> {
  const res = await apiClient.post(`/api/v1/expert/assignments/${assignmentId}/decline`, { note });
  return res.data;
}

export async function startAssignmentGrading(
  assignmentId: string,
): Promise<{ status: string; evaluation_id: string }> {
  const res = await apiClient.post(`/api/v1/expert/assignments/${assignmentId}/start`);
  return res.data;
}

export async function getAssignmentWorkspace(assignmentId: string): Promise<ExpertWorkspaceData> {
  const res = await apiClient.get(`/api/v1/expert/assignments/${assignmentId}/workspace`);
  return res.data;
}

export async function saveExpertDraft(
  assignmentId: string,
  payload: ExpertReviewPayload,
): Promise<{ status: string; evaluation_id: string; saved_at: string }> {
  const res = await apiClient.put(`/api/v1/expert/assignments/${assignmentId}/draft`, payload);
  return res.data;
}

export async function submitExpertReview(
  assignmentId: string,
  payload: ExpertReviewPayload,
): Promise<{ status: string; assignment_id: string; evaluation_id: string; overall_band: number }> {
  const res = await apiClient.post(`/api/v1/expert/assignments/${assignmentId}/submit`, payload);
  return res.data;
}

export async function getLearnerExpertQuota(): Promise<LearnerQuota> {
  const res = await apiClient.get("/api/v1/student/expert-quota");
  return res.data;
}

export async function reserveMockExpertSlot(
  attemptId: string,
): Promise<{ reserved: boolean; message: string }> {
  const res = await apiClient.post(`/api/v1/test-practice/attempts/${attemptId}/reserve-mock-slot`);
  return res.data;
}

export async function releaseMockExpertSlot(attemptId: string): Promise<{ status: string }> {
  const res = await apiClient.post(`/api/v1/test-practice/attempts/${attemptId}/release-mock-slot`);
  return res.data;
}

export async function requestPracticeExpertReview(
  attemptId: string,
): Promise<{ status: string; request_id: string; message: string }> {
  const res = await apiClient.post(`/api/v1/test-practice/attempts/${attemptId}/request-expert-review`);
  return res.data;
}

export async function getAttemptExpertRating(attemptId: string): Promise<ExpertHelpfulnessRatingResponse> {
  const res = await apiClient.get(`/api/v1/test-practice/attempts/${attemptId}/expert-rating`);
  return res.data;
}

export async function submitAttemptExpertRating(
  attemptId: string,
  payload: { is_helpful: boolean; tags: string[] },
): Promise<{ status: string; rating_id?: string }> {
  const res = await apiClient.post(`/api/v1/test-practice/attempts/${attemptId}/expert-rating`, payload);
  return res.data;
}

export type { CriterionScoreDetail };
