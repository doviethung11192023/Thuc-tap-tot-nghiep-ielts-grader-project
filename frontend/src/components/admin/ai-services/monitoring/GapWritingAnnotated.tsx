"use client";

import React from "react";
import type { GapAnnotation, GapCaseDetail } from "@/types/admin-ai-monitoring";
import { buildSegments } from "./gap-annotation-segments";

// AI một màu (vàng), Expert màu khác (xanh); đoạn cả hai cùng đánh dấu có viền hai màu.
function markClass(marks: GapAnnotation[]): string {
  const ai = marks.some((m) => m.source === "ai");
  const expert = marks.some((m) => m.source === "expert");
  if (ai && expert) return "bg-amber-200 border-b-[3px] border-sky-500";
  return ai ? "bg-amber-200" : "bg-sky-200";
}

function Tooltip({ marks }: { marks: GapAnnotation[] }) {
  return (
    <span className="hidden group-hover:block absolute left-0 top-full z-20 mt-1 w-72 rounded-lg bg-zinc-900 text-white text-xs p-3 shadow-lg whitespace-normal font-sans space-y-2">
      {marks.map((m, i) => (
        <span key={i} className="block">
          <span className={`font-bold ${m.source === "ai" ? "text-amber-300" : "text-sky-300"}`}>{m.source === "ai" ? "AI" : "Expert"}</span>
          {(m.category || m.type) && <span className="text-zinc-300"> · {[m.category, m.type].filter(Boolean).join(" / ")}</span>}
          {m.corrected_text && <span className="block mt-0.5">Sửa thành: <strong>{m.corrected_text}</strong></span>}
          {m.explanation && <span className="block mt-0.5 text-zinc-200">{m.explanation}</span>}
        </span>
      ))}
    </span>
  );
}

/** Bài viết từng task với lỗi AI và Expert tô màu khác nhau; rê chuột để xem giải thích và bản sửa. */
export function GapWritingAnnotated({ tasks }: { tasks: GapCaseDetail["writing"] }) {
  if (tasks.length === 0) return null;
  return (
    <section className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-zinc-900">Bài viết và lỗi được đánh dấu</h2>
        <div className="flex items-center gap-4 text-xs text-zinc-600">
          <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-amber-200 border border-amber-300" /> Lỗi AI đánh dấu</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-sky-200 border border-sky-300" /> Lỗi Expert đánh dấu</span>
        </div>
      </div>
      {tasks.map((t) => {
        const counts = { ai: t.annotations.filter((a) => a.source === "ai").length, expert: t.annotations.filter((a) => a.source === "expert").length };
        return (
          <div key={t.task_no} className="space-y-2">
            <h3 className="text-sm font-bold text-zinc-900">Task {t.task_no} <span className="font-normal text-zinc-500">· AI {counts.ai} lỗi, Expert {counts.expert} lỗi</span></h3>
            {t.task_prompt && <p className="text-xs text-zinc-500 whitespace-pre-wrap border-l-2 border-zinc-200 pl-3">{t.task_prompt}</p>}
            <div className="text-sm leading-7 text-zinc-800 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
              {t.content ? buildSegments(t.content, t.annotations).map((seg, i) =>
                seg.marks.length === 0 ? <React.Fragment key={i}>{seg.text}</React.Fragment> : (
                  <span key={i} tabIndex={0} className={`relative group cursor-help rounded-sm ${markClass(seg.marks)}`}>
                    {seg.text}
                    <Tooltip marks={seg.marks} />
                  </span>
                )) : <span className="text-zinc-400">Bài trống.</span>}
            </div>
          </div>
        );
      })}
    </section>
  );
}
