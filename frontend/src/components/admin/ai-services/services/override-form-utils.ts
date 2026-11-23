// Hàm kiểm khoảng giá trị phía client cho form ghi đè (FR-036); backend vẫn kiểm lại.

export interface ParsedNumber {
  value: number | null; // null = để trống = không ghi đè
  error: string | null;
}

export function parseOptionalNumber(raw: string, label: string, min: number, max: number, integer = false): ParsedNumber {
  const text = raw.trim();
  if (text === "") return { value: null, error: null };
  const value = Number(text.replace(",", "."));
  if (!Number.isFinite(value)) return { value: null, error: `${label} phải là số` };
  if (integer && !Number.isInteger(value)) return { value: null, error: `${label} phải là số nguyên` };
  if (value < min || value > max) return { value: null, error: `${label} phải nằm trong khoảng ${min} đến ${max}` };
  return { value, error: null };
}

export const SAVED_MESSAGE = "Đã lưu, áp dụng cho lượt chấm mới trong tối đa 60 giây";

export function numberToText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}
