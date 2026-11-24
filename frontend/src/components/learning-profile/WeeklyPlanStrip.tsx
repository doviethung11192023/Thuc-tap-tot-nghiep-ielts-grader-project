"use client";

import React, { useState } from "react";
import { Bell, BellOff, CalendarCheck2, RotateCcw, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AdaptiveStreakData } from "@/types/learning-profile";
import { claimStreakRepair, updateStudyPlan } from "@/services/learning-profile";

interface WeeklyPlanStripProps {
  streak: AdaptiveStreakData;
  onUpdated?: () => void;
}

const GOAL_OPTIONS: Array<3 | 5 | 7> = [3, 5, 7];

export function WeeklyPlanStrip({ streak, onUpdated }: WeeklyPlanStripProps) {
  const queryClient = useQueryClient();
  const [weeklyGoal, setWeeklyGoal] = useState<number>(streak.weekly_goal_days ?? 5);
  const [reminderOn, setReminderOn] = useState<boolean>(streak.reminder_enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [repairing, setRepairing] = useState(false);

  const completedDays = streak.weekly_completed_days ?? 0;
  const weeklyPct = Math.min(100, Math.round((completedDays / Math.max(1, weeklyGoal)) * 100));

  const handleGoalChange = async (days: 3 | 5 | 7) => {
    if (days === weeklyGoal || saving) return;
    const prev = weeklyGoal;
    setWeeklyGoal(days);
    setSaving(true);
    try {
      await updateStudyPlan({ weekly_goal_days: days });
      toast.success(`Đã đặt mục tiêu ${days} buổi/tuần (tính từ thứ Hai GMT+7)`);
      queryClient.invalidateQueries({ queryKey: ["student-streak-summary"] });
      onUpdated?.();
    } catch {
      setWeeklyGoal(prev);
      toast.error("Không thể cập nhật kế hoạch tuần. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleReminder = async () => {
    if (saving) return;
    const nextVal = !reminderOn;
    setReminderOn(nextVal);
    setSaving(true);
    try {
      await updateStudyPlan({ reminder_enabled: nextVal });
      toast.success(nextVal ? "Đã bật nhắc giữ chuỗi lúc 20:00 (GMT+7)" : "Đã tắt thông báo nhắc học 20:00");
      queryClient.invalidateQueries({ queryKey: ["student-streak-summary"] });
      onUpdated?.();
    } catch {
      setReminderOn(!nextVal);
      toast.error("Không thể thay đổi cài đặt nhắc học.");
    } finally {
      setSaving(false);
    }
  };

  const handleClaimRepair = async () => {
    if (repairing) return;
    setRepairing(true);
    try {
      const res = await claimStreakRepair();
      toast.success(`Đã khôi phục thành công chuỗi ${res.current_streak} ngày liên tiếp!`);
      queryClient.invalidateQueries({ queryKey: ["student-streak-summary"] });
      onUpdated?.();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Chưa đủ điều kiện khôi phục chuỗi (cần hoàn thành 2 bài R/L >= 15 câu hoặc 1 bài Writing/Speaking).";
      toast.error(detail);
    } finally {
      setRepairing(false);
    }
  };

  const rp = streak.repair_progress ?? { completed: 0, required: 2 };
  const repairReady = rp.completed >= rp.required;

  return (
    <div className="space-y-3 pt-3 border-t border-[var(--ux-line)] relative z-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs text-[var(--ux-ink-2)] font-semibold">
          <CalendarCheck2 className="w-4 h-4 text-[#932120] shrink-0" />
          <span>
            Nhịp độ tuần này:{" "}
            <strong className="text-[var(--ux-ink)] tabular-nums">
              {completedDays}/{weeklyGoal} buổi
            </strong>{" "}
            <span className="text-[11px] text-zinc-500">({weeklyPct}%)</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-xl bg-[var(--ux-surface-2)] p-0.5 border border-[var(--ux-line)]" role="group" aria-label="Chọn số buổi mục tiêu mỗi tuần">
            {GOAL_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={saving}
                onClick={() => handleGoalChange(opt)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  weeklyGoal === opt
                    ? "bg-[#932120] text-white shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {opt} buổi
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={handleToggleReminder}
            aria-pressed={reminderOn}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer ${
              reminderOn
                ? "bg-red-50 border-red-200 text-[#932120]"
                : "bg-zinc-50 border-zinc-200 text-zinc-500"
            }`}
            title="Nhận nhắc giữ chuỗi thông minh lúc 20:00 GMT+7 khi chuỗi >= 2 ngày"
          >
            {reminderOn ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            <span>Nhắc 20:00</span>
          </button>
        </div>
      </div>

      {streak.can_repair && (
        <div className="rounded-xl bg-[#fef2f2] border border-[#fecaca] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5 text-xs">
            <p className="font-black text-[#932120] flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 shrink-0" />
              Cửa sổ Streak Repair 48h — Cứu chuỗi {streak.broken_streak_backup} ngày
            </p>
            <p className="text-zinc-700 leading-relaxed">
              Hoàn thành nhiệm vụ gấp đôi chuẩn ngày (2 bài R/L tổng &ge; 15 câu hoặc 1 bài Writing/Speaking hợp lệ):{" "}
              <strong className="text-[#932120] tabular-nums">
                {rp.completed}/{rp.required}
              </strong>
            </p>
          </div>
          <button
            type="button"
            disabled={repairing || !repairReady}
            onClick={handleClaimRepair}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#932120] hover:bg-[#7a1a19] disabled:opacity-50 text-white text-xs font-extrabold whitespace-nowrap transition-colors cursor-pointer shrink-0"
          >
            {repairing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            {repairReady ? "Khôi phục chuỗi ngay" : `Cần thêm ${rp.required - rp.completed} bài`}
          </button>
        </div>
      )}
    </div>
  );
}
