"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Bookmark } from "lucide-react";
import { PracticeRadarMini } from "./PracticeRadarMini";
import {
  getCachedPracticeHistory,
} from "@/services/practice-history-cache";
import { getLearningProfileOverview } from "@/services/learning-profile";
import type { SkillScore } from "@/types/learning-profile";

const EMPTY_RADAR: SkillScore[] = [
  { skill: "Writing", score: 0 },
  { skill: "Overview", score: 0 },
  { skill: "Listening", score: 0 },
  { skill: "Reading", score: 0 },
  { skill: "Speaking", score: 0 },
];

export function PracticeHistorySidebarWidget() {
  const cached = getCachedPracticeHistory();
  const [overallScore, setOverallScore] = useState<number>(() => cached?.overall_score ?? 0);
  const [radarData, setRadarData] = useState<SkillScore[]>(() => cached?.radar_data || []);
  const [loading, setLoading] = useState<boolean>(() => !cached);

  useEffect(() => {
    let mounted = true;
    // Chỉ gọi endpoint nhẹ Overview thay vì tải toàn bộ 560 câu trả lời + 50 dòng lịch sử
    getLearningProfileOverview()
      .then((overview) => {
        if (!mounted || !overview) return;
        setOverallScore(Number(Number(overview.dashboard_stats?.avg_band ?? 0).toFixed(1)));
        setRadarData(overview.radar_data?.length ? overview.radar_data : EMPTY_RADAR);
        setLoading(false);
      })
      .catch((e) => {
        console.warn("Lỗi tải radar widget:", e);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

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

        {loading && radarData.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-3">
            <div className="w-24 h-24 rounded-full border-3 border-zinc-100 border-t-blue-600 animate-spin" />
            <span className="text-xs text-zinc-400 font-medium">Đang cập nhật điểm số...</span>
          </div>
        ) : (
          <PracticeRadarMini
            radarData={radarData.length > 0 ? radarData : EMPTY_RADAR}
            overallScore={overallScore > 0 ? overallScore : 0}
          />
        )}
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
