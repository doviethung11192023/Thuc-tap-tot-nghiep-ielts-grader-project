"use client";

import React, { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getAiPricing, getAiUsage } from "@/services/admin-ai-monitoring";
import type { UsageGroupBy } from "@/types/admin-ai-monitoring";
import { PricingEditor } from "./PricingEditor";
import { PriceSyncPanel } from "./PriceSyncPanel";
import { UsageRowsTable } from "./UsageRowsTable";
import { UsageSummary } from "./UsageSummary";
import { currentMonth } from "./monitoring-format";

const GROUPS: { key: UsageGroupBy; label: string }[] = [
  { key: "day", label: "Theo ngày" },
  { key: "model", label: "Theo model" },
  { key: "skill", label: "Theo kỹ năng" },
];

/** Tab "Chi phí": chọn tháng, tổng so với ngân sách, bảng theo ngày/model/kỹ năng, bảng giá. */
export function UsageView() {
  const [month, setMonth] = useState(currentMonth());
  const [groupBy, setGroupBy] = useState<UsageGroupBy>("day");

  const usage = useQuery({
    queryKey: ["admin-ai-usage", month, groupBy],
    queryFn: () => getAiUsage(month || undefined, groupBy),
    placeholderData: keepPreviousData,
  });
  const pricing = useQuery({ queryKey: ["admin-ai-pricing"], queryFn: getAiPricing });

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-zinc-700 inline-flex items-center gap-2">
          Tháng
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="min-h-[40px] rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#932120]/30" />
        </label>
      </div>

      {usage.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-[#932120]" /></div>
      ) : usage.isError || !usage.data ? (
        <p className="text-center text-zinc-500 py-8">Không tải được số liệu chi phí.</p>
      ) : (
        <>
          <UsageSummary report={usage.data} />
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
            <div className="flex gap-1 p-2 border-b border-zinc-200 bg-zinc-50/60" role="tablist">
              {GROUPS.map((g) => (
                <button key={g.key} type="button" role="tab" aria-selected={groupBy === g.key} onClick={() => setGroupBy(g.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${groupBy === g.key ? "bg-[#932120] text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
                  {g.label}
                </button>
              ))}
            </div>
            <UsageRowsTable rows={usage.data.rows} groupBy={groupBy} />
          </div>
        </>
      )}

      {pricing.data && <PriceSyncPanel pricing={pricing.data} />}
      {pricing.data && <PricingEditor pricing={pricing.data} />}
    </div>
  );
}
