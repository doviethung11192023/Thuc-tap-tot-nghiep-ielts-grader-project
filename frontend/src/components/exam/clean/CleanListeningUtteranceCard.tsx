"use client";

import React from 'react';
import { Play } from 'lucide-react';
import { CleanListeningQuestion, CleanListeningUtterance } from '@/mocks/clean-dataset/listening-test-1-clean';

interface CleanListeningUtteranceCardProps {
  utterance: CleanListeningUtterance;
  badge: { bg: string; avatarBg: string; label: string };
  matchingQuestions: CleanListeningQuestion[];
  isCurrentActive: boolean;
  activeQuestionNumber: number;
  highlightedEvidenceText: string | null;
  currentSectionQuestions: CleanListeningQuestion[];
  onSelectQuestion: (num: number) => void;
  onPlayAtTime: (seconds: number) => void;
}

export function CleanListeningUtteranceCard({
  utterance,
  badge,
  matchingQuestions,
  isCurrentActive,
  activeQuestionNumber,
  highlightedEvidenceText,
  currentSectionQuestions,
  onSelectQuestion,
  onPlayAtTime
}: CleanListeningUtteranceCardProps) {
  const hasEvidence = matchingQuestions.length > 0;

  const renderText = () => {
    if (!isCurrentActive) return <span>{utterance.text}</span>;

    const activeQ = currentSectionQuestions.find(q => q.question_number === activeQuestionNumber);
    const target = (highlightedEvidenceText || activeQ?.evidence_text || '').trim().replace(/^["']|["']$/g, '');
    if (!target) return <span>{utterance.text}</span>;

    const lowerText = utterance.text.toLowerCase();
    const lowerTarget = target.toLowerCase();
    let matchIdx = lowerText.indexOf(lowerTarget);
    let matchLen = target.length;

    if (matchIdx === -1 && target.length > 25) {
      const shortTarget = target.slice(0, 25).toLowerCase();
      matchIdx = lowerText.indexOf(shortTarget);
      if (matchIdx !== -1) matchLen = 25;
    }

    if (matchIdx === -1) return <span>{utterance.text}</span>;

    const before = utterance.text.slice(0, matchIdx);
    const matched = utterance.text.slice(matchIdx, matchIdx + matchLen);
    const after = utterance.text.slice(matchIdx + matchLen);

    return (
      <span>
        {before}
        <mark
          id="active-listening-evidence"
          className="bg-amber-200/95 text-amber-950 font-medium px-1 py-0.5 rounded border-b-2 border-amber-500 selection:bg-amber-300 inline"
        >
          <span className="inline-flex items-center text-[10px] font-bold bg-amber-500 text-white px-1 py-0.2 rounded-sm mr-1 align-baseline tracking-tight">
            Câu {activeQuestionNumber}
          </span>
          {matched}
        </mark>
        {after}
      </span>
    );
  };

  return (
    <div
      data-utterance-text={utterance.text}
      className={`p-3.5 rounded-2xl border transition-all ${
        isCurrentActive
          ? 'border-amber-400 bg-amber-50/40 ring-1 ring-amber-300 shadow-xs'
          : hasEvidence
          ? 'border-blue-300 bg-blue-50/30'
          : 'border-zinc-200/80 bg-zinc-50/40 hover:bg-zinc-50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${badge.avatarBg}`}>
            {badge.label[0]}
          </div>
          <span className="font-bold text-xs text-zinc-800">
            {utterance.speaker_name || badge.label}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onPlayAtTime(utterance.start_seconds)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-blue-600 hover:text-white text-zinc-700 text-xs font-bold transition-all border border-zinc-200 cursor-pointer"
          title={`Phát từ giây ${utterance.time_formatted}`}
        >
          <Play className="w-3 h-3 ml-0.5" />
          <span>{utterance.time_formatted}</span>
        </button>
      </div>

      <div className="text-xs sm:text-sm text-zinc-800 leading-relaxed pl-8">
        {hasEvidence && (
          <div className="flex items-center gap-1.5 mb-1.5 text-blue-900 font-bold text-xs">
            <span className="text-red-500">📍</span>
            <span>Chứng cứ cho câu: </span>
            {matchingQuestions.map(mq => (
              <button
                key={mq.id}
                type="button"
                onClick={() => onSelectQuestion(mq.question_number)}
                className={`cursor-pointer underline text-xs font-bold transition-colors ${
                  mq.question_number === activeQuestionNumber
                    ? 'text-amber-700 font-extrabold bg-amber-100 px-1.5 py-0.5 rounded'
                    : 'text-blue-700 hover:text-blue-900'
                }`}
              >
                ({mq.question_number})
              </button>
            ))}
          </div>
        )}
        <p>{renderText()}</p>
      </div>
    </div>
  );
}
