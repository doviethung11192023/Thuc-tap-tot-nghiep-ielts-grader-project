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
            const matchingQuestions = currentSectionQuestions.filter(q =>
              q.evidence_text && u.text.toLowerCase().includes(q.evidence_text.slice(0, 25).toLowerCase())
            );
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
                  className={`p-3.5 rounded-xl border transition-all ${
                    isActive ? 'border-amber-400 bg-amber-50/60 ring-1 ring-amber-300' : 'border-blue-200 bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-900">
                      📍 Vị trí câu {q.question_number}
                    </span>
                    <button
                      type="button"
                      onClick={() => onPlayAtTime(Math.max(0, (q.question_number - 1) * 35))}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>Phát</span>
                    </button>
                  </div>
                  <p className="text-sm italic text-zinc-800 border-l-2 border-blue-400 pl-3">
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
