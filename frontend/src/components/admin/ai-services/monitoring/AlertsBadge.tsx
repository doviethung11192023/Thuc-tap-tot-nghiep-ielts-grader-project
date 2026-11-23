"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { getAdminAlerts } from "@/services/admin-ai-monitoring";
import { BUDGET_STATE_LABEL } from "./monitoring-format";

/** Badge cảnh báo AI (lượt lỗi, lượt treo, ngân sách); ẩn khi không có gì; bấm → lượt chấm cần chú ý. */
export function AlertsBadge() {
  const { data } = useQuery({ queryKey: ["admin-alerts"], queryFn: getAdminAlerts, refetchInterval: 60_000 });
  if (!data || data.total === 0) return null;
  const budgetAlert = data.budget.state === "warning" || data.budget.state === "exceeded";
  const parts: string[] = [];
  if (data.failed_attempts > 0) parts.push(`${data.failed_attempts} bài chấm lỗi`);
  if (data.stuck_runs > 0) parts.push(`${data.stuck_runs} lượt treo`);
  if (budgetAlert) parts.push(`${BUDGET_STATE_LABEL[data.budget.state].label.toLowerCase()}${data.budget.percent !== null ? ` (${data.budget.percent}%)` : ""}`);
  return (
    <Link href="/admin/ai-services/runs?status=attention"
      className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 hover:bg-red-100 transition-colors">
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <span className="font-bold">{data.total} cảnh báo AI</span>
      <span className="text-red-700">{parts.join(" · ")}</span>
      <span className="ml-auto font-semibold underline whitespace-nowrap">Xem lượt chấm</span>
    </Link>
  );
}
