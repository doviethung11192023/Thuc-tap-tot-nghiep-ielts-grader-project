"use client";

import React, { useEffect, useState } from 'react';
import { Volume2, Sparkles, Mic } from 'lucide-react';
import type { SpeakingPartQuestionItem } from "@/types/exam-speaking";
import type { RoomPhase } from '@/hooks/useSpeakingRoomMachine';
import type { AnswerState } from '@/hooks/useSpeakingUploadQueue';
import { SpeakingAnswerControls } from './speaking-answer-controls';

interface SpeakingVirtualRoomStageProps {
  partNumber: 1 | 2 | 3;
  questionIndex: number;
  totalQuestions: number;
  questionItem?: SpeakingPartQuestionItem;
  cueCard?: { topic: string; bullet_points: string[] };
  phase: RoomPhase;
  secondsLeft: number;
  isMock: boolean;
  answer?: AnswerState;
  getLevel?: () => number;
  onReplayPrompt: () => void;
  onStop: () => void;
  onSkipPreparation: () => void;
  onRerecord: () => void;
  onRetryUpload: () => void;
  onNextQuestion: () => void;
}

const BAR_WEIGHTS = [0.45, 0.7, 0.9, 1.0, 0.8, 0.95, 0.65, 0.85, 1.0, 0.75, 0.6, 0.4];

export const SpeakingVirtualRoomStage: React.FC<SpeakingVirtualRoomStageProps> = ({
  partNumber,
  questionIndex,
  totalQuestions,
  questionItem,
  cueCard,
  phase,
  secondsLeft,
  isMock,
  answer,
  getLevel,
  onReplayPrompt,
  onStop,
  onSkipPreparation,
  onRerecord,
  onRetryUpload,
  onNextQuestion,
}) => {
  const isRecording = phase === 'recording';
  const [micLevel, setMicLevel] = useState(0);

  useEffect(() => {
    if (!isRecording || !getLevel) {
      setMicLevel(0);
      return;
    }
    const timer = setInterval(() => {
      setMicLevel(getLevel());
    }, 80);
    return () => clearInterval(timer);
  }, [isRecording, getLevel]);

  // Thi thử phát câu hỏi 1 lần, không nghe lại (BR-13)
  const canReplay = !isMock && !!questionItem?.audio_prompt_url && phase === 'finished';

  return (
    <div className="flex-1 flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-extrabold">
            Part {partNumber}
          </span>
          <span className="text-slate-400">›</span>
          <span>
            Câu {questionIndex + 1} / {totalQuestions}
          </span>
        </div>
      </div>

      <div className="flex-1 w-full bg-gradient-to-b from-[#006fe6] to-[#0082f6] rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[420px]">
        <div className="flex justify-center mb-4 h-12">
          {canReplay && (
            <button
              type="button"
              onClick={onReplayPrompt}
              aria-label="Nghe lại câu hỏi"
              className="w-12 h-12 rounded-2xl bg-white/95 hover:bg-white text-blue-600 shadow-md flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              title="Nghe lại câu hỏi"
            >
              <Volume2 className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          {partNumber === 2 && cueCard ? (
            <div className="space-y-4 max-w-lg text-left bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/20 w-full">
              <h2 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                {cueCard.topic}
              </h2>
              {cueCard.bullet_points.length > 0 && (
                <div className="space-y-1.5 text-xs sm:text-sm text-blue-50">
                  <p className="font-semibold text-white">You should say:</p>
                  {cueCard.bullet_points.map((point, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-blue-200 font-bold">•</span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white leading-tight max-w-2xl drop-shadow-xs">
              {questionItem?.question}
            </h2>
          )}
        </div>

        <div className="relative pt-6 flex flex-col items-center justify-end gap-3">
          {isRecording && (
            <div
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 backdrop-blur-xs border border-white/25"
              aria-label="Mức âm thanh micro trực tiếp"
            >
              <Mic className="w-3.5 h-3.5 text-rose-200 animate-pulse shrink-0" />
              <div className="flex items-center gap-1 h-5">
                {BAR_WEIGHTS.map((weight, idx) => {
                  const pct = Math.min(100, Math.max(18, micLevel * 550 * weight));
                  return (
                    <span
                      key={idx}
                      className="w-1 rounded-full bg-white transition-[height] duration-75"
                      style={{ height: `${pct}%` }}
                    />
                  );
                })}
              </div>
              <span className="text-[11px] font-bold text-white/95 ml-1">Đang thu âm</span>
            </div>
          )}

          <div className="absolute -bottom-4 left-0 right-0 h-16 bg-white/20 blur-md rounded-t-[50%] pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center text-blue-600 border-2 border-blue-200">
              <div className="relative">
                <Sparkles className="w-8 h-8 text-blue-600" />
                {isRecording && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                )}
              </div>
            </div>
            <span className="text-[11px] font-bold text-white/90 mt-1.5 drop-shadow-xs">
              MoonLab AI Examiner
            </span>
          </div>
        </div>
      </div>

      <SpeakingAnswerControls
        phase={phase}
        secondsLeft={secondsLeft}
        isMock={isMock}
        isPart2={partNumber === 2}
        answer={answer}
        onStop={onStop}
        onSkipPreparation={onSkipPreparation}
        onRerecord={onRerecord}
        onRetryUpload={onRetryUpload}
        onNext={onNextQuestion}
      />
    </div>
  );
};
