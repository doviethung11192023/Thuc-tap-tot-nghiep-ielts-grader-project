"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useExamCountdown } from '@/hooks/useExamCountdown';
import { ReadingTestData } from '@/types/exam';
import { ExitConfirmModal } from './ExitConfirmModal';
import { SubmitConfirmModal } from './SubmitConfirmModal';
import { GradingProgressOverlay } from './GradingProgressOverlay';
import { ReadingWorkspaceHeader } from './reading/ReadingWorkspaceHeader';
import { ReadingPassagePane } from './reading/ReadingPassagePane';
import { ReadingQuestionsPane } from './reading/ReadingQuestionsPane';

interface ReadingWorkspaceProps {
  testData: ReadingTestData;
  mode: 'exam' | 'practice';
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

export function ReadingWorkspace({ testData, mode, selectedParts, returnUrl, onAbandon, deadlineMs, onSubmit, initialAnswers, onAnswersChange }: ReadingWorkspaceProps) {
  const router = useRouter();
  const [activePassage, setActivePassage] = useState(0);
  const [fontSize, setFontSize] = useState<number>(17);
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
  const [highlightedEvidence, setHighlightedEvidence] = useState<{ paragraph: string; quote: string } | null>(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const passageScrollRef = useRef<HTMLDivElement>(null);

  const availablePassages = useMemo(() => {
    if (!selectedParts?.length) {
      return testData.passages.map((p, idx) => ({ ...p, passageNumber: idx + 1 }));
    }
    const partNums = selectedParts.map(Number);
    const filtered = testData.passages
      .map((p, idx) => ({ ...p, passageNumber: idx + 1 }))
      .filter((p) => partNums.includes(p.passageNumber));
    return filtered.length > 0 ? filtered : testData.passages.map((p, idx) => ({ ...p, passageNumber: idx + 1 }));
  }, [testData.passages, selectedParts]);

  const currentPassage = availablePassages[activePassage] || availablePassages[0];
  const allQuestions = useMemo(() => availablePassages.flatMap(p => p.question_groups.flatMap(g => g.questions)), [availablePassages]);

  const initialExamSeconds = Math.max(1, availablePassages.length) * 20 * 60;
  // Hết giờ thi thử: nộp bài mới nhất (server chấm bản đã lưu nếu tới muộn, BR-21)
  const timerSeconds = useExamCountdown(mode, initialExamSeconds, deadlineMs, () => {
    setIsGrading(true);
    Promise.resolve(onSubmit(userAnswers)).catch(() => setIsGrading(false));
  });

  const handleSelectEvidence = (paragraphId: string, quote: string) => {
    setHighlightedEvidence({ paragraph: paragraphId, quote });
    if (passageScrollRef.current) {
      document.getElementById(`para-${paragraphId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleQuestionPaletteClick = (qNumber: number) => {
    const targetIdx = availablePassages.findIndex(p => 
      p.question_groups.some((g: any) => g.questions.some((item: any) => item.question_number === qNumber))
    );
    if (targetIdx !== -1 && targetIdx !== activePassage) {
      setActivePassage(targetIdx);
      setHighlightedEvidence(null);
    }
  };

  const answeredCount = Object.keys(userAnswers).filter(k => {
    const val = userAnswers[Number(k)];
    return typeof val === 'string' ? val.trim().length > 0 : Array.isArray(val) && val.length > 0;
  }).length;

  const unansweredQuestionNumbers = useMemo(() => {
    return allQuestions
      .map(q => q.question_number)
      .filter(qNum => {
        const val = userAnswers[qNum];
        return !(typeof val === 'string' ? val.trim().length > 0 : Array.isArray(val) && val.length > 0);
      });
  }, [allQuestions, userAnswers]);

  const handleConfirmSubmit = async () => {
    setIsSubmitModalOpen(false);
    setIsGrading(true);
    try {
      await onSubmit(userAnswers);
    } catch {
      setIsGrading(false);
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-50 rounded-2xl overflow-hidden shadow-lg border border-zinc-200">
      <ReadingWorkspaceHeader
        title={testData.title}
        mode={mode}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        timerSeconds={timerSeconds}
        initialExamSeconds={initialExamSeconds}
        onExitClick={() => setIsExitModalOpen(true)}
        onSubmit={() => setIsSubmitModalOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <ReadingPassagePane
          availablePassages={availablePassages}
          activePassage={activePassage}
          fontSize={fontSize}
          highlightedEvidence={highlightedEvidence}
          userAnswers={userAnswers}
          onPassageChange={(idx) => {
            setActivePassage(idx);
            setHighlightedEvidence(null);
          }}
          passageScrollRef={passageScrollRef}
        />

        <ReadingQuestionsPane
          currentPassage={currentPassage}
          allQuestions={allQuestions}
          answeredCount={answeredCount}
          userAnswers={userAnswers}
          flaggedQuestions={flaggedQuestions}
          onAnswerChange={(qNum, val) => setUserAnswers(prev => ({ ...prev, [qNum]: val }))}
          onSelectEvidence={handleSelectEvidence}
          onQuestionClick={handleQuestionPaletteClick}
        />
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
        onSaveDraftAndExit={() => {
          try {
            localStorage.setItem(`ielts_reading_draft_${testData.test_id}`, JSON.stringify(userAnswers));
            alert("💾 Đã lưu nháp tiến độ bài làm Reading thành công!");
          } catch (e) {
            console.error("Failed to save draft:", e);
          }
          setIsExitModalOpen(false);
          router.push(returnUrl || '/test-practice');
        }}
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

      <GradingProgressOverlay
        isOpen={isGrading}
        skill="reading"
        title={testData.title}
      />
    </div>
  );
}
