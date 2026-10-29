"use client";

import React, { useState } from 'react';
import { ArrowLeftRight, Play } from 'lucide-react';
import { CleanListeningQuestion } from '@/mocks/clean-dataset/listening-test-1-clean';

interface CleanGroupEvidenceLocationProps {
  currentQ: CleanListeningQuestion;
  onPlayAtTime: (seconds: number) => void;
  onSelectEvidenceText?: (text: string) => void;
}

export function CleanGroupEvidenceLocation({
  currentQ,
  onPlayAtTime,
  onSelectEvidenceText
}: CleanGroupEvidenceLocationProps) {
  const [selectedEvidenceIndex, setSelectedEvidenceIndex] = useState<number>(0);

  const renderHighlightedPrompt = (prompt: string, keywords: any[]) => {
    if (!keywords || keywords.length === 0) return <span>{prompt}</span>;
    const terms = keywords.map(k => k.paraphrased_text?.trim()).filter(Boolean);
    if (terms.length === 0) return <span>{prompt}</span>;
    const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return (
      <span className="leading-relaxed">
        {prompt.split(regex).map((part, idx) => {
          const isMatch = terms.some(t => t.toLowerCase() === part.toLowerCase());
          return isMatch ? (
            <span key={idx} className="inline border border-dashed border-emerald-500 bg-emerald-50/70 text-emerald-950 rounded px-1.5 py-0.5 mx-0.5 font-medium">
              {part}
            </span>
          ) : <span key={idx}>{part}</span>;
        })}
      </span>
    );
  };

  const renderHighlightedEvidence = (text: string, keywords: any[]) => {
    if (!text) return <span className="italic text-zinc-400">Không có vị trí chứng cứ âm thanh.</span>;
    if (!keywords || keywords.length === 0) return <span>"{text}"</span>;
    const terms = keywords.map(k => k.original_text?.trim()).filter(Boolean);
    if (terms.length === 0) return <span>"{text}"</span>;
    const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return (
      <span>
        "{text.split(regex).map((part, idx) => {
          const isMatch = terms.some(t => t.toLowerCase() === part.toLowerCase());
          return isMatch ? (
            <span key={idx} className="inline border border-dashed border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold px-1 py-0.5 rounded mx-0.5">
              {part}
            </span>
          ) : <span key={idx}>{part}</span>;
        })}"
      </span>
    );
  };

  const getTimestampForQuestion = (q: CleanListeningQuestion): number => {
    const timeMap: Record<number, number> = { 1: 136, 2: 152, 3: 165, 4: 175, 5: 215, 6: 230, 7: 255, 8: 280, 9: 315, 10: 340 };
    return timeMap[q.question_number] ?? Math.max(0, (q.question_number - 1) * 35);
  };

  return (
    <div className="space-y-4">
      {/* Mục: Từ khóa chính trong câu hỏi */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900">
          <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">?</div>
          <span>Từ khóa chính trong câu hỏi (Question {currentQ.question_number})</span>
        </div>
        <div className="text-zinc-800 text-sm pl-6 font-normal">
          {renderHighlightedPrompt(currentQ.prompt, currentQ.keywords_mapping)}
        </div>
      </div>

      {/* Hàng tabs chọn Evidence */}
      <div className="flex items-center gap-2 pl-1">
        <button
          type="button"
          onClick={() => setSelectedEvidenceIndex(0)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            selectedEvidenceIndex === 0 ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
          }`}
        >
          Evidence 1
        </button>
        {currentQ.keywords_mapping && currentQ.keywords_mapping.length > 1 && (
          <button
            type="button"
            onClick={() => setSelectedEvidenceIndex(1)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              selectedEvidenceIndex === 1 ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            Evidence 2
          </button>
        )}
      </div>

      {/* Mục: So sánh với bản ghi âm */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900">
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            <span>So sánh với bản ghi âm</span>
          </div>

          <button
            type="button"
            onClick={() => {
              onPlayAtTime(getTimestampForQuestion(currentQ));
              if (onSelectEvidenceText && currentQ.evidence_text) {
                onSelectEvidenceText(currentQ.evidence_text);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 ml-0.5" />
            <span>Phát âm thanh</span>
          </button>
        </div>

        <div className="p-3 bg-white rounded-xl border border-blue-200/80 text-sm text-zinc-800 leading-relaxed shadow-2xs">
          {renderHighlightedEvidence(currentQ.evidence_text, currentQ.keywords_mapping)}
        </div>

        {currentQ.keywords_mapping && currentQ.keywords_mapping.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-xs font-semibold text-zinc-500">Cặp từ đồng nghĩa / diễn giải tương đương:</div>
            <div className="flex flex-wrap gap-2">
              {currentQ.keywords_mapping.map((km, kIdx) => (
                <div key={kIdx} className="flex items-center gap-1.5 text-xs bg-white px-2.5 py-1 rounded-lg border border-zinc-200 shadow-2xs">
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
