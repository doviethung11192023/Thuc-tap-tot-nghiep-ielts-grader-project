import apiClient from "@/lib/api-client";
import type { 
  ExpertProfile, 
  ExpertAssignment, 
  ExpertWorkspaceData, 
  LearnerQuota 
} from "@/types";

// ============================================================
// API SERVICE: PHÂN HỆ CHUYÊN GIA & QUOTA (EXPERT WORKFLOW)
// ============================================================

// 1. Hồ sơ Chuyên gia (UC-14)
export async function getExpertProfile(): Promise<ExpertProfile> {
  const res = await apiClient.get("/api/v1/expert/me");
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

// 2. Danh sách bài chấm của Chuyên gia (UC-15, BR-11)
export async function getExpertAssignments(statusFilter: "active" | "completed" | "all" = "active"): Promise<ExpertAssignment[]> {
  const res = await apiClient.get(`/api/v1/expert/assignments?status_filter=${statusFilter}`);
  return res.data;
}

// 3. Từ chối nhận bài trong 2h đầu (FR-39)
export async function declineAssignment(assignmentId: string, note: string): Promise<{ status: string }> {
  const res = await apiClient.post(`/api/v1/expert/assignments/${assignmentId}/decline`, { note });
  return res.data;
}

// 4. Bắt đầu chấm bài -> khởi tạo/clone draft evaluation (UC-16)
export async function startAssignmentGrading(assignmentId: string): Promise<{ status: string; evaluation_id: string }> {
  const res = await apiClient.post(`/api/v1/expert/assignments/${assignmentId}/start`);
  return res.data;
}

// 5. Nạp toàn bộ dữ liệu phòng chấm Split-View (Đề, bài làm, AI gợi ý, draft)
export async function getAssignmentWorkspace(assignmentId: string): Promise<ExpertWorkspaceData> {
  const res = await apiClient.get(`/api/v1/expert/assignments/${assignmentId}/workspace`);
  return res.data;
}

// 5b. Lưu bản nháp chấm bài (Auto-save / Lưu và thoát)
export async function saveExpertDraft(
  assignmentId: string,
  payload: {
    overall_band: number;
    criterion_scores: Array<{
      criterion_id: string;
      task_no?: number;
      skill?: string;
      band: number;
      comment?: string;
    }>;
    annotations?: any[];
    feedback?: string;
    change_reason?: string;
  }
): Promise<{ status: string; evaluation_id: string; saved_at: string }> {
  const res = await apiClient.put(`/api/v1/expert/assignments/${assignmentId}/draft`, payload);
  return res.data;
}

// 6. Nộp kết quả chấm chính thức (UC-16, SD-07, FR-42)
export async function submitExpertReview(
  assignmentId: string, 
  payload: {
    overall_band: number;
    criterion_scores: Array<{
      criterion_id: string;
      task_no?: number;
      skill?: string;
      band: number;
      comment?: string;
    }>;
    annotations?: any[];
    feedback?: string;
    change_reason?: string;
  }
): Promise<any> {
  const res = await apiClient.post(`/api/v1/expert/assignments/${assignmentId}/submit`, payload);
  return res.data;
}

// 7. Học viên: Kiểm tra hạn mức tuần (BR-15, BR-16, BR-20)
export async function getLearnerExpertQuota(): Promise<LearnerQuota> {
  const res = await apiClient.get("/api/v1/student/expert-quota");
  return res.data;
}

// 8. Học viên: Giữ chỗ suất chấm Mock (BR-15)
export async function reserveMockExpertSlot(attemptId: string): Promise<{ reserved: boolean; message: string }> {
  const res = await apiClient.post(`/api/v1/test-practice/attempts/${attemptId}/reserve-mock-slot`);
  return res.data;
}

// 9. Học viên: Nhả chỗ suất chấm Mock (abandoned)
export async function releaseMockExpertSlot(attemptId: string): Promise<{ status: string }> {
  const res = await apiClient.post(`/api/v1/test-practice/attempts/${attemptId}/release-mock-slot`);
  return res.data;
}

// 10. Học viên: Xin Chuyên gia chấm lại bài Practice (BR-16)
export async function requestPracticeExpertReview(attemptId: string): Promise<{ status: string; request_id: string; message: string }> {
  const res = await apiClient.post(`/api/v1/test-practice/attempts/${attemptId}/request-expert-review`);
  return res.data;
}
