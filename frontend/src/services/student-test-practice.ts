import apiClient from "@/lib/api-client";
import { mockExamCollections } from "@/mocks/test-sets";
import type { ExamCollection, SingleTestItem, PublishedTestItem } from "@/types/test-practice";

export interface GetPublishedTestsParams {
  page?: number;
  limit?: number;
  skill?: string;
  difficulty?: string;
  search?: string;
}

export async function getStudentPublishedTests(params: GetPublishedTestsParams = {}) {
  try {
    const res = await apiClient.get<{
      meta: { code: number };
      data: { items: PublishedTestItem[]; total: number; page: number; limit: number };
    }>("/api/v1/test-practice/tests", { params });
    return res.data?.data || { items: [], total: 0, page: 1, limit: 12 };
  } catch (err) {
    console.warn("Lỗi khi tải danh sách đề thi đã xuất bản:", err);
    return { items: [], total: 0, page: 1, limit: 12 };
  }
}

export async function getStudentExamCollections(): Promise<ExamCollection[]> {
  try {
    const res = await apiClient.get<{ meta: { code: number }; data: ExamCollection[] }>(
      "/api/v1/test-practice/sets"
    );
    if (res.data?.data && res.data.data.length > 0) {
      return res.data.data;
    }
  } catch (err) {
    console.warn("Lỗi khi tải bộ đề thi từ backend, sử dụng dữ liệu mặc định:", err);
  }
  return mockExamCollections;
}

export async function getStudentExamCollectionDetail(setId: string): Promise<ExamCollection | null> {
  try {
    const res = await apiClient.get<{ meta: { code: number }; data: ExamCollection }>(
      `/api/v1/test-practice/sets/${setId}`
    );
    if (res.data?.data) {
      return res.data.data;
    }
  } catch (err) {
    console.warn(`Lỗi khi tải chi tiết bộ đề ${setId}, sử dụng dữ liệu fallback:`, err);
  }
  return mockExamCollections.find((c) => c.id === setId) || mockExamCollections[0] || null;
}

export async function startTestAttempt(testId: string, mode: "practice" | "mock" = "practice", skill?: string) {
  const res = await apiClient.post<{ meta: { code: number }; data: any }>(
    "/api/v1/test-practice/attempts/start",
    { test_id: testId, mode, skill }
  );
  return res.data.data;
}

export async function getAttemptExamContent(attemptId: string) {
  const res = await apiClient.get<{ meta: { code: number }; data: any }>(
    `/api/v1/test-practice/attempts/${attemptId}/content`
  );
  return res.data.data;
}

export async function getTestExamContentDirect(testId: string) {
  const res = await apiClient.get<{ meta: { code: number }; data: any }>(
    `/api/v1/test-practice/tests/${testId}/content`
  );
  return res.data.data;
}

export async function submitReadingListeningAnswers(
  attemptId: string,
  payload: { answers: Record<string, any>; time_spent_sec?: number; parts?: number[] }
) {
  const res = await apiClient.post<{ meta: { code: number }; data: any }>(
    `/api/v1/test-practice/attempts/${attemptId}/submit`,
    payload
  );
  return res.data.data;
}

export async function submitWritingAttempt(
  attemptId: string,
  payload: { task1_text?: string; task2_text?: string; essay_text?: string; time_spent_sec?: number }
) {
  const res = await apiClient.post<{ meta: { code: number }; data: any }>(
    `/api/v1/test-practice/attempts/${attemptId}/submit-writing`,
    payload
  );
  return res.data.data;
}

export async function submitSpeakingAttempt(
  attemptId: string,
  payload: { recordings?: any[]; time_spent_sec?: number }
) {
  const res = await apiClient.post<{ meta: { code: number }; data: any }>(
    `/api/v1/test-practice/attempts/${attemptId}/submit-speaking`,
    payload
  );
  return res.data.data;
}

export async function getAttemptSummary(attemptId: string) {
  const res = await apiClient.get<{ meta: { code: number }; data: any }>(
    `/api/v1/test-practice/attempts/${attemptId}/summary`
  );
  return res.data.data;
}

export async function getAttemptDetail(attemptId: string) {
  const res = await apiClient.get<{ meta: { code: number }; data: any }>(
    `/api/v1/test-practice/attempts/${attemptId}/detail`
  );
  return res.data.data;
}

export async function getStudentHistory(page: number = 1, limit: number = 10, skill?: string) {
  const res = await apiClient.get<{ meta: { code: number }; data: any }>(
    "/api/v1/student/history",
    { params: { page, limit, skill } }
  );
  return res.data.data;
}

export async function getStudentLearningProfile() {
  const res = await apiClient.get<{ meta: { code: number }; data: any }>(
    "/api/v1/student/learning-profile"
  );
  return res.data.data;
}
