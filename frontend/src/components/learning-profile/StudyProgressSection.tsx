"use client";

import React from "react";
import Link from "next/link";
import { Trophy, ArrowRight, CheckCircle2 } from "lucide-react";
import type { StudyMilestone } from "@/types/learning-profile";

interface StudyProgressSectionProps {
  milestones: StudyMilestone[];
}

export function StudyProgressSection({ milestones }: StudyProgressSectionProps) {
  return (
    <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-zinc-900 tracking-tight">Tiến độ học tập</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Lộ trình rèn luyện theo các cột mốc năng lực IELTS chuẩn hóa</p>
        </div>
      </div>

      <div className="space-y-3.5">
        {milestones.map((ms) => {
          const nextHref = ms.next_test_id 
            ? `/test-practice/reading/${ms.next_test_id}?mode=practice` 
            : `/test-practice`;

          return (
            <div
              key={ms.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                ms.is_active
                  ? "border-blue-200 bg-gradient-to-r from-blue-50/50 via-white to-white shadow-xs"
                  : "border-zinc-200/80 bg-zinc-50/60"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left: Badge and Details */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-xs">
                    {ms.band_target.toFixed(1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-zinc-900 text-sm">{ms.title}</h3>
                      {ms.is_active && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Study Plan đang hoạt động
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-zinc-600 font-medium mt-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-amber-700">
                        <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        Tổng số cúp đã đạt: <strong className="text-zinc-900 font-bold">{ms.total_cups_earned}/{ms.max_cups}</strong>
                      </span>
                      <span className="text-zinc-400">•</span>
                      <span>
                        Số Units đạt 2 cúp trở lên: <strong className="text-zinc-900 font-bold">{ms.completed_units}/{ms.total_units} Units</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Continue button */}
                {ms.is_active && (
                  <Link
                    href={nextHref}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0"
                  >
                    <span>Tiếp tục</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-3.5 w-full bg-zinc-200/80 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    ms.is_active ? "bg-blue-600" : "bg-zinc-400"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, ms.progress_percent))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
