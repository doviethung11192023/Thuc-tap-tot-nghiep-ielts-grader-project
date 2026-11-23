"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Scale } from "lucide-react";
import { getAiExpertGap } from "@/services/admin-ai-monitoring";
import type { GapGroupBy } from "@/types/admin-ai-monitoring";
import { GapBlockView } from "./GapBlockView";

const GROUP_OPTIONS: { value: GapGroupBy; label: string }[] = [
  { value: "none", label: "Không chia" },
  { value: "prompt_version", label: "Phiên bản prompt" },
  { value: "model", label: "Model" },
  { value: "task_type", label: "Dạng đề" },
  { value: "band_range", label: "Khoảng band" },
];

const GROUP_LABEL: Record<string, string> = { unknown: "không rõ", mixed: "nhiều model", uncategorized: "chưa phân loại", speaking: "Speaking" };

/** Thẻ chênh lệch điểm AI so với Expert trong 30 ngày (Thống kê). */
export function ExpertGapCard() {
  const [groupBy, setGroupBy] = useState<GapGroupBy>("none");
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin-ai-expert-gap", 30, groupBy], queryFn: () => getAiExpertGap(30, groupBy) });

  return (
    <div className="bg-white p-5 sm:p-7 rounded-2xl border border-zinc-200 shadow-xs w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2.5">
          <Scale className="w-5 h-5 text-[#932120]" /> Chênh lệch điểm AI – Expert (30 ngày)
        </h3>
        <label className="text-sm text-zinc-600 inline-flex items-center gap-2">
          Chia theo
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GapGroupBy)}
            className="min-h-[38px] rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#932120]/30">
            {GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs text-zinc-500">Độ lệch = band Expert trừ band AI, chỉ tính bài có cả hai bên chấm. Dương nghĩa là AI chấm thấp hơn Expert. Bấm một tiêu chí để xem các bài lệch.</p>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#932120]" /></div>
      ) : isError || !data ? (
        <p className="text-sm text-zinc-500">Không tải được số liệu chênh lệch.</p>
      ) : data.groups ? (
        <div className="space-y-2.5">
          {data.groups.length === 0 && <p className="text-sm text-zinc-400">chưa đủ dữ liệu</p>}
          {data.groups.map((g) => <GapBlockView key={g.key} title={GROUP_LABEL[g.label] ?? g.label} block={g} />)}
        </div>
      ) : (
        <GapBlockView block={{ overall: data.overall ?? null, by_criterion: data.by_criterion ?? [] }} />
      )}
    </div>
  );
}
