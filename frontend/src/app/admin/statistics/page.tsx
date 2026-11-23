"use client";

import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Users, FileText, Clock, Loader2, RotateCcw } from "lucide-react";
import { getSystemStatistics } from "@/services/users";
import toast from "react-hot-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { KpiCard } from "@/components/admin/statistics/KpiCard";
import { AlertsBadge } from "@/components/admin/ai-services/monitoring/AlertsBadge";
import { ExpertGapCard } from "@/components/admin/ai-services/monitoring/ExpertGapCard";

interface SystemStats {
  total_users?: number;
  total_essays?: number;
  essays_today?: number;
  ai_error_rate?: number;
  failed_runs?: number;
  finished_runs?: number;
  avg_processing_time?: number;
  submissions_trend?: { date: string; count: number }[];
}

export default function AdminStatisticsPage() {
  const { data: stats, isLoading, isError, refetch } = useQuery<SystemStats>({
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
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 w-full">
        <KpiCard title="Total Users" value={stats?.total_users?.toString() || "0"} icon={<Users className="w-5 h-5 text-blue-600" />} subtext="Total registered users" />
        <KpiCard title="Writing Submissions" value={stats?.total_essays?.toString() || "0"} icon={<FileText className="w-5 h-5 text-emerald-600" />} subtext="Tổng lượt làm Writing đã nộp (toàn thời gian)" />
        <KpiCard title="Writing Today" value={stats?.essays_today?.toString() || "0"} icon={<Activity className="w-5 h-5 text-[#932120]" />} subtext="Lượt Writing nộp từ 0h hôm nay (giờ VN)" />
        <KpiCard title="AI Error Rate" value={`${stats?.ai_error_rate || 0}%`} isPositive={false} icon={<AlertTriangle className="w-5 h-5 text-red-600" />} subtext={`${stats?.failed_runs ?? 0}/${stats?.finished_runs ?? 0} lượt chấm lỗi (Writing + Speaking, tính cả lượt đã chạy lại)`} />
        <KpiCard title="Avg Processing Time" value={`${stats?.avg_processing_time || 0}s`} icon={<Clock className="w-5 h-5 text-amber-600" />} subtext="Trung bình mỗi lượt chấm thành công (1 task Writing hoặc 1 bài Speaking)" />
      </div>

      <div className="bg-white p-5 sm:p-7 rounded-2xl border border-zinc-200 shadow-xs w-full">
        <h3 className="text-base sm:text-lg font-bold text-zinc-900 mb-5 flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-[#932120]" /> Lượt nộp bài 7 ngày qua (cả 4 kỹ năng, giờ VN)
        </h3>
        <div className="h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.submissions_trend || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e4e4e7", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} itemStyle={{ color: "#932120", fontWeight: "bold" }} />
              <Line type="monotone" dataKey="count" name="Số bài" stroke="#932120" strokeWidth={3} dot={{ r: 4, fill: "#932120", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ExpertGapCard />
    </div>
  );
}
