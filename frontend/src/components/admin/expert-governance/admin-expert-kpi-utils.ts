import type { AdminExpertPerformanceRow } from "@/services/admin-reviews";

export const TIER_BADGE_META: Record<string, { label: string; cls: string }> = {
  top_expert: { label: "Top Expert", cls: "bg-red-50 text-[#932120] border-red-300" },
  high_performer: { label: "High Performer", cls: "bg-amber-50 text-amber-800 border-amber-300" },
  standard: { label: "Standard", cls: "bg-zinc-100 text-zinc-700 border-zinc-300" },
  probation: { label: "Probation", cls: "bg-rose-50 text-rose-800 border-rose-300" },
};

export function exportExpertPerformanceCsv(items: AdminExpertPerformanceRow[], period: string): void {
  const header = [
    "Chuyen gia",
    "Email",
    "Hang",
    "Hoan thanh",
    "Dung han SLA (%)",
    "Cham som <=24h (%)",
    "Dat lan dau (%)",
    "TB xu ly (h)",
    "Tu choi (%)",
    "Nghi van rubber-stamp",
    "Huu ich (%)",
    "Vi pham dang hieu luc",
  ];
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const rows = items.map((e) =>
    [
      e.full_name,
      e.email,
      e.tier || "standard",
      e.completed_period ?? e.completed_total,
      e.on_time_rate ?? "",
      e.early_sla_rate ?? "",
      e.completeness_first_pass_rate ?? "",
      e.avg_turnaround_hours ?? "",
      e.decline_rate ?? 0,
      e.rubber_stamp_count ?? 0,
      e.helpfulness_rate ?? "",
      e.active_penalties_30d ?? 0,
    ]
      .map(esc)
      .join(","),
  );
  const csv = "\uFEFF" + [header.map(esc).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `expert-performance-${period}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
