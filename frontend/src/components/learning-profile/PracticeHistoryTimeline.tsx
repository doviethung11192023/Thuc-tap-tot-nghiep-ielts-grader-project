"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import type { PracticeHistoryItem } from "@/types/learning-profile";

interface PracticeHistoryTimelineProps {
  history: PracticeHistoryItem[];
}

export function PracticeHistoryTimeline({ history }: PracticeHistoryTimelineProps) {
  return (
    <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-zinc-900 text-sm tracking-tight">Lịch sử Test Practice</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Dựa trên các bài thi thực tế gần nhất của bạn</p>
        </div>
        <Link
          href="/history"
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
        >
          <span>Xem tất cả</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
        {history.map((item) => {
          const formattedDate = item.submittedAt ? new Date(item.submittedAt).toLocaleDateString("vi-VN", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
          }) : "Gần đây";

          const resultHref = item.id ? `/results/${item.id}` : "/history";

          return (
            <div key={item.id} className="relative group">
              {/* Timeline marker */}
              <div className="absolute -left-6 top-3.5 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white group-hover:scale-125 transition-transform" />

              <div className="bg-zinc-50/70 hover:bg-white border border-zinc-200/80 p-4 rounded-2xl transition-all hover:shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-200/80 text-zinc-700">
                        {item.type_badge}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                        {item.band > 0 ? `Band ${item.band.toFixed(1)}` : `${item.score_percent}%`}
                      </span>
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        {item.skill}
                      </span>
                    </div>

                    <h4 className="font-bold text-zinc-900 text-sm tracking-tight group-hover:text-blue-600 transition-colors">
                      {item.testName}
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>Nộp bài lúc: {formattedDate}</span>
                    </div>
                  </div>

                  <Link
                    href={resultHref}
                    className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0"
                  >
                    <span>Xem chi tiết</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
