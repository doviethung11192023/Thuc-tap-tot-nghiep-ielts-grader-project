import apiClient from "@/lib/api-client";

export interface AdminTestSetItem {
  id: string;
  name: string;
  created_at?: string;
  total_tests: number;
  published_tests: number;
  skills: string[];
}

export interface ListAdminTestSetsResponse {
  items: AdminTestSetItem[];
  total: number;
  standalone_tests_count: number;
}

export async function getAdminTestSets(): Promise<ListAdminTestSetsResponse> {
  const res = await apiClient.get<{ meta: { code: number }; data: ListAdminTestSetsResponse }>(
    "/api/v1/admin/test-sets"
  );
  return res.data.data;
}

export async function createAdminTestSet(name: string): Promise<AdminTestSetItem> {
  const res = await apiClient.post<{ meta: { code: number }; data: AdminTestSetItem }>(
    "/api/v1/admin/test-sets",
    { name }
  );
  return res.data.data;
}

export async function updateAdminTestSet(setId: string, name: string): Promise<AdminTestSetItem> {
  const res = await apiClient.put<{ meta: { code: number }; data: AdminTestSetItem }>(
    `/api/v1/admin/test-sets/${setId}`,
    { name }
  );
  return res.data.data;
}

export async function deleteAdminTestSet(setId: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/test-sets/${setId}`);
}

export async function bulkAssignTestsToSet(testIds: string[], testSetId: string | null): Promise<number> {
  const res = await apiClient.post<{ meta: { code: number }; data: { updated_count: number } }>(
    "/api/v1/admin/tests/bulk-assign-set",
    { test_ids: testIds, test_set_id: testSetId }
  );
  return res.data?.data?.updated_count || 0;
}
