"use client";

import React, { useState } from "react";
import { Compass, RotateCcw, Save, Loader2 } from "lucide-react";
import type { SystemSetting } from "@/types/exam";
import { AdminGamificationConfigCard } from "@/components/admin/settings/AdminGamificationConfigCard";

interface AdminRoadmapConfigTabProps {
  settings: SystemSetting[];
  savingKey: string | null;
  onSave: (key: string, value: Record<string, unknown>) => Promise<void>;
}

const DEFAULTS = {
  mock_window: 3,
  practice_window: 5,
  min_attempts_confidence: 2,
  recent_exclude_days: 14,
  recommended_count: 3,
  tests_per_half_band: 6,
};

const FIELDS: Array<{ key: keyof typeof DEFAULTS; label: string; help: string; min: number; max: number }> = [
  { key: "mock_window", label: "Số bài Mock tính band hiện tại (BR-12)", help: "Trung bình N bài thi thử Mock chính thức gần nhất.", min: 1, max: 10 },
  { key: "practice_window", label: "Số bài Practice dự phòng (BR-12)", help: "Dùng khi học viên chưa có bài Mock đạt chuẩn.", min: 1, max: 15 },
  { key: "min_attempts_confidence", label: "Ngưỡng tối thiểu để chẩn đoán & chốt tháng", help: "Dưới ngưỡng này hiển thị trạng thái Chẩn đoán / Tạm tính.", min: 1, max: 5 },
  { key: "recent_exclude_days", label: "Chu kỳ không lặp lại đề đã làm (ngày - BR-17)", help: "Ưu tiên gợi ý đề chưa làm trong N ngày gần đây.", min: 1, max: 60 },
  { key: "recommended_count", label: "Số bài đề xuất hiển thị mỗi lần", help: "Mặc định 3 bài (Smart Practice Trio).", min: 1, max: 5 },
  { key: "tests_per_half_band", label: "Định mức bài luyện để tăng 0.5 band", help: "Dùng tính chỉ tiêu tuần theo ngày thi (Weekly Pacing).", min: 2, max: 20 },
];

export function AdminRoadmapConfigTab({ settings, savingKey, onSave }: AdminRoadmapConfigTabProps) {
  const existing = settings.find((s) => s.key === "roadmap_config")?.value as
    | Partial<typeof DEFAULTS>
    | undefined;
  const [form, setForm] = useState<typeof DEFAULTS>(() => ({ ...DEFAULTS, ...(existing || {}) }));
  const syncSig = JSON.stringify(existing || {});
  const [prevSig, setPrevSig] = useState(syncSig);

  if (prevSig !== syncSig) {
    setPrevSig(syncSig);
    setForm({ ...DEFAULTS, ...(existing || {}) });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave("roadmap_config", form);
  };

  return (
    <div className="space-y-5">
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#932120]/10 text-[#932120] flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-zinc-900">Cấu Hình Thuật Toán Lộ Trình & Chẩn Đoán (BR-12 / BR-17)</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Điều chỉnh tham số gợi ý đề và ngưỡng tin cậy cho toàn bộ học viên theo thời gian thực.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setForm(DEFAULTS)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Khôi phục mặc định
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="p-4 rounded-2xl bg-zinc-50/80 border border-zinc-200/80 space-y-2">
            <label className="block text-xs font-bold text-zinc-800">{f.label}</label>
            <input
              type="number"
              min={f.min}
              max={f.max}
              value={form[f.key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: Math.max(f.min, Math.min(f.max, Number(e.target.value) || f.min)) }))}
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-white text-sm font-black text-[#932120] focus:outline-none focus:ring-1 focus:ring-[#932120]"
            />
            <p className="text-[11px] text-zinc-500">{f.help}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2 border-t border-zinc-100">
        <button
          type="submit"
          disabled={savingKey === "roadmap_config"}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer disabled:opacity-60"
        >
          {savingKey === "roadmap_config" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Lưu Cấu Hình Lộ Trình</span>
        </button>
      </div>
    </form>
    <AdminGamificationConfigCard settings={settings} savingKey={savingKey} onSave={onSave} />
    </div>
  );
}
