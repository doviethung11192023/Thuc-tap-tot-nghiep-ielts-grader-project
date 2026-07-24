import React from 'react';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { TrendingUp, Clock, Target, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <StudentPageLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
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
          <StatCard title="Bài đã làm" value="12" icon={<CheckCircle className="text-green-500" />} />
          <StatCard title="Band trung bình" value="6.5" icon={<TrendingUp className="text-blue-500" />} />
          <StatCard title="Mục tiêu" value="7.0" icon={<Target className="text-[#932120]" />} />
          <StatCard title="Thời gian/bài" value="38p" icon={<Clock className="text-amber-500" />} />
        </div>

        {/* Recent Essays */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center">
            <h2 className="font-bold text-lg text-zinc-800">Bài làm gần đây</h2>
            <Link href="/topics" className="text-sm font-medium text-[#932120] hover:underline">
              Làm bài mới &rarr;
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-sm font-bold text-zinc-900 truncate">
                    The widespread use of the internet has a mostly negative effect on social interaction.
                  </h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                    <span className="bg-zinc-100 px-2 py-0.5 rounded text-zinc-600 font-medium">Task 2</span>
                    <span>Hôm qua</span>
                    <span>284 words</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-black text-[#932120]">6.5</div>
                    <div className="text-[10px] uppercase font-bold text-zinc-400">Band</div>
                  </div>
                  <Link href={`/results/test-id-${i}`}>
                    <button className="px-3 py-1.5 text-sm font-medium border border-zinc-200 rounded-lg hover:border-[#932120] hover:text-[#932120] transition-colors">
                      Xem chi tiết
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StudentPageLayout>
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
