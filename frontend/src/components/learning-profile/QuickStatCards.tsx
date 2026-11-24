"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle, TrendingUp, Target, Clock, BookOpen } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { BlurFadeCard, SpotlightCard, StaggerGrid, type SpotlightTone } from "@/components/motion";
import type { DashboardStats } from "@/types/learning-profile";

interface QuickStatCardsProps {
  stats?: DashboardStats;
}

export function QuickStatCards({ stats }: QuickStatCardsProps) {
  const prefersReduced = useReducedMotion();
  const cards: Array<{
    title: string;
    value: string;
    icon: React.ReactNode;
    bg: string;
    tone: SpotlightTone;
  }> = [
    {
      title: "Bài đã làm",
      value: stats ? stats.total_submissions.toString() : "0",
      icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
      bg: "bg-emerald-50 border-emerald-100",
      tone: "emerald",
    },
    {
      title: "Band trung bình",
      value: stats && stats.avg_band > 0 ? stats.avg_band.toFixed(1) : "0.0",
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
      bg: "bg-blue-50 border-blue-100",
      tone: "sky",
    },
    {
      title: "Band cao nhất",
      value: stats && stats.best_band > 0 ? stats.best_band.toFixed(1) : "0.0",
      icon: <Target className="w-5 h-5 text-[#932120]" />,
      bg: "bg-red-50 border-red-100",
      tone: "crimson",
    },
    {
      title: "Lần cuối",
      value: stats?.last_activity_date || "-",
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      bg: "bg-amber-50 border-amber-100",
      tone: "amber",
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
            className="px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer active:scale-[0.98]"
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
            <span>Luyện đề thi</span>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards with shared Spotlight & Stagger */}
      <StaggerGrid autoAnimate={false} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, idx) => (
          <BlurFadeCard key={c.title} index={idx} inView={false}>
            <SpotlightCard
              tone={c.tone}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/90 shadow-2xs flex items-center gap-3.5 hover:border-zinc-300 h-full overflow-hidden"
            >
              <m.div
                initial={prefersReduced ? false : { scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 20, delay: Math.min(idx * 0.045, 0.2) + 0.12 }}
                className={`p-2.5 rounded-xl border ${c.bg} shrink-0 relative z-10`}
              >
                {c.icon}
              </m.div>
              <div className="min-w-0 relative z-10">
                <div className="text-xs font-semibold text-zinc-500 truncate">{c.title}</div>
                <div className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight mt-0.5 tabular-nums">{c.value}</div>
              </div>
            </SpotlightCard>
          </BlurFadeCard>
        ))}
      </StaggerGrid>
    </div>
  );
}
