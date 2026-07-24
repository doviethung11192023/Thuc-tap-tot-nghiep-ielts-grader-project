import React from 'react';
import { AdminPageLayout } from '@/components/layout/AdminPageLayout';
import { Activity, AlertTriangle, ShieldAlert, DollarSign, ArrowUpRight, ArrowDownRight, Bot } from 'lucide-react';

// Reusable KPI Card Component
function KpiCard({ title, value, change, isPositive, icon, subtext }: { title: string, value: string, change: string, isPositive: boolean, icon: React.ReactNode, subtext: string }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-zinc-50 border border-zinc-100 rounded-lg">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isPositive ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
          {change}
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard 
            title="AI Success Rate" 
            value="98.2%" 
            change="-0.5%" 
            isPositive={true}
            icon={<Activity className="w-5 h-5 text-green-600" />} 
            subtext="Tỷ lệ chấm bài không gặp lỗi/timeout"
          />
          <KpiCard 
            title="Score Overridden Rate" 
            value="4.8%" 
            change="+1.2%" 
            isPositive={false}
            icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} 
            subtext="Tỷ lệ điểm ảo giác bị Guardrail L3 ghi đè"
          />
          <KpiCard 
            title="Moderation Rejects" 
            value="142" 
            change="+12" 
            isPositive={false}
            icon={<ShieldAlert className="w-5 h-5 text-[#932120]" />} 
            subtext="Bài bị chặn (Spam, Prompt Injection)"
          />
          <KpiCard 
            title="Token API Cost" 
            value="$18.50" 
            change="+$2.10" 
            isPositive={false}
            icon={<DollarSign className="w-5 h-5 text-blue-600" />} 
            subtext="Chi phí ước tính hôm nay (GPT-4 / Gemini)"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Area Chart: Processing Volume & Errors */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
            <h3 className="text-base font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <Bot className="w-5 h-5 text-zinc-400" />
              Lưu lượng xử lý & Tỷ lệ lỗi (24h qua)
            </h3>
            <div className="h-64 flex items-end justify-between gap-2 border-b border-zinc-100 pb-2">
              {/* Mock Area Chart using bars */}
              {[40, 65, 80, 120, 150, 130, 90, 70, 45, 55, 85, 110].map((h, i) => (
                <div key={i} className="relative w-full group h-full flex items-end">
                  {/* Total Volume */}
                  <div 
                    className="w-full bg-zinc-100 rounded-t-sm transition-all group-hover:bg-zinc-200 absolute bottom-0" 
                    style={{ height: `${h}%` }}
                  ></div>
                  {/* Error / Override Volume (red layer) */}
                  <div 
                    className="w-full bg-[#932120]/20 rounded-t-sm transition-all group-hover:bg-[#932120]/40 absolute bottom-0" 
                    style={{ height: `${h * 0.15}%` }}
                  ></div>
                  
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 transition-opacity">
                    Requests: {h * 10} <br/>
                    Issues: {Math.round(h * 1.5)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-400 font-medium">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:59</span>
            </div>
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                <div className="w-3 h-3 bg-zinc-200 rounded-sm"></div> Tổng Requests
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                <div className="w-3 h-3 bg-[#932120]/40 rounded-sm"></div> Lỗi (Overridden/Failed)
              </div>
            </div>
          </div>

          {/* Pie Chart: Error Distribution */}
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
            <h3 className="text-base font-bold text-zinc-900 mb-6">Phân bổ Lỗi AI</h3>
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              {/* CSS Conic Gradient Pie Chart */}
              <div className="w-40 h-40 rounded-full shadow-inner relative" 
                   style={{ background: 'conic-gradient(#932120 0% 45%, #f59e0b 45% 75%, #3b82f6 75% 90%, #d4d4d8 90% 100%)' }}>
                <div className="absolute inset-0 m-auto w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                  <span className="text-xs text-zinc-500 font-bold">Total Issues</span>
                  <span className="text-xl font-black text-zinc-900">324</span>
                </div>
              </div>

              {/* Legend */}
              <div className="w-full space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#932120] rounded-sm"></div>
                    <span className="text-zinc-600 font-medium">Score Overridden</span>
                  </div>
                  <span className="font-bold text-zinc-900">45%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
                    <span className="text-zinc-600 font-medium">Timeout / Retry</span>
                  </div>
                  <span className="font-bold text-zinc-900">30%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                    <span className="text-zinc-600 font-medium">JSON Parse Error</span>
                  </div>
                  <span className="font-bold text-zinc-900">15%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-zinc-300 rounded-sm"></div>
                    <span className="text-zinc-600 font-medium">Other</span>
                  </div>
                  <span className="font-bold text-zinc-900">10%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminPageLayout>
  );
}
