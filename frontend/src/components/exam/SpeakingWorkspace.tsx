"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { MockSpeakingExamDataset, SpeakingPartData } from '@/mocks/exam-speaking';
import { useSpeakingRecorder, type RecordedAnswer } from '@/hooks/useSpeakingRecorder';
import { useSpeakingRoomMachine, type RoomQuestion } from '@/hooks/useSpeakingRoomMachine';
import { useSpeakingUploadQueue } from '@/hooks/useSpeakingUploadQueue';
import { getVoiceConsentAt } from '@/services/speaking-room';
import { SpeakingIntroModal } from './speaking/speaking-intro-modal';
import { SpeakingConsentGate } from './speaking/speaking-consent-gate';
import { SpeakingMicCheck } from './speaking/speaking-mic-check';
import { SpeakingPartGuideline } from './speaking/speaking-part-guideline';
import { SpeakingQuestionSidebar } from './speaking/speaking-question-sidebar';
import { SpeakingVirtualRoomStage } from './speaking/speaking-virtual-room-stage';
import { SpeakingAidsPanel } from './speaking/speaking-aids-panel';
import { SpeakingReviewScreen } from './speaking/speaking-review-screen';
import { ExitConfirmModal } from './ExitConfirmModal';

type ViewPhase = 'intro' | 'consent' | 'mic_check' | 'guideline' | 'testing' | 'review';
type PartNumber = 1 | 2 | 3;

interface SpeakingWorkspaceProps {
  testData: MockSpeakingExamDataset;
  attemptId: string;
  mode?: 'exam' | 'practice';
  deadlineMs?: number | null;
  returnUrl?: string;
  submitError?: string | null;
  /** Thi thử (exam): gọi khi Learner thoát giữa chừng để backend ghi nhận abandoned. */
  onAbandon?: () => Promise<unknown> | void;
  onSubmit: () => Promise<void>;
}

const INTRO_DISMISSED_KEY = 'moonlab_speaking_intro_dismissed';

function introDismissed(): boolean {
  try {
    return localStorage.getItem(INTRO_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function SpeakingWorkspace({
  testData: exam, attemptId, mode = 'exam', deadlineMs, returnUrl, submitError, onAbandon, onSubmit,
}: SpeakingWorkspaceProps) {
  const router = useRouter();
  const isMock = mode === 'exam';
  const parts = exam.parts;

  const [viewPhase, setViewPhase] = useState<ViewPhase>('intro');
  const [currentPart, setCurrentPart] = useState<PartNumber>(parts[0]?.part_number ?? 1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [notes, setNotes] = useState('');
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [micLost, setMicLost] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const submittedRef = useRef(false);

  const recorder = useSpeakingRecorder(() => setMicLost(true));
  const uploads = useSpeakingUploadQueue(attemptId);
  const { answers } = uploads;

  const activePartData = parts.find((p: SpeakingPartData) => p.part_number === currentPart) ?? parts[0];
  const questions = useMemo(() => activePartData?.questions ?? [], [activePartData]);
  const currentQuestion = questions[currentQuestionIndex];

  const allQuestions = useMemo(
    () => parts.flatMap((part) => (part.questions ?? []).map((question, index) => ({ part: part.part_number, index, question }))),
    [parts],
  );

  /** Câu đầu tiên chưa có câu trả lời, để làm tiếp sau khi tải lại trang. */
  const goToFirstUnanswered = useCallback(() => {
    const next = allQuestions.find(({ question }) => !answers[question.id]);
    if (!next) return setViewPhase('review');
    setCurrentPart(next.part);
    setCurrentQuestionIndex(next.index);
    setViewPhase('guideline');
  }, [allQuestions, answers]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex((index) => index + 1);
      return;
    }
    const nextPart = parts.find((part) => part.part_number > currentPart);
    if (nextPart) {
      setCurrentPart(nextPart.part_number);
      setCurrentQuestionIndex(0);
      setViewPhase('guideline');
    } else {
      setViewPhase('review');
    }
  }, [currentPart, currentQuestionIndex, parts, questions.length]);

  const roomQuestion = useMemo<RoomQuestion | undefined>(() => {
    if (!currentQuestion) return undefined;
    return {
      key: currentQuestion.id,
      audioUrl: currentQuestion.audio_prompt_url,
      prepSeconds: currentQuestion.prep_time_sec ?? 0,
      answerSeconds: currentQuestion.answer_time_sec ?? 45,
      answered: !!answers[currentQuestion.id],
    };
  }, [answers, currentQuestion]);

  const { enqueue } = uploads;
  const handleRecorded = useCallback(
    (questionKey: string, answer: RecordedAnswer) => enqueue(questionKey, answer),
    [enqueue],
  );

  const room = useSpeakingRoomMachine({
    active: viewPhase === 'testing',
    question: roomQuestion,
    isMock,
    startRecording: recorder.start,
    stopRecording: recorder.stop,
    discardRecording: recorder.discard,
    onRecorded: handleRecorded,
    onAdvance: handleNextQuestion,
    onRecordingFailed: () => setMicLost(true),
  });

  const { waitForAll } = uploads;
  const finishTest = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    await waitForAll();
    try {
      await onSubmit();
    } finally {
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [onSubmit, waitForAll]);

  // Đồng hồ thi thử: server giữ deadline (BR-07), hết giờ thì giữ phần đã nói và tự nộp (FR-12)
  const { stopForDeadline } = room;
  useEffect(() => {
    if (!isMock || !deadlineMs) return;
    const timer = setInterval(() => {
      const left = deadlineMs - Date.now();
      setRemainingMs(Math.max(0, left));
      if (left <= 0) {
        clearInterval(timer);
        setViewPhase('review');
        void stopForDeadline().then(finishTest);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [deadlineMs, finishTest, isMock, stopForDeadline]);

  const { requestMic } = recorder;
  const handleIntroDone = useCallback(() => {
    return getVoiceConsentAt()
      .catch(() => null)
      .then((consentAt) => setViewPhase(consentAt ? 'mic_check' : 'consent'));
  }, []);

  useEffect(() => {
    if (introDismissed()) void handleIntroDone();
  }, [handleIntroDone]);

  const handleMicPassed = () => {
    void requestMic();
    goToFirstUnanswered();
  };

  const handleSelectQuestion = (partNumber: PartNumber, index: number) => {
    if (isMock) return;
    setCurrentQuestionIndex(index);
    if (partNumber !== currentPart) {
      setCurrentPart(partNumber);
      setViewPhase('guideline');
    } else {
      setViewPhase('testing');
    }
  };

  const openQuestion = (partNumber: PartNumber, index: number) => {
    setCurrentPart(partNumber);
    setCurrentQuestionIndex(index);
    setViewPhase('testing');
  };

  const handleExit = () => setIsExitModalOpen(true);

  const recordedStatus = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const { part, index, question } of allQuestions) map[`p${part}_q${index + 1}`] = !!answers[question.id];
    return map;
  }, [allQuestions, answers]);

  const clock = remainingMs === null ? null : (
    <span className="flex items-center gap-1.5 text-xs font-bold font-mono text-blue-700">
      <Clock className="w-3.5 h-3.5" />
      {Math.floor(remainingMs / 60000).toString().padStart(2, '0')}:{Math.floor((remainingMs % 60000) / 1000).toString().padStart(2, '0')}
    </span>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <SpeakingIntroModal
        isOpen={viewPhase === 'intro' && !introDismissed()}
        onClose={handleExit}
        onConfirm={handleIntroDone}
      />

      {viewPhase === 'consent' && (
        <SpeakingConsentGate onAccepted={() => setViewPhase('mic_check')} onDecline={handleExit} />
      )}

      {viewPhase === 'mic_check' && (
        <SpeakingMicCheck
          micError={recorder.micError}
          requestMic={recorder.requestMic}
          getLevel={recorder.getLevel}
          startRecording={recorder.start}
          stopRecording={recorder.stop}
          onPassed={handleMicPassed}
        />
      )}

      {viewPhase === 'guideline' && activePartData && (
        <SpeakingPartGuideline
          partNumber={currentPart}
          instructions={activePartData.instructions}
          guidelines={activePartData.guidelines}
          onBack={handleExit}
          onStart={() => setViewPhase('testing')}
        />
      )}

      {viewPhase === 'review' && (
        <SpeakingReviewScreen
          testTitle={exam.title}
          parts={parts}
          answers={answers}
          isMock={isMock}
          submitting={submitting}
          submitError={submitError ?? null}
          onBackToExam={() => setViewPhase('testing')}
          onRetakeQuestion={openQuestion}
          onRetryUpload={uploads.retry}
          onSubmitForAnalysis={() => void finishTest()}
        />
      )}

      {viewPhase === 'testing' && activePartData && (
        <div className="flex-1 flex flex-col justify-between">
          <header className="w-full bg-white border-b border-slate-200/80 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <button
              onClick={handleExit}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Rời khỏi phòng thi"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xs sm:text-sm font-bold text-slate-800 text-center max-w-2xl truncate px-3">{exam.title}</h1>
            <div className="min-w-8 flex justify-end">{clock}</div>
          </header>

          <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col lg:flex-row gap-4 items-stretch">
            <SpeakingQuestionSidebar
              parts={parts}
              currentPart={currentPart}
              currentQuestionIndex={currentQuestionIndex}
              recordedStatus={recordedStatus}
              locked={isMock || room.phase === 'recording'}
              onSelectQuestion={handleSelectQuestion}
              onOpenReview={() => setViewPhase('review')}
            />

            <SpeakingVirtualRoomStage
              partNumber={currentPart}
              questionIndex={currentQuestionIndex}
              totalQuestions={questions.length}
              questionItem={currentQuestion}
              cueCard={activePartData.cue_card}
              phase={room.phase}
              secondsLeft={room.secondsLeft}
              isMock={isMock}
              answer={currentQuestion ? answers[currentQuestion.id] : undefined}
              onReplayPrompt={room.replayPrompt}
              onStop={() => void room.stopManually()}
              onSkipPreparation={room.skipPreparation}
              onRerecord={room.rerecord}
              onRetryUpload={() => currentQuestion && uploads.retry(currentQuestion.id)}
              onNextQuestion={handleNextQuestion}
            />

            {!isMock && (
              <SpeakingAidsPanel
                ideas={currentQuestion?.ideas || activePartData.cue_card?.ideas}
                notes={notes}
                onNotesChange={setNotes}
              />
            )}
          </main>
        </div>
      )}

      {micLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-3 text-center">
            <h2 className="text-lg font-bold text-slate-800">Mất kết nối micro</h2>
            <p className="text-sm text-slate-600">Các câu đã ghi vẫn được giữ. Bạn có thể nộp phần đã làm, hoặc kết nối lại micro rồi tải lại trang để làm tiếp.</p>
            <button
              onClick={() => { setMicLost(false); setViewPhase('review'); }}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl text-sm"
            >
              Xem lại bài đã làm
            </button>
          </div>
        </div>
      )}

      <ExitConfirmModal
        isOpen={isExitModalOpen}
        mode={mode}
        onContinue={() => setIsExitModalOpen(false)}
        onExitDiscard={async () => { if (mode === 'exam') await onAbandon?.(); router.push(returnUrl || '/test-practice'); }}
      />
    </div>
  );
}
