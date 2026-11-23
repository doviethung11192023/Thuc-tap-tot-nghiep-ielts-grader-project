"use client";

import React from "react";
import type { AuditLogFilters } from "@/types/admin-ai-monitoring";

export interface AdminOption { id: string; label: string }

/** Các action đang được hệ thống ghi vào audit log. */
export const AUDIT_ACTIONS = [
  "regrade_ai", "update_ai_model_prices", "update_ai_budget", "update_ai_runtime_config",
  "replace_ai_provider_key", "revert_ai_provider_key", "create_prompt_version", "set_prompt_production",
  "purge_ai_traces", "sync_ai_model_prices", "update_system_setting", "create_test", "update_test", "delete_test",
  "create_band_conversion", "update_band_conversion", "delete_band_conversion", "lock_user", "unlock_user", "resend_invite",
];

const FIELD = "min-h-[40px] rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#932120]/30";

interface Props {
  value: AuditLogFilters;
  admins: AdminOption[];
  onChange: (next: AuditLogFilters) => void;
}

/** Bộ lọc audit log: người làm (hệ thống hoặc Admin), hành động, đối tượng, khoảng ngày. */
export function AuditLogFilterBar({ value, admins, onChange }: Props) {
  const set = (patch: Partial<AuditLogFilters>) => onChange({ ...value, ...patch });
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <select aria-label="Người thực hiện" className={FIELD} value={value.actor ?? ""} onChange={(e) => set({ actor: e.target.value })}>
        <option value="">Mọi người thực hiện</option>
        <option value="system">Hệ thống</option>
        {admins.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
      </select>
      <input list="audit-actions" aria-label="Hành động" placeholder="Hành động" className={FIELD} value={value.action ?? ""} onChange={(e) => set({ action: e.target.value.trim() })} />
      <datalist id="audit-actions">{AUDIT_ACTIONS.map((a) => <option key={a} value={a} />)}</datalist>
      <input aria-label="Đối tượng" placeholder="Đối tượng (vd: attempts)" className={FIELD} value={value.entity ?? ""} onChange={(e) => set({ entity: e.target.value.trim() })} />
      <input type="date" aria-label="Từ ngày" className={FIELD} value={value.date_from ?? ""} onChange={(e) => set({ date_from: e.target.value })} />
      <input type="date" aria-label="Đến ngày" className={FIELD} value={value.date_to ?? ""} onChange={(e) => set({ date_to: e.target.value })} />
      <button type="button" onClick={() => onChange({})} className="min-h-[40px] rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-600 hover:bg-zinc-50">Xoá lọc</button>
    </div>
  );
}
