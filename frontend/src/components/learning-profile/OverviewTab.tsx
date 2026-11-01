"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { LearningProfileBanner } from "./LearningProfileBanner";
import { QuickStatCards } from "./QuickStatCards";
import { OverviewChartsSection } from "./OverviewChartsSection";
import { RecentSubmissionsList } from "./RecentSubmissionsList";
import { LearningProfileHeatmap } from "./LearningProfileHeatmap";
import type { LearningProfileOverviewData } from "@/types/learning-profile";

interface OverviewTabProps {
  userName: string;
  data: LearningProfileOverviewData | null;
  loading?: boolean;
  onOpenGoalModal: () => void;
}

export function OverviewTab({ userName, data, loading, onOpenGoalModal }: OverviewTabProps) {
  if (loading || !data) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-9 h-9 animate-spin mx-auto text-[#932120] mb-3" />
        <p className="text-xs text-zinc-500 font-semibold">Đang tải hồ sơ năng lực học tập thực tế của bạn...</p>
      </div>
    );
  }

  const { kpis, goals, dashboard_stats, recent_submissions, radar_data, donut_data, heatmap_weeks } = data;

  return (
    <div className="space-y-6 w-full">
      {/* 1. Header Banner & Trình độ IELTS 3 cột */}
      <LearningProfileBanner
        userName={userName}
        goals={goals}
        onOpenGoalModal={onOpenGoalModal}
      />

      {/* 2. Thống kê tiến trình học tập (4 Thẻ Stat & Quick Actions từ Dashboard) */}
      <QuickStatCards stats={dashboard_stats} />

      {/* 3. Biểu đồ Radar & Donut */}
      <OverviewChartsSection
        radarData={radar_data}
        donutData={donut_data}
        totalTests={kpis.total_tests_taken}
      />

      {/* 4. Bài làm gần đây */}
      <RecentSubmissionsList submissions={recent_submissions} />

      {/* 5. Heatmap Tần suất học tập 7 hàng Mon-Sun */}
      <LearningProfileHeatmap heatmapWeeks={heatmap_weeks} />
    </div>
  );
}
