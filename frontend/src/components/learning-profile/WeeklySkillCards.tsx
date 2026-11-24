"use client";

import React from "react";
import { Headphones, BookOpen, PenTool, Mic, TrendingUp } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { BlurFadeCard, SpotlightCard, StaggerGrid, type SpotlightTone } from "@/components/motion";
import type { WeeklySkillStat } from "@/types/learning-profile";

interface WeeklySkillCardsProps {
  skillAverages: Record<string, WeeklySkillStat>;
}

export function WeeklySkillCards({ skillAverages }: WeeklySkillCardsProps) {
  const prefersReduced = useReducedMotion();
  const SKILL_CONFIG: Record<string, { icon: React.ReactNode; bg: string; tone: SpotlightTone }> = {
    Listening: {
      icon: <Headphones className="w-5 h-5 text-amber-600" />,
      bg: "bg-amber-50 border-amber-100",
      tone: "amber",
    },
    Reading: {
      icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
      bg: "bg-emerald-50 border-emerald-100",
      tone: "emerald",
    },
    Writing: {
      icon: <PenTool className="w-5 h-5 text-blue-600" />,
      bg: "bg-blue-50 border-blue-100",
      tone: "sky",
    },
    Speaking: {
      icon: <Mic className="w-5 h-5 text-[#932120]" />,
      bg: "bg-rose-50 border-rose-100",
      tone: "crimson",
    },
  };

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-base font-black text-zinc-900 tracking-tight">Điểm trung bình hàng tuần</h2>
        <p className="text-xs text-zinc-500 mt-0.5">So sánh sự thay đổi điểm số thực tế so với tuần trước</p>
      </div>

      <StaggerGrid autoAnimate={false} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
        {(["Listening", "Reading", "Writing", "Speaking"] as const).map((sk, idx) => {
          const stats = skillAverages[sk] || { average: null, completed_tests: 0, delta: null };
          const cfg = SKILL_CONFIG[sk];

          return (
            <BlurFadeCard key={sk} index={idx}>
              <SpotlightCard
                tone={cfg.tone}
                className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs flex flex-col justify-between h-full overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">{sk}</span>
                  <m.div
                    initial={prefersReduced ? false : { scale: 0.6 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ type: "spring", stiffness: 360, damping: 20, delay: Math.min(idx * 0.045, 0.2) + 0.1 }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border ${cfg.bg}`}
                  >
                    {cfg.icon}
                  </m.div>
                </div>

                <div className="relative z-10">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-black text-zinc-900 tracking-tight tabular-nums">
                      {stats.average !== null ? stats.average.toFixed(1) : "-.-"}
                    </span>
                    {stats.delta !== null && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-0.5 ${
                          stats.delta >= 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        {stats.delta >= 0 ? `+ ${stats.delta}` : `${stats.delta}`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 font-medium mt-1.5">
                    {stats.completed_tests > 0 ? `${stats.completed_tests} bài test đã hoàn thành` : "Chưa có bài thi"}
                  </p>
                </div>
              </SpotlightCard>
            </BlurFadeCard>
          );
        })}
      </StaggerGrid>
      <p className="text-[11px] text-zinc-400 font-medium pt-0.5">
        * Điểm số được tính toán trên thang điểm IELTS chính thức (Band 0.0 - 9.0).
      </p>
    </div>
  );
}
