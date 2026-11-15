"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { ListeningTestData } from '@/mocks/exam-listening';
import { ExitConfirmModal } from './ExitConfirmModal';
import { SubmitConfirmModal } from './SubmitConfirmModal';
import { GradingProgressOverlay } from './GradingProgressOverlay';
import { ListeningWorkspaceHeader } from './listening/ListeningWorkspaceHeader';
import { ListeningAudioBar } from './listening/ListeningAudioBar';
import { ListeningQuestionsPane } from './listening/ListeningQuestionsPane';
import { useListeningPlayer } from '@/hooks/useListeningPlayer';

interface ListeningWorkspaceProps {
  testData: ListeningTestData;
  mode: 'exam' | 'practice';
  selectedParts?: string[];
  returnUrl?: string;
  /** Thi thử (exam): gọi khi Learner thoát giữa chừng để backend ghi nhận abandoned. */
  onAbandon?: () => Promise<unknown> | void;
  /** Hạn nộp của thi thử theo đồng hồ client (ms); null nếu không có. */
  deadlineMs?: number | null;
  onSubmit: (userAnswers: Record<number, string | string[]>) => Promise<void> | void;
}

export function ListeningWorkspace({ testData, mode, selectedParts, returnUrl, onAbandon, deadlineMs, onSubmit }: ListeningWorkspaceProps) {
  const router = useRouter();
  const draftKey = `ielts_listening_draft_${testData.test_id}`;
  const [activeSection, setActiveSection] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string | string[]>>(() => {
    try {
      if (typeof window === 'undefined') return {};
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // Ignore malformed draft
    }
    return {};
  });
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [draftSavedNotice, setDraftSavedNotice] = useState<string | null>(null);
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
  const allQuestions = useMemo(() => availableSections.flatMap(s => s.question_groups.flatMap(g => g.questions)), [availableSections]);

  const player = useListeningPlayer({
    audioUrl: currentSection?.audio_url,
    sectionKey: String(currentSection?.sectionNumber || currentSection?.section_number || activeSection),
    defaultDuration: currentSection?.duration_seconds || 450,
  });

  // BR-07: Listening Mock 30 phút cho cả 4 section (7,5 phút/section). Phải khớp deadline server
  // (tests.duration_minutes = 30), nếu dài hơn thì bài tự nộp lúc hết giờ bị server từ chối 409.
  const initialExamSeconds = Math.round((Math.max(1, availableSections.length) * 30 * 60) / 4);
  const [timerSeconds, setTimerSeconds] = useState<number>(mode === 'exam' ? initialExamSeconds : 0);
  const latestAnswersRef = useRef(userAnswers);
  const latestOnSubmitRef = useRef(onSubmit);
  const deadlineMsRef = useRef(deadlineMs);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    latestAnswersRef.current = userAnswers;
  }, [userAnswers]);

  useEffect(() => {
    latestOnSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    deadlineMsRef.current = deadlineMs;
  }, [deadlineMs]);

  useEffect(() => {
    if (mode !== 'practice') return;
    if (Object.keys(userAnswers).length === 0) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(userAnswers));
    } catch {
      // Ignore storage quota errors
    }
  }, [userAnswers, mode, draftKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (mode !== 'exam') {
          return prev + 1;
        }
        const serverRemaining = deadlineMsRef.current
          ? Math.max(0, Math.floor((deadlineMsRef.current - Date.now()) / 1000))
          : prev;
        const nextVal = Math.min(prev <= 1 ? 0 : prev - 1, serverRemaining);
        if (nextVal <= 0) {
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            setTimeout(() => {
              setIsGrading(true);
              Promise.resolve(latestOnSubmitRef.current(latestAnswersRef.current))
                .then(() => {
                  try {
                    localStorage.removeItem(draftKey);
                  } catch {
                    // Ignore storage error
                  }
                })
                .catch(() => setIsGrading(false));
            }, 0);
          }
          return 0;
        }
        return nextVal;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, draftKey]);

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
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // Ignore storage error
      }
    } catch {
      setIsGrading(false);
    }
  };

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(userAnswers));
      const now = new Date();
      setDraftSavedNotice(`Đã lưu nháp lúc ${now.toTimeString().slice(0, 8)}`);
    } catch (e) {
      console.error("Save draft error:", e);
    }
    setIsExitModalOpen(false);
    router.push(returnUrl || '/test-practice');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-50 rounded-2xl overflow-hidden shadow-lg border border-zinc-200 relative">
      {draftSavedNotice && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900 shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{draftSavedNotice}</span>
        </div>
      )}

      <ListeningWorkspaceHeader
        title={testData.title}
        mode={mode}
        timerSeconds={timerSeconds}
        initialExamSeconds={initialExamSeconds}
        onExitClick={() => setIsExitModalOpen(true)}
        onSubmit={() => setIsSubmitModalOpen(true)}
      />

      <ListeningAudioBar
        audioRef={player.audioRef}
        audioUrl={currentSection?.audio_url}
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
        volume={player.volume}
        onVolumeChange={player.changeVolume}
        onSeek={player.seek}
        audioEventHandlers={player.audioEventHandlers}
      />

      <div className="flex-1 flex overflow-hidden">
        <ListeningQuestionsPane
          availableSections={availableSections}
          activeSection={activeSection}
          currentSection={currentSection}
          allQuestions={allQuestions}
          answeredCount={answeredCount}
          userAnswers={userAnswers}
          flaggedQuestions={flaggedQuestions}
          onSectionChange={(idx) => setActiveSection(idx)}
          onAnswerChange={(qNum, val) => setUserAnswers(prev => ({ ...prev, [qNum]: val }))}
          onQuestionClick={handleQuestionPaletteClick}
          onToggleFlag={handleToggleFlag}
        />
      </div>

      <ExitConfirmModal
        isOpen={isExitModalOpen}
        mode={mode}
        onContinue={() => setIsExitModalOpen(false)}
        onExitDiscard={async () => {
          setIsExitModalOpen(false);
          try {
            localStorage.removeItem(draftKey);
          } catch {
            // Ignore storage error
          }
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
