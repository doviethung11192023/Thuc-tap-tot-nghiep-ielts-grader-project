import React from "react";

type Tone = "green" | "amber" | "red" | "gray";

const TONE_CLASS: Record<Tone, string> = {
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  red: "bg-red-100 text-red-700 border-red-200",
  gray: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const STATUS: Record<string, { label: string; tone: Tone }> = {
  ok: { label: "Hoạt động", tone: "green" },
  loaded: { label: "Đã nạp", tone: "green" },
  ready: { label: "Sẵn sàng", tone: "green" },
  not_configured: { label: "Chưa cấu hình", tone: "amber" },
  not_loaded: { label: "Chưa nạp", tone: "amber" },
  not_initialized: { label: "Chưa khởi tạo", tone: "amber" },
  env_fallback: { label: "Đang dùng .env", tone: "amber" },
  error: { label: "Lỗi", tone: "red" },
  timeout: { label: "Hết thời gian", tone: "red" },
  unavailable: { label: "Không kết nối", tone: "red" },
  unknown: { label: "Không rõ", tone: "gray" },
};

export function ServiceStatusBadge({ status }: { status: string }) {
  const info = STATUS[status] ?? { label: status || "Không rõ", tone: "gray" as Tone };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${TONE_CLASS[info.tone]}`}>
      {info.label}
    </span>
  );
}
