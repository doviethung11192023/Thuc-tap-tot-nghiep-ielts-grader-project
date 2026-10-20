"use client";

import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, Play, RotateCcw, Volume2, FileText, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { ListeningTestData } from '@/mocks/exam-listening';
import { QuestionGroupRenderer } from './renderers/QuestionGroupRenderer';

interface ListeningResultsViewProps {
  testData: ListeningTestData;
  userAnswers: Record<number, string | string[]>;
  mode: 'exam' | 'practice';
  onRetake: () => void;
}

export function ListeningResultsView({ testData, userAnswers, mode, onRetake }: ListeningResultsViewProps) {
  const [activeSection, setActiveSection] = useState<number>(0);
  const [playbackTime, setPlaybackTime] = useState<string>('00:00');
  const [isPlayingSnippet, setIsPlayingSnippet] = useState<boolean>(false);

  const currentSection = testData.sections[activeSection];

  // Score Calculation
  const allQuestions = testData.sections.flatMap(s => 
    s.question_groups.flatMap(g => g.questions)
  );

  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  allQuestions.forEach(q => {
    const userVal = userAnswers[q.question_number];
    if (!userVal || (typeof userVal === 'string' && !userVal.trim())) {
      unansweredCount++;
    } else {
      const isCorrect = q.correct_answers?.some((ans: string) => {
        if (typeof userVal === 'string') {
          return ans.trim().toLowerCase() === userVal.trim().toLowerCase();
        }
        return false;
      });
      if (isCorrect) correctCount++;
      else incorrectCount++;
    }
  });

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
    return 5.0;
  };

  const estimatedBand = getEstimatedBand(correctCount, allQuestions.length);

  const handleJumpToTimestamp = (timestamp: string) => {
    setPlaybackTime(timestamp);
    setIsPlayingSnippet(true);
    setTimeout(() => setIsPlayingSnippet(false), 5000); // simulate 5s audio snippet
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-50 rounded-2xl overflow-hidden shadow-lg border border-zinc-200">
      {/* Top Banner */}
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
                Đã chấm điểm
              </span>
              <h1 className="font-bold text-zinc-900 text-sm md:text-base">
                Kết Quả & Interactive Transcript: {testData.title}
              </h1>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block">
              Bản gỡ băng toàn bài với từ khóa đáp án và cảnh báo bẫy thông tin gây nhiễu.
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

      {/* Results Ribbon */}
      <div className="bg-zinc-900 text-white px-5 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#932120] flex items-center justify-center font-black text-xl text-white shadow-md">
              {estimatedBand.toFixed(1)}
            </div>
            <div>
              <p className="text-xs text-zinc-400 uppercase font-semibold">Ước tính Overall Band</p>
              <p className="text-sm font-bold text-white">IELTS Academic Listening</p>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-700 hidden sm:block" />

          <div className="flex items-center gap-4 text-xs sm:text-sm">
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

        {/* Audio Snippet Status */}
        <div className="flex items-center gap-3 text-xs bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-700">
          <Volume2 className={`w-4 h-4 ${isPlayingSnippet ? 'text-emerald-400 animate-pulse' : 'text-zinc-400'}`} />
          <span className="text-zinc-300">
            {isPlayingSnippet ? `Đang phát lại đoạn: ${playbackTime}...` : `Đoạn đã chọn: ${playbackTime}`}
          </span>
        </div>
      </div>

      {/* Split Review: Left Transcript / Right Question Details */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Interactive Transcript */}
        <div className="w-1/2 border-r border-zinc-200 bg-white flex flex-col h-full relative">
          <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between shrink-0">
            <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#932120]" /> Interactive Audio Script
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Từ khóa đáp án
              </span>
              <span className="flex items-center gap-1 font-semibold text-amber-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Bẫy thông tin
              </span>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4 pb-20">
            <div className="border-b border-zinc-100 pb-2 mb-4">
              <h4 className="font-bold text-zinc-800">{currentSection.title}</h4>
            </div>

            {currentSection.transcripts.map((line) => (
              <div 
                key={line.id} 
                className="p-3.5 rounded-xl border border-zinc-100 hover:border-zinc-300 transition-colors bg-zinc-50/50 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-zinc-700 uppercase tracking-wider">
                    {line.speaker}
                  </span>
                  <button
                    onClick={() => handleJumpToTimestamp(line.timestamp)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-200 hover:bg-[#932120] hover:text-white transition-colors text-[11px] font-mono font-bold text-zinc-700"
                    title="Nghe lại đoạn này"
                  >
                    <Play className="w-3 h-3" /> {line.timestamp}
                  </button>
                </div>
                
                <p className="text-sm text-zinc-800 leading-relaxed">
                  {line.text}
                </p>

                {/* Keywords badges */}
                {line.keywords && line.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {line.keywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                          kw.type === 'answer'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {kw.type === 'answer' ? '✓ Đáp án Q' + kw.question_number : '⚠ Bẫy Q' + kw.question_number}: "{kw.phrase}"
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Section Switcher Tabs */}
          <div className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-zinc-200 p-2.5 flex gap-2 z-10 shadow-xs">
            {testData.sections.map((s, idx) => (
              <button
                key={s.section_number}
                onClick={() => setActiveSection(idx)}
                className={`flex-1 py-2 px-3 text-xs md:text-sm font-bold rounded-xl transition-all ${
                  activeSection === idx 
                    ? 'bg-[#932120] text-white shadow-md' 
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                Section {s.section_number}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Questions & Explanations */}
        <div className="w-1/2 flex flex-col h-full bg-zinc-50/70">
          <div className="flex justify-between items-center px-6 py-3.5 border-b border-zinc-200 bg-white shrink-0 shadow-xs z-10">
            <h3 className="font-bold text-zinc-900 text-sm md:text-base">
              Đối Chiếu Câu Hỏi Section {currentSection.section_number}
            </h3>
            <span className="text-xs font-semibold text-zinc-500">
              Đúng {correctCount}/{allQuestions.length} câu
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
            {currentSection.question_groups.map(group => (
              <div key={group.group_id} className="relative">
                <QuestionGroupRenderer
                  group={group}
                  mode="review"
                  userAnswers={userAnswers}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
