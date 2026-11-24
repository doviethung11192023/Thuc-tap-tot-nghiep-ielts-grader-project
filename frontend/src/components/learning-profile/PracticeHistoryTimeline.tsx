"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { BlurFadeCard, SpotlightCard, ScrollTimelineTrack } from "@/components/motion";
import type { PracticeHistoryItem } from "@/types/learning-profile";

interface PracticeHistoryTimelineProps {
  history: PracticeHistoryItem[];
}

export function PracticeHistoryTimeline({ history }: PracticeHistoryTimelineProps) {
  return (
    <BlurFadeCard>
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-zinc-900 text-sm tracking-tight">Lịch sử Test Practice</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Dựa trên các bài thi thực tế gần nhất của bạn</p>
          </div>
          <Link
            href="/test-practice/history"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <ScrollTimelineTrack trackLeftClass="left-2.5" className="space-y-4">
          {history.map((item, idx) => {
            const formattedDate = item.submittedAt
              ? new Date(item.submittedAt).toLocaleDateString("vi-VN", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "Gần đây";

            const skillLower = (item.skill || "").toLowerCase();
            const isOpen = item.status === "in_progress";
            const resumeMode =
              item.mode === "mock" || item.mode === "exam" || item.type_badge === "Thi thử cả đề"
                ? "exam"
                : "practice";
            const isTestPractice =
              skillLower === "reading" || skillLower === "listening" || skillLower === "speaking" || !!item.test_id;

            const resultHref =
              isOpen && item.test_id
                ? `/test-practice/${skillLower}/${item.test_id}?mode=${resumeMode}`
                : isTestPractice && item.test_id
                ? `/test-practice/${skillLower}/${item.test_id}/summary?attemptId=${item.id}&returnUrl=${encodeURIComponent("/learning-profile?tab=test-practice")}`
                : item.id
                ? `/results/${item.id}`
                : "/test-practice/history";

            const statusBadge =
              item.band > 0
                ? `Band ${item.band.toFixed(1)}`
                : item.status === "in_progress"
                ? "Đang làm"
                : item.status === "grading"
                ? "Đang chấm"
                : item.status === "grading_failed"
                ? "Lỗi chấm"
                : item.status === "waiting_expert"
                ? "Chờ C.Gia"
                : "Band 0.0";

            const badgeColor =
              item.status === "grading_failed"
                ? "bg-red-100 text-red-700"
                : item.status === "in_progress" || item.status === "grading" || item.status === "waiting_expert"
                ? "bg-amber-100 text-amber-800"
                : item.band >= 6.0
                ? "bg-emerald-100 text-emerald-800"
                : item.band >= 4.0
                ? "bg-amber-100 text-amber-800"
                : "bg-rose-100 text-rose-800";

            return (
              <BlurFadeCard key={item.id} index={idx} className="relative group">
                <div className="absolute -left-[20px] top-3.5 w-3 h-3 rounded-full bg-[#932120] ring-4 ring-white group-hover:scale-125 transition-transform z-10" />

                <SpotlightCard
                  tone="crimson"
                  className="bg-zinc-50/70 hover:bg-white border border-zinc-200/80 p-4 rounded-2xl hover:shadow-xs overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-200/80 text-zinc-700">
                          {item.type_badge}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${badgeColor}`}>
                          {statusBadge}
                        </span>
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                          {item.skill}
                        </span>
                      </div>

                      <h4 className="font-bold text-zinc-900 text-sm tracking-tight group-hover:text-[#932120] transition-colors">
                        {item.testName}
                      </h4>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>
                          {isOpen ? "Bắt đầu lúc:" : "Nộp bài lúc:"} {formattedDate}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={resultHref}
                      className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors active:scale-[0.98] shrink-0"
                    >
                      <span>Xem chi tiết</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </SpotlightCard>
              </BlurFadeCard>
            );
          })}
        </ScrollTimelineTrack>
      </div>
    </BlurFadeCard>
  );
}
