"use client";

import React, { useState } from "react";
import { X, Target, Calendar, Award, Loader2, Save } from "lucide-react";
import type { GoalUpdatePayload, LearningProfileGoals } from "@/types/learning-profile";

interface GoalSetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoals: LearningProfileGoals;
  onSave: (payload: GoalUpdatePayload) => Promise<boolean>;
  saving: boolean;
}

export function GoalSetterModal({
  isOpen,
  onClose,
  currentGoals,
  onSave,
  saving,
}: GoalSetterModalProps) {
  const [inputBand, setInputBand] = useState<number>(currentGoals.input_band || 4.5);
  const [targetOverall, setTargetOverall] = useState<number>(currentGoals.target_band || 6.5);
  // Chưa chọn ngày thi thì để trống, không tự điền ngày giả (spec 005)
  const [testDate, setTestDate] = useState<string>(currentGoals.test_date || "");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave({
      input_band: Number(inputBand),
      target_overall: Number(targetOverall),
      ...(testDate ? { test_date: testDate } : {}),
    });
    if (success) {
      onClose();
    }
  };

  const BAND_OPTIONS = [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#932120]/10 flex items-center justify-center text-[#932120]">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Thiết Lập Mục Tiêu Học Tập</h3>
              <p className="text-xs text-zinc-500">Cá nhân hóa lộ trình và dự đoán band điểm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">
              Trình độ đầu vào hiện tại (Input Band):
            </label>
            <select
              value={inputBand}
              onChange={(e) => setInputBand(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#932120]"
            >
              {BAND_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  Band {b.toFixed(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">
              Mục tiêu điểm số IELTS mong muốn (Target Overall):
            </label>
            <select
              value={targetOverall}
              onChange={(e) => setTargetOverall(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white font-bold text-[#932120] focus:outline-none focus:ring-1 focus:ring-[#932120]"
            >
              {BAND_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  Band {b.toFixed(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              Ngày dự kiến thi thực tế:
            </label>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#932120]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-300 rounded-xl font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#932120] text-white rounded-xl font-bold hover:bg-[#7a1a19] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Lưu Mục Tiêu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
