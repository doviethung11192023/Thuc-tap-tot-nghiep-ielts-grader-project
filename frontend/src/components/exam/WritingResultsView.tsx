"use client";

import React, { useState } from 'react';
import { ArrowLeft, RotateCcw, Award, CheckCircle2, AlertCircle, Sparkles, BookOpen, ChevronDown, ChevronUp, Layers, HelpCircle, X } from 'lucide-react';
import Link from 'next/link';
import { mockWritingExamDataset, WritingHighlight } from '@/mocks/exam-writing';

interface WritingResultsViewProps {
  essayText: string;
  onRetake: () => void;
}

export function WritingResultsView({ essayText, onRetake }: WritingResultsViewProps) {
  const result = mockWritingExamDataset.grading_result;
  
  // Highlight Filter Pills (toggle state)
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({
    error: true,
    coherence: true,
    lexical: true,
    strength: true
  });

  const [selectedHighlight, setSelectedHighlight] = useState<WritingHighlight | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tr' | 'cc' | 'lr' | 'gra'>('overview');
  const [isModelAnswerExpanded, setIsModelAnswerExpanded] = useState<boolean>(false);

  const toggleFilter = (key: string) => {
    setActiveFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to colorize text
  const getHighlightClass = (category: string) => {
    switch (category) {
      case 'error':
        return 'bg-red-100 text-red-900 border-b-2 border-red-500 hover:bg-red-200 cursor-pointer px-1 rounded-sm';
      case 'coherence':
        return 'bg-amber-100 text-amber-900 border-b-2 border-amber-500 hover:bg-amber-200 cursor-pointer px-1 rounded-sm';
      case 'lexical':
        return 'bg-purple-100 text-purple-900 border-b-2 border-purple-500 hover:bg-purple-200 cursor-pointer px-1 rounded-sm';
      case 'strength':
        return 'bg-emerald-100 text-emerald-900 border-b-2 border-emerald-500 hover:bg-emerald-200 cursor-pointer px-1 rounded-sm';
      default:
        return '';
    }
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
                Đã chấm xong
              </span>
              <h1 className="font-bold text-zinc-900 text-sm md:text-base">
                Kết Quả Đánh Giá Chi Tiết: IELTS Writing Task 2
              </h1>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block">
              Phân tích đa tác nhân AI Grader theo 4 tiêu chí chuẩn IELTS và bộ lọc sửa lỗi tương tác.
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

      {/* Main 2-Column Split View - Chuẩn image39.png */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column (55%): Student Essay & 4 Filter Pills */}
        <div className="w-[55%] border-r border-zinc-200 bg-white flex flex-col h-full relative">
          {/* 4 Interactive Filter Pills Header */}
          <div className="p-3.5 bg-zinc-50/80 border-b border-zinc-200 shrink-0 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-zinc-500 uppercase mr-1">Bộ lọc cờ:</span>
            
            <button
              onClick={() => toggleFilter('error')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilters.error 
                  ? 'bg-red-600 text-white shadow-xs' 
                  : 'bg-zinc-200 text-zinc-600 opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              Lỗi: {result.highlights.filter(h => h.category === 'error').length}
            </button>

            <button
              onClick={() => toggleFilter('coherence')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilters.coherence 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'bg-zinc-200 text-zinc-600 opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              Lập luận: {result.highlights.filter(h => h.category === 'coherence').length}
            </button>

            <button
              onClick={() => toggleFilter('lexical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilters.lexical 
                  ? 'bg-purple-600 text-white shadow-xs' 
                  : 'bg-zinc-200 text-zinc-600 opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              Từ vựng: {result.highlights.filter(h => h.category === 'lexical').length}
            </button>

            <button
              onClick={() => toggleFilter('strength')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilters.strength 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-zinc-200 text-zinc-600 opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              Điểm sáng: {result.highlights.filter(h => h.category === 'strength').length}
            </button>
          </div>

          {/* Student Essay Content with Highlights */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
            <div className="border-b border-zinc-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                BÀI VIẾT GỐC CỦA THÍ SINH • Click vào đoạn gạch chân để xem góp ý
              </h3>
            </div>

            <div className="font-serif text-lg leading-relaxed text-zinc-800 space-y-4">
              {/* Render paragraphs with highlights */}
              {mockWritingExamDataset.sample_student_submission.split('\n\n').map((para, pIdx) => {
                let renderedPara = para;

                return (
                  <p key={pIdx} className="leading-relaxed">
                    {/* Render words or segments */}
                    {para.split('. ').map((sentence, sIdx) => {
                      // Check if any active highlight matches this sentence
                      const matchedHighlight = result.highlights.find(h => 
                        sentence.includes(h.original_text) && activeFilters[h.category]
                      );

                      if (matchedHighlight) {
                        const parts = sentence.split(matchedHighlight.original_text);
                        return (
                          <span key={sIdx}>
                            {parts[0]}
                            <mark
                              onClick={() => setSelectedHighlight(matchedHighlight as WritingHighlight)}
                              className={getHighlightClass(matchedHighlight.category)}
                              title={matchedHighlight.title}
                            >
                              {matchedHighlight.original_text}
                            </mark>
                            {parts[1]}.{' '}
                          </span>
                        );
                      }

                      return <span key={sIdx}>{sentence}. </span>;
                    })}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Interactive Popover Card for Selected Highlight (triết lý no_overwriting) */}
          {selectedHighlight && (
            <div className="absolute bottom-4 inset-x-4 bg-white rounded-2xl border-2 border-[#932120] p-5 shadow-2xl z-30 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider ${
                    selectedHighlight.category === 'error' ? 'bg-red-100 text-red-800' :
                    selectedHighlight.category === 'coherence' ? 'bg-amber-100 text-amber-800' :
                    selectedHighlight.category === 'lexical' ? 'bg-purple-100 text-purple-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {selectedHighlight.title}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedHighlight(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-600 mb-2">
                <strong>Lý do phân tích:</strong> {selectedHighlight.reason}
              </p>

              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs space-y-1">
                <span className="text-zinc-500 font-semibold uppercase text-[10px] block">
                  Đề xuất chỉnh sửa (1 câu chuẩn ngữ pháp):
                </span>
                <p className="font-semibold text-emerald-800 font-serif text-sm">
                  "{selectedHighlight.suggested_fix}"
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (45%): 5 Tabs & Grader Breakdown */}
        <div className="w-[45%] flex flex-col h-full bg-zinc-50/70">
          {/* 5 Tabs Header */}
          <div className="flex border-b border-zinc-200 bg-white shrink-0 overflow-x-auto p-1">
            {[
              { id: 'overview', label: 'Tổng quan' },
              { id: 'tr', label: 'TR (Task Response)' },
              { id: 'cc', label: 'CC (Coherence)' },
              { id: 'lr', label: 'LR (Lexical)' },
              { id: 'gra', label: 'GRA (Grammar)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap text-center ${
                  activeTab === tab.id
                    ? 'bg-[#932120] text-white shadow-xs'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
            {activeTab === 'overview' && (
              <>
                {/* Huge Red Band Score Card */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Overall Writing Band Score
                    </span>
                    <h2 className="text-sm font-semibold text-zinc-600 mt-0.5">
                      Đạt yêu cầu chuẩn IELTS Academic
                    </h2>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-[#932120] flex items-center justify-center font-black text-3xl text-white shadow-lg">
                    {result.overall_band.toFixed(1)}
                  </div>
                </div>

                {/* 4 Criteria Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
                    <span className="text-xs text-zinc-500 font-medium">Task Response</span>
                    <p className="text-xl font-black text-[#932120] mt-1">
                      {result.criteria_scores.task_response.score.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
                    <span className="text-xs text-zinc-500 font-medium">Coherence & Cohesion</span>
                    <p className="text-xl font-black text-[#932120] mt-1">
                      {result.criteria_scores.coherence_cohesion.score.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
                    <span className="text-xs text-zinc-500 font-medium">Lexical Resource</span>
                    <p className="text-xl font-black text-[#932120] mt-1">
                      {result.criteria_scores.lexical_resource.score.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
                    <span className="text-xs text-zinc-500 font-medium">Grammar & Accuracy</span>
                    <p className="text-xl font-black text-[#932120] mt-1">
                      {result.criteria_scores.grammatical_accuracy.score.toFixed(1)}
                    </p>
                  </div>
                </div>

                {/* Top 3 Priorities */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 font-bold text-zinc-900 text-sm">
                    <AlertCircle className="w-4 h-4 text-[#932120]" />
                    <span>Top 3 Ưu Tiên Cải Thiện (Actionable Feedback):</span>
                  </div>
                  <ul className="space-y-2 text-xs text-zinc-700">
                    {result.top_priorities.map((item, idx) => (
                      <li key={idx} className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100 font-medium">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Vocabulary Upgrades Table */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" /> Bảng Nâng Cấp Từ Vựng (B2 ➔ C1/C2)
                  </h4>
                  <div className="divide-y divide-zinc-100 text-xs">
                    {result.lexical_upgrades.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between gap-2">
                        <span className="text-zinc-500 line-through">{item.original}</span>
                        <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {item.upgraded}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Model Essay Band 8.5 Accordion */}
                <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                  <button
                    onClick={() => setIsModelAnswerExpanded(!isModelAnswerExpanded)}
                    className="w-full p-4 flex items-center justify-between text-left font-bold text-sm text-zinc-900 bg-zinc-50 hover:bg-zinc-100 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#932120]" />
                      {result.model_essay_band_8.title} ({result.model_essay_band_8.word_count} words)
                    </span>
                    {isModelAnswerExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isModelAnswerExpanded && (
                    <div className="p-6 font-serif text-sm leading-relaxed text-zinc-800 space-y-3 bg-white">
                      {result.model_essay_band_8.paragraphs.map((p, idx) => (
                        <p key={idx}>{p}</p>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Individual Criteria Tab View */}
            {activeTab !== 'overview' && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
                {(() => {
                  const keyMap: Record<'tr' | 'cc' | 'lr' | 'gra', keyof typeof result.criteria_scores> = {
                    tr: 'task_response',
                    cc: 'coherence_cohesion',
                    lr: 'lexical_resource',
                    gra: 'grammatical_accuracy'
                  };
                  const crit = result.criteria_scores[keyMap[activeTab as 'tr' | 'cc' | 'lr' | 'gra']];

                  return (
                    <>
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                        <div>
                          <h3 className="text-lg font-bold text-zinc-900 uppercase">
                            {activeTab.toUpperCase()} Analysis
                          </h3>
                          <p className="text-xs text-zinc-500 mt-1">{crit.description}</p>
                        </div>
                        <span className="text-2xl font-black text-[#932120] bg-red-50 px-3 py-1 rounded-xl">
                          {crit.score.toFixed(1)}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Điểm mạnh đã đạt:
                        </h4>
                        <ul className="space-y-2 text-xs text-zinc-700">
                          {crit.strengths.map((s: string, idx: number) => (
                            <li key={idx} className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                              • {s}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" /> Đề xuất cải thiện:
                        </h4>
                        <ul className="space-y-2 text-xs text-zinc-700">
                          {crit.improvements.map((im: string, idx: number) => (
                            <li key={idx} className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
                              • {im}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
