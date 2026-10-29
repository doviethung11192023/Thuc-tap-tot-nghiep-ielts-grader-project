"use client";

import React from 'react';
import { CleanListeningExerciseGroup, CleanListeningQuestion } from '@/mocks/clean-dataset/listening-test-1-clean';
import { CleanListeningScoreCard } from './CleanListeningScoreCard';
import { CleanListeningTableRenderer } from './CleanListeningTableRenderer';
import { CleanQuestionItemRenderer } from './CleanQuestionItemRenderer';
import { CleanGroupDropdownExplanation } from './CleanGroupDropdownExplanation';

interface CleanListeningExerciseGroupsPaneProps {
  userName?: string;
  submittedAt: string;
  overallBand: number;
  correctCount: number;
  totalQuestions: number;
  currentExerciseGroups: CleanListeningExerciseGroup[];
  currentSectionQuestions: CleanListeningQuestion[];
  activeQuestionNumber: number;
  onSelectQuestion: (num: number) => void;
  onPlayAtTime: (seconds: number) => void;
  onSelectEvidenceText: (text: string) => void;
}

export function CleanListeningExerciseGroupsPane({
  userName = "long",
  submittedAt,
  overallBand,
  correctCount,
  totalQuestions,
  currentExerciseGroups,
  currentSectionQuestions,
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
                  activeQuestionNumber={activeQuestionNumber}
                  onSelectQuestion={onSelectQuestion}
                  onPlayAtTime={onPlayAtTime}
                  onSelectEvidenceText={onSelectEvidenceText}
                  defaultExpanded={gIdx === 0}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {groupQuestions.map(q => (
                    <CleanQuestionItemRenderer
                      key={q.id}
                      question={q}
                      onSelectEvidence={onSelectEvidenceText}
                      defaultExpanded={false}
                    />
                  ))}
                </div>
                <CleanGroupDropdownExplanation
                  questions={groupQuestions}
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
