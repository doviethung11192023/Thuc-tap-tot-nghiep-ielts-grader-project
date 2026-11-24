"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert, Sparkles } from "lucide-react";

interface AiAgreementConfirmModalProps {
  open: boolean;
  overallBand: number;
  minStudyTipChars?: number;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (studyTipNote: string) => void;
}

export function AiAgreementConfirmModal({
  open,
  overallBand,
  minStudyTipChars = 30,
  submitting,
  onClose,
  onConfirm,
}: AiAgreementConfirmModalProps) {
  const [confirmedRead, setConfirmedRead] = useState(false);
  const [studyTipNote, setStudyTipNote] = useState("");

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const tipTrim = studyTipNote.trim();
  const canSubmit = confirmedRead && tipTrim.length >= minStudyTipChars && !submitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-agreement-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-zinc-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 id="ai-agreement-title" className="text-base font-bold text-zinc-900">
              Xác nhận đồng thuận 100% với đánh giá AI (Band{" "}
              <span className="font-mono tabular-nums text-[#932120]">{overallBand.toFixed(1)}</span>)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Bạn giữ nguyên toàn bộ điểm số, nhận xét và chú thích từ AI gợi ý. Vui lòng bổ sung một gợi ý ôn tập trọng tâm gửi học viên trước khi công bố.
            </p>
          </div>
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FAF8F5] border border-zinc-200 cursor-pointer text-xs text-zinc-800">
          <input
            type="checkbox"
            checked={confirmedRead}
            onChange={(e) => setConfirmedRead(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#932120] rounded"
          />
          <span className="font-medium leading-relaxed">
            Tôi xác nhận đã đọc toàn bộ bài làm của học viên và đồng ý với kết quả Band{" "}
            <strong className="font-mono">{overallBand.toFixed(1)}</strong> cùng các nhận xét hiện tại.
          </span>
        </label>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="ai-agree-study-tip" className="text-xs font-bold text-zinc-800">
              Gợi ý học tập trọng tâm (bắt buộc &ge; {minStudyTipChars} ký tự):
            </label>
            <span
              className={`text-[11px] font-mono tabular-nums font-bold ${
                tipTrim.length >= minStudyTipChars ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {tipTrim.length}/{minStudyTipChars}
            </span>
          </div>
          <textarea
            id="ai-agree-study-tip"
            rows={3}
            value={studyTipNote}
            onChange={(e) => setStudyTipNote(e.target.value)}
            placeholder="Ví dụ: Em nên ưu tiên luyện thêm cấu trúc câu điều kiện và chọn từ vựng học thuật chính xác hơn ở Task 2..."
            className="w-full text-xs p-3 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#932120] leading-relaxed"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
          >
            Quay lại chỉnh sửa
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onConfirm(tipTrim)}
            className="px-5 py-2 bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-2 disabled:opacity-45 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Xác nhận &amp; Công bố</span>
            {!submitting && canSubmit && <CheckCircle2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
