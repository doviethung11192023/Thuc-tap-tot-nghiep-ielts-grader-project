"use client";

import React from "react";
import type { CriterionComment } from "@/types/admin-ai-monitoring";
import { CRITERION_LABEL, formatBand } from "./monitoring-format";

interface Props {
  title: string;
  tone: "ai" | "expert";
  overall: number | null;
  criteria: CriterionComment[];
  showTaskNo: boolean;
  children?: React.ReactNode;
}

const TONE = { ai: "border-amber-300 bg-amber-50/40", expert: "border-sky-300 bg-sky-50/40" };
const TITLE = { ai: "text-amber-800", expert: "text-sky-800" };

/** Một cột của trang so sánh: band tổng, band + nhận xét từng tiêu chí. */
export function GapScoreColumn({ title, tone, overall, criteria, showTaskNo, children }: Props) {
  return (
    <section className={`rounded-2xl border-2 p-5 space-y-4 ${TONE[tone]}`}>
      <div className="flex items-center justify-between">
        <h2 className={`text-lg font-extrabold ${TITLE[tone]}`}>{title}</h2>
        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Band tổng</div>
          <div className="text-2xl font-black text-zinc-900">{formatBand(overall)}</div>
        </div>
      </div>
      {children}
      <ul className="space-y-3">
        {criteria.length === 0 && <li className="text-sm text-zinc-500">Không có điểm từng tiêu chí.</li>}
        {criteria.map((c) => (
          <li key={`${c.task_no}-${c.code}`} className="bg-white rounded-xl border border-zinc-200 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-zinc-900">
                {c.code ? CRITERION_LABEL[c.code] ?? c.code : "—"}
                {showTaskNo && <span className="ml-2 text-xs font-semibold text-zinc-500">Task {c.task_no}</span>}
              </span>
              <span className="text-base font-black text-zinc-900">{formatBand(c.band)}</span>
            </div>
            <p className="mt-1.5 text-sm text-zinc-700 whitespace-pre-wrap">{c.comment || <span className="text-zinc-400">Không có nhận xét.</span>}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
