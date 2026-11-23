"use client";

import React, { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { getGradingRuns } from "@/services/admin-ai-monitoring";
import type { GradingRunFilters } from "@/types/admin-ai-monitoring";
import { MonitoringPagination } from "./MonitoringPagination";
import { RegradeConfirmModal } from "./RegradeConfirmModal";
import { RunsFilterBar } from "./RunsFilterBar";
import { RunsTable } from "./RunsTable";
import { MAX_REGRADE, useRegradeFlow } from "./use-regrade-flow";

const LIMIT = 20;

/** Tab "Lượt chấm": lọc, phân trang, chọn nhiều bài để chạy lại. Bộ lọc trạng thái lấy từ ?status= (badge dẫn tới). */
export function RunsListView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const filters: GradingRunFilters = {
    status: params.get("status") ?? "",
    skill: params.get("skill") ?? "",
    date_from: params.get("date_from") ?? "",
    date_to: params.get("date_to") ?? "",
    model: params.get("model") ?? "",
    prompt_name: params.get("prompt_name") ?? "",
    prompt_version: params.get("prompt_version") ?? "",
  };
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-grading-runs", filters, page],
    queryFn: () => getGradingRuns({ ...filters, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });

  const onDone = useCallback(() => {
    setSelected(new Set());
    void queryClient.invalidateQueries({ queryKey: ["admin-grading-runs"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
  }, [queryClient]);
  const regrade = useRegradeFlow(onDone);

  // Giữ bộ lọc trên URL để chia sẻ link và để badge dẫn thẳng vào ?status=attention.
  const applyFilters = (next: GradingRunFilters) => {
    const qs = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => v && qs.set(k, String(v)));
    setPage(1);
    setSelected(new Set());
    router.replace(qs.toString() ? `?${qs.toString()}` : "?");
  };

  const items = data?.items ?? [];
  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = (checked: boolean) => setSelected((prev) => {
    const next = new Set(prev);
    items.forEach((r) => { if (r.attempt_id) { if (checked) next.add(r.attempt_id); else next.delete(r.attempt_id); } });
    return next;
  });
  const tooMany = selected.size > MAX_REGRADE;

  return (
    <div className="space-y-5 w-full">
      <RunsFilterBar value={filters} onChange={applyFilters} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-600">
          {selected.size > 0 ? <>Đã chọn <strong className="text-zinc-900">{selected.size}</strong> bài</> : "Chọn dòng để chạy lại chấm AI"}
          {tooMany && <span className="ml-2 text-red-700 font-semibold">Tối đa {MAX_REGRADE} bài mỗi lần</span>}
        </div>
        <div className="flex gap-2.5">
          <button type="button" onClick={() => void refetch()} className="min-h-[40px] bg-white border border-zinc-200 rounded-xl px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 inline-flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Làm mới
          </button>
          <button type="button" disabled={selected.size === 0 || tooMany || regrade.loading} onClick={() => void regrade.start(Array.from(selected))}
            className="min-h-[40px] bg-[#932120] hover:bg-[#7a1a19] text-white rounded-xl px-4 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50">
            {regrade.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Chạy lại
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[#932120]" /></div>
        ) : (
          <>
            <RunsTable items={items} selected={selected} onToggle={toggle} onToggleAll={toggleAll} />
            <MonitoringPagination page={page} limit={LIMIT} total={data?.total ?? 0} onPageChange={setPage} unit="lượt chấm" />
          </>
        )}
      </div>
      {regrade.preview && (
        <RegradeConfirmModal preview={regrade.preview} submitting={regrade.submitting} onConfirm={() => void regrade.confirm()} onClose={regrade.close} />
      )}
    </div>
  );
}
