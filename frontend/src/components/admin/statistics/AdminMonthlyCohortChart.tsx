"use client";

import React from "react";
import { TrendingUp } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface CohortPoint {
  month: string;
  label: string;
  avg_band: number;
  active_learners: number;
  total_attempts: number;
}

export function AdminMonthlyCohortChart({ data = [] }: { data?: CohortPoint[] }) {
  return (
    <div className="bg-white p-5 sm:p-7 rounded-2xl border border-zinc-200 shadow-xs w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <h3 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2.5">
          <TrendingUp className="w-5 h-5 text-blue-600" /> Tiến độ Band Học Viên Toàn Hệ Thống Theo Tháng
        </h3>
        <span className="text-xs text-zinc-500 font-medium">6 tháng gần nhất (Band trung bình vs. Số lượt bài chấm)</span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
            <XAxis dataKey="label" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis yAxisId="band" domain={[0, 9]} stroke="#2563eb" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis yAxisId="count" orientation="right" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e4e4e7" }} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar yAxisId="count" dataKey="total_attempts" name="Lượt bài chấm" fill="#e4e4e7" radius={[6, 6, 0, 0]} barSize={28} />
            <Line yAxisId="band" type="monotone" dataKey="avg_band" name="Band TB hệ thống" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: "#2563eb" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
