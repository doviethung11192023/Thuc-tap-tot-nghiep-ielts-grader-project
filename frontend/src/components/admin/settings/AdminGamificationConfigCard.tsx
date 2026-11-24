"use client";

import React, { useState } from "react";
import { Flame, Loader2, RotateCcw, Save } from "lucide-react";
import type { SystemSetting } from "@/types/exam";

interface Props {
  settings: SystemSetting[];
  savingKey: string | null;
  onSave: (key: string, value: Record<string, unknown>) => Promise<void>;
}

const GAMIFICATION_DEFAULTS = {
  normal_daily_minutes: 15,
  sprint_daily_minutes: 30,
  sprint_days_before_exam: 60,
  freeze_per_streak_days: 7,
  max_freezes_per_month: 2,
  grace_recovery_max_gap_days: 2,
  mastery_gold_accuracy_pct: 80,
  mastery_gold_min_types: 3,
  mastery_gold_min_scored: 20,
  breakthrough_bronze_delta: 0.5,
  breakthrough_silver_band: 6.5,
  streak_tiers: { bronze: 3, silver: 14, gold: 30 },
};

type FlatNumKey = Exclude<keyof typeof GAMIFICATION_DEFAULTS, "streak_tiers">;

const NUM_FIELDS: Array<{ key: FlatNumKey; label: string; min: number; max: number; step?: number }> = [
  { key: "normal_daily_minutes", label: "Mục tiêu ngày chuẩn (phút)", min: 5, max: 120 },
  { key: "sprint_daily_minutes", label: "Mục tiêu ngày Sprint (phút)", min: 10, max: 180 },
  { key: "sprint_days_before_exam", label: "Kích hoạt Sprint trước kỳ thi (ngày)", min: 7, max: 180 },
  { key: "freeze_per_streak_days", label: "Cấp 1 thẻ Freeze mỗi N ngày chuỗi", min: 3, max: 30 },
  { key: "max_freezes_per_month", label: "Số thẻ Freeze tối đa / tháng", min: 0, max: 5 },
  { key: "grace_recovery_max_gap_days", label: "Ngưỡng ngày nghỉ cho Ân hạn (Grace)", min: 1, max: 5 },
  { key: "mastery_gold_accuracy_pct", label: "Độ chính xác % Huy hiệu Vàng L/R", min: 60, max: 100 },
  { key: "breakthrough_bronze_delta", label: "Tăng Band cho Huy hiệu Đồng", min: 0.5, max: 2.0, step: 0.5 },
  { key: "breakthrough_silver_band", label: "Ngưỡng Band cho Huy hiệu Bạc", min: 5.0, max: 8.5, step: 0.5 },
];

export function AdminGamificationConfigCard({ settings, savingKey, onSave }: Props) {
  const existing = settings.find((s) => s.key === "learner_gamification_config")?.value as
    | Partial<typeof GAMIFICATION_DEFAULTS>
    | undefined;

  const mergeStored = () => ({
    ...GAMIFICATION_DEFAULTS,
    ...(existing || {}),
    streak_tiers: { ...GAMIFICATION_DEFAULTS.streak_tiers, ...(existing?.streak_tiers || {}) },
  });

  const [form, setForm] = useState(mergeStored);
  const sig = JSON.stringify(existing || {});
  const [prevSig, setPrevSig] = useState(sig);
  if (prevSig !== sig) {
    setPrevSig(sig);
    setForm(mergeStored());
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave("learner_gamification_config", form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#932120] flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-zinc-900">Cấu Hình Adaptive Streak, Freeze &amp; Huy Hiệu 3 Tầng</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Đồng bộ động vào thẻ Chuỗi học, Ân hạn khôi phục và 9 Huy hiệu của học viên.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setForm(GAMIFICATION_DEFAULTS)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Mặc định
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {NUM_FIELDS.map((f) => (
          <label key={f.key} className="block p-3.5 rounded-2xl bg-zinc-50/80 border border-zinc-200/80 space-y-1.5">
            <span className="block text-xs font-bold text-zinc-800">{f.label}</span>
            <input
              type="number"
              min={f.min}
              max={f.max}
              step={f.step ?? 1}
              value={form[f.key]}
              onChange={(e) => setForm((p) => ({ ...p, [f.key]: Math.max(f.min, Math.min(f.max, Number(e.target.value) || f.min)) }))}
              className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 bg-white text-sm font-black text-[#932120] focus:outline-none focus:ring-1 focus:ring-[#932120]"
            />
          </label>
        ))}
      </div>

      <div className="flex justify-end pt-2 border-t border-zinc-100">
        <button
          type="submit"
          disabled={savingKey === "learner_gamification_config"}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer disabled:opacity-60"
        >
          {savingKey === "learner_gamification_config" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Lưu Cấu Hình Streak &amp; Huy Hiệu</span>
        </button>
      </div>
    </form>
  );
}
