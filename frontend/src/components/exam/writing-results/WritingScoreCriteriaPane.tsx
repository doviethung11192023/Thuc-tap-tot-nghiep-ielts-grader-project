"use client";

import React, { useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { mockWritingExamDataset } from '@/mocks/exam-writing';

interface WritingScoreCriteriaPaneProps {
  gradingResult: typeof mockWritingExamDataset.grading_result;
}

export function WritingScoreCriteriaPane({ gradingResult }: WritingScoreCriteriaPaneProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tr' | 'cc' | 'lr' | 'gra'>('overview');
  const [isModelExpanded, setIsModelExpanded] = useState<boolean>(false);

  const tabs = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'tr', label: 'TR (Task Response)' },
    { id: 'cc', label: 'CC (Coherence)' },
    { id: 'lr', label: 'LR (Lexical)' },
    { id: 'gra', label: 'GRA (Grammar)' }
  ];

  const criteriaMap: Record<'tr' | 'cc' | 'lr' | 'gra', keyof typeof gradingResult.criteria_scores> = {
    tr: 'task_response',
    cc: 'coherence_cohesion',
    lr: 'lexical_resource',
    gra: 'grammatical_accuracy'
  };

  return (
    <div className="w-full lg:w-[45%] flex flex-col h-full bg-zinc-50/70">
      <div className="flex border-b border-zinc-200 bg-white shrink-0 overflow-x-auto p-1 custom-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 px-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap text-center cursor-pointer ${
              activeTab === tab.id ? 'bg-[#932120] text-white shadow-xs' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
        {activeTab === 'overview' ? (
          <>
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
                {gradingResult.overall_band.toFixed(1)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'Task Response', score: gradingResult.criteria_scores.task_response.score },
                { name: 'Coherence & Cohesion', score: gradingResult.criteria_scores.coherence_cohesion.score },
                { name: 'Lexical Resource', score: gradingResult.criteria_scores.lexical_resource.score },
                { name: 'Grammar & Accuracy', score: gradingResult.criteria_scores.grammatical_accuracy.score },
              ].map(c => (
                <div key={c.name} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
                  <span className="text-xs text-zinc-500 font-medium">{c.name}</span>
                  <p className="text-xl font-black text-[#932120] mt-1">{c.score.toFixed(1)}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 font-bold text-zinc-900 text-sm">
                <AlertCircle className="w-4 h-4 text-[#932120]" />
                <span>Top 3 Ưu Tiên Cải Thiện:</span>
              </div>
              <ul className="space-y-2 text-xs text-zinc-700">
                {gradingResult.top_priorities.map((item, idx) => (
                  <li key={idx} className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100 font-medium">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-600" /> Bảng Nâng Cấp Từ Vựng (B2 ➔ C1/C2)
              </h4>
              <div className="divide-y divide-zinc-100 text-xs">
                {gradingResult.lexical_upgrades.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between gap-2">
                    <span className="text-zinc-500 line-through">{item.original}</span>
                    <span className="font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      {item.upgraded}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
              <button
                onClick={() => setIsModelExpanded(!isModelExpanded)}
                className="w-full p-4 flex items-center justify-between text-left font-bold text-sm text-zinc-900 bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#932120]" />
                  {gradingResult.model_essay_band_8.title} ({gradingResult.model_essay_band_8.word_count} words)
                </span>
                {isModelExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {isModelExpanded && (
                <div className="p-6 font-serif text-sm leading-relaxed text-zinc-800 space-y-3 bg-white">
                  {gradingResult.model_essay_band_8.paragraphs.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
            {(() => {
              const crit = gradingResult.criteria_scores[criteriaMap[activeTab as 'tr' | 'cc' | 'lr' | 'gra']];
              return (
                <>
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 uppercase">{activeTab.toUpperCase()} Analysis</h3>
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
                        <li key={idx} className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">• {s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Đề xuất cải thiện:
                    </h4>
                    <ul className="space-y-2 text-xs text-zinc-700">
                      {crit.improvements.map((im: string, idx: number) => (
                        <li key={idx} className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl">• {im}</li>
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
  );
}
