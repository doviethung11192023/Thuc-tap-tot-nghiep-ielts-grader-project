"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Clock, Send, ZoomIn, ZoomOut, Flag, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReadingTestData } from '@/types/exam';
import { QuestionGroupRenderer } from './renderers/QuestionGroupRenderer';
import { ExitConfirmModal } from './ExitConfirmModal';

interface ReadingWorkspaceProps {
  testData: ReadingTestData;
  mode: 'exam' | 'practice';
  selectedParts: string[];
  onSubmit: (userAnswers: Record<number, string | string[]>) => void;
}

export function ReadingWorkspace({ testData, mode, selectedParts, onSubmit }: ReadingWorkspaceProps) {
  const router = useRouter();
  const [activePassage, setActivePassage] = useState(0);
  const [fontSize, setFontSize] = useState<number>(17); // 15 to 21px
  const [userAnswers, setUserAnswers] = useState<Record<number, string | string[]>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [highlightedEvidence, setHighlightedEvidence] = useState<{ paragraph: string; quote: string } | null>(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);

  // Initial time: Exam mode = 60 mins (3600s), Practice mode = count up from 0
  const initialExamSeconds = Math.max(1, selectedParts.length) * 20 * 60;
  const [timerSeconds, setTimerSeconds] = useState<number>(mode === 'exam' ? initialExamSeconds : 0);
  
  const passageScrollRef = useRef<HTMLDivElement>(null);
  const currentPassage = testData.passages[activePassage];

  // Active Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (mode === 'exam') {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval!);
            alert("⏱️ Hết giờ làm bài thi Reading! Hệ thống tự động thu bài và chuyển sang phần chấm điểm.");
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

  const formatDisplayTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionNumber: number, value: any) => {
    setUserAnswers(prev => ({ ...prev, [questionNumber]: value }));
  };

  const toggleFlag = (questionNumber: number) => {
    setFlaggedQuestions(prev => ({ ...prev, [questionNumber]: !prev[questionNumber] }));
  };

  const handleSelectEvidence = (paragraphId: string, quote: string) => {
    setHighlightedEvidence({ paragraph: paragraphId, quote });
    if (passageScrollRef.current) {
      const el = document.getElementById(`para-${paragraphId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleExitDiscard = () => {
    setIsExitModalOpen(false);
    router.push('/test-practice');
  };

  const handleSaveDraftAndExit = () => {
    try {
      localStorage.setItem(`ielts_reading_draft_${testData.test_id}`, JSON.stringify(userAnswers));
      alert("💾 Đã lưu nháp tiến độ bài làm Reading thành công!");
    } catch (e) {
      console.error("Failed to save draft:", e);
    }
    setIsExitModalOpen(false);
    router.push('/test-practice');
  };

  // Collect all questions for bottom palette
  const allQuestions = testData.passages.flatMap(p => 
    p.question_groups.flatMap(g => g.questions)
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
          {/* Font Resizing Controls */}
          <div className="hidden sm:flex items-center gap-1 bg-zinc-100 p-1 rounded-xl text-zinc-700">
            <button 
              onClick={() => setFontSize(prev => Math.max(14, prev - 1))}
              className="p-1.5 hover:bg-white rounded-lg transition-colors text-xs font-bold"
              title="Giảm cỡ chữ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-1 select-none">{fontSize}px</span>
            <button 
              onClick={() => setFontSize(prev => Math.min(22, prev + 1))}
              className="p-1.5 hover:bg-white rounded-lg transition-colors text-xs font-bold"
              title="Tăng cỡ chữ"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Active Timer Display */}
          <div className="flex items-center gap-2 bg-red-50 text-[#932120] border border-red-100 px-3.5 py-1.5 rounded-xl text-sm font-bold shadow-xs">
            <Clock className="w-4 h-4 text-[#932120]" />
            {mode === 'exam' ? (
              <span>{formatDisplayTime(timerSeconds)} / {formatDisplayTime(initialExamSeconds)}</span>
            ) : (
              <span>⏱️ {formatDisplayTime(timerSeconds)}</span>
            )}
          </div>

          {/* Submit Button */}
          <button 
            onClick={() => onSubmit(userAnswers)}
            className="flex items-center gap-2 bg-[#932120] text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-[#7a1a19] shadow-md transition-all active:scale-95"
          >
            <Send className="w-4 h-4" /> Nộp bài
          </button>
        </div>
      </div>

      {/* Split Screen Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Passage */}
        <div className="w-1/2 border-r border-zinc-200 bg-white flex flex-col h-full relative">
          <div 
            ref={passageScrollRef}
            className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6 pb-20"
          >
            <div className="border-b border-zinc-100 pb-4 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#932120] bg-red-50 px-3 py-1 rounded-full border border-red-100">
                Reading Passage {activePassage + 1}
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 mt-3 font-serif">
                {currentPassage.passage.title}
              </h2>
            </div>

            <div 
              className="space-y-6 text-zinc-800 leading-relaxed font-serif"
              style={{ fontSize: `${fontSize}px` }}
            >
              {currentPassage.passage.paragraphs?.map((p) => {
                const isSelected = highlightedEvidence?.paragraph === p.id;
                return (
                  <div 
                    key={p.id} 
                    id={`para-${p.id}`}
                    className={`p-4 rounded-xl transition-all duration-300 flex gap-4 ${
                      isSelected 
                        ? 'bg-amber-100 ring-2 ring-amber-400 shadow-sm' 
                        : 'hover:bg-zinc-50'
                    }`}
                  >
                    <span className="font-sans font-bold text-zinc-400 shrink-0 text-base select-none">
                      [{p.id}]
                    </span>
                    <p className="leading-relaxed">
                      {isSelected && highlightedEvidence?.quote && p.text.includes(highlightedEvidence.quote) ? (
                        <span>
                          {p.text.split(highlightedEvidence.quote)[0]}
                          <mark className="bg-amber-300 font-semibold px-1 rounded text-zinc-900 animate-pulse">
                            {highlightedEvidence.quote}
                          </mark>
                          {p.text.split(highlightedEvidence.quote)[1]}
                        </span>
                      ) : (
                        p.text
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Tabs for Passage Switch */}
          <div className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-zinc-200 p-2.5 flex gap-2 z-10 shadow-xs">
            {testData.passages.map((p, idx) => {
              const passageQCount = p.question_groups.reduce((acc, g) => acc + g.questions.length, 0);
              const passageAnswered = p.question_groups.flatMap(g => g.questions)
                .filter(q => !!userAnswers[q.question_number]).length;

              return (
                <button
                  key={p.passage.id}
                  onClick={() => {
                    setActivePassage(idx);
                    setHighlightedEvidence(null);
                  }}
                  className={`flex-1 py-2 px-3 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                    activePassage === idx 
                      ? 'bg-[#932120] text-white shadow-md' 
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  <span>Passage {idx + 1}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${activePassage === idx ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'}`}>
                    {passageAnswered}/{passageQCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Questions & Palette */}
        <div className="w-1/2 flex flex-col h-full bg-zinc-50/70">
          <div className="flex justify-between items-center px-6 py-3.5 border-b border-zinc-200 bg-white shrink-0 shadow-xs z-10">
            <h3 className="font-bold text-zinc-900 text-sm md:text-base">
              Câu hỏi ({answeredCount}/{allQuestions.length} đã làm)
            </h3>
            <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#932120]"></span> Đã trả lời
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Đánh dấu
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6 pb-28">
            {currentPassage.question_groups.map(group => (
              <div key={group.group_id} className="relative">
                <QuestionGroupRenderer
                  group={group}
                  mode="exam"
                  userAnswers={userAnswers}
                  onAnswerChange={handleAnswerChange}
                  onSelectEvidence={handleSelectEvidence}
                />
              </div>
            ))}
          </div>

          {/* Bottom Question Palette (Ghim đáy cột phải) */}
          <div className="bg-white border-t border-zinc-200 p-2.5 shrink-0 shadow-lg z-10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Danh sách câu hỏi • Đã làm {answeredCount}/{allQuestions.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar p-1">
              {allQuestions.map((q) => {
                const isAnswered = !!userAnswers[q.question_number];
                const isFlagged = !!flaggedQuestions[q.question_number];

                return (
                  <button
                    key={q.question_number}
                    onClick={() => {
                      // Switch to corresponding passage if needed
                      const targetPassageIdx = testData.passages.findIndex(p => 
                        p.question_groups.some(g => g.questions.some(item => item.question_number === q.question_number))
                      );
                      if (targetPassageIdx !== -1 && targetPassageIdx !== activePassage) {
                        setActivePassage(targetPassageIdx);
                      }
                    }}
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                      isFlagged
                        ? 'bg-amber-500 text-white shadow-xs ring-1 ring-amber-600'
                        : isAnswered
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

      {/* Exit Interception Modal */}
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
