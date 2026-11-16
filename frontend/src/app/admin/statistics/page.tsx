"use client";

import React, { useEffect, useState } from "react";
import { Activity, AlertTriangle, Users, FileText, Clock, Bot, Loader2 } from "lucide-react";
import { getSystemStatistics, getEvaluationLogs } from "@/services/users";
import toast from "react-hot-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { KpiCard } from "@/components/admin/KpiCard";

export default function AdminStatisticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [statsData, logsData] = await Promise.all([
          getSystemStatistics(),
          getEvaluationLogs({ limit: 10 }),
        ]);
        setStats(statsData);
        setLogs(logsData.items || logsData || []);
      } catch (error) {
        toast.error("Failed to load statistics and logs");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

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
      </div>

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

      <div className="bg-white p-5 sm:p-7 rounded-2xl border border-zinc-200 shadow-xs w-full">
        <h3 className="text-base sm:text-lg font-bold text-zinc-900 mb-5 flex items-center gap-2.5">
          <Bot className="w-5 h-5 text-zinc-700" /> AI Evaluation Logs (Lịch sử chấm thi AI gần đây)
        </h3>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs sm:text-sm text-left text-zinc-600">
            <thead className="text-xs text-zinc-600 uppercase bg-zinc-50 border-b border-zinc-200 font-bold">
              <tr>
                <th scope="col" className="px-6 py-4">#</th>
                <th scope="col" className="px-6 py-4">Học viên</th>
                <th scope="col" className="px-6 py-4">Đề thi</th>
                <th scope="col" className="px-6 py-4">Status</th>
                <th scope="col" className="px-6 py-4">Processing Time</th>
                <th scope="col" className="px-6 py-4">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.length > 0 ? (
                logs.map((log: any, index: number) => (
                  <tr key={log.id} className="bg-white hover:bg-zinc-50/70 transition-colors">
                    <td className="px-6 py-4 font-bold text-zinc-900 whitespace-nowrap">{index + 1}</td>
                    <td className="px-6 py-4 font-medium">{log.essay?.user?.email || "N/A"}</td>
                    <td className="px-6 py-4 font-medium">
                      {log.essay?.topic?.title || "N/A"}
                      {/* Writing: mỗi task một lượt chấm; Speaking không có task_no */}
                      {log.task_no ? <span className="ml-1.5 text-xs font-bold text-zinc-500">· Task {log.task_no}</span> : null}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${log.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : log.status === "FAILED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {log.status || "UNKNOWN"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">{log.latency_ms ? `${(log.latency_ms / 1000).toFixed(1)}s` : "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.created_at ? new Date(log.created_at).toLocaleString("vi-VN") : "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-400">Chưa có nhật ký chấm thi nào gần đây</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
