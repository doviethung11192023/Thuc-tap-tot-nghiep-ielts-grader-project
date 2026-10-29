"use client";

import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Send, ArrowLeft, Clock, HelpCircle } from 'lucide-react';

interface SubmitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalQuestions: number;
  answeredCount: number;
  unansweredQuestionNumbers: number[];
  timerFormatted?: string;
  onJumpToQuestion?: (qNum: number) => void;
}

export function SubmitConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  totalQuestions,
  answeredCount,
  unansweredQuestionNumbers,
  timerFormatted,
  onJumpToQuestion,
}: SubmitConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unansweredCount = unansweredQuestionNumbers.length;
  const isComplete = unansweredCount === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div 
        className="w-full max-w-md bg-white rounded-3xl border border-zinc-200 shadow-2xl p-6 sm:p-7 relative overflow-hidden transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs border ${
            isComplete 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
              : 'bg-amber-50 border-amber-200 text-amber-600'
          }`}>
            {isComplete ? (
              <CheckCircle2 className="w-7 h-7" />
            ) : (
              <AlertTriangle className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1">
            <h3 id="submit-modal-title" className="text-xl font-black text-zinc-900 tracking-tight">
              {isComplete ? 'Xác nhận nộp bài thi' : 'Bạn vẫn còn câu chưa hoàn thành!'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 font-medium">
              {isComplete 
                ? 'Bạn đã trả lời đầy đủ tất cả câu hỏi trong bài thi.'
                : `Hệ thống ghi nhận bạn còn ${unansweredCount} câu chưa điền câu trả lời.`}
            </p>
          </div>
        </div>

        {/* Stats card */}
        <div className="my-5 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-600">
            <span>Tiến độ làm bài:</span>
            <span className={`font-black ${isComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
              {answeredCount}/{totalQuestions} câu ({Math.round((answeredCount / Math.max(1, totalQuestions)) * 100)}%)
            </span>
          </div>

          <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isComplete ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, Math.round((answeredCount / Math.max(1, totalQuestions)) * 100))}%` }}
            />
          </div>

          {timerFormatted && (
            <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/60 font-medium">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                Thời gian bài làm:
              </span>
              <span className="font-bold text-zinc-700">{timerFormatted}</span>
            </div>
          )}
        </div>

        {/* Unanswered questions preview badges */}
        {!isComplete && (
          <div className="mb-5 space-y-2">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
              Các câu chưa trả lời ({unansweredCount}):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 custom-scrollbar">
              {unansweredQuestionNumbers.slice(0, 16).map((qNum) => (
                <button
                  key={qNum}
                  type="button"
                  onClick={() => {
                    onClose();
                    onJumpToQuestion?.(qNum);
                  }}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                  title={`Bấm để chuyển nhanh tới Câu ${qNum}`}
                >
                  Câu {qNum}
                </button>
              ))}
              {unansweredQuestionNumbers.length > 16 && (
                <span className="px-2 py-1 text-[11px] text-zinc-400 font-semibold">
                  +{unansweredQuestionNumbers.length - 16} câu khác
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={`w-full sm:flex-1 h-11 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isComplete
                ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                : 'bg-[#932120] text-white hover:bg-[#7a1a19] shadow-xs active:scale-95'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isComplete ? 'Kiểm tra lại' : 'Tiếp tục làm bài'}</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`w-full sm:flex-1 h-11 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isComplete
                ? 'bg-[#932120] text-white hover:bg-[#7a1a19] shadow-xs active:scale-95'
                : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{isComplete ? 'Nộp bài ngay' : 'Vẫn nộp bài'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
