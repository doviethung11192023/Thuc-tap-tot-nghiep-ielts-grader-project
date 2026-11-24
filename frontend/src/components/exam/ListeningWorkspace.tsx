"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useExamCountdown } from '@/hooks/useExamCountdown';
import { ListeningTestData } from '@/mocks/exam-listening';
import { ExitConfirmModal } from './ExitConfirmModal';
import { SubmitConfirmModal } from './SubmitConfirmModal';
import { GradingProgressOverlay } from './GradingProgressOverlay';
import { ListeningWorkspaceHeader } from './listening/ListeningWorkspaceHeader';
import { ListeningAudioBar } from './listening/ListeningAudioBar';
import { ListeningQuestionsPane } from './listening/ListeningQuestionsPane';
import { useListeningPlayer } from '@/hooks/useListeningPlayer';

const PracticeAiTutorDrawer = dynamic(
  () => import('./tutor/PracticeAiTutorDrawer').then((m) => m.PracticeAiTutorDrawer),
  { ssr: false, loading: () => null }
);

interface ListeningWorkspaceProps {
  testData: ListeningTestData;
  mode: 'exam' | 'practice';
  attemptId?: string | null;
  attemptError?: string | null;
  selectedParts?: string[];
  returnUrl?: string;
  /** Thi thử (exam): gọi khi Learner thoát giữa chừng để backend ghi nhận abandoned. */
  onAbandon?: () => Promise<unknown> | void;
  /** Hạn nộp của thi thử theo đồng hồ client (ms); null nếu không có. */
  deadlineMs?: number | null;
  onSubmit: (userAnswers: Record<number, string | string[]>) => Promise<void> | void;
  /** Bài đã lưu trên server khi làm tiếp (FR-11): số câu -> câu trả lời. */
  initialAnswers?: Record<string, string | string[]>;
  /** Báo mỗi lần đáp án đổi để trang cha tự lưu lên server. */
  onAnswersChange?: (answers: Record<number, string | string[]>) => void;
}

export function ListeningWorkspace({ testData, mode, attemptId, attemptError, selectedParts, returnUrl, onAbandon, deadlineMs, onSubmit, initialAnswers, onAnswersChange }: ListeningWorkspaceProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<number>(0);
  const [activeAudioSection, setActiveAudioSection] = useState<number>(0);
  const [examPhase, setExamPhase] = useState<'audio' | 'review' | 'expired'>('audio');
  const [reviewSeconds, setReviewSeconds] = useState<number>(120);
  const [userAnswers, setUserAnswers] = useState<Record<number, string | string[]>>({});

  // Khôi phục bài đã lưu trên server khi nó tới; câu Learner vừa trả lời trước đó thì giữ bản mới
  // Mốc ban đầu là undefined: bài đã lưu có sẵn ngay lúc mở (Mock tải đề sau khi có attempt) cũng được khôi phục
  const [restoredFrom, setRestoredFrom] = useState<typeof initialAnswers>(undefined);
  if (initialAnswers !== restoredFrom) {
    setRestoredFrom(initialAnswers);
    const restored: Record<number, string | string[]> = {};
    Object.entries(initialAnswers || {}).forEach(([num, value]) => { restored[Number(num)] = value; });
    setUserAnswers(prev => ({ ...restored, ...prev }));
  }
  useEffect(() => { onAnswersChange?.(userAnswers); }, [userAnswers, onAnswersChange]);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isGrading, setIsGrading] = useState<boolean>(false);

  const availableSections = useMemo(() => {
    const list = testData.sections.map((s, idx) => ({ ...s, sectionNumber: s.section_number || idx + 1 }));
    if (!selectedParts?.length) return list;
    const partNums = selectedParts.map(Number);
    const filtered = list.filter((s) => partNums.includes(s.sectionNumber));
    return filtered.length > 0 ? filtered : list;
  }, [testData.sections, selectedParts]);

  const currentSection = availableSections[activeSection] || availableSections[0];
  const audioSection =
    mode === 'exam'
      ? availableSections[activeAudioSection] || availableSections[0]
      : currentSection;
  const allQuestions = useMemo(() => availableSections.flatMap(s => s.question_groups.flatMap(g => g.questions)), [availableSections]);

  const handleAudioEnded = () => {
    if (mode !== 'exam') return;
    if (activeAudioSection < availableSections.length - 1) {
      setActiveAudioSection((prev) => prev + 1);
    } else {
      setExamPhase('review');
      setReviewSeconds(120);
    }
  };

  const player = useListeningPlayer({
    audioUrl: audioSection?.audio_url,
    sectionKey: String(
      audioSection?.sectionNumber ||
        audioSection?.section_number ||
        (mode === 'exam' ? activeAudioSection : activeSection)
    ),
    defaultDuration: audioSection?.duration_seconds || 450,
    autoPlayOnSectionChange: mode === 'exam',
    onEnded: handleAudioEnded,
  });

  // BR-07: Listening Mock 30 phút cho cả 4 section (7,5 phút/section). Phải khớp deadline server
  // (tests.duration_minutes = 30), nếu dài hơn thì bài tự nộp lúc hết giờ bị server từ chối 409.
  const initialExamSeconds = Math.round((Math.max(1, availableSections.length) * 30 * 60) / 4);
  const latestAnswersRef = useRef(userAnswers);
  const latestOnSubmitRef = useRef(onSubmit);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    latestAnswersRef.current = userAnswers;
  }, [userAnswers]);

  useEffect(() => {
    latestOnSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const triggerAutoSubmit = useCallback(() => {
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    setExamPhase('expired');
    setIsSubmitModalOpen(false);
    setIsGrading(true);
    Promise.resolve(latestOnSubmitRef.current(latestAnswersRef.current)).catch(() => {
      autoSubmittedRef.current = false;
      setIsGrading(false);
    });
  }, []);

  // Hết giờ thi thử: nộp bài mới nhất (server chấm bản đã lưu nếu tới muộn, BR-21)
  const timerSeconds = useExamCountdown(mode, initialExamSeconds, deadlineMs, triggerAutoSubmit);

  useEffect(() => {
    if (mode !== 'exam' || examPhase !== 'review') return;
    const id = setInterval(() => {
      setReviewSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          triggerAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [mode, examPhase, triggerAutoSubmit]);

  const handleToggleFlag = (qNumber: number) => {
    setFlaggedQuestions((prev) => ({ ...prev, [qNumber]: !prev[qNumber] }));
  };

  const handleQuestionPaletteClick = (qNumber: number) => {
    const targetIdx = availableSections.findIndex(s =>
      s.question_groups.some((g: any) => g.questions.some((item: any) => item.question_number === qNumber))
    );
    if (targetIdx !== -1 && targetIdx !== activeSection) {
      setActiveSection(targetIdx);
    }
    setTimeout(() => {
      const el =
        document.getElementById(`reading-question-${qNumber}`) ||
        document.querySelector(`[data-question-numbers~="${qNumber}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 90);
  };

  const unansweredQuestionNumbers = useMemo(() => {
    return allQuestions.map(q => q.question_number).filter(qNum => {
      const val = userAnswers[qNum];
      return !(typeof val === 'string'
        ? val.trim().length > 0
        : Array.isArray(val) && val.some((v) => String(v ?? '').trim().length > 0));
    });
  }, [allQuestions, userAnswers]);

  const answeredCount = allQuestions.length - unansweredQuestionNumbers.length;

  const handleConfirmSubmit = async () => {
    setIsSubmitModalOpen(false);
    setIsGrading(true);
    try {
      await onSubmit(userAnswers);
    } catch {
      setIsGrading(false);
    }
  };

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Bài đã tự lưu lên server (FR-11): thoát rồi quay lại vẫn làm tiếp được
  const handleSaveDraft = () => {
    setIsExitModalOpen(false);
    router.push(returnUrl || '/test-practice');
  };

  return (
    <div className="flex flex-col h-dvh w-full bg-zinc-50 overflow-hidden relative">
      <ListeningWorkspaceHeader
        title={testData.title}
        mode={mode}
        timerSeconds={timerSeconds}
        initialExamSeconds={initialExamSeconds}
        examPhase={examPhase}
        reviewSeconds={reviewSeconds}
        activeAudioSectionNumber={audioSection?.sectionNumber || activeAudioSection + 1}
        totalSections={availableSections.length}
        onExitClick={() => setIsExitModalOpen(true)}
        onSubmit={() => setIsSubmitModalOpen(true)}
      />

      <ListeningAudioBar
        audioRef={player.audioRef}
        audioUrl={audioSection?.audio_url}
        isPlaying={player.isPlaying}
        isBuffering={player.isBuffering}
        audioError={player.audioError}
        onTogglePlay={player.togglePlay}
        currentTime={player.currentTime}
        durationSeconds={player.duration}
        onRewind5s={() => player.rewind(5)}
        onForward5s={() => player.forward(5)}
        playbackSpeed={player.playbackSpeed}
        onSpeedChange={player.changeSpeed}
        isMuted={player.isMuted}
        onToggleMute={player.toggleMute}
        mode={mode}
        activeAudioSectionNumber={audioSection?.sectionNumber || activeAudioSection + 1}
        totalSections={availableSections.length}
        examPhase={examPhase}
        volume={player.volume}
        onVolumeChange={player.changeVolume}
        onSeek={player.seek}
        audioEventHandlers={player.audioEventHandlers}
      />

      {mode === 'exam' && examPhase === 'review' && (
        <div
          role="status"
          className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between gap-4 shrink-0 text-xs sm:text-sm text-amber-900 font-medium"
        >
          <span>
            Audio đã kết thúc. Bạn có <strong className="font-bold text-amber-950">{formatTimer(reviewSeconds)}</strong> để kiểm tra lại toàn bộ đáp án trước khi hệ thống tự động nộp bài.
          </span>
          <button
            type="button"
            onClick={handleConfirmSubmit}
            className="px-3 py-1 rounded-lg bg-[#932120] text-white text-xs font-bold hover:bg-[#7a1a19] shrink-0 cursor-pointer"
          >
            Nộp bài ngay
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <ListeningQuestionsPane
          availableSections={availableSections}
          activeSection={activeSection}
          playingAudioSection={mode === 'exam' ? activeAudioSection : undefined}
          isExamAudioPlaying={mode === 'exam' && player.isPlaying}
          currentSection={currentSection}
          allQuestions={allQuestions}
          answeredCount={answeredCount}
          userAnswers={userAnswers}
          flaggedQuestions={flaggedQuestions}
          isLocked={mode === 'exam' && examPhase === 'expired'}
          onSectionChange={(idx) => setActiveSection(idx)}
          onAnswerChange={(qNum, val) => setUserAnswers(prev => ({ ...prev, [qNum]: val }))}
          onQuestionClick={handleQuestionPaletteClick}
          onToggleFlag={handleToggleFlag}
        />

        {mode === 'practice' && (
          <PracticeAiTutorDrawer
            attemptId={attemptId}
            attemptError={attemptError}
            skill="listening"
            mode={mode}
            activeSectionNo={currentSection?.sectionNumber || activeSection + 1}
            userAnswers={userAnswers}
          />
        )}
      </div>

      <ExitConfirmModal
        isOpen={isExitModalOpen}
        mode={mode}
        onContinue={() => setIsExitModalOpen(false)}
        onExitDiscard={async () => {
          setIsExitModalOpen(false);
          if (mode === 'exam') await onAbandon?.();
          router.push(returnUrl || '/test-practice');
        }}
        onSaveDraftAndExit={handleSaveDraft}
      />

      <SubmitConfirmModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={handleConfirmSubmit}
        totalQuestions={allQuestions.length}
        answeredCount={answeredCount}
        unansweredQuestionNumbers={unansweredQuestionNumbers}
        timerFormatted={formatTimer(timerSeconds)}
        onJumpToQuestion={handleQuestionPaletteClick}
      />

      <GradingProgressOverlay isOpen={isGrading} skill="listening" title={testData.title} />
    </div>
  );
}
