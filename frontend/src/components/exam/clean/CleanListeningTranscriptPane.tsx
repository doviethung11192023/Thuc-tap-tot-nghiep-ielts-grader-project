"use client";

import React, { useRef, useEffect } from 'react';
import { FileText, Play } from 'lucide-react';
import { CleanListeningSection, CleanListeningQuestion } from '@/mocks/clean-dataset/listening-test-1-clean';
import { CleanListeningUtteranceCard } from './CleanListeningUtteranceCard';

interface CleanListeningTranscriptPaneProps {
  currentSection: CleanListeningSection;
  currentSectionQuestions: CleanListeningQuestion[];
  activeQuestionNumber: number;
  highlightedEvidenceText: string | null;
  onSelectQuestion: (num: number) => void;
  onPlayAtTime: (seconds: number) => void;
}

// LS-02: Chuẩn hóa text để so khớp dẫn chứng chính xác, không bị lỗi do ngoặc kép hoặc dấu câu
function cleanTextForMatching(str: string): string {
  return (str || '')
    .replace(/^[^:]+:\s*/, '')
    .replace(/["'“”‘’«»]/g, '')
    .replace(/[.,!?;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function CleanListeningTranscriptPane({
  currentSection,
  currentSectionQuestions,
  activeQuestionNumber,
  highlightedEvidenceText,
  onSelectQuestion,
  onPlayAtTime
}: CleanListeningTranscriptPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector('#active-listening-evidence');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeQuestionNumber, highlightedEvidenceText, currentSection.section_number]);

  // Speaker badge helper - strictly enforcing Purple Ban (No violet/purple/indigo)
  const getSpeakerBadge = (role: string) => {
    const cleanRole = (role || '').toLowerCase();
    if (cleanRole.includes('speaker 1') || cleanRole.includes('kelly')) {
      return {
        bg: 'bg-amber-100 text-amber-900 border-amber-300',
        avatarBg: 'bg-amber-600 text-white',
        label: 'Speaker 1'
      };
    }
    if (cleanRole.includes('speaker 2') || cleanRole.includes('herbert')) {
      return {
        bg: 'bg-blue-100 text-blue-900 border-blue-300',
        avatarBg: 'bg-blue-600 text-white',
        label: 'Speaker 2'
      };
    }
    return {
      bg: 'bg-zinc-100 text-zinc-900 border-zinc-300',
      avatarBg: 'bg-zinc-700 text-white',
      label: 'Narrator'
    };
  };

  return (
    <div
      ref={scrollRef}
      className="w-1/2 h-full overflow-y-auto bg-white p-5 md:p-7 border-r border-zinc-200 space-y-4"
    >
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wide">
            Bản ghi âm lời thoại ({currentSection.title})
          </h3>
        </div>
        <span className="text-xs text-zinc-500 font-medium">
          Click vào mốc thời gian để phát âm thanh
        </span>
      </div>

      <div className="space-y-4">
        {currentSection.transcript_utterances && currentSection.transcript_utterances.length > 0 ? (
          currentSection.transcript_utterances.map((u) => {
            const badge = getSpeakerBadge(u.role || u.speaker_name);
            const cleanUtterance = cleanTextForMatching(u.text);
            const matchingQuestions = currentSectionQuestions.filter(q => {
              if (!q.evidence_text) return false;
              const cleanEvidence = cleanTextForMatching(q.evidence_text);
              if (!cleanEvidence) return false;
              if (cleanUtterance.includes(cleanEvidence) || cleanEvidence.includes(cleanUtterance)) return true;
              if (cleanEvidence.length >= 15 && cleanUtterance.includes(cleanEvidence.slice(0, 20))) return true;
              const words = cleanEvidence.split(' ').filter(w => w.length > 2);
              if (words.length >= 3 && cleanUtterance.includes(words.slice(0, 3).join(' '))) return true;
              return false;
            });
            const isCurrentActive = matchingQuestions.some(q => q.question_number === activeQuestionNumber);

            return (
              <CleanListeningUtteranceCard
                key={u.id}
                utterance={u}
                badge={badge}
                matchingQuestions={matchingQuestions}
                isCurrentActive={isCurrentActive}
                activeQuestionNumber={activeQuestionNumber}
                highlightedEvidenceText={highlightedEvidenceText}
                currentSectionQuestions={currentSectionQuestions}
                onSelectQuestion={onSelectQuestion}
                onPlayAtTime={onPlayAtTime}
              />
            );
          })
        ) : (
          <div className="space-y-3.5">
            {currentSectionQuestions.map(q => {
              if (!q.evidence_text) return null;
              const isActive = q.question_number === activeQuestionNumber;
              return (
                <div
                  key={q.id}
                  id={isActive ? "active-listening-evidence" : undefined}
                  className={`p-3.5 rounded-xl border text-xs sm:text-sm transition-all ${
                    isActive
                      ? "border-amber-400 bg-amber-50/70 shadow-sm"
                      : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-blue-900">
                      Dẫn chứng Câu {q.question_number}
                    </span>
                    <button
                      type="button"
                      onClick={() => onPlayAtTime(0)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100/80 hover:bg-blue-200 px-2 py-0.5 rounded cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Nghe</span>
                    </button>
                  </div>
                  <p className="text-zinc-700 leading-relaxed italic">
                    "{q.evidence_text}"
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
