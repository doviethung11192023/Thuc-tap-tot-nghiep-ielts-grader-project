"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Send, Mic, Square, Play, RotateCcw, Volume2, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { mockSpeakingExamDataset } from '@/mocks/exam-speaking';
import { ExitConfirmModal } from './ExitConfirmModal';

interface SpeakingWorkspaceProps {
  mode?: 'exam' | 'practice';
  onSubmit: () => void;
}

export function SpeakingWorkspace({ mode = 'exam', onSubmit }: SpeakingWorkspaceProps) {
  const router = useRouter();
  const [activePart, setActivePart] = useState<1 | 2 | 3>(2); // Default to Part 2 for full cue card experience
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [hasRecorded, setHasRecorded] = useState<boolean>(false);
  const [scratchpadText, setScratchpadText] = useState<string>('Ha Giang motorbike trip with university friends\nBreathtaking Ma Pi Leng pass, limestone karsts\nSteep roads, ethnic minority children warmth');
  const [prepSeconds, setPrepSeconds] = useState<number>(60);
  const [isPrepActive, setIsPrepActive] = useState<boolean>(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);

  // Overall test timer: Exam mode counts down from 840s (14 mins), Practice mode counts up
  const initialExamSeconds = 840;
  const [timerSeconds, setTimerSeconds] = useState<number>(mode === 'exam' ? initialExamSeconds : 0);

  const currentPartData = mockSpeakingExamDataset.parts.find(p => p.part_number === activePart) || mockSpeakingExamDataset.parts[0];

  // Restore draft in practice mode
  useEffect(() => {
    if (mode === 'practice') {
      try {
        const savedDraft = localStorage.getItem('ielts_speaking_draft_mock');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.activePart) setActivePart(parsed.activePart);
          if (parsed.scratchpadText) setScratchpadText(parsed.scratchpadText);
          if (parsed.hasRecorded) setHasRecorded(parsed.hasRecorded);
        }
      } catch (e) {
        console.error("Failed to load speaking draft:", e);
      }
    }
  }, [mode]);

  // Overall Test Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (mode === 'exam') {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval!);
            alert("⏱️ Hết giờ làm bài thi Speaking! Hệ thống tự động thu bài và chuyển sang phần chấm điểm.");
            onSubmit();
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
  }, [mode, onSubmit]);

  // 60-second Cue Card Prep Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPrepActive && prepSeconds > 0) {
      interval = setInterval(() => {
        setPrepSeconds(prev => {
          if (prev <= 1) {
            setIsPrepActive(false);
            setIsRecording(true); // Automatically start recording when prep ends
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPrepActive, prepSeconds]);

  // Recording Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 120) { // Max 2 minutes
            setIsRecording(false);
            setHasRecorded(true);
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExitDiscard = () => {
    setIsExitModalOpen(false);
    router.push('/test-practice');
  };

  const handleSaveDraftAndExit = () => {
    try {
      localStorage.setItem('ielts_speaking_draft_mock', JSON.stringify({ activePart, scratchpadText, hasRecorded }));
      alert("💾 Đã lưu nháp tiến độ phòng thi Speaking thành công!");
    } catch (e) {
      console.error("Failed to save draft:", e);
    }
    setIsExitModalOpen(false);
    router.push('/test-practice');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-50 rounded-2xl overflow-hidden shadow-lg border border-zinc-200">
      {/* Top Header - Chuẩn h-14, không ngoặc đơn tùy tiện */}
      <div className="bg-white border-b border-zinc-200 px-5 py-2.5 h-14 flex items-center justify-between shadow-xs shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setIsExitModalOpen(true)}
            className="w-9 h-9 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600 hover:text-zinc-900"
            title="Thoát phòng thi"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-zinc-900 text-sm md:text-base truncate max-w-[280px] sm:max-w-md">
              {mockSpeakingExamDataset.title}
            </h1>
            <p className="text-[11px] text-zinc-500 hidden sm:block">
              Phòng thi nói tương tác ảo với Giám khảo AI và Mô phỏng sóng âm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-red-50 text-[#932120] border border-red-100 h-9 px-3.5 rounded-xl text-sm font-bold shadow-xs">
            <Clock className="w-4 h-4 text-[#932120]" />
            <span>{formatSecs(timerSeconds)}</span>
            {mode === 'exam' && <span className="text-xs text-red-400 font-normal">/ 14:00</span>}
          </div>

          <button 
            onClick={onSubmit}
            className="flex items-center gap-2 bg-[#932120] text-white h-9 px-5 rounded-xl text-sm font-bold hover:bg-[#7a1a19] shadow-xs transition-all active:scale-95"
          >
            <Send className="w-4 h-4" /> Nộp bài
          </button>
        </div>
      </div>

      {/* Main Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: 3 Parts Navigation & Content */}
        <div className="w-1/2 border-r border-zinc-200 bg-white flex flex-col h-full relative">
          {/* 3 Parts Navigation Tabs */}
          <div className="flex border-b border-zinc-200 bg-zinc-50/50 p-2 gap-2 shrink-0">
            {[1, 2, 3].map(num => (
              <button
                key={num}
                onClick={() => setActivePart(num as 1 | 2 | 3)}
                className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${
                  activePart === num
                    ? 'bg-[#932120] text-white shadow-xs'
                    : 'bg-white text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
                }`}
              >
                Part {num} • {num === 2 ? 'Cue Card' : 'Interview'}
              </button>
            ))}
          </div>

          <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
            <div className="border-b border-zinc-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#932120] bg-red-50 px-3 py-1 rounded-full border border-red-100">
                {currentPartData.title}
              </span>
              <p className="text-xs text-zinc-500 mt-2">{currentPartData.instructions}</p>
            </div>

            {/* Part 1 or Part 3 Questions */}
            {currentPartData.questions && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Câu hỏi phỏng vấn của Giám khảo:
                </h3>
                {currentPartData.questions.map((q, idx) => (
                  <div key={idx} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
                    <p className="text-zinc-900 font-medium text-base">{q}</p>
                    <button
                      type="button"
                      onClick={() => alert(`Đang phát giọng đọc mẫu cho câu: "${q}"`)}
                      className="text-xs font-bold text-[#932120] hover:underline flex items-center gap-1.5"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> Nghe Giám khảo AI phát âm
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Part 2 Cue Card Presentation */}
            {currentPartData.cue_card && (
              <div className="space-y-6">
                <div className="bg-red-50/40 border-2 border-red-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-red-100 pb-3">
                    <h3 className="font-bold text-sm text-[#932120] uppercase tracking-wider">
                      CANDIDATE CUE CARD
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-600">Chuẩn bị:</span>
                      <span className="font-mono font-black text-sm text-[#932120] bg-white px-2 py-0.5 rounded-lg border border-red-200">
                        {prepSeconds}s
                      </span>
                    </div>
                  </div>

                  <h4 className="text-lg font-bold text-zinc-900 font-serif">
                    {currentPartData.cue_card.topic}
                  </h4>

                  <p className="text-xs font-semibold text-zinc-600 uppercase">You should say:</p>
                  <ul className="space-y-2 pl-4 text-sm text-zinc-800 list-disc font-medium">
                    {currentPartData.cue_card.bullet_points.map((pt, idx) => (
                      <li key={idx}>{pt}</li>
                    ))}
                  </ul>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setIsPrepActive(true);
                        setPrepSeconds(60);
                      }}
                      disabled={isPrepActive}
                      className="px-4 py-2 rounded-xl bg-[#932120] text-white text-xs font-bold hover:bg-red-800 transition-colors disabled:opacity-50"
                    >
                      {isPrepActive ? 'Đang đếm ngược 60 giây...' : '⏱️ Bắt đầu 1 phút chuẩn bị'}
                    </button>
                  </div>
                </div>

                {/* Scratchpad Note-Taking Editor */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#932120]" />
                    Sổ tay ghi chú ý tưởng nhanh (Scratchpad):
                  </span>
                  <textarea
                    value={scratchpadText}
                    onChange={(e) => setScratchpadText(e.target.value)}
                    placeholder="Ghi chú từ khóa, liên từ, ý tưởng cho bài nói của bạn..."
                    className="w-full h-24 p-3 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-800 resize-none outline-none focus:ring-2 focus:ring-[#932120]/20 font-medium"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Examiner Visualizer & Audio Recording Studio */}
        <div className="w-1/2 flex flex-col h-full bg-zinc-900 text-white relative">
          {/* Virtual AI Examiner Avatar Panel */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute w-72 h-72 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center space-y-4">
              {/* Avatar Ring */}
              <div className="relative">
                <div className={`w-32 h-32 rounded-full border-4 ${isRecording ? 'border-red-500 animate-pulse' : 'border-zinc-700'} overflow-hidden shadow-2xl bg-zinc-800 flex items-center justify-center`}>
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80"
                    alt="AI IELTS Examiner"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-2 bg-zinc-800 border border-zinc-700 px-3 py-0.5 rounded-full text-[10px] font-bold text-zinc-300 flex items-center gap-1 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  AI Examiner Online
                </div>
              </div>

              <div className="text-center space-y-1">
                <h3 className="font-bold text-base text-zinc-100 flex items-center justify-center gap-2">
                  <span>Dr. Eleanor Vance</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs">
                  Native British IELTS Certified Assessor. Lắng nghe và đánh giá trực tiếp 4 tiêu chí phát âm.
                </p>
              </div>

              {/* Dynamic Sound Wave Visualizer */}
              <div className="flex items-center gap-1.5 h-12 py-2">
                {[40, 75, 30, 90, 60, 100, 45, 80, 25, 95, 65, 35, 85, 50, 70].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: isRecording ? `${h}%` : '20%' }}
                    className={`w-1.5 rounded-full transition-all duration-150 ${
                      isRecording ? 'bg-gradient-to-t from-red-600 to-amber-400' : 'bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Recording Control Studio */}
          <div className="border-t border-zinc-800 bg-zinc-950/70 p-6 flex flex-col items-center space-y-4">
            <div className="text-sm font-mono font-bold tracking-wider text-zinc-300">
              {isRecording ? (
                <span className="text-red-400 animate-pulse">● REC {formatSecs(recordingSeconds)} / 02:00</span>
              ) : hasRecorded ? (
                <span className="text-emerald-400">ĐÃ GHI ÂM: {formatSecs(recordingSeconds)}</span>
              ) : (
                <span className="text-zinc-500">SẴN SÀNG GHI ÂM</span>
              )}
            </div>

            {/* Record / Stop Action Button */}
            <div className="flex items-center gap-4">
              {!isRecording ? (
                <button
                  onClick={() => {
                    setIsRecording(true);
                    setHasRecorded(false);
                    setRecordingSeconds(0);
                  }}
                  className="w-16 h-16 rounded-full bg-[#932120] hover:bg-[#7a1a19] text-white flex items-center justify-center shadow-xl transition-transform active:scale-95 group"
                  title="Bắt đầu ghi âm"
                >
                  <Mic className="w-7 h-7 group-hover:scale-110 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsRecording(false);
                    setHasRecorded(true);
                  }}
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl animate-pulse transition-transform active:scale-95"
                  title="Dừng ghi âm"
                >
                  <Square className="w-6 h-6" />
                </button>
              )}

              {hasRecorded && !isRecording && (
                <button
                  onClick={() => alert("Đang phát lại bản thu âm thử nghiệm của bạn...")}
                  className="w-12 h-12 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white flex items-center justify-center shadow-md transition-colors"
                  title="Nghe lại bản thu"
                >
                  <Play className="w-5 h-5 ml-0.5" />
                </button>
              )}
            </div>

            <div className="text-xs text-zinc-400 pt-2 border-t border-zinc-700/60 w-full text-center">
              {isRecording ? (
                <span className="text-red-400 font-semibold flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  Đang ghi âm giọng nói của bạn... Hãy nói to, rõ ràng.
                </span>
              ) : hasRecorded ? (
                <span className="text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Đã ghi âm thành công. Bạn có thể nghe lại hoặc bấm Nộp bài.
                </span>
              ) : (
                'Nhấn vào nút Micro để bắt đầu ghi âm câu trả lời của bạn.'
              )}
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
