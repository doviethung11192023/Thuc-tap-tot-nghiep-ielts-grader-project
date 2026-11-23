"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { GapCaseItem } from "@/types/admin-ai-monitoring";
import { MODE_LABEL, SKILL_LABEL, formatBand, formatDateTime, formatSigned } from "./monitoring-format";

/** Bảng ca lệch xếp theo |độ lệch| giảm dần; bấm dòng mở trang so sánh. */
export function GapCasesTable({ items, criterionLabel }: { items: GapCaseItem[]; criterionLabel: string }) {
  const router = useRouter();
  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-xs sm:text-sm text-left text-zinc-600">
        <thead className="text-xs text-zinc-600 uppercase bg-zinc-50 border-b border-zinc-200 font-bold">
          <tr>
            <th className="px-3 py-3">Expert chấm lúc</th>
            <th className="px-3 py-3">Đề thi</th>
            <th className="px-3 py-3">Kỹ năng</th>
            <th className="px-3 py-3">Dạng đề</th>
            <th className="px-3 py-3 text-right">AI ({criterionLabel})</th>
            <th className="px-3 py-3 text-right">Expert ({criterionLabel})</th>
            <th className="px-3 py-3 text-right">Lệch</th>
            <th className="px-3 py-3">Model</th>
            <th className="px-3 py-3">Prompt</th>
            <th className="px-3 py-3">Lý do</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {items.length === 0 ? (
            <tr><td colSpan={10} className="px-6 py-10 text-center text-zinc-400">Không có bài nào lệch theo bộ lọc này</td></tr>
          ) : items.map((c) => (
            <tr key={`${c.ai_evaluation_id}-${c.expert_evaluation_id}`} onClick={() => router.push(`/admin/ai-gap/${c.attempt_id}`)}
              className="bg-white hover:bg-zinc-50/70 cursor-pointer">
              <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(c.expert_scored_at)}</td>
              <td className="px-3 py-3 font-medium text-zinc-900 max-w-[220px] truncate" title={c.test_title ?? ""}>{c.test_title ?? "—"}</td>
              <td className="px-3 py-3 whitespace-nowrap">{SKILL_LABEL[c.skill] ?? c.skill}{c.mode ? ` · ${MODE_LABEL[c.mode] ?? c.mode}` : ""}</td>
              <td className="px-3 py-3">{c.task_type}</td>
              <td className="px-3 py-3 text-right">{formatBand(c.ai_band)}</td>
              <td className="px-3 py-3 text-right">{formatBand(c.expert_band)}</td>
              <td className={`px-3 py-3 text-right font-bold ${c.diff > 0 ? "text-sky-700" : "text-red-700"}`}>{formatSigned(c.diff)}</td>
              <td className="px-3 py-3 font-mono text-xs">{c.model}</td>
              <td className="px-3 py-3 font-mono text-xs">{c.prompt_label}</td>
              <td className="px-3 py-3">{c.has_expert_reason ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">Có</span> : <span className="text-zinc-400">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
