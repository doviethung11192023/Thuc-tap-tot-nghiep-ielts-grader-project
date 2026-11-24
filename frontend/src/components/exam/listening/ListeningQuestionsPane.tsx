"use client";

import React from 'react';
import { Compass, Flag } from 'lucide-react';
import { QuestionGroupRenderer } from '../renderers/QuestionGroupRenderer';

interface ListeningQuestionsPaneProps {
  availableSections: any[];
  activeSection: number;
  playingAudioSection?: number;
  isExamAudioPlaying?: boolean;
  currentSection: any;
  allQuestions: any[];
  answeredCount: number;
  userAnswers: Record<number, string | string[]>;
  flaggedQuestions?: Record<number, boolean>;
  isLocked?: boolean;
  onSectionChange: (idx: number) => void;
  onAnswerChange: (questionNumber: number, value: any) => void;
  onQuestionClick: (questionNumber: number) => void;
  onToggleFlag?: (questionNumber: number) => void;
}

function hasAnswerValue(val: string | string[] | undefined): boolean {
  if (Array.isArray(val)) return val.some((v) => String(v ?? '').trim().length > 0);
  return typeof val === 'string' && val.trim().length > 0;
}

export function ListeningQuestionsPane({
  availableSections,
  activeSection,
  playingAudioSection,
  isExamAudioPlaying = false,
  currentSection,
  allQuestions,
  answeredCount,
  userAnswers,
  flaggedQuestions = {},
  isLocked = false,
  onSectionChange,
  onAnswerChange,
  onQuestionClick,
  onToggleFlag,
}: ListeningQuestionsPaneProps) {
  if (!currentSection) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Section Tabs */}
      <div className="border-b border-zinc-200 px-6 py-2.5 bg-zinc-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex gap-2 overflow-x-auto">
          {availableSections.map((s, idx) => {
            const isPlayingThisSection = playingAudioSection === idx && isExamAudioPlaying;
            return (
              <button
                key={s.section_number || s.sectionNumber || idx}
                type="button"
                onClick={() => onSectionChange(idx)}
                className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  activeSection === idx
                    ? 'bg-[#932120] text-white shadow-md'
                    : 'bg-white text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
                }`}
              >
                {isPlayingThisSection && (
                  <span
                    className={`w-2 h-2 rounded-full animate-pulse ${
                      activeSection === idx ? 'bg-emerald-300' : 'bg-emerald-500'
                    }`}
                    title="Đang phát audio Section này"
                  />
                )}
                <span>Section {s.sectionNumber || s.section_number || idx + 1}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    activeSection === idx ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {s.question_groups.reduce((acc: number, g: any) => acc + g.questions.length, 0)} câu
                </span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-500 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#932120]"></span> Đã trả lời
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Đánh dấu
          </span>
        </div>
      </div>

      {/* Section Header & Questions */}
      <div
        className={`flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-6 pb-28 ${
          isLocked ? 'pointer-events-none opacity-60 select-none' : ''
        }`}
      >
        <div className="border-b border-zinc-100 pb-4">
          <h2 className="text-xl font-bold text-zinc-900">{currentSection.title}</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Lắng nghe cẩn thận audio và điền câu trả lời vào các chỗ trống hoặc lựa chọn phương án đúng.
          </p>
        </div>

        {currentSection.question_groups.map((group: any) => {
          const groupQNums: number[] = (group.questions || []).map((q: any) => q.question_number);
          const isMissingMapNotice =
            !group.diagram_image_url &&
            group.question_type !== 'diagram_labelling' &&
            /\b(map|plan|diagram)\b/i.test(group.instruction || '');

          return (
            <div
              key={group.group_id}
              id={`reading-question-group-${group.group_id}`}
              data-question-numbers={groupQNums.join(' ')}
              className="relative space-y-2.5"
            >
              {onToggleFlag && groupQNums.length > 0 && (
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <span className="text-[11px] font-medium text-zinc-500 mr-0.5 flex items-center gap-1">
                    <Flag className="w-3 h-3 text-amber-500" />
                    Đánh dấu xem lại:
                  </span>
                  {groupQNums.map((qNum) => {
                    const isFlagged = !!flaggedQuestions[qNum];
                    return (
                      <button
                        key={qNum}
                        type="button"
                        onClick={() => onToggleFlag(qNum)}
                        aria-pressed={isFlagged}
                        title={isFlagged ? `Bỏ đánh dấu câu ${qNum}` : `Đánh dấu câu ${qNum}`}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                          isFlagged
                            ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-amber-400 hover:text-amber-700'
                        }`}
                      >
                        {qNum}
                      </button>
                    );
                  })}
                </div>
              )}

              {isMissingMapNotice && (
                <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                  <Compass className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900">Câu hỏi nghe định hướng không gian:</strong> Nghe chỉ dẫn vị trí trong băng nghe và đối chiếu trực tiếp với danh sách lựa chọn / ghi chú bên dưới.
                  </span>
                </div>
              )}

              <QuestionGroupRenderer
                group={group}
                mode="exam"
                userAnswers={userAnswers}
                onAnswerChange={onAnswerChange}
              />
            </div>
          );
        })}
      </div>

      {/* Bottom Question Palette */}
      <div className="bg-white border-t border-zinc-200 p-2.5 shrink-0 shadow-lg z-10">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            Danh sách câu hỏi • Đã làm {answeredCount}/{allQuestions.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar p-1">
          {allQuestions.map((q: any) => {
            const isAnswered = hasAnswerValue(userAnswers[q.question_number]);
            const isFlagged = !!flaggedQuestions[q.question_number];
            return (
              <button
                key={q.question_number}
                type="button"
                onClick={() => onQuestionClick(q.question_number)}
                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                  isFlagged
                    ? 'bg-amber-500 text-white shadow-xs ring-1 ring-amber-600'
                    : isAnswered
                    ? 'bg-[#932120] text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
                }`}
                title={`Câu ${q.question_number}${isFlagged ? ' (Đã đánh dấu)' : ''}`}
              >
                {q.question_number}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
