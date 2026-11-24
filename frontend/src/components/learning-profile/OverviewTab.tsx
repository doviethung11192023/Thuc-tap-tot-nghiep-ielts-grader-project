"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { LearningProfileBanner } from "./LearningProfileBanner";
import { PersonalizedRoadmapSection } from "./PersonalizedRoadmapSection";
import { QuickStatCards } from "./QuickStatCards";
import { RecentSubmissionsList } from "./RecentSubmissionsList";
import { LearningProfileHeatmap } from "./LearningProfileHeatmap";
import { AdaptiveStreakCard } from "./AdaptiveStreakCard";
import { LearnerBadgesShowcase } from "./LearnerBadgesShowcase";
import { ChartSkeleton } from "@/components/ui/skeleton";
import type { LearningProfileOverviewData } from "@/types/learning-profile";

const MonthlyProgressSection = dynamic(
  () => import("./MonthlyProgressSection").then((m) => m.MonthlyProgressSection),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-80" label="Đang tải tiến độ hàng tháng..." /> }
);

const OverviewChartsSection = dynamic(
  () => import("./OverviewChartsSection").then((m) => m.OverviewChartsSection),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-80" label="Đang tải biểu đồ năng lực..." /> }
);

interface OverviewTabProps {
  userName: string;
  data: LearningProfileOverviewData | null;
  loading?: boolean;
  onOpenGoalModal: () => void;
  onRefresh?: () => void;
}

export function OverviewTab({ userName, data, loading, onOpenGoalModal, onRefresh }: OverviewTabProps) {
  if (loading || !data) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-9 h-9 animate-spin mx-auto text-[#932120] mb-3" />
        <p className="text-xs text-zinc-500 font-semibold">Đang tải hồ sơ năng lực học tập thực tế của bạn...</p>
      </div>
    );
  }

  const {
    kpis,
    goals,
    dashboard_stats,
    recent_submissions,
    roadmap,
    study_milestones,
    monthly_progression,
    monthly_scorecard,
    radar_data,
    donut_data,
    heatmap_weeks,
    adaptive_streak,
    badges,
  } = data;

  return (
    <div className="space-y-6 w-full">
      {/* 1. Header Banner, Nhịp độ tuần tự cân bằng & Trình độ IELTS BR-12 */}
      <LearningProfileBanner
        userName={userName}
        goals={goals}
        weeklyPacing={roadmap?.weekly_pacing}
        onOpenGoalModal={onOpenGoalModal}
      />

      {/* 1b. Adaptive Streak */}
      <AdaptiveStreakCard streak={adaptive_streak} onRefresh={onRefresh} />

      {/* 2. Lộ Trình Luyện Đề Cá Nhân Hóa (Ưu tiên hành động học ngay trên đầu trang) */}
      <PersonalizedRoadmapSection roadmap={roadmap} milestones={study_milestones} />

      {/* 3. Theo Dõi Trình Độ Thay Đổi Hàng Tháng */}
      <MonthlyProgressSection progression={monthly_progression} scorecard={monthly_scorecard} />

      {/* 4. Thống kê tiến trình nhanh */}
      <QuickStatCards stats={dashboard_stats} />

      {/* 5. Biểu đồ Radar & Donut */}
      <OverviewChartsSection radarData={radar_data} donutData={donut_data} totalTests={kpis.total_tests_taken} />

      {/* 6. Huy hiệu Thành tích 3 Tầng (Động lực duy trì dài hạn) */}
      <LearnerBadgesShowcase badges={badges} />

      {/* 7. Bài làm gần đây */}
      <RecentSubmissionsList submissions={recent_submissions} />

      {/* 8. Heatmap Tần suất học tập 7 hàng Mon-Sun */}
      <LearningProfileHeatmap heatmapWeeks={heatmap_weeks} />
    </div>
  );
}
