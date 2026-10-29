"use client";

import React, { useState } from 'react';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { mockSpeakingExamDataset, type MockSpeakingExamDataset, type SpeakingPartData } from '@/mocks/exam-speaking';
import { SpeakingIntroModal } from './speaking/speaking-intro-modal';
import { SpeakingPartGuideline } from './speaking/speaking-part-guideline';
import { SpeakingQuestionSidebar } from './speaking/speaking-question-sidebar';
import { SpeakingVirtualRoomStage } from './speaking/speaking-virtual-room-stage';
import { SpeakingAidsPanel } from './speaking/speaking-aids-panel';
import { SpeakingReviewScreen } from './speaking/speaking-review-screen';
import { ExitConfirmModal } from './ExitConfirmModal';

interface SpeakingWorkspaceProps {
  testData?: MockSpeakingExamDataset;
  mode?: 'exam' | 'practice';
  onSubmit: () => void;
}

export function SpeakingWorkspace({ testData, mode = 'exam', onSubmit }: SpeakingWorkspaceProps) {
  const router = useRouter();
  const exam = testData || mockSpeakingExamDataset;

  const [viewPhase, setViewPhase] = useState<'intro' | 'guideline' | 'testing' | 'review'>('intro');
  const [currentPart, setCurrentPart] = useState<1 | 2 | 3>(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [recordedMap, setRecordedMap] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const activePartData = exam.parts.find((p: SpeakingPartData) => p.part_number === currentPart) || exam.parts[0];
  const questions =
    activePartData?.questions ||
    (activePartData?.cue_card
      ? [
          {
            id: 'p2_cue',
            question_number: 1,
            question: activePartData.cue_card.topic,
            ideas: activePartData.cue_card.ideas,
          },
        ]
      : []);

  const currentQuestionItem = questions[currentQuestionIndex];

  const handleSelectQuestion = (partNumber: 1 | 2 | 3, qIdx: number) => {
    if (partNumber !== currentPart) {
      setCurrentPart(partNumber);
      setCurrentQuestionIndex(qIdx);
      setViewPhase('guideline');
    } else {
      setCurrentQuestionIndex(qIdx);
      setViewPhase('testing');
    }
  };

  const handleRecordComplete = () => {
    const key = `p${currentPart}_q${currentQuestionIndex + 1}`;
    setRecordedMap((prev) => ({ ...prev, [key]: true }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else if (currentPart === 1 && exam.parts.some((p: SpeakingPartData) => p.part_number === 2)) {
      setCurrentPart(2);
      setCurrentQuestionIndex(0);
      setViewPhase('guideline');
    } else if (currentPart === 2 && exam.parts.some((p: SpeakingPartData) => p.part_number === 3)) {
      setCurrentPart(3);
      setCurrentQuestionIndex(0);
      setViewPhase('guideline');
    } else {
      setViewPhase('review');
    }
  };

  const handleRetakeQuestion = (partNum: 1 | 2 | 3, qIdx: number) => {
    setCurrentPart(partNum);
    setCurrentQuestionIndex(qIdx);
    setViewPhase('testing');
  };

  const handleRetakeAll = () => {
    setRecordedMap({});
    setCurrentPart((exam.parts[0]?.part_number as 1 | 2 | 3) || 1);
    setCurrentQuestionIndex(0);
    setViewPhase('guideline');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <SpeakingIntroModal
        isOpen={viewPhase === 'intro'}
        onClose={() => setViewPhase('guideline')}
        onConfirm={() => setViewPhase('guideline')}
      />

      {viewPhase === 'guideline' && activePartData && (
        <SpeakingPartGuideline
          partNumber={currentPart}
          instructions={activePartData.instructions}
          guidelines={activePartData.guidelines}
          onBack={() => setIsExitModalOpen(true)}
          onStart={() => setViewPhase('testing')}
        />
      )}

      {viewPhase === 'review' && (
        <SpeakingReviewScreen
          testTitle={exam.title}
          parts={exam.parts}
          onBackToExam={() => setViewPhase('testing')}
          onRetakeQuestion={handleRetakeQuestion}
          onRetakeAll={handleRetakeAll}
          onSubmitForAnalysis={onSubmit}
        />
      )}

      {viewPhase === 'testing' && activePartData && (
        <div className="flex-1 flex flex-col justify-between">
          <header className="w-full bg-white border-b border-slate-200/80 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <button
              onClick={() => setIsExitModalOpen(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Rời khỏi phòng thi"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <h1 className="text-xs sm:text-sm font-bold text-slate-800 text-center max-w-2xl truncate px-3">
              {exam.title}
            </h1>

            <button
              onClick={() => setViewPhase('review')}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              title="Tùy chọn bài thi"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </header>

          <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col lg:flex-row gap-4 items-stretch">
            <SpeakingQuestionSidebar
              parts={exam.parts}
              currentPart={currentPart}
              currentQuestionIndex={currentQuestionIndex}
              recordedStatus={recordedMap}
              onSelectQuestion={handleSelectQuestion}
              onOpenReview={() => setViewPhase('review')}
            />

            <SpeakingVirtualRoomStage
              partNumber={currentPart}
              questionIndex={currentQuestionIndex}
              totalQuestions={questions.length}
              questionItem={currentQuestionItem}
              cueCard={activePartData.cue_card}
              isRecorded={!!recordedMap[`p${currentPart}_q${currentQuestionIndex + 1}`]}
              onRecordComplete={handleRecordComplete}
              onNextQuestion={handleNextQuestion}
            />

            <SpeakingAidsPanel
              ideas={currentQuestionItem?.ideas || activePartData.cue_card?.ideas}
              notes={notes}
              onNotesChange={setNotes}
            />
          </main>
        </div>
      )}

      <ExitConfirmModal
        isOpen={isExitModalOpen}
        mode={mode}
        onContinue={() => setIsExitModalOpen(false)}
        onExitDiscard={() => router.push('/test-practice')}
      />
    </div>
  );
}
