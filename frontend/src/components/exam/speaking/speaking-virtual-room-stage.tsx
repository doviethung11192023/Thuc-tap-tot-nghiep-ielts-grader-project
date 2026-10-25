"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Play, Pause, RotateCcw, ArrowRight, Mic, Sparkles, Clock, Check } from 'lucide-react';
import { SpeakingPartQuestionItem } from '@/mocks/exam-speaking';

interface SpeakingVirtualRoomStageProps {
  partNumber: 1 | 2 | 3;
  questionIndex: number;
  totalQuestions: number;
  questionItem?: SpeakingPartQuestionItem;
  cueCard?: {
    topic: string;
    bullet_points: string[];
    preparation_time_seconds: number;
    speaking_time_seconds: number;
  };
  isRecorded: boolean;
  onRecordComplete: () => void;
  onNextQuestion: () => void;
}

export const SpeakingVirtualRoomStage: React.FC<SpeakingVirtualRoomStageProps> = ({
  partNumber,
  questionIndex,
  totalQuestions,
  questionItem,
  cueCard,
  isRecorded,
  onRecordComplete,
  onNextQuestion,
}) => {
  // Thinking time timer (counts up)
  const [thinkingSeconds, setThinkingSeconds] = useState(0);

  // Part 2 prep countdown (60s down)
  const [prepSeconds, setPrepSeconds] = useState(60);
  const [isPreppingPart2, setIsPreppingPart2] = useState(partNumber === 2);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const audioDuration = 4; // Mock 4s

  // Reset timer on question change
  useEffect(() => {
    setThinkingSeconds(0);
    setIsRecording(false);
    setRecordingSeconds(0);
    setIsPlayingAudio(false);
    setPlaybackTime(0);

    if (partNumber === 2) {
      setPrepSeconds(60);
      setIsPreppingPart2(true);
    }
  }, [partNumber, questionIndex]);

  // Thinking timer ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setThinkingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [partNumber, questionIndex]);

  // Part 2 Prep timer ticker
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (partNumber === 2 && isPreppingPart2 && prepSeconds > 0) {
      timer = setInterval(() => {
        setPrepSeconds((prev) => {
          if (prev <= 1) {
            setIsPreppingPart2(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [partNumber, isPreppingPart2, prepSeconds]);

  // Recording timer ticker
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  // Playback mock ticker
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlayingAudio) {
      timer = setInterval(() => {
        setPlaybackTime((prev) => {
          if (prev >= audioDuration) {
            setIsPlayingAudio(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlayingAudio]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      onRecordComplete();
    } else {
      // Start recording
      setIsRecording(true);
      setRecordingSeconds(0);
      if (partNumber === 2) {
        setIsPreppingPart2(false);
      }
    }
  };

  const handleReRecord = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
  };

  const handlePlayPrompt = () => {
    const textToSpeak = partNumber === 2 ? cueCard?.topic : questionItem?.question;
    if ('speechSynthesis' in window && textToSpeak) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between space-y-4">
      {/* Top Header Row */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>Part {partNumber}</span>
          <span className="text-slate-400">›</span>
          <span>Question {questionIndex + 1} of {totalQuestions}</span>
        </div>

        {/* Thinking Time Capsule */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200/80 rounded-full shadow-xs text-xs font-medium text-slate-600">
          <span>Thời gian suy nghĩ đã dùng</span>
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-bold text-blue-600 font-mono">
            {formatSeconds(thinkingSeconds)}
          </span>
        </div>
      </div>

      {/* Main Blue Stage Box */}
      <div className="w-full bg-gradient-to-b from-[#006fe6] to-[#0082f6] rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[360px]">
        {/* Examiner Audio Button */}
        <div className="flex justify-center mb-4">
          <button
            onClick={handlePlayPrompt}
            className="w-12 h-12 rounded-2xl bg-white/95 hover:bg-white text-blue-600 shadow-md flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            title="Nghe giám khảo đọc câu hỏi"
          >
            <Volume2 className="w-6 h-6" />
          </button>
        </div>

        {/* Question Prompt or Cue Card Content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          {partNumber === 2 && cueCard ? (
            <div className="space-y-4 max-w-lg text-left bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/20 w-full">
              <h2 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                {cueCard.topic}
              </h2>
              <div className="space-y-1.5 text-xs sm:text-sm text-blue-50">
                <p className="font-semibold text-white">You should say:</p>
                {cueCard.bullet_points.map((pt, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-blue-300 font-bold">•</span>
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white leading-tight max-w-2xl drop-shadow-xs">
              {questionItem?.question || "Do people in your country often say 'thank you'?"}
            </h2>
          )}
        </div>

        {/* Stage Bottom Decor: Soft Clouds & MoonLab AI Examiner Avatar */}
        <div className="relative pt-6 flex justify-center items-end">
          {/* Cloud layers */}
          <div className="absolute -bottom-4 left-0 right-0 h-16 bg-white/20 blur-md rounded-t-[50%] pointer-events-none"></div>

          {/* AI Examiner Avatar */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center text-blue-600 border-2 border-blue-200">
              <div className="relative">
                <Sparkles className="w-8 h-8 text-blue-600" />
                {isRecording && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
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

      {/* Control Bar Below Stage */}
      <div className="w-full flex flex-col items-center space-y-3 pt-2">
        {/* Status Toast / Tip */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200/60 px-3.5 py-1.5 rounded-full">
          {partNumber === 2 && isPreppingPart2 ? (
            <span>
              ⏱️ Bạn còn <strong className="text-blue-600 font-bold font-mono">{prepSeconds}s</strong> để suy nghĩ
            </span>
          ) : isRecording ? (
            <span className="text-red-600 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Đang ghi âm... ({formatSeconds(recordingSeconds)})
            </span>
          ) : isRecorded ? (
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Đã ghi âm xong câu trả lời
            </span>
          ) : (
            <span>💡 Âm thanh chưa rõ, hãy nói to hơn nhé!</span>
          )}
        </div>

        {/* Audio Player and Buttons */}
        <div className="w-full flex items-center justify-center gap-3 max-w-md">
          {/* Audio Player Bar if recorded */}
          {isRecorded && (
            <div className="flex-1 flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-slate-200/80 shadow-xs">
              <button
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shrink-0"
              >
                {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max={audioDuration}
                  value={playbackTime}
                  onChange={(e) => setPlaybackTime(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                  {formatSeconds(playbackTime)}/{formatSeconds(audioDuration)}
                </span>
              </div>
            </div>
          )}

          {/* Record Button */}
          {isRecording ? (
            <button
              onClick={handleToggleRecord}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-xs shadow-md shadow-red-500/20 flex items-center gap-2 transition-all animate-pulse"
            >
              <div className="w-2.5 h-2.5 rounded-xs bg-white"></div>
              <span>Dừng ghi âm</span>
            </button>
          ) : isRecorded ? (
            <button
              onClick={handleReRecord}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ghi âm lại</span>
            </button>
          ) : (
            <button
              onClick={handleToggleRecord}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <Mic className="w-4 h-4" />
              <span>{partNumber === 2 ? 'Bắt đầu nói Part 2' : 'Bắt đầu ghi âm'}</span>
            </button>
          )}

          {/* Next Question Button */}
          <button
            onClick={onNextQuestion}
            className="w-10 h-10 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
            title="Câu tiếp theo"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
