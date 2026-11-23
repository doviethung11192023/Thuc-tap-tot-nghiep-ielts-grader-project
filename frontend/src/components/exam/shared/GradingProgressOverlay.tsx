"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Sparkles, BookOpen, Headphones } from 'lucide-react';

interface GradingProgressOverlayProps {
  isOpen: boolean;
  skill?: 'reading' | 'listening' | 'writing' | 'speaking';
  title?: string;
}

const STEPS = [
  { id: 1, label: 'Lưu bài làm & đồng bộ câu trả lời của thí sinh' },
  { id: 2, label: 'AI Examiner đối soát đáp án & trích xuất dẫn chứng bài thi' },
  { id: 3, label: 'Quy đổi IELTS Band Score chuẩn Cambridge & phân tích chi tiết' },
];

export function GradingProgressOverlay({ isOpen, skill = 'reading', title }: GradingProgressOverlayProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setProgress(25);
      return;
    }

    const t1 = setTimeout(() => {
      setCurrentStep(2);
      setProgress(65);
    }, 900);

    const t2 = setTimeout(() => {
      setCurrentStep(3);
      setProgress(95);
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isReading = skill === 'reading';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
    >
      <div className="w-full max-w-md bg-white rounded-3xl border border-zinc-200 shadow-2xl p-7 text-center space-y-6 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-100/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        {/* Brand Icon & Spinner */}
        <div className="relative z-10 flex flex-col items-center space-y-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[#932120] flex items-center justify-center text-white shadow-lg shadow-red-900/20">
              {isReading ? <BookOpen className="w-8 h-8" /> : <Headphones className="w-8 h-8" />}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-xs border border-zinc-200">
              <Loader2 className="w-4 h-4 text-[#932120] animate-spin" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-[#932120] text-xs font-bold border border-red-100">
              <Sparkles className="w-3.5 h-3.5 text-[#932120]" />
              <span>Hệ thống AI IELTS Examiner</span>
            </div>
            <h3 className="text-xl font-black text-zinc-900 tracking-tight">
              Đang Chấm & Phân Tích Bài Thi
            </h3>
            {title && (
              <p className="text-xs text-zinc-500 font-medium line-clamp-1 max-w-xs mx-auto">
                {title}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2 relative z-10">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-600">
            <span>Tiến độ xử lý</span>
            <span className="text-[#932120]">{progress}%</span>
          </div>
          <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden border border-zinc-200/60">
            <div
              className="h-full bg-[#932120] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stepper Checklist */}
        <div className="space-y-2.5 text-left relative z-10">
          {STEPS.map((step) => {
            const isDone = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div
                key={step.id}
                className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                  isCurrent
                    ? 'bg-red-50/70 border-red-200 text-zinc-900 font-bold'
                    : isDone
                    ? 'bg-zinc-50 border-zinc-200 text-zinc-600 font-medium'
                    : 'bg-white border-zinc-100 text-zinc-400 opacity-60 font-medium'
                }`}
              >
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-[#932120] animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-zinc-300 text-[10px] flex items-center justify-center text-zinc-400">
                      {step.id}
                    </div>
                  )}
                </div>
                <span className="text-xs leading-tight">{step.label}</span>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-zinc-400 font-medium relative z-10">
          Vui lòng đợi giây lát, hệ thống đang chuẩn bị bảng kết quả chi tiết...
        </p>
      </div>
    </div>
  );
}
