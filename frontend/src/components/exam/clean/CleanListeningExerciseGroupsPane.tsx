"use client";

import React from 'react';
import { Compass } from 'lucide-react';
import { CleanListeningExerciseGroup, CleanListeningQuestion, CleanListeningUtterance } from '@/mocks/clean-dataset/listening-test-1-clean';
import { CleanListeningScoreCard } from './CleanListeningScoreCard';
import { CleanListeningTableRenderer } from './CleanListeningTableRenderer';
import { CleanQuestionItemRenderer } from './CleanQuestionItemRenderer';
import { CleanGroupDropdownExplanation } from './CleanGroupDropdownExplanation';
import { CleanDetailSummaryCard } from './CleanDetailSummaryCard';

interface CleanListeningExerciseGroupsPaneProps {
  userName?: string;
  submittedAt: string;
  overallBand: number | null;
  correctCount: number;
  totalQuestions: number;
  currentExerciseGroups: CleanListeningExerciseGroup[];
  currentSectionQuestions: CleanListeningQuestion[];
  transcriptUtterances?: CleanListeningUtterance[];
  activeQuestionNumber: number;
  onSelectQuestion: (num: number) => void;
  onPlayAtTime: (seconds: number) => void;
  onSelectEvidenceText: (text: string, questionNumber?: number) => void;
}

export function CleanListeningExerciseGroupsPane({
  userName = "Học viên",
  submittedAt,
  overallBand,
  correctCount,
  totalQuestions,
  currentExerciseGroups,
  currentSectionQuestions,
  transcriptUtterances,
  activeQuestionNumber,
  onSelectQuestion,
  onPlayAtTime,
  onSelectEvidenceText
}: CleanListeningExerciseGroupsPaneProps) {
  return (
    <div className="w-1/2 h-full overflow-y-auto bg-zinc-50/60 p-5 md:p-6 space-y-6">
      <CleanListeningScoreCard
        userName={userName}
        submittedAt={submittedAt}
        overallBand={overallBand}
        correctCount={correctCount}
        totalQuestions={totalQuestions}
      />

      {currentExerciseGroups.map((group, gIdx) => {
        const groupQuestions = currentSectionQuestions.filter(
          q => q.question_number >= group.question_start && q.question_number <= group.question_end
        );
        const hasTableData = !!group.table_data;

        return (
          <div key={group.id || gIdx} className="space-y-4">
            <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs md:text-sm">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">?</div>
                <span>Questions {group.question_start} - {group.question_end}</span>
              </div>
              <p className="text-xs md:text-sm font-semibold text-zinc-800">{group.title}</p>
            </div>

            {hasTableData ? (
              <div className="space-y-4">
                <CleanListeningTableRenderer
                  tableData={group.table_data}
                  title={group.content?.split('\n')?.[0] || `Form Questions ${group.question_start}-${group.question_end}`}
                  subtitle="Bảng mẫu phòng thi kèm đáp án học viên"
                  questions={groupQuestions}
                  activeQuestionNumber={activeQuestionNumber}
                  onSelectQuestion={onSelectQuestion}
                />
                <CleanGroupDropdownExplanation
                  questions={groupQuestions}
                  transcriptUtterances={transcriptUtterances}
                  activeQuestionNumber={activeQuestionNumber}
                  onSelectQuestion={onSelectQuestion}
                  onPlayAtTime={onPlayAtTime}
                  onSelectEvidenceText={onSelectEvidenceText}
                  defaultExpanded={gIdx === 0}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {group.diagram_image_url ? (
                  <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-2xs">
                    <img
                      src={group.diagram_image_url}
                      alt={`Sơ đồ ${group.question_start}-${group.question_end}`}
                      className="w-full h-auto max-h-[420px] object-contain mx-auto rounded-lg"
                    />
                  </div>
                ) : /\b(map|plan|diagram)\b/i.test(group.title || '') ? (
                  <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                    <Compass className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-900">Câu hỏi nghe định hướng bản đồ / sơ đồ:</strong> Đối chiếu trực tiếp vị trí các đáp án với lời thoại transcript ở cột bên trái.
                    </span>
                  </div>
                ) : null}

                {/* LS-03: Render đoạn văn ghi chú gốc (Complete the notes) nếu group có template */}
                {group.template && (
                  <CleanDetailSummaryCard
                    template={group.template}
                    questions={groupQuestions as any}
                    onSelectQuestion={onSelectQuestion}
                  />
                )}

                <div className="space-y-3">
                  {groupQuestions.map(q => (
                    <CleanQuestionItemRenderer
                      key={q.id}
                      question={q}
                      optionsPool={group.options_pool}
                      onSelectEvidence={onSelectEvidenceText}
                      defaultExpanded={false}
                    />
                  ))}
                </div>
                <CleanGroupDropdownExplanation
                  questions={groupQuestions}
                  transcriptUtterances={transcriptUtterances}
                  activeQuestionNumber={activeQuestionNumber}
                  onSelectQuestion={onSelectQuestion}
                  onPlayAtTime={onPlayAtTime}
                  onSelectEvidenceText={onSelectEvidenceText}
                  defaultExpanded={false}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
