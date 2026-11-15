"use client";

import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { SpeakingPartData } from '@/mocks/exam-speaking';
import type { AnswerState } from '@/hooks/useSpeakingUploadQueue';
import { SpeakingDetailAudioPlayer } from './speaking-detail-audio-player';

interface SpeakingReviewScreenProps {
  testTitle: string;
  parts: SpeakingPartData[];
  answers: Record<string, AnswerState>;
  isMock: boolean;
  submitting: boolean;
  submitError: string | null;
  onBackToExam: () => void;
  onRetakeQuestion: (partNumber: 1 | 2 | 3, questionIndex: number) => void;
  onRetryUpload: (questionId: string) => void;
  onSubmitForAnalysis: () => void;
}

export const SpeakingReviewScreen: React.FC<SpeakingReviewScreenProps> = ({
  testTitle,
  parts,
  answers,
  isMock,
  submitting,
  submitError,
  onBackToExam,
  onRetakeQuestion,
  onRetryUpload,
  onSubmitForAnalysis,
}) => {
  const [selectedPart, setSelectedPart] = useState<1 | 2 | 3>(parts[0]?.part_number ?? 1);

  const activePartData = parts.find((p) => p.part_number === selectedPart) || parts[0];
  const questions = activePartData.questions ?? [];
  const allQuestions = parts.flatMap((part) => part.questions ?? []);
  const answeredCount = allQuestions.filter((q) => !!answers[q.id]).length;
  const unanswered = allQuestions.length - answeredCount;
  const failed = allQuestions.filter((q) => answers[q.id]?.status === 'failed').length;
  const uploading = allQuestions.some((q) => answers[q.id]?.status === 'uploading');

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {isMock ? (
            <div className="w-10" />
          ) : (
            <button
              type="button"
              onClick={onBackToExam}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Quay lại phòng thi"
              aria-label="Quay lại phòng thi"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="text-center min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Kiểm tra trước khi nộp bài
            </p>
            <h1 className="text-sm font-bold text-slate-900 truncate max-w-2xl">{testTitle}</h1>
          </div>

          <div className="w-10" />
        </div>
      </header>

      {/* Main 2-Column Content */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Part Filter + Question Cards */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/90 px-4 py-3 shadow-2xs">
            <div className="flex items-center gap-2">
              {parts.map(({ part_number: pn }) => (
                <button
                  key={pn}
                  type="button"
                  onClick={() => setSelectedPart(pn)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    selectedPart === pn
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Part {pn}
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {questions.length} câu hỏi
            </span>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const answer = answers[q.id];
              return (
                <article
                  key={q.id || idx}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-extrabold">
                      Part {selectedPart} • Câu {idx + 1}
                    </span>

                    {!isMock && (
                      <button
                        type="button"
                        onClick={() => onRetakeQuestion(selectedPart, idx)}
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-xl bg-blue-50/70 hover:bg-blue-100/70 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{answer ? 'Ghi âm lại' : 'Trả lời ngay'}</span>
                      </button>
                    )}
                  </div>

                  <p className="text-sm font-bold text-slate-800 leading-snug">{q.question}</p>

                  {answer?.blobUrl && !isMock && (
                    <SpeakingDetailAudioPlayer src={answer.blobUrl} durationMs={answer.durationMs} />
                  )}
                  {!answer && (
                    <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      Chưa có câu trả lời cho câu hỏi này.
                    </p>
                  )}
                  {answer?.status === 'uploading' && (
                    <p className="text-xs font-medium text-blue-700 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang tải âm thanh lên hệ thống...
                    </p>
                  )}
                  {answer?.status === 'saved' && !answer.blobUrl && (
                    <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đã lưu bản ghi âm
                    </p>
                  )}
                  {answer?.status === 'failed' && (
                    <div className="flex items-center justify-between gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      <span>{answer.error}</span>
                      {answer.blobUrl && (
                        <button
                          type="button"
                          onClick={() => onRetryUpload(q.id)}
                          className="font-bold underline shrink-0 cursor-pointer"
                        >
                          Lưu lại
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>

        {/* Right: Sticky Submission Summary */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-slate-900">Tổng kết bài thi</h2>
            <p className="text-xs text-slate-500">
              Hoàn thành các câu trả lời trước khi gửi sang hệ thống AI chấm điểm.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3">
              <p className="text-[11px] font-semibold text-slate-500">Đã trả lời</p>
              <p className="text-xl font-black text-blue-700 tabular-nums">
                {answeredCount}/{allQuestions.length}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3">
              <p className="text-[11px] font-semibold text-slate-500">Còn trống</p>
              <p className="text-xl font-black text-slate-800 tabular-nums">{unanswered}</p>
            </div>
          </div>

          {unanswered > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs font-medium text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Còn {unanswered} câu chưa trả lời.</span>
            </div>
          )}

          {failed > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs font-medium text-red-700">
              {failed} câu chưa lưu được và sẽ không được chấm nếu bạn nộp bây giờ.
            </div>
          )}

          {submitError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs font-medium text-red-700">
              {submitError}
            </div>
          )}

          {unanswered === 0 && failed === 0 && !submitError && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Tất cả câu trả lời đã sẵn sàng để chấm điểm!</span>
            </div>
          )}

          <button
            type="button"
            onClick={onSubmitForAnalysis}
            disabled={submitting || uploading}
            className="w-full py-3.5 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors text-sm cursor-pointer"
          >
            {submitting || uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>
              {submitting
                ? 'Đang nộp bài...'
                : uploading
                  ? 'Đang lưu câu trả lời...'
                  : 'Nộp bài để chấm'}
            </span>
          </button>
        </aside>
      </main>
    </div>
  );
};
