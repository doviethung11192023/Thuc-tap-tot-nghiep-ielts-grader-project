"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock, Send, Play, Pause, Volume2, VolumeX, RotateCcw, FastForward, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ListeningTestData } from '@/mocks/exam-listening';
import { QuestionGroupRenderer } from './renderers/QuestionGroupRenderer';
import { ExitConfirmModal } from './ExitConfirmModal';

interface ListeningWorkspaceProps {
  testData: ListeningTestData;
  mode: 'exam' | 'practice';
  onSubmit: (userAnswers: Record<number, string | string[]>) => void;
}

export function ListeningWorkspace({ testData, mode, onSubmit }: ListeningWorkspaceProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(45);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string | string[]>>({});
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);

  // Exam mode: 30 minutes (1800s) countdown, Practice mode: count up
  const initialExamSeconds = testData.total_duration_minutes * 60 || 1800;
  const [timerSeconds, setTimerSeconds] = useState<number>(mode === 'exam' ? initialExamSeconds : 0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentSection = testData.sections[activeSection];

  // Active Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (mode === 'exam') {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval!);
            alert("⏱️ Hết giờ làm bài thi Listening! Hệ thống tự động thu bài và chuyển sang phần chấm điểm.");
            onSubmit(userAnswers);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, onSubmit, userAnswers]);

  // Simulated audio playback progress
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= currentSection.duration_seconds) {
            setIsPlaying(false);
            return currentSection.duration_seconds;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, currentSection.duration_seconds]);

  const formatDisplayTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAudioTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionNumber: number, value: any) => {
    setUserAnswers(prev => ({ ...prev, [questionNumber]: value }));
  };

  const handleExitDiscard = () => {
    setIsExitModalOpen(false);
    router.push('/test-practice');
  };

  const handleSaveDraftAndExit = () => {
    try {
      localStorage.setItem(`ielts_listening_draft_${testData.test_id}`, JSON.stringify(userAnswers));
      alert("💾 Đã lưu nháp tiến độ bài làm Listening thành công!");
    } catch (e) {
      console.error("Failed to save draft:", e);
    }
    setIsExitModalOpen(false);
    router.push('/test-practice');
  };

  // Collect all questions for the palette
  const allQuestions = testData.sections.flatMap(s => 
    s.question_groups.flatMap(g => g.questions)
  );

  const answeredCount = Object.keys(userAnswers).filter(k => {
    const val = userAnswers[Number(k)];
    return typeof val === 'string' ? val.trim().length > 0 : Array.isArray(val) && val.length > 0;
  }).length;

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-50 rounded-2xl overflow-hidden shadow-lg border border-zinc-200">
      {/* Top Header */}
      <div className="bg-white border-b border-zinc-200 px-5 py-2.5 h-14 flex items-center justify-between shadow-xs shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsExitModalOpen(true)}
            className="w-9 h-9 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600 hover:text-zinc-900"
            title="Thoát phòng thi"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-zinc-900 text-sm md:text-base truncate max-w-[280px] sm:max-w-md">
              {testData.title}
            </h1>
            <p className="text-[11px] text-zinc-500">
              Chế độ: <span className="font-semibold text-[#932120] uppercase">{mode === 'exam' ? 'Phòng thi giới hạn giờ' : 'Luyện tập tự do'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-red-50 text-[#932120] border border-red-100 px-3.5 py-1.5 rounded-xl text-sm font-bold shadow-xs">
            <Clock className="w-4 h-4 text-[#932120]" />
            {mode === 'exam' ? (
              <span>{formatDisplayTime(timerSeconds)} / {formatDisplayTime(initialExamSeconds)}</span>
            ) : (
              <span>⏱️ {formatDisplayTime(timerSeconds)}</span>
            )}
          </div>

          <button 
            onClick={() => onSubmit(userAnswers)}
            className="flex items-center gap-2 bg-[#932120] text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-[#7a1a19] shadow-md transition-all active:scale-95"
          >
            <Send className="w-4 h-4" /> Nộp bài
          </button>
        </div>
      </div>

      {/* STICKY AUDIO PLAYER BAR */}
      <div className="bg-zinc-900 text-white px-6 py-3.5 shrink-0 shadow-md border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(prev => !prev)}
            className="w-10 h-10 rounded-full bg-[#932120] hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
            title={isPlaying ? 'Tạm dừng' : 'Phát âm thanh'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            onClick={() => setCurrentTime(prev => Math.max(0, prev - 5))}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
            title="Tua lùi 5 giây"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-bold text-zinc-300">
            {formatAudioTime(currentTime)} / {formatAudioTime(currentSection.duration_seconds)}
          </span>
        </div>

        {/* Visual Waveform Simulator */}
        <div className="flex-1 max-w-md mx-4 hidden md:flex items-center gap-1 h-6">
          {Array.from({ length: 36 }).map((_, idx) => {
            const progressRatio = currentTime / currentSection.duration_seconds;
            const barRatio = idx / 36;
            const isActive = barRatio <= progressRatio;
            const height = 20 + Math.sin(idx * 0.5) * 14;

            return (
              <div
                key={idx}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isActive ? 'bg-[#932120]' : 'bg-zinc-700'
                } ${isPlaying && isActive ? 'animate-pulse' : ''}`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        {/* Controls: Speed & Mute */}
        <div className="flex items-center gap-3">
          {mode === 'practice' && (
            <div className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-lg text-xs font-bold text-zinc-300">
              <span className="text-zinc-500 mr-1">Tốc độ:</span>
              {[0.8, 1.0, 1.2].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-0.5 rounded ${playbackSpeed === speed ? 'bg-[#932120] text-white' : 'hover:text-white'}`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setIsMuted(prev => !prev)}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
            title={isMuted ? 'Bật âm lượng' : 'Tắt tiếng'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sections Navigator + Question List */}
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
          {/* Section Tabs */}
          <div className="border-b border-zinc-200 px-6 py-2.5 bg-zinc-50 flex gap-2 shrink-0 overflow-x-auto">
            {testData.sections.map((s, idx) => (
              <button
                key={s.section_number}
                onClick={() => {
                  setActiveSection(idx);
                  setCurrentTime(0);
                }}
                className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeSection === idx
                    ? 'bg-[#932120] text-white shadow-md'
                    : 'bg-white text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
                }`}
              >
                <span>Section {s.section_number}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeSection === idx ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                  {s.question_groups.reduce((acc, g) => acc + g.questions.length, 0)} câu
                </span>
              </button>
            ))}
          </div>

          {/* Section Header & Questions */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-6 pb-28">
            <div className="border-b border-zinc-100 pb-4">
              <h2 className="text-xl font-bold text-zinc-900">{currentSection.title}</h2>
              <p className="text-xs text-zinc-500 mt-1">
                Lắng nghe cẩn thận audio và điền câu trả lời vào các chỗ trống hoặc lựa chọn phương án đúng.
              </p>
            </div>

            {currentSection.question_groups.map(group => (
              <div key={group.group_id} className="relative">
                <QuestionGroupRenderer
                  group={group}
                  mode="exam"
                  userAnswers={userAnswers}
                  onAnswerChange={handleAnswerChange}
                />
              </div>
            ))}
          </div>

          {/* Bottom Question Palette */}
          <div className="bg-white border-t border-zinc-200 p-2.5 shrink-0 shadow-lg z-10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Danh sách câu hỏi • Đã làm {answeredCount}/{allQuestions.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar p-1">
              {allQuestions.map((q) => {
                const isAnswered = !!userAnswers[q.question_number];
                return (
                  <button
                    key={q.question_number}
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                      isAnswered
                        ? 'bg-[#932120] text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
                    }`}
                    title={`Câu ${q.question_number}`}
                  >
                    {q.question_number}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      <ExitConfirmModal
        isOpen={isExitModalOpen}
        mode={mode}
        onContinue={() => setIsExitModalOpen(false)}
        onExitDiscard={handleExitDiscard}
        onSaveDraftAndExit={handleSaveDraftAndExit}
      />
    </div>
  );
}
