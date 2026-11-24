"use client";

import React, { useState } from 'react';
import { ShieldCheck, Type, BookOpen, Activity, X } from 'lucide-react';

interface SpeakingIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const SpeakingIntroModal: React.FC<SpeakingIntroModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('moonlab_speaking_intro_dismissed', 'true');
      } catch (e) {
        // ignore
      }
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden p-6 sm:p-8 animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Giới thiệu về IELTS Speaking
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Một số thông tin quan trọng bạn cần biết về bài thi IELTS Speaking:
          </p>
        </div>

        {/* Exam Format Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-xs text-slate-300 font-medium mb-5">
          <div>
            <span className="text-slate-400 block font-normal">Hình thức:</span>
            <span className="font-semibold text-white">Phỏng vấn 1-1</span>
          </div>
          <div>
            <span className="text-slate-400 block font-normal">Thời gian thi:</span>
            <span className="font-semibold text-white">11 tới 14 phút</span>
          </div>
          <div>
            <span className="text-slate-400 block font-normal">Số phần thi:</span>
            <span className="font-semibold text-white">3 phần</span>
          </div>
        </div>

        {/* Criteria List */}
        <div className="space-y-3 mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Tiêu chí chấm bài
          </h3>

          <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-[#932120]/25 text-rose-300 border border-[#932120]/40 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Fluency and Coherence</div>
              <div className="text-xs text-slate-400">Trả lời câu hỏi trôi chảy và đúng nội dung</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Lexical Resource</div>
              <div className="text-xs text-slate-400">Vốn từ vựng</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Grammatical Range and Accuracy</div>
              <div className="text-xs text-slate-400">Sử dụng ngữ pháp đa dạng và chính xác</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Pronunciation</div>
              <div className="text-xs text-slate-400">Phát âm</div>
            </div>
          </div>
        </div>

        {/* Band Scale Info */}
        <div className="text-xs text-slate-300 bg-slate-800/70 p-3 rounded-xl border border-slate-700/80 mb-5">
          <span className="font-semibold text-white">Thang điểm: </span>
          Band 1.0 (không thể giao tiếp) tới Band 9.0 (nói thành thạo, tự nhiên tương tự người bản xứ).
        </div>

        {/* Motivational Greeting */}
        <div className="flex items-center gap-2 mb-5 text-sm font-semibold text-rose-200 bg-[#932120]/25 border border-[#932120]/40 p-2.5 rounded-xl">
          <span>✨</span>
          <span>Chúc bạn làm bài tốt!!</span>
        </div>

        {/* Checkbox & Confirm Button */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded text-[#932120] focus:ring-[#932120] border-slate-600 bg-slate-800"
            />
            <span>Tôi đã hiểu. Không hiển thị lại lần sau</span>
          </label>

          <button
            onClick={handleConfirm}
            className="w-full py-3 px-4 bg-[#932120] hover:bg-[#7a1a19] text-white font-semibold rounded-2xl shadow-lg shadow-red-950/40 transition-all text-sm cursor-pointer"
          >
            Tôi đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
