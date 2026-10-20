"use client";

import React from 'react';
import { Calendar, Clock, Trophy, PenTool, BookOpen } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { mockRadarData, mockDonutData, mockActivityData } from '@/mocks/learning-profile';

interface OverviewTabProps {
  userName: string;
}

export function OverviewTab({ userName }: OverviewTabProps) {
  // Activity Heatmap generation (simplified for mockup)
  const renderHeatmap = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // 12 columns for weeks
    const weeks = Array.from({ length: 12 }, (_, i) => i);
    
    return (
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[700px]">
          <div className="flex mb-2 text-xs text-zinc-500">
            <div className="w-8"></div>
            {/* Months labels mock */}
            <div className="flex-1 flex justify-between px-2">
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col gap-2 text-xs text-zinc-500 font-medium justify-between py-1">
              {days.map(d => <span key={d} className="h-4 flex items-center">{d}</span>)}
            </div>
            <div className="flex gap-2 flex-1">
              {weeks.map(week => (
                <div key={week} className="flex flex-col gap-2">
                  {days.map((d, i) => {
                    const activity = Math.floor(Math.random() * 100);
                    let bgColor = 'bg-zinc-100';
                    if (activity > 60) bgColor = 'bg-blue-600';
                    else if (activity > 15) bgColor = 'bg-blue-300';
                    else if (activity > 0) bgColor = 'bg-blue-100';
                    
                    return (
                      <div 
                        key={`${week}-${i}`} 
                        className={`w-4 h-4 rounded-sm ${bgColor} cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-zinc-400 transition-all`}
                        title={`${activity} phút`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 text-xs text-zinc-500 font-medium justify-between py-1 ml-4">
              {days.map((d, i) => <span key={`total-${i}`} className="h-4 flex items-center bg-blue-50 text-blue-700 px-2 rounded">{Math.floor(Math.random() * 100)}</span>)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#932120] to-[#b93231] rounded-xl p-6 text-white shadow-md">
        <h2 className="text-xl font-bold mb-2">Hi, {userName} 👋</h2>
        <p className="text-white/90 mb-6">Hãy tiếp tục học mỗi ngày - nỗ lực của bạn sẽ được đền đáp!</p>
        
        <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm max-w-2xl border border-white/20">
          <div className="flex justify-between items-center mb-2 text-sm font-medium">
            <span>Đầu vào (4.5)</span>
            <span>Dự đoán (5.5)</span>
            <span>Mục tiêu (6.5)</span>
          </div>
          <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden">
            <div className="bg-white h-2.5 rounded-full relative" style={{ width: '45%' }}>
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-sm rounded-full animate-pulse"></div>
            </div>
          </div>
          <button className="mt-4 text-sm font-semibold bg-white text-[#932120] px-4 py-2 rounded-md hover:bg-zinc-100 transition-colors shadow-sm">
            + Nhập trình độ đầu vào và mục tiêu của bạn
          </button>
        </div>
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="w-10 h-10 bg-zinc-100 text-zinc-600 rounded-full flex items-center justify-center mb-2">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-900">1 <span className="text-sm font-normal text-zinc-500">giờ</span></p>
            <p className="text-xs text-zinc-500 font-medium mt-1">Tổng thời lượng</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mb-2">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-900">0</p>
            <p className="text-xs text-zinc-500 font-medium mt-1">Tổng số cúp đã đạt</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-900">2</p>
            <p className="text-xs text-zinc-500 font-medium mt-1">Số bài test đã làm</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-2">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-900">0</p>
            <p className="text-xs text-zinc-500 font-medium mt-1">Số bài đã học</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-zinc-900">Điểm trung bình theo kỹ năng</h3>
            <p className="text-sm text-zinc-500">trong Test Practice</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={mockRadarData}>
                <PolarGrid stroke="#e4e4e7" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: '#71717a', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 9]} tick={false} axisLine={false} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-zinc-900">Tổng số skills tests đã hoàn thành</h3>
            <p className="text-sm text-zinc-500">trong Test Practice</p>
          </div>
          <div className="flex items-center h-64">
            <div className="w-1/2 h-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {mockDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-zinc-500">Số bài test đã làm</span>
                <span className="text-3xl font-bold text-zinc-900">2</span>
              </div>
            </div>
            <div className="w-1/2 pl-4 flex flex-col gap-3">
              {mockDonutData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-zinc-600">{item.name}</span>
                  </div>
                  <span className="font-semibold text-zinc-900">{item.value} tests</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Section */}
      <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-semibold text-zinc-900">Tần suất học tập</h3>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-zinc-100"></div>Không có hoạt động</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-blue-100"></div>&lt;15 phút</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-blue-300"></div>15-60 phút</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-blue-600"></div>&gt;60 phút</div>
          </div>
        </div>
        {renderHeatmap()}
      </div>
    </div>
  );
}
