import React from "react";

// Mức của chỉ số con (spec 006 US5). Code đã kẹp mức theo band, nên nhãn không mâu thuẫn với điểm.
const STYLES: Record<string, { label: string; cls: string }> = {
  needs_work: { label: "Cần cải thiện", cls: "bg-red-50 text-red-700 border-red-200" },
  fair: { label: "Khá", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  good: { label: "Tốt", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  very_good: { label: "Rất tốt", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  excellent: { label: "Xuất sắc", cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

export function SubLevelBadge({ level }: { level?: string }) {
  const style = level ? STYLES[level] : undefined;
  if (!style) return null;
  return (
    <span className={`ml-2 px-2 py-0.5 rounded-full border text-[10px] font-bold normal-case ${style.cls}`}>
      {style.label}
    </span>
  );
}
