import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Hàm tiện ích để merge Tailwind classes (dùng rất nhiều khi làm components)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format điểm IELTS: 6.5, 7.0, 8.5...
export function formatBandScore(score: number): string {
  return score.toFixed(1);
}

// Trả về màu sắc tương ứng với band score
// Dùng trong UI để hiển thị màu xanh/vàng/đỏ cho điểm số
export function getBandScoreColor(score: number): string {
  if (score >= 7.0) return "text-green-500";
  if (score >= 5.5) return "text-yellow-500";
  return "text-red-500";
}

// Trả về màu cho lỗi ngữ pháp theo severity
export function getErrorSeverityColor(severity: "minor" | "major" | "critical"): string {
  const colors = {
    minor: "bg-yellow-100 border-yellow-400 text-yellow-800",
    major: "bg-orange-100 border-orange-400 text-orange-800",
    critical: "bg-red-100 border-red-400 text-red-800",
  };
  return colors[severity];
}

// Đếm số từ trong bài viết (tương tự backend)
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Format ngày giờ (VD: "10/07/2026 10:05")
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Tên tiêu chí IELTS đầy đủ
export const CRITERIA_LABELS = {
  tr: "Task Response",
  cc: "Coherence & Cohesion",
  lr: "Lexical Resource",
  gra: "Grammatical Range & Accuracy",
} as const;
