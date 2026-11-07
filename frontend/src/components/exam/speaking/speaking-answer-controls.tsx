"use client";

import React from 'react';
import { ArrowRight, Check, RotateCcw, Square } from 'lucide-react';
import type { AnswerState } from '@/hooks/useSpeakingUploadQueue';
import type { RoomPhase } from '@/hooks/useSpeakingRoomMachine';
import { SpeakingRecordedAudio } from './speaking-recorded-audio';

interface SpeakingAnswerControlsProps {
  phase: RoomPhase;
  secondsLeft: number;
  isMock: boolean;
  isPart2: boolean;
  answer?: AnswerState;
  onStop: () => void;
  onSkipPreparation: () => void;
  onRerecord: () => void;
  onRetryUpload: () => void;
  onNext: () => void;
}

const formatSeconds = (sec: number) =>
  `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;

function StatusLine({ phase, secondsLeft, isPart2, answer }: Pick<SpeakingAnswerControlsProps, 'phase' | 'secondsLeft' | 'isPart2' | 'answer'>) {
  if (phase === 'asking') return <span>🎧 Giám khảo đang đọc câu hỏi...</span>;
  if (phase === 'preparing') {
    return (
      <span>
        ⏱️ {isPart2 ? 'Chuẩn bị' : 'Suy nghĩ'}: <strong className="text-blue-600 font-bold font-mono">{secondsLeft}s</strong>, sau đó tự bắt đầu ghi âm
      </span>
    );
  }
  if (phase === 'recording') {
    return (
      <span className="text-red-600 font-semibold flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
        Đang ghi âm, còn {formatSeconds(secondsLeft)}
      </span>
    );
  }
  if (answer?.status === 'uploading') return <span>Đang lưu câu trả lời...</span>;
  if (answer?.status === 'failed') return <span className="text-red-600 font-medium">{answer.error}</span>;
  if (answer?.status === 'saved') {
    return (
      <span className="text-emerald-700 font-medium flex items-center gap-1">
        <Check className="w-3.5 h-3.5" /> Đã lưu câu trả lời
      </span>
    );
  }
  return <span>Câu này chưa có câu trả lời</span>;
}

export const SpeakingAnswerControls: React.FC<SpeakingAnswerControlsProps> = ({
  phase, secondsLeft, isMock, isPart2, answer, onStop, onSkipPreparation, onRerecord, onRetryUpload, onNext,
}) => (
  <div className="w-full flex flex-col items-center space-y-3 pt-2">
    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200/60 px-3.5 py-1.5 rounded-full">
      <StatusLine phase={phase} secondsLeft={secondsLeft} isPart2={isPart2} answer={answer} />
    </div>

    <div className="w-full flex items-center justify-center gap-3 max-w-md">
      {phase === 'finished' && answer?.blobUrl && !isMock && (
        <SpeakingRecordedAudio src={answer.blobUrl} className="flex-1 min-w-0 h-10" />
      )}

      {phase === 'preparing' && !isMock && (
        <button onClick={onSkipPreparation} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xs shrink-0">
          Bắt đầu nói ngay
        </button>
      )}

      {phase === 'recording' && (
        <button onClick={onStop} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-xs shadow-md shadow-red-500/20 flex items-center gap-2">
          <Square className="w-3 h-3 fill-white" />
          <span>Đã nói xong</span>
        </button>
      )}

      {phase === 'finished' && answer?.status === 'failed' && (
        <button onClick={onRetryUpload} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-bold text-xs shrink-0">
          Lưu lại
        </button>
      )}

      {phase === 'finished' && !isMock && (
        <button onClick={onRerecord} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xs flex items-center gap-2 shrink-0">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{answer ? 'Ghi âm lại' : 'Ghi âm'}</span>
        </button>
      )}

      {phase === 'finished' && !isMock && (
        <button
          onClick={onNext}
          className="w-10 h-10 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0"
          title="Câu tiếp theo"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
);
