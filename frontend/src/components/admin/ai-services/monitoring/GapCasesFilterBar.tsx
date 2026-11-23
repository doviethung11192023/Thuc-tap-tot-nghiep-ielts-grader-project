"use client";

import React, { useState } from "react";
import { CRITERION_LABEL } from "./monitoring-format";

export interface GapCaseFilterState {
  skill: string;
  criterion: string;
  min_abs: string;
  direction: string;
  days: string;
}

const FIELD = "min-h-[40px] rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#932120]/30";

/** Bộ lọc ca lệch: kỹ năng, tiêu chí, độ lệch tối thiểu, chiều lệch, số ngày. */
export function GapCasesFilterBar({ value, onChange }: { value: GapCaseFilterState; onChange: (next: GapCaseFilterState) => void }) {
  const set = (patch: Partial<GapCaseFilterState>) => onChange({ ...value, ...patch });
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      <select aria-label="Kỹ năng" className={FIELD} value={value.skill} onChange={(e) => set({ skill: e.target.value })}>
        <option value="">Mọi kỹ năng</option>
        <option value="writing">Writing</option>
        <option value="speaking">Speaking</option>
      </select>
      <select aria-label="Tiêu chí" className={FIELD} value={value.criterion} onChange={(e) => set({ criterion: e.target.value })}>
        <option value="overall">Band tổng</option>
        {Object.entries(CRITERION_LABEL).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm text-zinc-600">
        Lệch từ
        <MinGapInput committed={value.min_abs} onCommit={(min_abs) => set({ min_abs })} />
        band
      </label>
      <select aria-label="Chiều lệch" className={FIELD} value={value.direction} onChange={(e) => set({ direction: e.target.value })}>
        <option value="all">Cả hai chiều</option>
        <option value="ai_higher">AI chấm cao hơn Expert</option>
        <option value="ai_lower">AI chấm thấp hơn Expert</option>
      </select>
      <select aria-label="Khoảng thời gian" className={FIELD} value={value.days} onChange={(e) => set({ days: e.target.value })}>
        <option value="7">7 ngày qua</option>
        <option value="30">30 ngày qua</option>
        <option value="90">90 ngày qua</option>
        <option value="365">365 ngày qua</option>
      </select>
    </div>
  );
}

/**
 * Ô "Lệch từ" giữ bản nháp riêng: chỉ đẩy lên URL khi là số trong 0..9.
 * Nếu đẩy cả lúc ô trống (đang gõ lại), URL mất min_abs và ô nhảy về mặc định 1 giữa chừng.
 */
function MinGapInput({ committed, onCommit }: { committed: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(committed);
  const [seen, setSeen] = useState(committed);
  // URL đổi từ nơi khác (link, nút quay lại) và khác số đang gõ: lấy theo URL. Không remount để ô giữ focus.
  if (committed !== seen) {
    setSeen(committed);
    if (Number(committed) !== Number(draft)) setDraft(committed);
  }
  return (
    <input type="number" min={0} max={9} step={0.5} aria-label="Độ lệch tối thiểu" className={`${FIELD} w-20`} value={draft}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        const n = Number(next);
        if (next.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 9 && next !== committed) onCommit(next);
      }} />
  );
}
