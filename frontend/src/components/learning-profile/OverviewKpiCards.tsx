"use client";

import React from "react";
import { Clock, Trophy, FileText, BookOpen, HelpCircle } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import type { LearningProfileKPIs } from "@/types/learning-profile";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { BlurFadeCard, SpotlightCard, StaggerGrid, type SpotlightTone } from "@/components/motion";

interface OverviewKpiCardsProps {
  kpis: LearningProfileKPIs;
}

export function OverviewKpiCards({ kpis }: OverviewKpiCardsProps) {
  const prefersReduced = useReducedMotion();
  const hoursVal = Number(kpis.total_time_hours || 0);
  const hoursDecimals = Number.isInteger(hoursVal) ? 0 : 1;

  const cards: Array<{
    id: string;
    title: string;
    value: number;
    decimals: number;
    suffix?: string;
    icon: React.ReactNode;
    bgIcon: string;
    tone: SpotlightTone;
    tooltip: string;
  }> = [
    {
      id: "time",
      title: "Tổng thời lượng",
      value: hoursVal,
      decimals: hoursDecimals,
      suffix: " giờ",
      icon: <Clock className="w-5 h-5 text-sky-600" />,
      bgIcon: "bg-sky-50 border-sky-100",
      tone: "sky",
      tooltip: "Tổng thời gian thực tế bạn đã làm bài và luyện đề",
    },
    {
      id: "cups",
      title: "Tổng số cúp đã đạt",
      value: Number(kpis.total_cups || 0),
      decimals: 0,
      icon: <Trophy className="w-5 h-5 text-amber-600 fill-amber-500/20" />,
      bgIcon: "bg-amber-50 border-amber-100",
      tone: "amber",
      tooltip: "Số lần đạt kết quả thi xuất sắc (Band >= 7.0)",
    },
    {
      id: "tests",
      title: "Số bài test đã làm",
      value: Number(kpis.total_tests_taken || 0),
      decimals: 0,
      icon: <FileText className="w-5 h-5 text-[#932120]" />,
      bgIcon: "bg-rose-50 border-rose-100",
      tone: "crimson",
      tooltip: "Tổng lượt bài thi đầy đủ và kỹ năng đã tham gia",
    },
    {
      id: "exercises",
      title: "Số bài đã học",
      value: Number(kpis.total_exercises_studied || 0),
      decimals: 0,
      icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
      bgIcon: "bg-emerald-50 border-emerald-100",
      tone: "emerald",
      tooltip: "Số bài thi đã được hệ thống chấm điểm hoàn tất",
    },
  ];

  return (
    <StaggerGrid autoAnimate={false} className="grid grid-cols-2 lg:grid-cols-1 gap-3.5 h-full">
      {cards.map((c, idx) => (
        <BlurFadeCard key={c.id} index={idx} inView={false}>
          <SpotlightCard
            tone={c.tone}
            className="bg-[var(--ux-surface)] rounded-2xl border border-[var(--ux-line)] p-4 sm:p-4.5 shadow-2xs flex items-center justify-between hover:shadow-sm hover:-translate-y-0.5 h-full overflow-hidden"
          >
            <div className="flex items-center gap-3.5 relative z-10">
              <m.div
                initial={prefersReduced ? false : { scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 20, delay: Math.min(idx * 0.045, 0.2) + 0.1 }}
                className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${c.bgIcon}`}
              >
                {c.icon}
              </m.div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--ux-ink-2)] font-semibold">{c.title}</span>
                  <span title={c.tooltip} className="inline-flex">
                    <HelpCircle className="w-3 h-3 text-[var(--ux-ink-3)]" />
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-black text-[var(--ux-ink)] mt-0.5 tracking-tight tabular-nums">
                  <AnimatedNumber value={c.value} decimals={c.decimals} suffix={c.suffix} />
                </p>
              </div>
            </div>
          </SpotlightCard>
        </BlurFadeCard>
      ))}
    </StaggerGrid>
  );
}
