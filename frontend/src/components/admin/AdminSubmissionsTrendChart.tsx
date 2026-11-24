"use client";

import React from "react";
import { Activity } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendPoint {
  date: string;
  count: number;
}

export function AdminSubmissionsTrendChart({ data = [] }: { data?: TrendPoint[] }) {
  return (
    <div className="bg-[var(--ux-surface)] p-5 sm:p-7 rounded-2xl border border-[var(--ux-line)] shadow-xs w-full">
      <h3 className="text-base sm:text-lg font-bold text-[var(--ux-ink)] mb-5 flex items-center gap-2.5">
        <Activity className="w-5 h-5 text-[#932120]" /> Biểu đồ xu hướng nộp bài
      </h3>
      <div className="h-72 sm:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
            <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e4e4e7",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              itemStyle={{ color: "#932120", fontWeight: "bold" }}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="Số bài"
              stroke="#932120"
              strokeWidth={3}
              dot={{ r: 4, fill: "#932120", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
