"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Search, UserCheck, X } from "lucide-react";
import type { AdminExpertWorkload, AdminReviewItem } from "@/services/admin-reviews";

interface AdminAssignExpertModalProps {
  review: AdminReviewItem | null;
  experts: AdminExpertWorkload[];
  submitting: boolean;
  onClose: () => void;
  onConfirm: (expertId: string, note: string) => Promise<void>;
}

export function AdminAssignExpertModal({
  review,
  experts,
  submitting,
  onClose,
  onConfirm,
}: AdminAssignExpertModalProps) {
  const [selectedExpertId, setSelectedExpertId] = useState<string>("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!review) return;
    setSelectedExpertId("");
    setNote("");
    setQuery("");
  }, [review]);

  useEffect(() => {
    if (!review) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [review, submitting, onClose]);

  if (!review) return null;

  const currentExpertId = review.current_assignment?.expert_id;
  const activeExperts = experts.filter((e) => e.is_active);
  const filteredExperts = activeExperts.filter((e) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return e.email.toLowerCase().includes(q) || e.full_name.toLowerCase().includes(q);
  });

  const selectedExpert = activeExperts.find((e) => e.user_id === selectedExpertId);
  const isOverrideSelected =
    selectedExpert &&
    (!selectedExpert.is_available || selectedExpert.active_open >= selectedExpert.max_active_reviews);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-expert-modal-title"
    >
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#932120]/10 text-[#932120] flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="assign-expert-modal-title" className="text-lg font-bold text-zinc-900 truncate">
                {currentExpertId ? "Chuyển giao Chuyên gia (Admin Override)" : "Gán Chuyên gia Chấm bài"}
              </h2>
              <p className="text-xs text-zinc-500 truncate">
                Yêu cầu #{review.request_id.slice(0, 8)} · {review.learner.email} · {review.skill.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng hộp thoại"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {review.current_assignment?.started_at && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Chuyên gia hiện tại đã mở bản nháp chấm bài</p>
                <p className="text-amber-800 mt-0.5">
                  Nếu chuyển giao ngay lúc này, lượt phân công của{" "}
                  <span className="font-semibold">{review.current_assignment.expert_email}</span> sẽ đóng với trạng thái{" "}
                  <code className="px-1 py-0.5 bg-amber-100 rounded">reassigned</code>.
                </p>
              </div>
            </div>
          )}

          {/* Search expert */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm chuyên gia theo tên hoặc email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#932120]/20 focus:border-[#932120]"
            />
          </div>

          {/* Expert list */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {filteredExperts.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-6">Không tìm thấy chuyên gia phù hợp.</p>
            ) : (
              filteredExperts.map((exp) => {
                const isCurrent = exp.user_id === currentExpertId;
                const isSelected = exp.user_id === selectedExpertId;
                const isOverloaded = exp.active_open >= exp.max_active_reviews;
                const loadPct = Math.min(100, Math.round((exp.active_open / Math.max(exp.max_active_reviews, 1)) * 100));

                return (
                  <button
                    key={exp.user_id}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => setSelectedExpertId(exp.user_id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isCurrent
                        ? "bg-zinc-50 border-zinc-200 opacity-60 cursor-not-allowed"
                        : isSelected
                        ? "bg-[#932120]/5 border-[#932120] ring-2 ring-[#932120]/15 cursor-pointer"
                        : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/70 cursor-pointer"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-zinc-900 truncate">{exp.full_name}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-zinc-200 text-zinc-700">
                            Đang giữ bài
                          </span>
                        )}
                        {exp.is_available ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Sẵn sàng
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Tạm nghỉ (Admin Override)
                          </span>
                        )}
                        {isOverloaded && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            Đầy tải
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{exp.email}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right w-24">
                        <div className="text-xs font-bold text-zinc-700">
                          {exp.active_open}/{exp.max_active_reviews} bài
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              isOverloaded ? "bg-red-500" : loadPct >= 70 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${loadPct}%` }}
                          />
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? "bg-[#932120] border-[#932120] text-white" : "border-zinc-300"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {isOverrideSelected && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
              Chuyên gia này đang bật chế độ tạm nghỉ hoặc đã chạm giới hạn tải. Bạn đang thực hiện quyền gán trực tiếp của Admin.
            </p>
          )}

          {/* Note */}
          <div>
            <label htmlFor="admin-reassign-note" className="block text-xs font-bold text-zinc-700 mb-1.5">
              Ghi chú điều phối (tùy chọn)
            </label>
            <input
              id="admin-reassign-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Điều phối sang chuyên gia phụ trách trực tiếp..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#932120]/20 focus:border-[#932120]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/70 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-sm font-bold text-zinc-700 cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={!selectedExpertId || submitting}
            onClick={() => void onConfirm(selectedExpertId, note)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#932120] hover:bg-[#7a1b1a] text-white text-sm font-bold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {currentExpertId ? "Xác nhận chuyển giao" : "Xác nhận gán bài"}
          </button>
        </div>
      </div>
    </div>
  );
}
