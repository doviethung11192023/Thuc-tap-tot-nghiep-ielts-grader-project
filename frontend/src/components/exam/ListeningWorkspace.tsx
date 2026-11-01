"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  onSubmit: (userAnswers: Record<number, string | string[]>) => Promise<void> | void;
}

export function ListeningWorkspace({ testData, mode, selectedParts, returnUrl, onSubmit }: ListeningWorkspaceProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string | string[]>>({});
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
    defaultDuration: currentSection?.duration_seconds || 450,
  });

  const initialExamSeconds = Math.max(1, availableSections.length) * 8 * 60;
  const [timerSeconds, setTimerSeconds] = useState<number>(mode === 'exam' ? initialExamSeconds : 0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (mode === 'exam') {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval!);
            setIsGrading(true);
            onSubmit(userAnswers);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      interval = setInterval(() => setTimerSeconds(prev => prev + 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [mode, onSubmit, userAnswers]);

  const handleQuestionPaletteClick = (qNumber: number) => {
    const targetIdx = availableSections.findIndex(s => 
      s.question_groups.some((g: any) => g.questions.some((item: any) => item.question_number === qNumber))
    );
    if (targetIdx !== -1 && targetIdx !== activeSection) {
      setActiveSection(targetIdx);
    }
  };

  const answeredCount = Object.keys(userAnswers).filter(k => {
    const val = userAnswers[Number(k)];
    return typeof val === 'string' ? val.trim().length > 0 : Array.isArray(val) && val.length > 0;
  }).length;

  const unansweredQuestionNumbers = useMemo(() => {
    return allQuestions.map(q => q.question_number).filter(qNum => {
      const val = userAnswers[qNum];
      return !(typeof val === 'string' ? val.trim().length > 0 : Array.isArray(val) && val.length > 0);
    });
  }, [allQuestions, userAnswers]);

  const handleConfirmSubmit = async () => {
    setIsSubmitModalOpen(false);
    setIsGrading(true);
    try { await onSubmit(userAnswers); } catch { setIsGrading(false); }
  };

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(`ielts_listening_draft_${testData.test_id}`, JSON.stringify(userAnswers));
      alert("💾 Đã lưu nháp tiến độ bài làm Listening thành công!");
    } catch (e) { console.error("Save draft error:", e); }
    setIsExitModalOpen(false);
    router.push(returnUrl || '/test-practice');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-50 rounded-2xl overflow-hidden shadow-lg border border-zinc-200">
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
        onTogglePlay={player.togglePlay}
        currentTime={player.currentTime}
        durationSeconds={player.duration}
        onRewind5s={() => player.rewind(5)}
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
          onSectionChange={(idx) => setActiveSection(idx)}
          onAnswerChange={(qNum, val) => setUserAnswers(prev => ({ ...prev, [qNum]: val }))}
          onQuestionClick={handleQuestionPaletteClick}
        />
      </div>

      <ExitConfirmModal
        isOpen={isExitModalOpen}
        mode={mode}
        onContinue={() => setIsExitModalOpen(false)}
        onExitDiscard={() => { setIsExitModalOpen(false); router.push(returnUrl || '/test-practice'); }}
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
