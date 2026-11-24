"use client";

import React from "react";
import { Calendar, Edit3, HelpCircle, Bot, ShieldCheck, Hourglass } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { BlurFadeCard, SpotlightCard } from "@/components/motion";
import type { LearningProfileGoals, WeeklyPacingSummary } from "@/types/learning-profile";

interface LearningProfileBannerProps {
  userName: string;
  goals: LearningProfileGoals;
  weeklyPacing?: WeeklyPacingSummary;
  onOpenGoalModal: () => void;
}

export function LearningProfileBanner({ userName, goals, weeklyPacing, onOpenGoalModal }: LearningProfileBannerProps) {
  const prefersReduced = useReducedMotion();
  const skillPills = [
    { label: "L", val: goals.target_listening ?? goals.target_band },
    { label: "R", val: goals.target_reading ?? goals.target_band },
    { label: "W", val: goals.target_writing ?? goals.target_band },
    { label: "S", val: goals.target_speaking ?? goals.target_band },
  ];

  const weekTarget = weeklyPacing?.weekly_target_tests ?? 3;
  const weekDone = weeklyPacing?.completed_this_week ?? 0;
  const weekPct = Math.min(100, Math.round((weekDone / Math.max(1, weekTarget)) * 100));

  return (
    <BlurFadeCard inView={false}>
      <SpotlightCard
        tone="sky"
        className="w-full bg-gradient-to-r from-sky-50/90 via-blue-50/70 to-emerald-50/40 border border-sky-100/80 rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(#0284c7 0.75px, transparent 0.75px)", backgroundSize: "20px 20px" }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-start gap-4 max-w-xl">
            <m.div
              initial={prefersReduced ? false : { scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 360, damping: 24, delay: 0.08 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-sky-400 p-0.5 shadow-md shrink-0 flex items-center justify-center"
            >
              <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center text-blue-600">
                <Bot className="w-9 h-9" />
              </div>
            </m.div>
            <div className="space-y-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight inline-block relative">
                  Hi, {userName}
                  {!prefersReduced && (
                    <m.span
                      aria-hidden="true"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.6, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="block h-1 rounded-full bg-[#932120]/30 origin-left mt-0.5"
                    />
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-600 mt-0.5 font-medium">
                  Lộ trình luyện đề thích ứng được tính động từ dữ liệu thi & mục tiêu của bạn.
                </p>
              </div>

              {weeklyPacing && (
                <div className="inline-flex flex-wrap items-center gap-2.5 bg-white/85 border border-sky-100 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-zinc-700 shadow-2xs">
                  <span className="text-[#932120] font-bold">Còn {weeklyPacing.days_remaining} ngày tới kỳ thi</span>
                  <span className="text-zinc-300">|</span>
                  <span>Nhịp tuần này: <strong>{weekDone}/{weekTarget} bài</strong></span>
                  <div className="w-16 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                    <m.div
                      initial={prefersReduced ? false : { width: 0 }}
                      animate={{ width: `${weekPct}%` }}
                      transition={{ duration: 0.65, delay: 0.2, ease: "easeOut" }}
                      className={`h-full rounded-full ${weeklyPacing.pacing_status === "needs_boost" ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={prefersReduced ? { width: `${weekPct}%` } : undefined}
                    />
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    weeklyPacing.pacing_status === "needs_boost" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {weeklyPacing.pacing_status === "completed" ? "Đạt mục tiêu" : weeklyPacing.pacing_status === "on_track" ? "Đúng tiến độ" : "Cần tăng tốc"}
                  </span>
                </div>
              )}

              {(goals.waiting_expert_count ?? 0) > 0 && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg ml-0 sm:ml-2">
                  <Hourglass className="w-3.5 h-3.5" />
                  <span>{goals.waiting_expert_count} bài Mock đang chờ Giảng viên chấm (có điểm sơ bộ AI)</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full lg:w-auto">
            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-semibold text-zinc-600">
              <button type="button" onClick={onOpenGoalModal} className="flex items-center gap-1.5 hover:text-[#932120] transition-colors cursor-pointer">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>{goals.test_date ? `Ngày thi: ${goals.test_date}` : "Chọn ngày thi"}</span>
              </button>
              <button type="button" onClick={onOpenGoalModal} className="px-3 py-1 rounded-full border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer active:scale-[0.98]">
                <Edit3 className="w-3 h-3 text-[#932120]" />
                <span>Chỉnh sửa mục tiêu</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200/90 p-3 sm:px-5 sm:py-3.5 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Trình độ IELTS (Chuẩn BR-12)</p>
                {goals.confidence_label && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    <ShieldCheck className="w-3 h-3" /> {goals.confidence_label}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-6 sm:gap-8 items-center text-center divide-x divide-zinc-100">
                <div className="pr-2">
                  <span className="text-[11px] text-zinc-500 font-medium block">Đầu vào</span>
                  <span className="text-lg font-black text-zinc-900 tabular-nums">{goals.input_band.toFixed(1)}</span>
                </div>
                <div className="px-2">
                  <span className="text-[11px] text-zinc-500 font-medium inline-flex items-center justify-center gap-1">
                    Dự đoán
                    <span title="Overall từ band hiện tại 4 kỹ năng (ưu tiên 3 bài Mock gần nhất > 5 bài Practice); thiếu kỹ năng nào thì chưa tính" className="inline-flex">
                      <HelpCircle className="w-3 h-3 text-blue-500" />
                    </span>
                  </span>
                  <span className="text-lg font-black text-blue-600 block tabular-nums">{goals.predicted_band !== null ? goals.predicted_band.toFixed(1) : "—"}</span>
                </div>
                <div className="pl-2">
                  <span className="text-[11px] text-zinc-500 font-medium block">Mục tiêu</span>
                  <span className="text-lg font-black text-[#932120] block tabular-nums">{goals.target_band.toFixed(1)}</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2 border-t border-zinc-100 text-[11px] font-semibold text-zinc-600">
                {skillPills.map((p) => (
                  <span key={p.label} className="px-2 py-0.5 rounded-md bg-zinc-50 border border-zinc-200/80">
                    {p.label}: <strong className="text-zinc-900">{Number(p.val).toFixed(1)}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SpotlightCard>
    </BlurFadeCard>
  );
}
