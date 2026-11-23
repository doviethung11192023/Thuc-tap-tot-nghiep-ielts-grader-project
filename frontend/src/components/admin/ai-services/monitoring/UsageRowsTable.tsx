"use client";

import React from "react";
import type { UsageGroupBy, UsageRow } from "@/types/admin-ai-monitoring";
import { SKILL_LABEL, formatCost, formatNumber } from "./monitoring-format";

const KEY_HEADER: Record<UsageGroupBy, string> = { day: "Ngày", model: "Model", skill: "Kỹ năng" };

/** Bảng token và chi phí theo ngày, model hoặc kỹ năng. */
export function UsageRowsTable({ rows, groupBy }: { rows: UsageRow[]; groupBy: UsageGroupBy }) {
  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-xs sm:text-sm text-left text-zinc-600">
        <thead className="text-xs text-zinc-600 uppercase bg-zinc-50 border-b border-zinc-200 font-bold">
          <tr>
            <th className="px-4 py-3">{KEY_HEADER[groupBy]}</th>
            <th className="px-4 py-3 text-right">Lượt chấm</th>
            <th className="px-4 py-3 text-right">Token vào</th>
            <th className="px-4 py-3 text-right">Token ra</th>
            <th className="px-4 py-3 text-right">Chi phí</th>
            <th className="px-4 py-3 text-right">Chưa rõ chi phí</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.length === 0 ? (
            <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-400">Chưa có lượt chấm nào trong tháng này</td></tr>
          ) : rows.map((r) => (
            <tr key={r.key} className="bg-white hover:bg-zinc-50/70">
              <td className={`px-4 py-3 font-semibold text-zinc-900 ${groupBy === "model" ? "font-mono text-xs" : ""}`}>
                {groupBy === "skill" ? SKILL_LABEL[r.key] ?? r.key : r.key}
              </td>
              <td className="px-4 py-3 text-right">{formatNumber(r.runs)}</td>
              <td className="px-4 py-3 text-right">{formatNumber(r.input_tokens)}</td>
              <td className="px-4 py-3 text-right">{formatNumber(r.output_tokens)}</td>
              <td className="px-4 py-3 text-right font-semibold text-zinc-900">{formatCost(r.cost_usd)}</td>
              <td className="px-4 py-3 text-right">{r.unknown_cost_runs > 0 ? r.unknown_cost_runs : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
