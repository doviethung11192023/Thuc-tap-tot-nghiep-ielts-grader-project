"use client";

import React from 'react';
import { ArrowLeftRight, Compass, Play } from 'lucide-react';
import type { CleanListeningQuestion, CleanListeningUtterance } from "@/types/listening-result-detail";

interface CleanGroupEvidenceLocationProps {
  currentQ: CleanListeningQuestion;
  transcriptUtterances?: CleanListeningUtterance[];
  onPlayAtTime: (seconds: number) => void;
  onSelectEvidenceText?: (text: string, questionNumber?: number) => void;
}

function normalizeForMatch(str: string): string {
  return (str || '')
    .replace(/^[^:]+:\s*/, '')
    .replace(/["'“”‘’«».,!?;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findUtteranceStartSeconds(
  utterances: CleanListeningUtterance[] | undefined,
  evidenceText?: string
): number {
  if (!utterances || utterances.length === 0 || !evidenceText) return 0;
  const cleanEvidence = normalizeForMatch(evidenceText);
  if (!cleanEvidence) return 0;

  const matched = utterances.find((u) => {
    const cleanU = normalizeForMatch(u.text);
    if (!cleanU) return false;
    if (cleanU.includes(cleanEvidence) || cleanEvidence.includes(cleanU)) return true;
    if (cleanEvidence.length >= 15 && cleanU.includes(cleanEvidence.slice(0, 20))) return true;
    const words = cleanEvidence.split(' ').filter((w) => w.length > 2);
    return words.length >= 3 && cleanU.includes(words.slice(0, 3).join(' '));
  });

  return matched?.start_seconds ?? 0;
}

export function CleanGroupEvidenceLocation({
  currentQ,
  transcriptUtterances,
  onPlayAtTime,
  onSelectEvidenceText,
}: CleanGroupEvidenceLocationProps) {
  const renderHighlightedPrompt = (prompt: string, keywords: any[]) => {
    if (!keywords || keywords.length === 0) return <span>{prompt}</span>;
    const terms = keywords.map((k) => k.paraphrased_text?.trim()).filter(Boolean);
    if (terms.length === 0) return <span>{prompt}</span>;
    const regex = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return (
      <span className="leading-relaxed">
        {prompt.split(regex).map((part, idx) => {
          const isMatch = terms.some((t) => t.toLowerCase() === part.toLowerCase());
          return isMatch ? (
            <span
              key={idx}
              className="inline border border-dashed border-emerald-500 bg-emerald-50/70 text-emerald-950 rounded px-1.5 py-0.5 mx-0.5 font-medium"
            >
              {part}
            </span>
          ) : (
            <span key={idx}>{part}</span>
          );
        })}
      </span>
    );
  };

  const renderHighlightedEvidence = (text: string, keywords: any[]) => {
    if (!text) return <span className="italic text-zinc-400">Không có vị trí chứng cứ âm thanh.</span>;
    if (!keywords || keywords.length === 0) return <span>"{text}"</span>;
    const terms = keywords.map((k) => k.original_text?.trim()).filter(Boolean);
    if (terms.length === 0) return <span>"{text}"</span>;
    const regex = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return (
      <span>
        "
        {text.split(regex).map((part, idx) => {
          const isMatch = terms.some((t) => t.toLowerCase() === part.toLowerCase());
          return isMatch ? (
            <span
              key={idx}
              className="inline border border-dashed border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold px-1 py-0.5 rounded mx-0.5"
            >
              {part}
            </span>
          ) : (
            <span key={idx}>{part}</span>
          );
        })}
        "
      </span>
    );
  };

  const handleHighlight = () => {
    if (onSelectEvidenceText && currentQ.evidence_text) {
      onSelectEvidenceText(currentQ.evidence_text, currentQ.question_number);
    }
  };

  const handlePlayEvidence = () => {
    const startSec = findUtteranceStartSeconds(transcriptUtterances, currentQ.evidence_text);
    onPlayAtTime(startSec);
    handleHighlight();
  };

  return (
    <div className="space-y-4">
      {/* Mục: Từ khóa chính trong câu hỏi */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-800">
          <div className="w-4 h-4 rounded-full bg-[#932120] text-white flex items-center justify-center text-[10px]">
            ?
          </div>
          <span>Từ khóa chính trong câu hỏi (Question {currentQ.question_number})</span>
        </div>
        <div className="text-zinc-800 text-sm pl-6 font-normal">
          {renderHighlightedPrompt(currentQ.prompt, currentQ.keywords_mapping)}
        </div>
      </div>

      {/* Mục: So sánh với bản ghi âm */}
      <div className="rounded-xl border border-red-200/70 bg-red-50/20 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#932120]">
            <ArrowLeftRight className="w-4 h-4 text-[#932120]" />
            <span>So sánh với bản ghi âm</span>
          </div>

          <div className="flex items-center gap-2">
            {onSelectEvidenceText && currentQ.evidence_text && (
              <button
                type="button"
                onClick={handleHighlight}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer active:scale-95"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Highlight trên transcript</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePlayEvidence}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 ml-0.5" />
              <span>Phát âm thanh</span>
            </button>
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-red-200/70 text-sm text-zinc-800 leading-relaxed shadow-2xs">
          {renderHighlightedEvidence(currentQ.evidence_text, currentQ.keywords_mapping)}
        </div>

        {currentQ.keywords_mapping && currentQ.keywords_mapping.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-xs font-semibold text-zinc-500">
              Cặp từ đồng nghĩa / diễn giải tương đương:
            </div>
            <div className="flex flex-wrap gap-2">
              {currentQ.keywords_mapping.map((km, kIdx) => (
                <div
                  key={kIdx}
                  className="flex items-center gap-1.5 text-xs bg-white px-2.5 py-1 rounded-lg border border-zinc-200 shadow-2xs"
                >
                  <span className="font-semibold text-zinc-800">[{km.paraphrased_text}]</span>
                  <span className="text-emerald-600 font-bold">≈</span>
                  <span className="font-semibold text-emerald-800">[{km.original_text}]</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
