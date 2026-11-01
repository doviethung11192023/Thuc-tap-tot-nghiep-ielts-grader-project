"use client";

import React from "react";
import { Clock, Trophy, FileText, BookOpen, HelpCircle } from "lucide-react";
import type { LearningProfileKPIs } from "@/types/learning-profile";

interface OverviewKpiCardsProps {
  kpis: LearningProfileKPIs;
}

export function OverviewKpiCards({ kpis }: OverviewKpiCardsProps) {
  const cards = [
    {
      id: "time",
      title: "Tổng thời lượng",
      value: `${kpis.total_time_hours} giờ`,
      icon: <Clock className="w-5 h-5 text-blue-600" />,
      bgIcon: "bg-blue-50 border-blue-100",
      tooltip: "Tổng thời gian thực tế bạn đã làm bài và luyện đề",
    },
    {
      id: "cups",
      title: "Tổng số cúp đã đạt",
      value: kpis.total_cups,
      icon: <Trophy className="w-5 h-5 text-amber-600 fill-amber-500/20" />,
      bgIcon: "bg-amber-50 border-amber-100",
      tooltip: "Số lần đạt kết quả thi xuất sắc (Band >= 7.0)",
    },
    {
      id: "tests",
      title: "Số bài test đã làm",
      value: kpis.total_tests_taken,
      icon: <FileText className="w-5 h-5 text-rose-600" />,
      bgIcon: "bg-rose-50 border-rose-100",
      tooltip: "Tổng lượt bài thi đầy đủ và kỹ năng đã tham gia",
    },
    {
      id: "exercises",
      title: "Số bài đã học",
      value: kpis.total_exercises_studied,
      icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
      bgIcon: "bg-emerald-50 border-emerald-100",
      tooltip: "Số bài thi đã được hệ thống chấm điểm hoàn tất",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-1 gap-3.5 h-full">
      {cards.map((c) => (
        <div
          key={c.id}
          className="bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-4.5 shadow-2xs flex items-center justify-between hover:shadow-xs transition-shadow"
        >
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${c.bgIcon}`}>
              {c.icon}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-500 font-medium">{c.title}</span>
                <span title={c.tooltip} className="inline-flex">
                  <HelpCircle className="w-3 h-3 text-zinc-400" />
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-zinc-900 mt-0.5 tracking-tight">
                {c.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
