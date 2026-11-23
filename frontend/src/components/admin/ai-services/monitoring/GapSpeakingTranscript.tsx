"use client";

import React from "react";
import type { GapCaseDetail } from "@/types/admin-ai-monitoring";

/** Transcript từng câu hỏi Speaking (chỉ những câu Learner đã xác nhận). */
export function GapSpeakingTranscript({ items }: { items: GapCaseDetail["speaking"] }) {
  if (items.length === 0) return null;
  return (
    <section className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
      <h2 className="text-base font-bold text-zinc-900">Transcript Speaking</h2>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="rounded-xl border border-zinc-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Part {it.part}</p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">{it.question ?? "—"}</p>
            <p className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap">{it.transcript || <span className="text-zinc-400">Không có transcript.</span>}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
