"use client";

import React from "react";
import { AlertTriangle, Loader2, RotateCcw, X } from "lucide-react";
import type { RegradePreview } from "@/types/admin-ai-monitoring";
import { ATTEMPT_STATUS_LABEL, BUDGET_STATE_LABEL, SKIP_REASON_LABEL, SKILL_LABEL, formatCost, shortId } from "./monitoring-format";

interface Props {
  preview: RegradePreview;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Hộp xác nhận chạy lại: số bài sẽ chạy, bài bị bỏ qua kèm lý do, chi phí ước tính, cảnh báo ngân sách. */
export function RegradeConfirmModal({ preview, submitting, onConfirm, onClose }: Props) {
  const count = preview.to_regrade.length;
  const budgetWarn = preview.budget.state === "warning" || preview.budget.state === "exceeded";
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-lg font-bold text-zinc-900">Xác nhận chạy lại chấm AI</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-1.5 rounded-lg hover:bg-zinc-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4 text-sm text-zinc-700">
          <p>
            Sẽ chạy lại <strong className="text-zinc-900">{count}</strong> bài. Mỗi bài tạo một lần chấm mới, kết quả cũ vẫn được giữ.
          </p>
          {count > 0 && (
            <ul className="text-xs text-zinc-600 space-y-1 max-h-32 overflow-y-auto border border-zinc-100 rounded-lg p-3 bg-zinc-50">
              {preview.to_regrade.map((a) => (
                <li key={a.attempt_id} className="font-mono">{shortId(a.attempt_id)} · {SKILL_LABEL[a.skill] ?? a.skill} · {ATTEMPT_STATUS_LABEL[a.status] ?? a.status}</li>
              ))}
            </ul>
          )}
          <p>
            Chi phí ước tính:{" "}
            <strong className="text-zinc-900">{formatCost(preview.estimated_cost_usd)}</strong>
            {preview.estimated_cost_usd === null && <span className="text-zinc-500"> (chưa đủ số liệu 30 ngày để ước tính)</span>}
          </p>
          {budgetWarn && (
            <div className={`flex gap-2 rounded-lg border p-3 ${BUDGET_STATE_LABEL[preview.budget.state].cls}`}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {BUDGET_STATE_LABEL[preview.budget.state].label}
                {preview.budget.percent !== null && ` (${preview.budget.percent}% ngân sách tháng)`}. Vẫn chạy lại được, hệ thống không chặn.
              </span>
            </div>
          )}
          {preview.skipped.length > 0 && (
            <div>
              <p className="font-semibold text-zinc-900 mb-1.5">Bỏ qua {preview.skipped.length} bài</p>
              <ul className="text-xs space-y-1 max-h-32 overflow-y-auto border border-zinc-100 rounded-lg p-3 bg-zinc-50">
                {preview.skipped.map((s, i) => (
                  <li key={`${s.attempt_id}-${i}`}>
                    <span className="font-mono">{shortId(s.attempt_id)}</span>: {SKIP_REASON_LABEL[s.reason] ?? s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-zinc-200">
          <button type="button" onClick={onClose} disabled={submitting}
            className="min-h-[40px] px-4 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Huỷ</button>
          <button type="button" onClick={onConfirm} disabled={submitting || count === 0}
            className="min-h-[40px] px-4 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Chạy lại {count} bài
          </button>
        </div>
      </div>
    </div>
  );
}
