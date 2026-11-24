"use client";

import React, { useEffect, useState } from "react";
import { X, Target, Calendar, Loader2, Save, AlertCircle, Sparkles } from "lucide-react";
import type { GoalUpdatePayload, LearningProfileGoals } from "@/types/learning-profile";

interface GoalSetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoals: LearningProfileGoals;
  onSave: (payload: GoalUpdatePayload) => Promise<boolean>;
  saving: boolean;
}

const BAND_OPTIONS = [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0];

function roundIeltsBand(v: number): number {
  const w = Math.floor(v);
  const r = v - w;
  return r < 0.25 ? w : r < 0.75 ? w + 0.5 : w + 1;
}

export function GoalSetterModal({ isOpen, onClose, currentGoals, onSave, saving }: GoalSetterModalProps) {
  const [inputBand, setInputBand] = useState<number>(currentGoals.input_band || 4.0);
  const [targetOverall, setTargetOverall] = useState<number>(currentGoals.target_band || 6.5);
  const [targetL, setTargetL] = useState<number>(currentGoals.target_listening || currentGoals.target_band || 7.0);
  const [targetR, setTargetR] = useState<number>(currentGoals.target_reading || currentGoals.target_band || 7.0);
  const [targetW, setTargetW] = useState<number>(currentGoals.target_writing || 6.0);
  const [targetS, setTargetS] = useState<number>(currentGoals.target_speaking || 6.0);
  const [testDate, setTestDate] = useState<string>(currentGoals.test_date || "");

  const syncKey = `${isOpen}-${currentGoals.input_band}-${currentGoals.target_band}-${currentGoals.target_listening}-${currentGoals.target_reading}-${currentGoals.target_writing}-${currentGoals.target_speaking}-${currentGoals.test_date}`;
  const [prevKey, setPrevKey] = useState(syncKey);

  if (prevKey !== syncKey) {
    setPrevKey(syncKey);
    if (isOpen) {
      setInputBand(currentGoals.input_band || 4.0);
      setTargetOverall(currentGoals.target_band || 6.5);
      setTargetL(currentGoals.target_listening || currentGoals.target_band || 7.0);
      setTargetR(currentGoals.target_reading || currentGoals.target_band || 7.0);
      setTargetW(currentGoals.target_writing || 6.0);
      setTargetS(currentGoals.target_speaking || 6.0);
      setTestDate(currentGoals.test_date || "");
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const invalidBandRange = targetOverall < inputBand;
  const computedOverall = roundIeltsBand((targetL + targetR + targetW + targetS) / 4);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalidBandRange) return;
    const success = await onSave({
      input_band: Number(inputBand),
      target_overall: Number(targetOverall),
      target_listening: Number(targetL),
      target_reading: Number(targetR),
      target_writing: Number(targetW),
      target_speaking: Number(targetS),
      test_date: testDate,
    });
    if (success) onClose();
  };

  const skillTargets = [
    { label: "Listening", value: targetL, setter: setTargetL },
    { label: "Reading", value: targetR, setter: setTargetR },
    { label: "Writing", value: targetW, setter: setTargetW },
    { label: "Speaking", value: targetS, setter: setTargetS },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#932120]/10 flex items-center justify-center text-[#932120]">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 id="goal-modal-title" className="text-base font-bold text-zinc-900">Thiết Lập Mục Tiêu Cá Nhân Hóa</h3>
              <p className="text-xs text-zinc-500">Điều chỉnh band từng kỹ năng để thuật toán chọn đề chính xác</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng hộp thoại" className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Đầu vào (Input Band):</label>
              <select value={inputBand} onChange={(e) => setInputBand(parseFloat(e.target.value))} className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#932120]">
                {BAND_OPTIONS.map((b) => <option key={b} value={b}>Band {b.toFixed(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Mục tiêu Tổng (Target Overall):</label>
              <select value={targetOverall} onChange={(e) => setTargetOverall(parseFloat(e.target.value))} className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white font-bold text-[#932120] focus:outline-none focus:ring-1 focus:ring-[#932120]">
                {BAND_OPTIONS.map((b) => <option key={b} value={b}>Band {b.toFixed(1)}</option>)}
              </select>
            </div>
          </div>

          {invalidBandRange && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-rose-700 font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Mục tiêu tổng ({targetOverall.toFixed(1)}) không thể thấp hơn đầu vào ({inputBand.toFixed(1)}).</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-zinc-700">Mục tiêu chi tiết 4 kỹ năng (BR-17):</p>
              <button
                type="button"
                onClick={() => setTargetOverall(Math.max(inputBand, computedOverall))}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#932120] hover:underline cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Khớp Overall ({computedOverall.toFixed(1)})
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {skillTargets.map((st) => (
                <div key={st.label}>
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">{st.label}</label>
                  <select value={st.value} onChange={(e) => st.setter(parseFloat(e.target.value))} className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg bg-white font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2563eb]">
                    {BAND_OPTIONS.map((b) => <option key={b} value={b}>{b.toFixed(1)}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Ngày dự kiến thi thực tế:
            </label>
            <input type="date" min={todayIso} value={testDate} onChange={(e) => setTestDate(e.target.value)} className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#932120]" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-zinc-300 rounded-xl font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer">Hủy</button>
            <button type="submit" disabled={saving || invalidBandRange} className="px-5 py-2 bg-[#932120] text-white rounded-xl font-bold hover:bg-[#7a1a19] disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Lưu Mục Tiêu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
