"use client";

import React, { useState, useRef } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, Award, RotateCcw, Search, Eye } from 'lucide-react';
import Link from 'next/link';
import { ReadingTestData } from '@/types/exam';
import { QuestionGroupRenderer } from './renderers/QuestionGroupRenderer';

interface ReadingResultsViewProps {
  testData: ReadingTestData;
  userAnswers: Record<number, string | string[]>;
  mode: 'exam' | 'practice';
  onRetake: () => void;
}

export function ReadingResultsView({ testData, userAnswers, mode, onRetake }: ReadingResultsViewProps) {
  const [activePassage, setActivePassage] = useState(0);
  const [filterMode, setFilterMode] = useState<'all' | 'incorrect'>('all');
  const [highlightedEvidence, setHighlightedEvidence] = useState<{ paragraph: string; quote: string } | null>(null);

  const passageScrollRef = useRef<HTMLDivElement>(null);
  const currentPassage = testData.passages[activePassage];

  // Scoring logic
  const allQuestions = testData.passages.flatMap(p => 
    p.question_groups.flatMap(g => g.questions)
  );

  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  allQuestions.forEach(q => {
    const userVal = userAnswers[q.question_number];
    if (!userVal || (typeof userVal === 'string' && !userVal.trim())) {
      unansweredCount++;
    } else {
      const isCorrect = q.correct_answers?.some(ans => {
        if (typeof userVal === 'string') {
          return ans.trim().toLowerCase() === userVal.trim().toLowerCase();
        }
        return false;
      });
      if (isCorrect) correctCount++;
      else incorrectCount++;
    }
  });

  // Calculate IELTS Band Score
  const getEstimatedBand = (score: number, total: number) => {
    const ratio = score / (total || 1);
    if (ratio >= 0.95) return 9.0;
    if (ratio >= 0.88) return 8.5;
    if (ratio >= 0.80) return 8.0;
    if (ratio >= 0.73) return 7.5;
    if (ratio >= 0.65) return 7.0;
    if (ratio >= 0.58) return 6.5;
    if (ratio >= 0.50) return 6.0;
    if (ratio >= 0.42) return 5.5;
    if (ratio >= 0.35) return 5.0;
    return 4.5;
  };

  const estimatedBand = getEstimatedBand(correctCount, allQuestions.length);

  const handleSelectEvidence = (paragraphId: string, quote: string) => {
    setHighlightedEvidence({ paragraph: paragraphId, quote });
    if (passageScrollRef.current) {
      const el = document.getElementById(`review-para-${paragraphId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-50 rounded-2xl overflow-hidden shadow-lg border border-zinc-200">
      {/* Top Banner / Navigation */}
      <div className="bg-white border-b border-zinc-200 px-5 py-2.5 h-14 flex items-center justify-between shadow-xs shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link 
            href="/test-practice" 
            className="w-9 h-9 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                Đã hoàn thành
              </span>
              <h1 className="font-bold text-zinc-900 text-sm md:text-base">
                Kết Quả & Đối Chiếu Dẫn Chứng: {testData.title}
              </h1>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block">
              Nhấp vào bất kỳ câu hỏi nào để cuộn tới vị trí dẫn chứng tương ứng trong bài đọc.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRetake}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 h-9 px-4 rounded-xl text-sm font-bold transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Làm lại bài
          </button>
          <Link
            href="/test-practice"
            className="bg-[#932120] text-white h-9 px-5 rounded-xl text-sm font-bold hover:bg-[#7a1a19] shadow-xs transition-colors flex items-center justify-center"
          >
            Hoàn tất
          </Link>
        </div>
      </div>

      {/* Results Summary Ribbon */}
      <div className="bg-zinc-900 text-white px-5 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#932120] flex items-center justify-center font-black text-lg text-white shadow-md">
              {estimatedBand.toFixed(1)}
            </div>
            <div>
              <p className="text-[11px] text-zinc-400 uppercase font-semibold">Ước tính Overall Band</p>
              <p className="text-xs font-bold text-white">IELTS Academic Reading</p>
            </div>
          </div>

          <div className="h-7 w-px bg-zinc-700 hidden sm:block" />

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" /> {correctCount} Đúng
            </span>
            <span className="flex items-center gap-1.5 text-red-400 font-bold">
              <XCircle className="w-4 h-4" /> {incorrectCount} Sai
            </span>
            <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
              <MinusCircle className="w-4 h-4" /> {unansweredCount} Bỏ qua
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Lọc câu hỏi:</span>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterMode === 'all' ? 'bg-[#932120] text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Tất cả: {allQuestions.length}
          </button>
          <button
            onClick={() => setFilterMode('incorrect')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterMode === 'incorrect' ? 'bg-[#932120] text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Chỉ xem câu sai: {incorrectCount + unansweredCount}
          </button>
        </div>
      </div>

      {/* Main Review Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Passage with Highlights */}
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

            <div className="space-y-6 text-zinc-800 leading-relaxed font-serif text-[17px]">
              {currentPassage.passage.paragraphs?.map((p) => {
                const isSelected = highlightedEvidence?.paragraph === p.id;
                return (
                  <div 
                    key={p.id} 
                    id={`review-para-${p.id}`}
                    className={`p-4 rounded-xl transition-all duration-300 flex gap-4 ${
                      isSelected 
                        ? 'bg-amber-100 ring-2 ring-amber-400 shadow-md' 
                        : 'hover:bg-zinc-50'
                    }`}
                  >
                    <span className="font-sans font-bold text-zinc-400 shrink-0 select-none">
                      [{p.id}]
                    </span>
                    <p className="leading-relaxed">
                      {isSelected && highlightedEvidence?.quote && p.text.includes(highlightedEvidence.quote) ? (
                        <span>
                          {p.text.split(highlightedEvidence.quote)[0]}
                          <mark className="bg-amber-300 font-bold px-1 rounded text-zinc-900 underline decoration-amber-500 decoration-2">
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
            {testData.passages.map((p, idx) => (
              <button
                key={p.passage.id}
                onClick={() => {
                  setActivePassage(idx);
                  setHighlightedEvidence(null);
                }}
                className={`flex-1 py-2 px-3 text-xs md:text-sm font-bold rounded-xl transition-all ${
                  activePassage === idx 
                    ? 'bg-[#932120] text-white shadow-md' 
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                Passage {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Questions Review & Evidence Link */}
        <div className="w-1/2 flex flex-col h-full bg-zinc-50/70">
          <div className="flex justify-between items-center px-6 py-3.5 border-b border-zinc-200 bg-white shrink-0 shadow-xs z-10">
            <h3 className="font-bold text-zinc-900 text-sm md:text-base flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#932120]" />
              Chi Tiết Đối Soát Đáp Án
            </h3>
            <span className="text-xs font-semibold text-zinc-500">
              Đúng {correctCount}/{allQuestions.length} câu
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
            {currentPassage.question_groups.map(group => {
              // If filtering by incorrect, check if group has any wrong question
              const filteredGroup = {
                ...group,
                questions: filterMode === 'incorrect'
                  ? group.questions.filter(q => {
                      const userVal = userAnswers[q.question_number];
                      if (!userVal) return true;
                      return !q.correct_answers?.some(ans => 
                        typeof userVal === 'string' && ans.trim().toLowerCase() === userVal.trim().toLowerCase()
                      );
                    })
                  : group.questions
              };

              if (filteredGroup.questions.length === 0) return null;

              return (
                <div key={group.group_id} className="relative">
                  <QuestionGroupRenderer
                    group={filteredGroup}
                    mode="review"
                    userAnswers={userAnswers}
                    onSelectEvidence={handleSelectEvidence}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
