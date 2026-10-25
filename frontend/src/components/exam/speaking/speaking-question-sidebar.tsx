"use client";

import React, { useState } from 'react';
import { Check, Mic, ChevronUp, ChevronDown, PlayCircle } from 'lucide-react';
import { SpeakingPartData } from '@/mocks/exam-speaking';

interface SpeakingQuestionSidebarProps {
  parts: SpeakingPartData[];
  currentPart: 1 | 2 | 3;
  currentQuestionIndex: number;
  recordedStatus: Record<string, boolean>; // key: "p1_q1", value: boolean
  onSelectQuestion: (partNumber: 1 | 2 | 3, questionIndex: number) => void;
  onOpenReview: () => void;
}

export const SpeakingQuestionSidebar: React.FC<SpeakingQuestionSidebarProps> = ({
  parts,
  currentPart,
  currentQuestionIndex,
  recordedStatus,
  onSelectQuestion,
  onOpenReview,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className="w-full lg:w-72 bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm flex flex-col justify-between shrink-0 h-full">
      <div>
        {/* Accordion Header */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between text-sm font-bold text-slate-800 pb-3 border-b border-slate-100 mb-3"
        >
          <span>Danh sách câu hỏi</span>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {!isCollapsed && (
          <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {parts.map((p) => {
              const questions = p.questions || (p.cue_card ? [{ id: 'p2_cue', question_number: 1, question: p.cue_card.topic, ideas: p.cue_card.ideas }] : []);

              return (
                <div key={p.part_number} className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-600 px-2 py-1">
                    Part {p.part_number}
                  </div>

                  <div className="space-y-1.5">
                    {questions.map((q, idx) => {
                      const questionKey = `p${p.part_number}_q${idx + 1}`;
                      const isRecorded = !!recordedStatus[questionKey];
                      const isCurrent = currentPart === p.part_number && currentQuestionIndex === idx;

                      return (
                        <button
                          key={q.id || idx}
                          onClick={() => onSelectQuestion(p.part_number, idx)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all border ${
                            isCurrent
                              ? 'bg-emerald-50/70 border-emerald-500 text-slate-800 shadow-sm'
                              : isRecorded
                              ? 'bg-emerald-50/40 border-emerald-200/60 text-slate-700 hover:bg-emerald-50/80'
                              : 'bg-slate-50/60 border-slate-200/60 text-slate-600 hover:bg-slate-100/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            {/* Status Icon */}
                            {isRecorded ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : isCurrent ? (
                              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                                <Mic className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                                <Mic className="w-3.5 h-3.5" />
                              </div>
                            )}

                            <span className="truncate">
                              Question {idx + 1}
                            </span>
                          </div>

                          {/* Current question active indicator */}
                          {isCurrent && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Button */}
      <div className="pt-4 border-t border-slate-100 mt-4">
        <button
          onClick={onOpenReview}
          className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2"
        >
          <PlayCircle className="w-4 h-4 text-blue-600" />
          <span>Review bài làm</span>
        </button>
      </div>
    </aside>
  );
};
