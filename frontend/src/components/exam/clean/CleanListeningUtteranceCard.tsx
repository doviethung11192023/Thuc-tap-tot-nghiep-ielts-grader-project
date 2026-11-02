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

  // LS-02: Thuật toán tìm và highlight câu dẫn chứng an toàn, không bị trượt do dấu ngoặc kép hoặc prefix
  const renderText = () => {
    if (!isCurrentActive) return <span>{utterance.text}</span>;

    const activeQ = currentSectionQuestions.find(q => q.question_number === activeQuestionNumber);
    let target = (highlightedEvidenceText || activeQ?.evidence_text || '').trim();
    target = target.replace(/^[^:]+:\s*/, '').replace(/^["'“”‘’«»]+|["'“”‘’«»]+$/g, '').trim();
    if (!target) return <span>{utterance.text}</span>;

    const lowerText = utterance.text.toLowerCase();
    const lowerTarget = target.toLowerCase();
    let matchIdx = lowerText.indexOf(lowerTarget);
    let matchLen = target.length;

    // 1. Thử bỏ các loại dấu ngoặc kép bên trong
    if (matchIdx === -1) {
      const strippedTarget = target.replace(/["'“”‘’]/g, '').trim().toLowerCase();
      matchIdx = lowerText.indexOf(strippedTarget);
      if (matchIdx !== -1) {
        matchLen = strippedTarget.length;
      }
    }

    // 2. Thử tiền tố 20 ký tự đầu tiên
    if (matchIdx === -1 && target.length > 20) {
      const shortTarget = target.slice(0, 20).toLowerCase();
      matchIdx = lowerText.indexOf(shortTarget);
      if (matchIdx !== -1) matchLen = 20;
    }

    // 3. Thử 3 từ đầu tiên
    if (matchIdx === -1) {
      const words = target.split(/\s+/).filter(w => w.length > 2);
      if (words.length >= 3) {
        const phrase = words.slice(0, 3).join(' ').toLowerCase();
        matchIdx = lowerText.indexOf(phrase);
        if (matchIdx !== -1) matchLen = phrase.length;
      }
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

  const displayTime = utterance.time_formatted || "00:00";
  const startSec = utterance.start_seconds || 0;

  return (
    <div
      data-utterance-text={utterance.text}
      className={`p-4 rounded-xl border transition-all ${
        isCurrentActive
          ? 'border-amber-400 bg-amber-50/40 shadow-xs'
          : hasEvidence
          ? 'border-zinc-200 bg-white hover:border-zinc-300'
          : 'border-zinc-100 bg-white/70'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${badge.avatarBg}`}
          >
            {badge.label[0]}
          </span>
          <span className="font-bold text-xs text-zinc-900">{badge.label}</span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.bg}`}
          >
            {badge.label}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onPlayAtTime(startSec)}
          title={`Phát âm thanh từ ${displayTime}`}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-mono font-medium transition-colors cursor-pointer"
        >
          <Play className="w-3 h-3 text-zinc-600 fill-current" />
          <span>{displayTime}</span>
        </button>
      </div>

      <div className="text-zinc-700 text-xs sm:text-sm leading-relaxed pl-8">
        {renderText()}
      </div>

      {hasEvidence && (
        <div className="mt-2.5 pl-8 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-zinc-400">Dẫn chứng:</span>
          {matchingQuestions.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelectQuestion(q.question_number)}
              className={`px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                q.question_number === activeQuestionNumber
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              Câu {q.question_number}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
