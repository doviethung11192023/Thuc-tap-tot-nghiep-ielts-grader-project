import React from "react";

const STATUS: Record<string, { label: string; cls: string }> = {
  running: { label: "Đang chạy", cls: "bg-blue-50 text-blue-800 border-blue-200" },
  done: { label: "Hoàn tất", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  failed: { label: "Lỗi", cls: "bg-red-50 text-red-700 border-red-200" },
};

/** Nhãn trạng thái lượt chấm; lượt chạy quá 25 phút có thêm nhãn "Treo". */
export function RunStatusBadge({ status, isStuck }: { status: string; isStuck?: boolean }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600 border-zinc-200" };
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${s.cls}`}>{s.label}</span>
      {isStuck && <span className="px-2 py-1 rounded-full border text-xs font-bold bg-amber-50 text-amber-800 border-amber-300">Treo</span>}
    </span>
  );
}
