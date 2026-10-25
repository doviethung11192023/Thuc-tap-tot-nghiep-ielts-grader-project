"use client";

import React, { useState } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, ArrowRight, AlertCircle, X, Sparkles } from 'lucide-react';
import { SpeakingPartData } from '@/mocks/exam-speaking';

interface SpeakingReviewScreenProps {
  testTitle: string;
  parts: SpeakingPartData[];
  onBackToExam: () => void;
  onRetakeQuestion: (partNumber: 1 | 2 | 3, questionIndex: number) => void;
  onRetakeAll: () => void;
  onSubmitForAnalysis: () => void;
}

export const SpeakingReviewScreen: React.FC<SpeakingReviewScreenProps> = ({
  testTitle,
  parts,
  onBackToExam,
  onRetakeQuestion,
  onRetakeAll,
  onSubmitForAnalysis,
}) => {
  const [selectedPart, setSelectedPart] = useState<1 | 2 | 3>(1);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [playingQuestionKey, setPlayingQuestionKey] = useState<string | null>(null);

  const activePartData = parts.find((p) => p.part_number === selectedPart) || parts[0];
  const questions =
    activePartData.questions ||
    (activePartData.cue_card
      ? [
          {
            id: 'p2_cue',
            question_number: 1,
            question: activePartData.cue_card.topic,
            ideas: activePartData.cue_card.ideas,
          },
        ]
      : []);

  return (
    <div className="min-h-screen bg-slate-900/90 text-white flex flex-col justify-between p-4 sm:p-6 relative select-none">
      {/* Background stars */}
      <div className="absolute top-12 left-16 text-white/30 text-2xl">✦</div>
      <div className="absolute top-28 right-24 text-white/40 text-xl">✦</div>
      <div className="absolute bottom-24 right-16 text-white/20 text-2xl">✦</div>

      {/* Top Header */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
        <button
          onClick={onBackToExam}
          className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Quay lại phòng thi"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-xs sm:text-sm font-bold text-white/90 text-center max-w-2xl truncate px-4">
          {testTitle}
        </h1>

        <button
          onClick={() => setIsResetModalOpen(true)}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-red-500/30 text-white/80 hover:text-red-200 transition-colors"
        >
          Làm lại toàn bộ
        </button>
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
            {[1, 2, 3].map((pn) => (
              <button
                key={pn}
                onClick={() => setSelectedPart(pn as 1 | 2 | 3)}
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
            const questionKey = `p${selectedPart}_q${idx + 1}`;
            const isPlaying = playingQuestionKey === questionKey;

            return (
              <div
                key={q.id || idx}
                className="w-full bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/15 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-300">
                    Question {idx + 1}
                  </span>

                  <button
                    onClick={() => onRetakeQuestion(selectedPart, idx)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-blue-100 transition-colors px-2.5 py-1 rounded-lg hover:bg-white/10"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Làm lại</span>
                  </button>
                </div>

                <p className="text-sm font-medium text-white leading-snug">
                  {q.question}
                </p>

                {/* Audio Player Bar */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => setPlayingQuestionKey(isPlaying ? null : questionKey)}
                    className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-transform hover:scale-105 shrink-0"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>

                  <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-blue-400 transition-all ${
                        isPlaying ? 'w-1/2 animate-pulse' : 'w-0'
                      }`}
                    ></div>
                  </div>

                  <span className="text-[11px] font-mono text-white/60">
                    {isPlaying ? '00:03/00:07' : '00:00/00:07'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="w-full max-w-md mx-auto relative z-10 pt-4 flex flex-col items-center space-y-2">
        <div className="text-xs font-medium text-white/80 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-300" />
          <span>Đến lúc phân tích rồi</span>
        </div>

        <button
          onClick={onSubmitForAnalysis}
          className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all hover:scale-102 active:scale-98 text-sm sm:text-base"
        >
          <span>Phân tích</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-slate-800 shadow-2xl text-center space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Bạn có muốn làm lại toàn bộ bài?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Thao tác này sẽ xoá tất cả bài làm hiện tại của bạn.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setIsResetModalOpen(false);
                  onRetakeAll();
                }}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Làm lại bài
              </button>

              <button
                onClick={() => setIsResetModalOpen(false)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition-colors"
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
