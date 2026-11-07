"use client";

import React, { useState } from 'react';
import { ArrowLeft, RotateCcw, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import type { SpeakingPartData } from '@/mocks/exam-speaking';
import type { AnswerState } from '@/hooks/useSpeakingUploadQueue';
import { SpeakingRecordedAudio } from './speaking-recorded-audio';

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
  const unanswered = allQuestions.filter((q) => !answers[q.id]).length;
  const failed = allQuestions.filter((q) => answers[q.id]?.status === 'failed').length;
  const uploading = allQuestions.some((q) => answers[q.id]?.status === 'uploading');

  return (
    <div className="min-h-screen bg-slate-900/90 text-white flex flex-col justify-between p-4 sm:p-6 relative select-none">
      {/* Background stars */}
      <div className="absolute top-12 left-16 text-white/30 text-2xl">✦</div>
      <div className="absolute top-28 right-24 text-white/40 text-xl">✦</div>
      <div className="absolute bottom-24 right-16 text-white/20 text-2xl">✦</div>

      {/* Top Header */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
        {isMock ? <div className="w-10" /> : (
          <button
            onClick={onBackToExam}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Quay lại phòng thi"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <h1 className="text-xs sm:text-sm font-bold text-white/90 text-center max-w-2xl truncate px-4">
          {testTitle}
        </h1>

        <div className="w-10" />
      </div>

      {/* Main Review Section */}
      <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col items-center justify-center py-6 relative z-10">
        {/* Title & Pills */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6 text-center">
          Xem lại bài làm
        </h2>

        {/* Part Tabs and Question Count */}
        <div className="w-full flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            {parts.map(({ part_number: pn }) => (
              <button
                key={pn}
                onClick={() => setSelectedPart(pn)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedPart === pn
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Part {pn}
              </button>
            ))}
          </div>

          <div className="text-xs font-medium text-white/60 bg-white/10 px-3 py-1 rounded-full">
            {questions.length} question{questions.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Question Cards List */}
        <div className="w-full space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {questions.map((q, idx) => {
            const answer = answers[q.id];
            return (
              <div
                key={q.id || idx}
                className="w-full bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/15 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-300">Question {idx + 1}</span>
                  {!isMock && (
                    <button
                      onClick={() => onRetakeQuestion(selectedPart, idx)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-blue-100 transition-colors px-2.5 py-1 rounded-lg hover:bg-white/10"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{answer ? 'Làm lại' : 'Trả lời'}</span>
                    </button>
                  )}
                </div>

                <p className="text-sm font-medium text-white leading-snug">{q.question}</p>

                {answer?.blobUrl && !isMock && <SpeakingRecordedAudio src={answer.blobUrl} className="w-full h-9" />}
                {!answer && <p className="text-xs text-amber-300">Chưa có câu trả lời</p>}
                {answer?.status === 'uploading' && <p className="text-xs text-white/70">Đang lưu...</p>}
                {answer?.status === 'saved' && !answer.blobUrl && <p className="text-xs text-emerald-300">Đã lưu</p>}
                {answer?.status === 'failed' && (
                  <div className="flex items-center justify-between gap-2 text-xs text-red-300">
                    <span>{answer.error}</span>
                    {answer.blobUrl && (
                      <button onClick={() => onRetryUpload(q.id)} className="font-semibold underline shrink-0">Lưu lại</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="w-full max-w-md mx-auto relative z-10 pt-4 flex flex-col items-center space-y-2">
        {unanswered > 0 && (
          <div className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Còn {unanswered} câu chưa trả lời</span>
          </div>
        )}
        {failed > 0 && <p className="text-xs text-red-300 text-center">{failed} câu chưa lưu được và sẽ không được chấm nếu bạn nộp bây giờ.</p>}
        {submitError && <p className="text-xs text-red-300 text-center">{submitError}</p>}
        {unanswered === 0 && failed === 0 && !submitError && (
          <div className="text-xs font-medium text-white/80 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Đến lúc phân tích rồi</span>
          </div>
        )}

        <button
          onClick={onSubmitForAnalysis}
          disabled={submitting || uploading}
          className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all text-sm sm:text-base"
        >
          <span>{submitting ? 'Đang nộp bài...' : uploading ? 'Đang lưu câu trả lời...' : 'Nộp bài để chấm'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
