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
import { NextStepCard } from "./NextStepCard";
import { CurrentBandsRow } from "./CurrentBandsRow";
import { useLearnerNextStep } from "@/hooks/useLearnerNextStep";
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

  return <OverviewContent userName={userName} data={data} onOpenGoalModal={onOpenGoalModal} onRefresh={onRefresh} />;
}

function OverviewContent({ userName, data, onOpenGoalModal, onRefresh }: Omit<OverviewTabProps, "loading"> & { data: LearningProfileOverviewData }) {
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
  // Thẻ "Bước tiếp theo" tải lại khi mục tiêu, ngày thi hoặc số bài làm đổi (spec 005)
  const refreshKey = `${goals.goal_set}|${goals.target_band}|${goals.test_date}|${kpis.total_tests_taken}|${kpis.total_cups}`;
  const nextStep = useLearnerNextStep(refreshKey);

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

      {/* 1c. Lộ trình học (spec 005): bước tiếp theo + band hiện tại theo BR-12 */}
      <NextStepCard {...nextStep} onOpenGoalModal={onOpenGoalModal} />
      {data.current_bands && (
        <CurrentBandsRow bands={data.current_bands} exam={data.exam} onOpenGoalModal={onOpenGoalModal} />
      )}

      {/* 2. Lộ Trình Luyện Đề Cá Nhân Hóa */}
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
