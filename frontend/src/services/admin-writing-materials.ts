import apiClient from "@/lib/api-client";

// Tài liệu theo đề Writing (spec 006): AI soạn nháp, Admin sửa và duyệt.
export type MaterialKind = "answer_key" | "outline" | "sample";

export interface WritingTaskMaterial {
  section_id: string;
  task_type: "task1" | "task2";
  answer_key: Record<string, unknown> | null;
  answer_key_reviewed_at: string | null;
  outline: string | null;
  outline_reviewed_at: string | null;
  sample_essay: string | null;
  sample_reviewed_at: string | null;
}

type Envelope = { meta: { code: number; message?: string }; data: WritingTaskMaterial };
const base = (sectionId: string) => `/api/v1/admin/writing-tasks/${sectionId}/material`;

export async function getWritingMaterial(sectionId: string) {
  return (await apiClient.get<Envelope>(base(sectionId))).data.data;
}

export async function draftWritingMaterial(sectionId: string, kind: MaterialKind) {
  // Gọi AI đọc ảnh / viết bài: có thể mất tới 1–2 phút
  return (await apiClient.post<Envelope>(`${base(sectionId)}/draft`, { kind }, { timeout: 200_000 })).data.data;
}

export async function saveWritingMaterial(
  sectionId: string,
  fields: Partial<Pick<WritingTaskMaterial, "answer_key" | "outline" | "sample_essay">>,
) {
  return (await apiClient.put<Envelope>(base(sectionId), fields)).data.data;
}

export async function approveWritingMaterial(sectionId: string, kind: MaterialKind) {
  return (await apiClient.post<Envelope>(`${base(sectionId)}/approve`, { kind })).data.data;
}
