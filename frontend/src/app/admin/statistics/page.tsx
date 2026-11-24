"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Users, FileText, Clock, Loader2, RotateCcw, SearchCheck } from "lucide-react";
import { getSystemStatistics } from "@/services/users";
import { toast } from "sonner";
import { KpiCard } from "@/components/admin/statistics/KpiCard";
import { AdminExpertKpiTable, type ExpertKpiRow } from "@/components/admin/AdminExpertKpiTable";
import { AlertsBadge } from "@/components/admin/ai-services/monitoring/AlertsBadge";
import { ExpertGapCard } from "@/components/admin/ai-services/monitoring/ExpertGapCard";
import { ChartSkeleton } from "@/components/ui/skeleton";
import { BlurFadeCard, StaggerGrid } from "@/components/motion";

// Nhật ký chấm AI và nút chấm lại nằm ở trang Service AI → Runs (spec 008), không lặp lại ở đây
interface SystemStatisticsData {
  total_users?: number;
  total_essays?: number;
  essays_today?: number;
  ai_error_rate?: number;
  failed_runs?: number;
  finished_runs?: number;
  avg_processing_time?: number;
  submissions_trend?: Array<{ date: string; count: number }>;
  monthly_cohort_progression?: Array<{
    month: string;
    label: string;
    avg_band: number;
    active_learners: number;
    total_attempts: number;
  }>;
  expert_kpis?: ExpertKpiRow[];
}

const AdminSubmissionsTrendChart = dynamic(
  () => import("@/components/admin/AdminSubmissionsTrendChart").then((m) => m.AdminSubmissionsTrendChart),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-96" label="Đang tải biểu đồ xu hướng nộp bài..." /> }
);

const AdminMonthlyCohortChart = dynamic(
  () => import("@/components/admin/AdminMonthlyCohortChart").then((m) => m.AdminMonthlyCohortChart),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-80" label="Đang tải biểu đồ cohort theo tháng..." /> }
);

export default function AdminStatisticsPage() {
  const { data: stats, isLoading, isError, refetch } = useQuery<SystemStatisticsData>({
    queryKey: ["admin-system-statistics"],
    queryFn: getSystemStatistics,
  });

  useEffect(() => {
    if (isError) toast.error("Không thể tải số liệu hệ thống");
  }, [isError]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">AI System Health & Metrics</h1>
          <p className="text-sm sm:text-base text-zinc-500 mt-1">Giám sát hiệu suất, độ ổn định và chi phí vận hành mô hình AI IELTS Grader</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <Link
            href="/admin/users"
            className="min-h-[44px] bg-[#932120] hover:bg-[#7a1a19] text-white rounded-xl px-4 py-2 text-xs sm:text-sm font-bold shadow-xs inline-flex items-center gap-2"
          >
            <SearchCheck className="w-4 h-4" /> Minh chứng Học viên
          </Link>
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-[44px] bg-white border border-zinc-200 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-700 hover:bg-zinc-50 shadow-xs inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Làm mới
          </button>
        </div>
      </div>

      <AlertsBadge />

      <StaggerGrid autoAnimate={false} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 w-full">
        <KpiCard index={0} tone="crimson" title="Total Users" value={stats?.total_users?.toString() || "0"} icon={<Users className="w-5 h-5 text-[#932120]" />} subtext="Total registered users" />
        <KpiCard index={1} tone="emerald" title="Writing Submissions" value={stats?.total_essays?.toString() || "0"} icon={<FileText className="w-5 h-5 text-emerald-600" />} subtext="Tổng lượt làm Writing đã nộp (toàn thời gian)" />
        <KpiCard index={2} tone="crimson" title="Writing Today" value={stats?.essays_today?.toString() || "0"} icon={<Activity className="w-5 h-5 text-[#932120]" />} subtext="Lượt Writing nộp từ 0h hôm nay (giờ VN)" />
        <KpiCard index={3} tone="amber" title="AI Error Rate" value={`${stats?.ai_error_rate || 0}%`} isPositive={false} icon={<AlertTriangle className="w-5 h-5 text-red-600" />} subtext={`${stats?.failed_runs ?? 0}/${stats?.finished_runs ?? 0} lượt chấm lỗi (Writing + Speaking, tính cả lượt đã chạy lại)`} />
        <KpiCard index={4} tone="sky" title="Avg Processing Time" value={`${stats?.avg_processing_time || 0}s`} icon={<Clock className="w-5 h-5 text-amber-600" />} subtext="Trung bình mỗi lượt chấm thành công (1 task Writing hoặc 1 bài Speaking)" />
      </StaggerGrid>

      <BlurFadeCard>
        <AdminSubmissionsTrendChart data={stats?.submissions_trend || []} />
      </BlurFadeCard>

      <BlurFadeCard>
        <AdminMonthlyCohortChart data={stats?.monthly_cohort_progression || []} />
      </BlurFadeCard>

      <BlurFadeCard>
        <AdminExpertKpiTable items={stats?.expert_kpis || []} interactive onPenaltyWaived={() => void refetch()} />
      </BlurFadeCard>

      <ExpertGapCard />
    </div>
  );
}
