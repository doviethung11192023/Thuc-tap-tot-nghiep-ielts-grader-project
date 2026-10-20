import apiClient from "@/lib/api-client";
import type { 
  TestItem, TestSet, BandConversion, SystemSetting, IngestResponse,
  DatasetScanResult, ScannedTestItem, SkillType, ContentStatus, AllowedMode 
} from "@/types/exam";

export interface ListTestsParams {
  page?: number;
  limit?: number;
  skill?: SkillType;
  status?: ContentStatus;
  allowed_mode?: AllowedMode;
  test_set_id?: string;
  sort_by?: string;
  search?: string;
}

export async function getTests(params?: ListTestsParams) {
  const res = await apiClient.get<{ meta: { code: number }; data: { items: TestItem[]; total: number } }>(
    "/api/v1/admin/tests",
    { params }
  );
  return res.data.data;
}

export async function getTestDetail(testId: string) {
  const res = await apiClient.get<{ meta: { code: number }; data: TestItem }>(
    `/api/v1/admin/tests/${testId}`
  );
  return res.data.data;
}

export async function createTest(payload: {
  title: string;
  skill: SkillType;
  test_set_id?: string | null;
  allowed_mode?: AllowedMode;
  status?: ContentStatus;
  duration_min?: number;
  origin?: string;
}) {
  const res = await apiClient.post("/api/v1/admin/tests", payload);
  return res.data.data;
}

export async function updateTest(testId: string, payload: Partial<TestItem>) {
  const res = await apiClient.put(`/api/v1/admin/tests/${testId}`, payload);
  return res.data.data;
}

export async function updateTestStatus(testId: string, status: ContentStatus) {
  const res = await apiClient.patch(`/api/v1/admin/tests/${testId}/status`, { status });
  return res.data.data;
}

export async function bulkUpdateTestStatus(testIds: string[], status: ContentStatus) {
  const res = await apiClient.post("/api/v1/admin/tests/bulk-status", { test_ids: testIds, status });
  return res.data;
}

export async function deleteTest(testId: string) {
  await apiClient.delete(`/api/v1/admin/tests/${testId}`);
}

export async function getTestSets(): Promise<TestSet[]> {
  const res = await apiClient.get<{ meta: { code: number }; data: TestSet[] }>(
    "/api/v1/admin/test-sets"
  );
  return res.data.data;
}

export async function createTestSet(name: string): Promise<TestSet> {
  const res = await apiClient.post("/api/v1/admin/test-sets", { name });
  return res.data.data;
}

export async function createSection(testId: string, payload: any) {
  const res = await apiClient.post(`/api/v1/admin/tests/${testId}/sections`, payload);
  return res.data.data;
}

export async function updateSection(sectionId: string, payload: any) {
  const res = await apiClient.put(`/api/v1/admin/sections/${sectionId}`, payload);
  return res.data.data;
}

export async function deleteSection(sectionId: string) {
  await apiClient.delete(`/api/v1/admin/sections/${sectionId}`);
}

export async function createQuestionGroup(sectionId: string, payload: any) {
  const res = await apiClient.post(`/api/v1/admin/sections/${sectionId}/question-groups`, payload);
  return res.data.data;
}

export async function deleteQuestionGroup(groupId: string) {
  await apiClient.delete(`/api/v1/admin/question-groups/${groupId}`);
}

export async function createQuestion(groupId: string, payload: any) {
  const res = await apiClient.post(`/api/v1/admin/question-groups/${groupId}/questions`, payload);
  return res.data.data;
}

export async function updateQuestion(questionId: string, payload: any) {
  const res = await apiClient.put(`/api/v1/admin/questions/${questionId}`, payload);
  return res.data.data;
}

export async function deleteQuestion(questionId: string) {
  await apiClient.delete(`/api/v1/admin/questions/${questionId}`);
}

export async function uploadMedia(file: File, folder: string = "general") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  const res = await apiClient.post("/api/v1/admin/media/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res.data.data;
}

export async function getBandConversions(skill?: string): Promise<BandConversion[]> {
  const res = await apiClient.get<{ meta: { code: number }; data: BandConversion[] }>(
    "/api/v1/admin/core/band-conversions",
    { params: { skill } }
  );
  return res.data.data;
}

export async function updateBandConversion(id: string, payload: Partial<BandConversion>) {
  const res = await apiClient.put(`/api/v1/admin/core/band-conversions/${id}`, payload);
  return res.data.data;
}

export async function getSystemSettings(): Promise<SystemSetting[]> {
  const res = await apiClient.get<{ meta: { code: number }; data: SystemSetting[] }>(
    "/api/v1/admin/core/settings"
  );
  return res.data.data;
}

export async function updateSystemSetting(key: string, value: Record<string, any>, description?: string) {
  const res = await apiClient.put(`/api/v1/admin/core/settings/${key}`, { value, description });
  return res.data.data;
}

export async function scanDataset(dataset_path?: string): Promise<DatasetScanResult> {
  const res = await apiClient.get<DatasetScanResult>("/api/v1/admin/ingest/scan", {
    params: { dataset_path }
  });
  return res.data;
}

export async function ingestCrawledDataset(payload?: {
  dataset_path?: string;
  test_limit?: number;
  include_reading_listening?: boolean;
  include_writing?: boolean;
  include_speaking?: boolean;
  only_pending?: boolean;
  selected_tests?: ScannedTestItem[];
}): Promise<IngestResponse> {
  const res = await apiClient.post<IngestResponse>("/api/v1/admin/ingest/crawled-test", payload || {});
  return res.data;
}
