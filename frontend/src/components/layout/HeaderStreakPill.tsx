"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Flame, Snowflake, CalendarCheck2, RotateCcw, ArrowRight, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getStreakSummary } from "@/services/learning-profile";

export function HeaderStreakPill() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: streak } = useQuery({
    queryKey: ["student-streak-summary", user?.id],
    queryFn: getStreakSummary,
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    retry: 0,
  });

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user || !streak) return null;

  const isUrgent = !streak.today_met && streak.current_streak > 0 && streak.hours_until_midnight_vn <= 4;
  const weeklyPct = Math.min(100, Math.round((streak.weekly_completed_days / Math.max(1, streak.weekly_goal_days)) * 100));

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        data-testid="header-streak-pill"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Chuỗi học liên tiếp ${streak.current_streak} ngày`}
        className={`relative inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer tabular-nums ${
          streak.can_repair
            ? "bg-amber-400/25 border-amber-300 text-amber-50 hover:bg-amber-400/35"
            : isUrgent
              ? "bg-amber-400/20 border-amber-300 text-amber-50 hover:bg-amber-400/30"
              : streak.today_met
                ? "bg-[#fef2f2] border-[#fecaca] text-[#932120] hover:bg-white shadow-2xs"
                : "bg-white/15 border-white/25 text-white hover:bg-white/25"
        }`}
      >
        <Flame
          className={`w-4 h-4 shrink-0 ${
            streak.today_met ? "text-[#932120] fill-[#932120]/20" : isUrgent ? "text-amber-300" : "text-red-100"
          }`}
        />
        <span>{streak.current_streak}</span>
        {(isUrgent || streak.can_repair) && (
          <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Tóm tắt chuỗi học tập"
          className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white text-zinc-900 border border-zinc-200 shadow-2xl p-4 space-y-3.5 z-50"
        >
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#932120]">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black text-zinc-900 tabular-nums">{streak.current_streak} ngày liên tiếp</p>
                <p className="text-[11px] font-medium text-zinc-500">Kỷ lục: {streak.longest_streak} ngày</p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                streak.today_met
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              {streak.today_met ? "Đã đạt hôm nay" : "Chưa đạt"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-sky-50 border border-sky-200 p-2.5">
              <div className="flex items-center gap-1 text-[11px] font-bold text-sky-800">
                <Snowflake className="w-3.5 h-3.5 text-sky-600" />
                <span>Streak Freeze</span>
              </div>
              <p className="text-sm font-black text-sky-950 mt-0.5 tabular-nums">
                {streak.freezes_remaining}/{streak.max_freezes_per_month} thẻ
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-2.5">
              <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-600">
                <CalendarCheck2 className="w-3.5 h-3.5 text-[#932120]" />
                <span>Tuần này</span>
              </div>
              <p className="text-sm font-black text-zinc-900 mt-0.5 tabular-nums">
                {streak.weekly_completed_days}/{streak.weekly_goal_days} buổi
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full rounded-full bg-[#932120] transition-all" style={{ width: `${weeklyPct}%` }} />
            </div>
            {!streak.today_met && (
              <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Còn {streak.hours_until_midnight_vn} giờ trước 00:00 (GMT+7)</span>
              </p>
            )}
          </div>

          {streak.can_repair && (
            <Link
              href="/learning-profile"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-bold text-[#932120] hover:bg-red-100 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                Cứu chuỗi {streak.broken_streak_backup} ngày (48h)
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          <Link
            href="/learning-profile"
            onClick={() => setOpen(false)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold transition-colors"
          >
            <span>Mở Hồ sơ năng lực</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
