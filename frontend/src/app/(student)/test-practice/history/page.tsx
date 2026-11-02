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
  const [statusFilter, setStatusFilter] = useState<"all" | "scored" | "in_progress">("all");
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
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
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

      {/* Main Content Layout - Full Width Fluid Container */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Thống kê điểm số (Radar + Question type accuracy) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
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
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Chi tiết các lượt luyện đề</h2>
                <p className="text-xs text-zinc-500">
                  Tổng số: {data?.total_attempts || 0} lần làm bài được ghi nhận
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="inline-flex items-center gap-1 p-1 bg-zinc-100 rounded-2xl border border-zinc-200/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === "all" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("scored")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === "scored" ? "bg-white text-emerald-800 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Đã hoàn thành
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("in_progress")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === "in_progress" ? "bg-white text-amber-800 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Đang làm dở
                </button>
              </div>
            </div>

            <PracticeTimelineSection
              groups={React.useMemo(() => {
                if (!data?.timeline_groups) return {};
                if (statusFilter === "all") return data.timeline_groups;
                const filtered: Record<string, typeof data.timeline_groups[string]> = {};
                for (const [m, items] of Object.entries(data.timeline_groups)) {
                  const mItems = items.filter((it) => it.status === statusFilter);
                  if (mItems.length > 0) filtered[m] = mItems;
                }
                return filtered;
              }, [data?.timeline_groups, statusFilter])}
              loading={loading && !data}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
