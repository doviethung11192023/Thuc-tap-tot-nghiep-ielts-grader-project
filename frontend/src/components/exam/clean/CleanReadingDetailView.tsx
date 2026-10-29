"use client";

import React, { useState, useRef, useMemo } from 'react';
import { CleanQuestionItemRenderer } from './CleanQuestionItemRenderer';
import { CleanReadingDetailPassagePane, HighlightTarget } from './CleanReadingDetailPassagePane';
import { CleanReadingDetailBottomBar } from './CleanReadingDetailBottomBar';
import { CleanReadingDetailScoreCard } from './CleanReadingDetailScoreCard';
import { CleanReadingDetailHeader } from './CleanReadingDetailHeader';
import { CleanDetailSummaryCard } from './CleanDetailSummaryCard';
import { CleanReadingDetailSkeleton } from './CleanReadingDetailSkeleton';
import { useAttemptDetail } from '@/hooks/useAttemptDetail';

interface CleanReadingDetailViewProps {
  onBack?: () => void;
  onRetake: () => void;
  attemptId?: string;
  selectedParts?: string[];
}

export function CleanReadingDetailView({
  onBack,
  onRetake,
  attemptId,
  selectedParts,
}: CleanReadingDetailViewProps) {
  const { data, loading } = useAttemptDetail(attemptId);
  const [activePassageIndex, setActivePassageIndex] = useState(0);
  const [highlightedEvidence, setHighlightedEvidence] = useState<HighlightTarget | null>(null);
  const passageScrollRef = useRef<HTMLDivElement>(null);

  const rawPassages = data.passages || [];
  const rawQuestions = data.questions || [];
  const rawGroups = data.exercise_groups || [];

  const filteredPassages = useMemo(() => {
    if (!selectedParts?.length) return rawPassages;
    const partNums = selectedParts.map(Number);
    const res = rawPassages.filter((p) => partNums.includes(p.passage_number));
    return res.length > 0 ? res : rawPassages;
  }, [rawPassages, selectedParts]);

  const filteredQuestions = useMemo(() => {
    if (!selectedParts?.length) return rawQuestions;
    const partNums = selectedParts.map(Number);
    const res = rawQuestions.filter((q) => partNums.includes(q.passage_number));
    return res.length > 0 ? res : rawQuestions;
  }, [rawQuestions, selectedParts]);

  const filteredExerciseGroups = useMemo(() => {
    if (!selectedParts?.length) return rawGroups;
    const partNums = selectedParts.map(Number);
    const res = rawGroups.filter((g) => partNums.includes(g.passage_number));
    return res.length > 0 ? res : rawGroups;
  }, [rawGroups, selectedParts]);

  if (loading) {
    return <CleanReadingDetailSkeleton />;
  }

  const currentPassage =
    filteredPassages[activePassageIndex] || filteredPassages[0] || { passage_number: 1, title: '', content: '' };
  const currentPassageQuestions = filteredQuestions.filter(
    (q) => q.passage_number === currentPassage.passage_number
  );
  const currentExerciseGroups = filteredExerciseGroups.filter(
    (eg) => eg.passage_number === currentPassage.passage_number
  );

  const getPassageScoreText = (passageNum: number) => {
    const qList = filteredQuestions.filter((q) => q.passage_number === passageNum);
    const correctCount = qList.filter((q) => q.is_correct).length;
    return `${correctCount}/${qList.length} Questions`;
  };

  const handleSelectEvidence = (originalText: string, questionNumber?: number) => {
    setHighlightedEvidence({ text: originalText, qNum: questionNumber });
  };

  const handleScrollToQuestion = (qNum: number) => {
    const el = document.getElementById(`question-card-${qNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-100 overflow-hidden font-sans">
      {/* 1. TOP HEADER */}
      <CleanReadingDetailHeader onBack={onBack} onRetake={onRetake} />

      {/* 2. SPLIT VIEW: Passage Left / Questions Right */}
      <div className="flex-1 flex overflow-hidden">
        <CleanReadingDetailPassagePane
          passageIndex={currentPassage.passage_number - 1}
          title={currentPassage.title}
          content={currentPassage.content}
          questions={currentPassageQuestions}
          passageScrollRef={passageScrollRef}
          highlightedEvidence={highlightedEvidence}
        />

        {/* Right Column: Score card + Summary paragraph + Questions list */}
        <div className="w-1/2 h-full overflow-y-auto bg-zinc-50/60 p-5 md:p-6 space-y-5 custom-scrollbar">
          <CleanReadingDetailScoreCard
            title={data.title}
            overallBand={data.overall_band}
            correctCount={data.correct_count}
            totalQuestions={filteredQuestions.length || 40}
          />

          {/* QUESTION GROUPS */}
          {currentExerciseGroups.map((group, gIdx) => {
            const questionsToRender = group.questions?.length
              ? group.questions
              : currentPassageQuestions.filter((q) => {
                  if (group.id && (q as any).group_id) return (q as any).group_id === group.id;
                  if (group.question_start && group.question_end) {
                    return (
                      q.question_number >= group.question_start &&
                      q.question_number <= group.question_end
                    );
                  }
                  return false;
                });

            if (questionsToRender.length === 0) return null;

            return (
              <div key={group.id || gIdx} className="space-y-4">
                {group.title && (
                  <div className="p-4 bg-zinc-100/80 rounded-xl border border-zinc-200">
                    <h4 className="font-bold text-sm text-zinc-800">{group.title}</h4>
                  </div>
                )}

                {/* Đoạn văn tóm tắt điền từ nếu có template */}
                {group.template && (
                  <CleanDetailSummaryCard
                    template={group.template}
                    questions={questionsToRender}
                    onSelectQuestion={handleScrollToQuestion}
                  />
                )}

                <div className="space-y-3">
                  {questionsToRender.map((question) => (
                    <CleanQuestionItemRenderer
                      key={question.question_number}
                      question={question}
                      onSelectEvidence={handleSelectEvidence}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {currentExerciseGroups.length === 0 && (
            <div className="space-y-3">
              {currentPassageQuestions.map((question) => (
                <CleanQuestionItemRenderer
                  key={question.question_number}
                  question={question}
                  onSelectEvidence={handleSelectEvidence}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM BAR */}
      <CleanReadingDetailBottomBar
        passages={filteredPassages}
        activePassageIndex={activePassageIndex}
        onSelectPassage={setActivePassageIndex}
        getPassageScoreText={getPassageScoreText}
      />
    </div>
  );
}
