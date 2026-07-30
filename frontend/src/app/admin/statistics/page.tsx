"use client";

import React, { useEffect, useState } from 'react';
import { AdminPageLayout } from '@/components/layout/AdminPageLayout';
import { Activity, AlertTriangle, Users, FileText, Clock, ArrowUpRight, ArrowDownRight, Bot, Loader2 } from 'lucide-react';
import { getSystemStatistics, getEvaluationLogs } from '@/services/users';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Reusable KPI Card Component
function KpiCard({ title, value, change, isPositive, icon, subtext }: { title: string, value: string, change: string, isPositive: boolean, icon: React.ReactNode, subtext: string }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-zinc-50 border border-zinc-100 rounded-lg">
          {icon}
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isPositive ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-zinc-500 text-sm font-medium">{title}</h3>
        <div className="text-2xl font-black text-zinc-900 mt-1">{value}</div>
        <p className="text-xs text-zinc-400 mt-2 font-medium">{subtext}</p>
      </div>
    </div>
  );
}

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
          getEvaluationLogs({ limit: 10 })
        ]);
        setStats(statsData);
        setLogs(logsData.items || logsData || []);
      } catch (error) {
        console.error("Failed to fetch admin statistics", error);
        toast.error("Failed to load statistics and logs");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <AdminPageLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">AI System Health & Metrics</h1>
            <p className="text-sm text-zinc-500 mt-1">Giám sát hiệu suất, độ ổn định và chi phí của mô hình AI</p>
          </div>
          <div className="flex gap-2">
            <select className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 focus:outline-none focus:border-[#932120]">
              <option>Hôm nay</option>
              <option>7 ngày qua</option>
              <option>Tháng này</option>
            </select>
            <button className="bg-[#932120] text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-[#7a1a19] transition-colors text-sm">
              Xuất Báo Cáo
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard 
            title="Total Users" 
            value={stats?.total_users?.toString() || "0"} 
            change="" 
            isPositive={true}
            icon={<Users className="w-5 h-5 text-blue-600" />} 
            subtext="Total registered users"
          />
          <KpiCard 
            title="Total Essays" 
            value={stats?.total_essays?.toString() || "0"} 
            change="" 
            isPositive={true}
            icon={<FileText className="w-5 h-5 text-green-600" />} 
            subtext="Total graded essays"
          />
          <KpiCard 
            title="Essays Today" 
            value={stats?.essays_today?.toString() || "0"} 
            change="" 
            isPositive={true}
            icon={<Activity className="w-5 h-5 text-purple-600" />} 
            subtext="Essays submitted today"
          />
          <KpiCard 
            title="AI Error Rate" 
            value={`${stats?.ai_error_rate || 0}%`} 
            change="" 
            isPositive={false}
            icon={<AlertTriangle className="w-5 h-5 text-red-600" />} 
            subtext="Evaluation error rate"
          />
          <KpiCard 
            title="Avg Processing Time" 
            value={`${stats?.avg_processing_time || 0}s`} 
            change="" 
            isPositive={true}
            icon={<Clock className="w-5 h-5 text-orange-600" />} 
            subtext="Average evaluation time"
          />
        </div>

        {/* Trend Chart */}
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm mt-6">
          <h3 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-zinc-400" />
            Biểu đồ nộp bài
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.submissions_trend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#932120', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="count" name="Số bài" stroke="#932120" strokeWidth={3} dot={{ r: 4, fill: '#932120', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Evaluation Logs */}
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm mt-6">
          <h3 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5 text-zinc-400" />
            AI Evaluation Logs
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-zinc-500">
              <thead className="text-xs text-zinc-700 uppercase bg-zinc-50">
                <tr>
                  <th scope="col" className="px-6 py-3">#</th>
                  <th scope="col" className="px-6 py-3">Học viên</th>
                  <th scope="col" className="px-6 py-3">Đề thi</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Processing Time</th>
                  <th scope="col" className="px-6 py-3">Created At</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log: any, index: number) => (
                    <tr key={log.id} className="bg-white border-b hover:bg-zinc-50">
                      <td className="px-6 py-4 font-medium text-zinc-900 whitespace-nowrap">{index + 1}</td>
                      <td className="px-6 py-4">{log.essay?.user?.email || 'N/A'}</td>
                      <td className="px-6 py-4">{log.essay?.topic?.title || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                          log.status === 'FAILED' ? 'bg-red-100 text-red-700' : 
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {log.status || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4">{log.processing_time ? `${log.processing_time}s` : '-'}</td>
                      <td className="px-6 py-4">{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">No logs found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminPageLayout>
  );
}
