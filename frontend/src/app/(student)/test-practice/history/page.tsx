"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, History, RefreshCw, BarChart2 } from "lucide-react";
import {
  fetchPracticeHistoryData,
  getCachedPracticeHistory,
  PracticeHistorySummaryData,
} from "@/services/practice-history-cache";
import { PracticeHistoryRadarCard } from "@/components/exam/history/PracticeHistoryRadarCard";
import { PracticeQuestionTypeAccuracyCard } from "@/components/exam/history/PracticeQuestionTypeAccuracyCard";
import { PracticeTimelineSection } from "@/components/exam/history/PracticeTimelineSection";

export default function TestPracticeHistoryPage() {
  const [data, setData] = useState<PracticeHistorySummaryData | null>(() => getCachedPracticeHistory());
  const [loading, setLoading] = useState<boolean>(!getCachedPracticeHistory());
  const [isPending, startTransition] = useTransition();

  const loadData = async (force = false) => {
    try {
      if (!data) setLoading(true);
      const res = await fetchPracticeHistoryData(force);
      startTransition(() => {
        setData(res);
      });
    } catch (e) {
      console.error("Lỗi khi tải lịch sử test practice:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50/70 pb-20">
      {/* Top sticky navigation bar */}
      <div className="bg-white border-b border-zinc-200/80 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/test-practice"
              className="p-2 -ml-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors inline-flex items-center gap-1.5 text-sm font-semibold"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-700" />
              <span className="hidden sm:inline">Quay lại</span>
            </Link>
            <div className="h-5 w-px bg-zinc-200" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <History className="w-4 h-4" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">
                Lịch sử Test Practice
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={loading || isPending}
              className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors disabled:opacity-50"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading || isPending ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Body Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Thống kê điểm số (Radar + Question type accuracy) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#932120]" />
              <div>
                <h2 className="text-base font-bold text-zinc-900">Thống kê điểm số</h2>
                <p className="text-xs text-zinc-500">Phân tích năng lực dựa trên các bài làm gần nhất</p>
              </div>
            </div>

            <PracticeHistoryRadarCard
              overallScore={data?.overall_score || 0}
              radarData={data?.radar_data || []}
            />

            <PracticeQuestionTypeAccuracyCard
              questionTypes={data?.question_types || []}
            />
          </div>

          {/* Right Column: Timeline Lịch sử Test Practice */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Chi tiết các lượt luyện đề</h2>
                <p className="text-xs text-zinc-500">
                  Tổng số: {data?.total_attempts || 0} lần làm bài được ghi nhận
                </p>
              </div>
            </div>

            <PracticeTimelineSection
              groups={data?.timeline_groups || {}}
              loading={loading && !data}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
