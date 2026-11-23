"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2, Scale } from "lucide-react";
import { getGapCases } from "@/services/admin-ai-monitoring";
import { GapCasesFilterBar, type GapCaseFilterState } from "./GapCasesFilterBar";
import { GapCasesTable } from "./GapCasesTable";
import { MonitoringPagination } from "./MonitoringPagination";

const LIMIT = 20;

/** Trang phân tích ca lệch AI–Expert. Bộ lọc nằm trên URL (thẻ Thống kê dẫn tới ?criterion=TR). */
export function GapCasesView() {
  const router = useRouter();
  const params = useSearchParams();
  const filters: GapCaseFilterState = {
    skill: params.get("skill") ?? "",
    criterion: params.get("criterion")?.toUpperCase() === "OVERALL" ? "overall" : params.get("criterion")?.toUpperCase() ?? "overall",
    min_abs: params.get("min_abs") ?? "1",
    direction: params.get("direction") ?? "all",
    days: params.get("days") ?? "30",
  };
  const [page, setPage] = useState(1);

  const minAbs = Number(filters.min_abs);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-gap-cases", filters, page],
    queryFn: () => getGapCases({
      days: Number(filters.days) || 30, skill: filters.skill, criterion: filters.criterion,
      min_abs: Number.isFinite(minAbs) && minAbs >= 0 ? minAbs : 1, direction: filters.direction, page, limit: LIMIT,
    }),
    placeholderData: keepPreviousData,
  });

  const apply = (next: GapCaseFilterState) => {
    const qs = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => v && qs.set(k, v));
    setPage(1);
    router.replace(`?${qs.toString()}`);
  };

  return (
    <div className="space-y-5 sm:space-y-6 w-full">
      <div className="border-b border-zinc-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2.5">
          <Scale className="w-7 h-7 text-[#932120]" /> Phân tích ca lệch AI – Expert
        </h1>
        <p className="text-sm sm:text-base text-zinc-500 mt-1">Các bài Expert chấm khác AI, xếp theo độ lệch giảm dần. Độ lệch = band Expert trừ band AI.</p>
      </div>
      <GapCasesFilterBar value={filters} onChange={apply} />
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[#932120]" /></div>
        ) : (
          <>
            <GapCasesTable items={data?.items ?? []} criterionLabel={filters.criterion === "overall" ? "tổng" : filters.criterion} />
            <MonitoringPagination page={page} limit={LIMIT} total={data?.total ?? 0} onPageChange={setPage} unit="bài" />
          </>
        )}
      </div>
    </div>
  );
}
