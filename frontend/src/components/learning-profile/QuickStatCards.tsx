"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle, TrendingUp, Target, Clock, BookOpen } from "lucide-react";
import type { DashboardStats } from "@/types/learning-profile";

interface QuickStatCardsProps {
  stats?: DashboardStats;
}

export function QuickStatCards({ stats }: QuickStatCardsProps) {
  const cards = [
    {
      title: "Bài đã làm",
      value: stats ? stats.total_submissions.toString() : "0",
      icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
      bg: "bg-emerald-50 border-emerald-100",
    },
    {
      title: "Band trung bình",
      value: stats && stats.avg_band > 0 ? stats.avg_band.toFixed(1) : "0.0",
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
      bg: "bg-blue-50 border-blue-100",
    },
    {
      title: "Band cao nhất",
      value: stats && stats.best_band > 0 ? stats.best_band.toFixed(1) : "0.0",
      icon: <Target className="w-5 h-5 text-[#932120]" />,
      bg: "bg-red-50 border-red-100",
    },
    {
      title: "Lần cuối",
      value: stats?.last_activity_date || "-",
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      bg: "bg-amber-50 border-amber-100",
    },
  ];

  return (
    <div className="space-y-4 w-full">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-black text-zinc-900 tracking-tight">Thống kê tiến trình học tập</h2>
          <p className="text-xs text-zinc-500">Tổng quan kết quả các bài thi thử</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/test-practice"
            className="px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
            <span>Luyện đề thi</span>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.title}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/90 shadow-2xs flex items-center gap-3.5 hover:border-zinc-300 transition-colors"
          >
            <div className={`p-2.5 rounded-xl border ${c.bg} shrink-0`}>
              {c.icon}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-500 truncate">{c.title}</div>
              <div className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight mt-0.5">{c.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
