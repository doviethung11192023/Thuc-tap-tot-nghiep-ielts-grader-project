"use client";

import React, { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import type { AdminExpertPerformanceRow } from "@/services/admin-reviews";
import type { ExpertPenaltyItem } from "@/types";

interface Props {
  expert: AdminExpertPerformanceRow | null;
  penalty: ExpertPenaltyItem | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (penaltyId: string, waiveReason: string) => void;
}

export function AdminWaivePenaltyModal({ expert, penalty, submitting, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!penalty) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [penalty, submitting, onClose]);

  if (!penalty || !expert) return null;

  const trimmed = reason.trim();
  const valid = trimmed.length >= 10 && !submitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="waive-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-zinc-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 id="waive-modal-title" className="text-base font-bold text-zinc-900">
              Miễn phạt vi phạm cho {expert.full_name}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Hệ thống sẽ ghi Audit Log, gỡ bỏ phạt và tính lại hạng/cooldown ngay lập tức.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-500">Mức độ / Lý do:</span>
            <span className="font-bold uppercase text-rose-700">
              {penalty.severity} · {penalty.reason}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Ngày ghi nhận:</span>
            <span className="font-mono text-zinc-800">
              {new Date(penalty.created_at).toLocaleString("vi-VN")}
            </span>
          </div>
          {penalty.note && <p className="text-zinc-600 pt-1 border-t border-zinc-200">{penalty.note}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="waive-reason-input" className="text-xs font-bold text-zinc-800">
              Lý do miễn phạt (tối thiểu 10 ký tự):
            </label>
            <span className={`text-[11px] font-mono tabular-nums font-bold ${trimmed.length >= 10 ? "text-emerald-700" : "text-amber-700"}`}>
              {trimmed.length}/10
            </span>
          </div>
          <textarea
            id="waive-reason-input"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Sự cố mạng hệ thống trường học trong khung giờ cao điểm ngày 22/11..."
            className="w-full text-xs p-3 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#932120]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => onConfirm(penalty.id, trimmed)}
            className="px-5 py-2 bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 disabled:opacity-45 cursor-pointer"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Xác nhận miễn phạt
          </button>
        </div>
      </div>
    </div>
  );
}
