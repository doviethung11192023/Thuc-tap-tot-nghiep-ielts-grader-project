"use client";

import React, { useState } from 'react';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { mockSpeakingExamDataset } from '@/mocks/exam-speaking';
import { SpeakingIntroModal } from './speaking/speaking-intro-modal';
import { SpeakingPartGuideline } from './speaking/speaking-part-guideline';
import { SpeakingQuestionSidebar } from './speaking/speaking-question-sidebar';
import { SpeakingVirtualRoomStage } from './speaking/speaking-virtual-room-stage';
import { SpeakingAidsPanel } from './speaking/speaking-aids-panel';
import { SpeakingReviewScreen } from './speaking/speaking-review-screen';
import { ExitConfirmModal } from './ExitConfirmModal';

interface SpeakingWorkspaceProps {
  mode?: 'exam' | 'practice';
  onSubmit: () => void;
}

export function SpeakingWorkspace({ mode = 'exam', onSubmit }: SpeakingWorkspaceProps) {
  const router = useRouter();
  const exam = mockSpeakingExamDataset;

  // View phase: 'intro' | 'guideline' | 'testing' | 'review'
  const [viewPhase, setViewPhase] = useState<'intro' | 'guideline' | 'testing' | 'review'>('intro');

  // Navigation state
  const [currentPart, setCurrentPart] = useState<1 | 2 | 3>(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Recorded questions map: key: "p1_q1", value: true
  const [recordedMap, setRecordedMap] = useState<Record<string, boolean>>({
    'p1_q1': true,
    'p1_q2': true,
  });

  // Scratchpad notes
  const [notes, setNotes] = useState(
    'Ha Giang motorbike trip with university friends\nBreathtaking Ma Pi Leng pass, limestone karsts\nSteep roads, ethnic minority children warmth'
  );

  // Exit Modal state
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const activePartData = exam.parts.find((p) => p.part_number === currentPart) || exam.parts[0];
  const questions =
    activePartData.questions ||
    (activePartData.cue_card
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

  // Handle intro modal confirm
  const handleIntroConfirm = () => {
    setViewPhase('guideline');
  };

  // Handle starting a part from guideline screen
  const handleStartPart = () => {
    setViewPhase('testing');
  };

  // Handle question selection
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

  // Handle recording completion for current question
  const handleRecordComplete = () => {
    const key = `p${currentPart}_q${currentQuestionIndex + 1}`;
    setRecordedMap((prev) => ({
      ...prev,
      [key]: true,
    }));
  };

  // Handle next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // End of this part
      if (currentPart === 1) {
        setCurrentPart(2);
        setCurrentQuestionIndex(0);
        setViewPhase('guideline');
      } else if (currentPart === 2) {
        setCurrentPart(3);
        setCurrentQuestionIndex(0);
        setViewPhase('guideline');
      } else {
        // All parts completed, go to review
        setViewPhase('review');
      }
    }
  };

  // Handle retake a single question from review screen
  const handleRetakeQuestion = (partNum: 1 | 2 | 3, qIdx: number) => {
    setCurrentPart(partNum);
    setCurrentQuestionIndex(qIdx);
    setViewPhase('testing');
  };

  // Handle reset all
  const handleRetakeAll = () => {
    setRecordedMap({});
    setCurrentPart(1);
    setCurrentQuestionIndex(0);
    setViewPhase('guideline');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* 1. Intro Modal Phase */}
      <SpeakingIntroModal
        isOpen={viewPhase === 'intro'}
        onClose={() => setViewPhase('guideline')}
        onConfirm={handleIntroConfirm}
      />

      {/* 2. Part Guideline Phase */}
      {viewPhase === 'guideline' && (
        <SpeakingPartGuideline
          partNumber={currentPart}
          instructions={activePartData.instructions}
          guidelines={activePartData.guidelines}
          onBack={() => setIsExitModalOpen(true)}
          onStart={handleStartPart}
        />
      )}

      {/* 3. Review Screen Phase */}
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

      {/* 4. Main 3-Column Virtual Speaking Room Testing Phase */}
      {viewPhase === 'testing' && (
        <div className="flex-1 flex flex-col justify-between">
          {/* Header */}
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

          {/* 3-Column Body */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col lg:flex-row gap-4 items-stretch">
            {/* Left Sidebar */}
            <SpeakingQuestionSidebar
              parts={exam.parts}
              currentPart={currentPart}
              currentQuestionIndex={currentQuestionIndex}
              recordedStatus={recordedMap}
              onSelectQuestion={handleSelectQuestion}
              onOpenReview={() => setViewPhase('review')}
            />

            {/* Center Virtual Examiner Stage */}
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

            {/* Right Aids Panel */}
            <SpeakingAidsPanel
              ideas={currentQuestionItem?.ideas || activePartData.cue_card?.ideas}
              notes={notes}
              onNotesChange={setNotes}
            />
          </main>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      <ExitConfirmModal
        isOpen={isExitModalOpen}
        mode={mode}
        onContinue={() => setIsExitModalOpen(false)}
        onExitDiscard={() => router.push('/test-practice')}
      />
    </div>
  );
}
