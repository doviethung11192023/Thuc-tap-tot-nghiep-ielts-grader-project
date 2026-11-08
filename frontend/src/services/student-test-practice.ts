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
    if (res.data?.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
  } catch (err) {
    console.warn("Lỗi khi tải bộ đề thi từ backend:", err);
  }
  return [];
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
    console.warn(`Lỗi khi tải chi tiết bộ đề ${setId}:`, err);
  }
  return null;
}

export async function startTestAttempt(testId: string, mode: "practice" | "mock" = "practice", skill?: string) {
  const res = await apiClient.post<{ meta: { code: number }; data: any }>(
    "/api/v1/test-practice/attempts/start",
    { test_id: testId, mode, skill }
  );
  return res.data.data;
}

/**
 * Huỷ bài chưa nộp. Luyện tập đang dở: xoá hẳn; thi thử đang dở (thoát phòng thi): tính abandoned.
 * Không ném lỗi: thoát phòng thi không được kẹt vì request huỷ.
 */
export async function discardAttempt(attemptId?: string | null): Promise<boolean> {
  if (!attemptId) return false;
  try {
    await apiClient.delete(`/api/v1/student/history/${attemptId}`);
    return true;
  } catch (err) {
    console.warn("Không huỷ được bài làm dở:", err);
    return false;
  }
}

/** Bài đang làm gửi lên server để tự lưu (FR-11). Writing: null/undefined = không đổi task đó. */
export interface SaveAttemptWorkPayload {
  answers?: Record<string | number, string | string[]>;
  task1_text?: string;
  task2_text?: string;
}

export async function saveAttemptWork(attemptId: string, payload: SaveAttemptWorkPayload) {
  const res = await apiClient.put<{ meta: { code: number }; data: { saved_at: string } }>(
    `/api/v1/test-practice/attempts/${attemptId}/work`,
    payload
  );
  return res.data.data;
}

export type MockSkill = "listening" | "reading" | "writing" | "speaking";

export interface MockSkillSummary {
  skill: MockSkill;
  total: number;
  remaining: number;
  open_attempt_id: string | null;
  open_test_id: string | null;
  open_deadline_at: string | null;
}

/** Bài Mock mới: hệ thống chọn ngẫu nhiên một đề chưa làm (UC-08). Có bài dở thì trả bài đó. */
export async function startRandomMock(skill: MockSkill) {
  const res = await apiClient.post<{ meta: { code: number }; data: { attempt_id: string; test_id: string; resumed: boolean } }>(
    "/api/v1/test-practice/mock/start",
    { skill }
  );
  return res.data.data;
}

export async function getMockSummary(): Promise<MockSkillSummary[]> {
  const res = await apiClient.get<{ meta: { code: number }; data: MockSkillSummary[] }>(
    "/api/v1/test-practice/mock/summary"
  );
  return res.data.data || [];
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

export async function submitSpeakingAttempt(attemptId: string) {
  const res = await apiClient.post<{ meta: { code: number }; data: any }>(
    `/api/v1/test-practice/attempts/${attemptId}/submit-speaking`,
    {}
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

export interface PracticeExerciseItem {
  id: string;
  title: string;
  type: string;
  raw_type: string;
  skill: string;
  difficulty: string;
  question_count: number;
  estimated_minutes: number;
  test_id: string;
  section_id: string;
  part_number: number;
  instructions: string;
}

export interface QuestionTypeSummaryItem {
  key: string;
  name: string;
  count: number;
  accuracy: number;
}

export async function getSkillExercises(params: {
  skill?: string;
  question_type?: string;
  difficulty?: string;
  page?: number;
  limit?: number;
}) {
  const res = await apiClient.get<{
    meta: { code: number };
    data: { items: PracticeExerciseItem[]; total: number; page: number; limit: number };
  }>("/api/v1/test-practice/exercises", { params });
  return res.data?.data || { items: [], total: 0, page: 1, limit: 12 };
}

export async function getQuestionTypesSummary(skill: string = "reading") {
  const res = await apiClient.get<{
    meta: { code: number };
    data: QuestionTypeSummaryItem[];
  }>("/api/v1/test-practice/question-types-summary", { params: { skill } });
  return res.data?.data || [];
}

