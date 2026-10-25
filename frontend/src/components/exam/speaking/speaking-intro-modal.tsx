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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-6 sm:p-8 animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            Giới thiệu về IELTS Speaking
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Một số thông tin quan trọng bạn cần biết về bài thi IELTS Speaking:
          </p>
        </div>

        {/* Exam Format Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 font-medium mb-5">
          <div>
            <span className="text-slate-400 block font-normal">Hình thức:</span>
            <span className="font-semibold text-slate-800">Phỏng vấn 1-1</span>
          </div>
          <div>
            <span className="text-slate-400 block font-normal">Thời gian thi:</span>
            <span className="font-semibold text-slate-800">11 tới 14 phút</span>
          </div>
          <div>
            <span className="text-slate-400 block font-normal">Số phần thi:</span>
            <span className="font-semibold text-slate-800">3 phần</span>
          </div>
        </div>

        {/* Criteria List */}
        <div className="space-y-3 mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Tiêu chí chấm bài
          </h3>

          <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-blue-50/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">Fluency and Coherence</div>
              <div className="text-xs text-slate-500">Trả lời câu hỏi trôi chảy và đúng nội dung</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-blue-50/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">Lexical Resource</div>
              <div className="text-xs text-slate-500">Vốn từ vựng</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-blue-50/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">Grammatical Range and Accuracy</div>
              <div className="text-xs text-slate-500">Sử dụng ngữ pháp đa dạng và chính xác</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-blue-50/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">Pronunciation</div>
              <div className="text-xs text-slate-500">Phát âm</div>
            </div>
          </div>
        </div>

        {/* Band Scale Info */}
        <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-5">
          <span className="font-semibold text-slate-800">Thang điểm: </span>
          Band 1.0 (không thể giao tiếp) tới Band 9.0 (nói thành thạo, tự nhiên tương tự người bản xứ).
        </div>

        {/* Motivational Greeting */}
        <div className="flex items-center gap-2 mb-5 text-sm font-semibold text-blue-700 bg-blue-50/60 p-2.5 rounded-xl">
          <span>✨</span>
          <span>Chúc bạn làm bài tốt!!</span>
        </div>

        {/* Checkbox & Confirm Button */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <span>Tôi đã hiểu. Không hiển thị lại lần sau</span>
          </label>

          <button
            onClick={handleConfirm}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25 transition-all text-sm"
          >
            Tôi đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
