"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import type { UsageReport } from "@/types/admin-ai-monitoring";
import { BUDGET_STATE_LABEL, formatCost, formatNumber } from "./monitoring-format";

function barColor(state: string): string {
  return state === "exceeded" ? "bg-red-600" : state === "warning" ? "bg-amber-500" : "bg-emerald-500";
}

/** Thẻ tổng tháng so với ngân sách, danh sách model chưa có giá. */
/** Lý do lượt chưa rõ chi phí: chấm trước khi có ghi token, hoặc model chưa có giá lúc chấm. */
function unknownReason(t: { unknown_cost_runs: number; no_usage_runs: number }): string {
  const noUsage = t.no_usage_runs ?? 0;
  const unpriced = t.unknown_cost_runs - noUsage;
  return [noUsage > 0 && `${noUsage} lượt chấm trước khi có ghi token`, unpriced > 0 && `${unpriced} lượt model chưa có giá lúc chấm`]
    .filter(Boolean).join(", ");
}

export function UsageSummary({ report }: { report: UsageReport }) {
  const { total, budget } = report;
  const state = BUDGET_STATE_LABEL[budget.state] ?? BUDGET_STATE_LABEL.off;
  const percent = budget.percent ?? 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Chi phí tháng {report.month}</h3>
            <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${state.cls}`}>{state.label}</span>
          </div>
          <div className="mt-2 text-3xl font-black text-zinc-900">{formatCost(total.cost_usd)}</div>
          <p className="text-xs text-zinc-500 mt-1">
            {budget.budget_usd ? `Ngân sách ${formatCost(budget.budget_usd)} (${budget.percent ?? 0}%)` : "Chưa đặt ngân sách tháng"}
            {total.unknown_cost_runs > 0 && ` · ${total.unknown_cost_runs} lượt chưa rõ chi phí, không tính vào tổng (${unknownReason(total)})`}
          </p>
          {budget.budget_usd ? (
            <div className="mt-3 h-2.5 rounded-full bg-zinc-100 overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <div className={`h-full ${barColor(budget.state)}`} style={{ width: `${Math.min(100, percent)}%` }} />
            </div>
          ) : null}
        </div>
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-xs">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Token trong tháng</h3>
          <div className="mt-2 text-sm text-zinc-700 space-y-1">
            <p>Vào: <strong className="text-zinc-900">{formatNumber(total.input_tokens)}</strong></p>
            <p>Ra: <strong className="text-zinc-900">{formatNumber(total.output_tokens)}</strong></p>
            <p>Số lượt chấm: <strong className="text-zinc-900">{formatNumber(total.runs)}</strong></p>
          </div>
        </div>
      </div>
      {report.models_without_price.length > 0 && (
        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            Model chưa có giá: <span className="font-mono">{report.models_without_price.join(", ")}</span>. Điền giá ở bảng bên dưới để tính chi phí cho các lượt chấm sau.
          </div>
        </div>
      )}
    </div>
  );
}
