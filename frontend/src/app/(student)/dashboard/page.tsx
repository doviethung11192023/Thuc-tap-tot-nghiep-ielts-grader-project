"use client";

import React, { useEffect, useState } from 'react';
import { TrendingUp, Clock, Target, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getEssayHistory } from '@/services/essays';
import { getUserProgress } from '@/services/users';
import { EssayHistoryItem, UserProgress } from '@/types';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [recentEssays, setRecentEssays] = useState<EssayHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [progressData, historyData] = await Promise.all([
          getUserProgress(),
          getEssayHistory({ page: 1, limit: 3 })
        ]);
        setProgress(progressData);
        setRecentEssays(historyData.items);
      } catch (error) {
        console.error("Lỗi khi tải dashboard:", error);
        toast.error("Không thể tải thông tin thống kê.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#932120]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
            <p className="text-zinc-500 mt-1">Theo dõi tiến trình học tập của bạn</p>
          </div>
          <Link href="/exam">
            <button className="bg-[#932120] text-white px-5 py-2.5 rounded-lg font-bold shadow-sm hover:bg-[#7a1a19] transition-colors flex items-center gap-2">
              Chấm bài tự do
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Bài đã làm" value={progress?.total_essays.toString() || "0"} icon={<CheckCircle className="text-green-500" />} />
          <StatCard title="Band trung bình" value={progress?.avg_overall_band.toFixed(1) || "0.0"} icon={<TrendingUp className="text-blue-500" />} />
          <StatCard title="Band cao nhất" value={progress?.best_overall_band.toFixed(1) || "0.0"} icon={<Target className="text-[#932120]" />} />
          <StatCard title="Lần cuối" value={progress?.last_submission_at ? new Date(progress.last_submission_at).toLocaleDateString('vi-VN') : "-"} icon={<Clock className="text-amber-500" />} />
        </div>

        {/* Recent Essays */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center">
            <h2 className="font-bold text-lg text-zinc-800">Bài làm gần đây</h2>
            <Link href="/history" className="text-sm font-medium text-[#932120] hover:underline">
              Xem tất cả &rarr;
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {recentEssays.length === 0 ? (
              <div className="px-6 py-10 text-center text-zinc-500">
                Chưa có bài luận nào. <Link href="/exam" className="text-[#932120] hover:underline">Hãy bắt đầu ngay</Link>.
              </div>
            ) : (
              recentEssays.map((item) => (
                <div key={item.essay_id} className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-zinc-50 transition-colors gap-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-sm font-bold text-zinc-900 truncate" title={item.topic_title}>
                      {item.topic_title}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                      <span className="bg-zinc-100 px-2 py-0.5 rounded text-zinc-600 font-medium uppercase">{item.essay_id.split('-')[0]}</span>
                      <span>{new Date(item.submitted_at).toLocaleDateString('vi-VN')}</span>
                      <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' :
                        item.status === 'failed' ? 'bg-red-100 text-red-700' :
                        item.status === 'evaluating' ? 'bg-blue-100 text-blue-700' :
                        'bg-zinc-100 text-zinc-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-lg font-black text-[#932120]">
                        {item.overall_band !== null ? item.overall_band.toFixed(1) : "-"}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-zinc-400">Band</div>
                    </div>
                    <Link href={`/results/${item.essay_id}`}>
                      <button className="px-3 py-1.5 text-sm font-medium border border-zinc-200 rounded-lg hover:border-[#932120] hover:text-[#932120] transition-colors flex items-center gap-1">
                        Chi tiết <ArrowRight className="w-4 h-4 hidden sm:block" />
                      </button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex items-center gap-4">
      <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-zinc-500">{title}</div>
        <div className="text-2xl font-bold text-zinc-900">{value}</div>
      </div>
    </div>
  );
}
