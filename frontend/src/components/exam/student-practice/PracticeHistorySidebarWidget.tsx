"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Bookmark } from "lucide-react";
import { PracticeRadarMini } from "./PracticeRadarMini";
import {
  fetchPracticeHistoryData,
  getCachedPracticeHistory,
  type PracticeHistorySummaryData,
} from "@/services/practice-history-cache";
import type { SkillScore } from "@/types/learning-profile";

const FALLBACK_RADAR: SkillScore[] = [
  { skill: "Writing", score: 5.0 },
  { skill: "Overview", score: 4.5 },
  { skill: "Listening", score: 5.5 },
  { skill: "Reading", score: 5.5 },
  { skill: "Speaking", score: 5.0 },
];

export function PracticeHistorySidebarWidget() {
  const [data, setData] = useState<PracticeHistorySummaryData | null>(() => getCachedPracticeHistory());

  useEffect(() => {
    let mounted = true;
    fetchPracticeHistoryData()
      .then((res) => {
        if (mounted && res) {
          setData(res);
        }
      })
      .catch((e) => {
        console.warn("Lỗi tải radar widget:", e);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const overallScore = data?.overall_score ?? 4.5;
  const radarData = data?.radar_data && data.radar_data.length > 0 ? data.radar_data : FALLBACK_RADAR;

  return (
    <aside className="w-full lg:w-80 xl:w-84 shrink-0 space-y-4">
      {/* 1. Lịch sử luyện đề Widget */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 shadow-2xs hover:shadow-xs transition-all space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
          <h3 className="font-black text-zinc-900 text-sm tracking-tight flex items-center gap-1.5">
            Lịch sử luyện đề
          </h3>
          <Link
            href="/test-practice/history"
            className="text-xs font-bold text-[#2563eb] hover:text-blue-700 flex items-center gap-0.5 group transition-colors"
          >
            <span>Xem chi tiết</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <PracticeRadarMini
          radarData={radarData}
          overallScore={overallScore}
        />
      </div>

      {/* 2. Bộ sưu tập của tôi Widget */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 shadow-2xs hover:shadow-xs transition-all space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
          <h3 className="font-black text-zinc-900 text-sm tracking-tight flex items-center gap-1.5">
            <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            <span>Bộ sưu tập của tôi</span>
          </h3>
        </div>
        <div className="py-4 px-2 text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
            <Bookmark className="w-5 h-5" />
          </div>
          <p className="text-xs text-zinc-500 font-medium leading-relaxed">
            Bạn chưa có bộ sưu tập đề yêu thích.
          </p>
          <p className="text-[11px] text-zinc-400">
            Nhấn biểu tượng lưu trên các bộ đề Cambridge để ghim vào đây.
          </p>
        </div>
      </div>
    </aside>
  );
}
