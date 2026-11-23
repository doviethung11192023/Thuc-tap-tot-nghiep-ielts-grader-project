"use client";

import React from "react";
import type { GradingRunFilters } from "@/types/admin-ai-monitoring";

interface Props {
  value: GradingRunFilters;
  onChange: (next: GradingRunFilters) => void;
}

const FIELD = "min-h-[40px] rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#932120]/30";

/** Bộ lọc danh sách lượt chấm: trạng thái, kỹ năng, khoảng ngày (giờ VN), model, phiên bản prompt. */
export function RunsFilterBar({ value, onChange }: Props) {
  const set = (patch: Partial<GradingRunFilters>) => onChange({ ...value, ...patch });
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
      <select aria-label="Trạng thái" className={FIELD} value={value.status ?? ""} onChange={(e) => set({ status: e.target.value })}>
        <option value="">Mọi trạng thái</option>
        <option value="running">Đang chạy</option>
        <option value="done">Hoàn tất</option>
        <option value="failed">Lỗi</option>
        <option value="stuck">Treo (&gt; 25 phút)</option>
        <option value="attention">Cần chú ý</option>
      </select>
      <select aria-label="Kỹ năng" className={FIELD} value={value.skill ?? ""} onChange={(e) => set({ skill: e.target.value })}>
        <option value="">Mọi kỹ năng</option>
        <option value="writing">Writing</option>
        <option value="speaking">Speaking</option>
      </select>
      <input type="date" aria-label="Từ ngày" className={FIELD} value={value.date_from ?? ""} onChange={(e) => set({ date_from: e.target.value })} />
      <input type="date" aria-label="Đến ngày" className={FIELD} value={value.date_to ?? ""} onChange={(e) => set({ date_to: e.target.value })} />
      <input type="text" aria-label="Model" placeholder="Model" className={FIELD} value={value.model ?? ""} onChange={(e) => set({ model: e.target.value })} />
      <input type="text" aria-label="Tên prompt" placeholder="Prompt (vd: ta, grade)" className={FIELD} value={value.prompt_name ?? ""} onChange={(e) => set({ prompt_name: e.target.value })} />
      <input type="text" aria-label="Phiên bản prompt" placeholder="Phiên bản (vd: 7)" inputMode="numeric" className={FIELD} value={value.prompt_version ?? ""} onChange={(e) => set({ prompt_version: e.target.value })} />
      <button type="button" onClick={() => onChange({})} className="min-h-[40px] rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-600 hover:bg-zinc-50">Xoá lọc</button>
    </div>
  );
}
