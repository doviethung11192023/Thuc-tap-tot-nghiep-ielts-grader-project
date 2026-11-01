"use client";

import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from "recharts";
import type { SkillScore, DonutItem } from "@/types/learning-profile";

interface OverviewChartsSectionProps {
  radarData: SkillScore[];
  donutData: DonutItem[];
  totalTests: number;
}

export function OverviewChartsSection({ radarData, donutData, totalTests }: OverviewChartsSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* Radar Chart */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-zinc-200/90 shadow-2xs">
        <div className="mb-4">
          <h3 className="font-black text-zinc-900 text-sm tracking-tight">Điểm trung bình theo kỹ năng</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Dựa trên kết quả bài thi Test Practice thực tế</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#e4e4e7" />
              <PolarAngleAxis dataKey="skill" tick={{ fill: "#52525b", fontSize: 12, fontWeight: 700 }} />
              <PolarRadiusAxis angle={30} domain={[0, 9]} tick={false} axisLine={false} />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="#3b82f6"
                fillOpacity={0.2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut Chart */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-zinc-200/90 shadow-2xs">
        <div className="mb-4">
          <h3 className="font-black text-zinc-900 text-sm tracking-tight">Tổng số skills tests đã hoàn thành</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Phân bổ lượt làm bài luyện thi theo 4 kỹ năng</p>
        </div>
        <div className="flex items-center h-64">
          <div className="w-1/2 h-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] text-zinc-500 font-semibold">Tổng bài test</span>
              <span className="text-2xl font-black text-zinc-900 tracking-tight">{totalTests}</span>
            </div>
          </div>
          <div className="w-1/2 pl-4 flex flex-col gap-2.5">
            {donutData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-zinc-600">{item.name}</span>
                </div>
                <span className="font-bold text-zinc-900">{item.value} tests</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
