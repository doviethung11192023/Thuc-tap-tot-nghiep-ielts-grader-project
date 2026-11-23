import type { PromptMessage, PromptOverview } from "@/types/admin-ai-services";

// Nhãn bước chỉ để hiển thị nhóm; bước lạ vẫn hiện bằng khoá của nó.
const STEP_LABELS: Record<string, string> = {
  writing_criteria: "Writing: chấm từng tiêu chí",
  writing_task2_grade: "Writing Task 2: chấm một lượt",
  writing_rewrite: "Writing: viết lại bài",
  writing_vision: "Writing Task 1: đọc biểu đồ",
  writing_classify: "Writing: phân loại đề",
  writing_keycheck: "Writing Task 1: kiểm đáp án",
  writing_material: "Writing: dàn ý và bài mẫu",
  speaking_grading: "Speaking: chấm bài",
};

export function stepLabel(step: string | null): string {
  if (!step) return "Khác";
  return STEP_LABELS[step] ?? step;
}

export interface PromptGroup {
  step: string | null;
  label: string;
  prompts: PromptOverview[];
}

/** Gom prompt theo bước, giữ thứ tự xuất hiện đầu tiên. */
export function groupPromptsByStep(prompts: PromptOverview[]): PromptGroup[] {
  const groups = new Map<string, PromptGroup>();
  for (const p of prompts) {
    const key = p.step ?? "";
    if (!groups.has(key)) groups.set(key, { step: p.step, label: stepLabel(p.step), prompts: [] });
    groups.get(key)!.prompts.push(p);
  }
  return [...groups.values()];
}

const VARIABLE = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

/** Tên các biến {{...}} dùng trong danh sách message (cùng quy tắc với backend). */
export function extractVariables(messages: PromptMessage[]): Set<string> {
  const found = new Set<string>();
  for (const m of messages) {
    for (const match of m.content.matchAll(VARIABLE)) found.add(match[1]);
  }
  return found;
}

export function formatPromptDate(iso: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("vi-VN");
}

export type ConfigParse = { ok: true; value: Record<string, unknown> } | { ok: false; error: string };

export function parseConfigJson(text: string): ConfigParse {
  const raw = text.trim() === "" ? "{}" : text;
  try {
    const value: unknown = JSON.parse(raw);
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: "Config phải là một object JSON, ví dụ {\"temperature\": 0.2}" };
    }
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return { ok: false, error: "Config không phải JSON hợp lệ" };
  }
}
