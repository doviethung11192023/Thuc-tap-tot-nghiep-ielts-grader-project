// Lucian UX/UI Prompt #099 & #379 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#099
"use client";

import React from "react";
import { Flame, Snowflake, RotateCcw, CalendarClock, CheckCircle2 } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import type { AdaptiveStreakData } from "@/types/learning-profile";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { BlurFadeCard, SpotlightCard } from "@/components/motion";
import { WeeklyPlanStrip } from "./WeeklyPlanStrip";

export function AdaptiveStreakCard({
  streak,
  onRefresh,
}: {
  streak?: AdaptiveStreakData;
  onRefresh?: () => void;
}) {
  const prefersReduced = useReducedMotion();
  if (!streak) return null;
  const isSprint = streak.mode === "sprint";

  const todayPct = Math.min(100, Math.max(0, Number(streak.today_progress_pct || 0)));
  const freezeRatio = Math.min(
    100,
    Math.max(0, (streak.freezes_remaining / Math.max(1, streak.max_freezes_per_month || 1)) * 100)
  );

  // Concentric Lucian #099 SVG Activity Rings geometry (viewBox 0 0 88 88)
  const outerR = 34;
  const innerR = 22;
  const outerC = 2 * Math.PI * outerR;
  const innerC = 2 * Math.PI * innerR;
  const outerOffset = outerC * (1 - todayPct / 100);
  const innerOffset = innerC * (1 - freezeRatio / 100);
  const primaryStroke = streak.today_met ? "#059669" : "#932120";

  return (
    <BlurFadeCard inView={false} delay={0.05}>
      <SpotlightCard
        tone={streak.today_met ? "emerald" : "crimson"}
        className="bg-[var(--ux-surface)] rounded-2xl border border-[var(--ux-line)] p-5 shadow-xs space-y-4 overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            {/* Lucian #099 Dual Activity Rings + #379 Flame pulse */}
            <div className="relative w-[76px] h-[76px] shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90" aria-hidden="true">
                <circle cx={44} cy={44} r={outerR} fill="none" stroke={primaryStroke} strokeOpacity={0.14} strokeWidth={9} />
                <circle
                  cx={44}
                  cy={44}
                  r={outerR}
                  fill="none"
                  stroke={primaryStroke}
                  strokeWidth={9}
                  strokeLinecap="round"
                  strokeDasharray={outerC}
                  strokeDashoffset={outerOffset}
                  className="transition-all duration-700"
                />
                <circle cx={44} cy={44} r={innerR} fill="none" stroke="#0284C7" strokeOpacity={0.16} strokeWidth={7} />
                <circle
                  cx={44}
                  cy={44}
                  r={innerR}
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth={7}
                  strokeLinecap="round"
                  strokeDasharray={innerC}
                  strokeDashoffset={innerOffset}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Flame
                  className={`w-5 h-5 ${streak.today_met ? "text-emerald-600" : "text-[#932120]"} ${
                    streak.current_streak > 0 && !prefersReduced ? "animate-flame-breath" : ""
                  }`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-[var(--ux-ink)] tracking-tight">
                  Chuỗi học liên tiếp:{" "}
                  <AnimatedNumber value={streak.current_streak} className="text-[#932120]" suffix=" ngày" />
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isSprint
                      ? "bg-rose-50 text-[#932120] border-rose-200"
                      : "bg-[var(--ux-surface-2)] text-[var(--ux-ink-2)] border-[var(--ux-line)]"
                  }`}
                >
                  {isSprint ? `Sprint nước rút (${streak.daily_target_minutes}p/ngày)` : `Chuẩn duy trì (${streak.daily_target_minutes}p/ngày)`}
                </span>
              </div>
              <p className="text-xs text-[var(--ux-ink-2)] mt-1">
                Kỷ lục dài nhất:{" "}
                <strong className="text-[var(--ux-ink)] tabular-nums">
                  <AnimatedNumber value={streak.longest_streak} suffix=" ngày" />
                </strong>
                {streak.days_until_exam !== null && streak.days_until_exam >= 0 && (
                  <>
                    {" "}· Còn{" "}
                    <strong className="text-[#932120] tabular-nums">
                      <AnimatedNumber value={streak.days_until_exam} suffix=" ngày" />
                    </strong>{" "}
                    tới ngày thi
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 flex items-center gap-1.5 text-xs font-bold tabular-nums">
              <Snowflake className="w-4 h-4 text-sky-600" />
              <span>
                Freeze: <AnimatedNumber value={streak.freezes_remaining} />/{streak.max_freezes_per_month}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--ux-ink-2)]">
            <span className="flex items-center gap-1.5">
              {streak.today_met ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <CalendarClock className="w-4 h-4 text-amber-600" />
              )}
              Mục tiêu hôm nay (GMT+7):{" "}
              <strong className="text-[var(--ux-ink)] tabular-nums">
                <AnimatedNumber value={streak.today_minutes} />/{streak.daily_target_minutes} phút
              </strong>
              {streak.today_completed > 0 && ` (${streak.today_completed} bài)`}
            </span>
            <span className="font-mono font-bold text-[#932120] tabular-nums">
              <AnimatedNumber value={streak.today_progress_pct} suffix="%" />
            </span>
          </div>
          <div className="w-full h-2.5 bg-[var(--ux-surface-2)] rounded-full overflow-hidden">
            <m.div
              initial={prefersReduced ? false : { width: 0 }}
              animate={{ width: `${todayPct}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className={`h-full rounded-full ${streak.today_met ? "bg-emerald-600" : "bg-[#932120]"}`}
              style={prefersReduced ? { width: `${todayPct}%` } : undefined}
            />
          </div>
        </div>

        {(streak.grace_recovery?.eligible || streak.grace_recovery?.recovered_today) && streak.grace_recovery.requirement && (
          <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs relative z-10 ${
            streak.grace_recovery.recovered_today
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}>
            {streak.grace_recovery.recovered_today ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <RotateCcw className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            )}
            <div>
              <strong className="block font-bold">
                {streak.grace_recovery.recovered_today
                  ? `Khôi phục chuỗi thành công (+${streak.grace_recovery.recoverable_streak} ngày)`
                  : `Ân hạn khôi phục chuỗi (${streak.grace_recovery.recoverable_streak} ngày)`}
              </strong>
              <span>{streak.grace_recovery.requirement}</span>
            </div>
          </div>
        )}

        <WeeklyPlanStrip streak={streak} onUpdated={onRefresh} />
      </SpotlightCard>
    </BlurFadeCard>
  );
}
