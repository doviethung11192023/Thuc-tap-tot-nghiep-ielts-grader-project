"use client";

import React, { useState } from 'react';
import { 
  Lightbulb, 
  ChevronUp, 
  ChevronDown, 
  Play, 
  ArrowLeftRight, 
  CheckCircle2, 
  XCircle, 
  FileText 
} from 'lucide-react';
import { CleanListeningQuestion } from '@/mocks/clean-dataset/listening-test-1-clean';

interface CleanGroupDropdownExplanationProps {
  questions: CleanListeningQuestion[];
  activeQuestionNumber: number;
  onSelectQuestion: (questionNumber: number) => void;
  onPlayAtTime: (seconds: number) => void;
  onSelectEvidenceText?: (text: string) => void;
  defaultExpanded?: boolean;
}

export function CleanGroupDropdownExplanation({
  questions,
  activeQuestionNumber,
  onSelectQuestion,
  onPlayAtTime,
  onSelectEvidenceText,
  defaultExpanded = true
}: CleanGroupDropdownExplanationProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [activeSubTab, setActiveSubTab] = useState<'location' | 'explanation'>('location');
  const [selectedEvidenceIndex, setSelectedEvidenceIndex] = useState<number>(0);

  if (!questions || questions.length === 0) return null;

  const currentQ = questions.find(q => q.question_number === activeQuestionNumber) || questions[0];

  // Helper render câu hỏi bọc viền nét đứt từ khóa
  const renderHighlightedPrompt = (prompt: string, keywords: any[]) => {
    if (!keywords || keywords.length === 0) return <span>{prompt}</span>;

    const terms = keywords
      .map(k => k.paraphrased_text?.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    if (terms.length === 0) return <span>{prompt}</span>;

    const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts = prompt.split(regex);

    return (
      <span className="leading-relaxed">
        {parts.map((part, idx) => {
          const isMatch = terms.some(t => t.toLowerCase() === part.toLowerCase());
          if (isMatch) {
            return (
              <span
                key={idx}
                className="inline-block border border-dashed border-emerald-500 bg-emerald-50/70 text-emerald-950 rounded-md px-2 py-0.5 mx-0.5 font-medium shadow-2xs"
              >
                {part}
              </span>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </span>
    );
  };

  // Helper render transcript evidence có highlight từ khóa
  const renderHighlightedEvidence = (text: string, keywords: any[]) => {
    if (!text) return <span className="italic text-zinc-400">Không có vị trí chứng cứ âm thanh.</span>;
    if (!keywords || keywords.length === 0) return <span>"{text}"</span>;

    const terms = keywords
      .map(k => k.original_text?.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    if (terms.length === 0) return <span>"{text}"</span>;

    const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        "
        {parts.map((part, idx) => {
          const isMatch = terms.some(t => t.toLowerCase() === part.toLowerCase());
          if (isMatch) {
            return (
              <span
                key={idx}
                className="inline-block border border-dashed border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold px-1.5 py-0.5 rounded mx-0.5"
              >
                {part}
              </span>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
        "
      </span>
    );
  };

  // Tính toán thời gian bắt đầu từ evidenceSourceId hoặc mapping câu hỏi
  // Trong dataset: Q1 có evidence_source_id "14" (start_timestamp 136785 -> 136s)
  const getTimestampForQuestion = (q: CleanListeningQuestion): number => {
    // Ước tính mốc thời gian dựa theo số câu trong Section 1 (tổng 435s)
    if (q.question_number === 1) return 136; // 02:16
    if (q.question_number === 2) return 152; // 02:32
    if (q.question_number === 3) return 165; // 02:45
    if (q.question_number === 4) return 175; // 02:55
    if (q.question_number === 5) return 215; // 03:35
    if (q.question_number === 6) return 230; // 03:50
    if (q.question_number === 7) return 255; // 04:15
    if (q.question_number === 8) return 280; // 04:40
    if (q.question_number === 9) return 315; // 05:15
    if (q.question_number === 10) return 340; // 05:40
    return Math.max(0, (q.question_number - 1) * 35);
  };

  return (
    <div className="rounded-2xl border border-blue-200 bg-white overflow-hidden shadow-2xs transition-all">
      {/* 1. Header Bar: Icon bóng đèn + Tiêu đề 'Giải thích đáp án' + Chevron */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-3 flex items-center justify-between text-left bg-blue-50/60 hover:bg-blue-100/70 transition-colors border-b border-blue-100"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
            <Lightbulb className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-blue-900">
            Giải thích đáp án
          </span>
          <span className="text-xs text-blue-600 font-medium">
            (Questions {questions[0]?.question_number} - {questions[questions.length - 1]?.question_number})
          </span>
        </div>
        <div className="text-blue-700">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* 2. Nội dung mở rộng */}
      {isExpanded && (
        <div className="p-4 md:p-5 space-y-4">
          {/* Hàng Tabs chọn câu hỏi trong group (Image 1) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-100">
            {questions.map(q => {
              const isSelected = q.question_number === currentQ.question_number;
              const isCorrect = q.is_correct;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onSelectQuestion(q.question_number)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-100'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCorrect ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                  />
                  <span>Question {q.question_number}</span>
                </button>
              );
            })}
          </div>

          {/* Segmented Switch: Vị trí đáp án vs Giải thích */}
          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-zinc-200 gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveSubTab('location')}
                className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeSubTab === 'location'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Vị trí đáp án
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('explanation')}
                className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeSubTab === 'explanation'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Giải thích
              </button>
            </div>
          </div>

          {/* SUB-TAB 1: VỊ TRÍ ĐÁP ÁN (Image 1 & 2) */}
          {activeSubTab === 'location' && (
            <div className="space-y-4">
              {/* Mục: Từ khóa chính trong câu hỏi */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900">
                  <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    ?
                  </div>
                  <span>Từ khóa chính trong câu hỏi (Question {currentQ.question_number})</span>
                </div>
                <div className="text-zinc-800 text-sm pl-6 font-normal">
                  {renderHighlightedPrompt(currentQ.prompt, currentQ.keywords_mapping)}
                </div>
              </div>

              {/* Hàng tabs chọn Evidence (nếu có) */}
              <div className="flex items-center gap-2 pl-1">
                <button
                  type="button"
                  onClick={() => setSelectedEvidenceIndex(0)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    selectedEvidenceIndex === 0
                      ? 'bg-blue-50 border-blue-300 text-blue-800'
                      : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                  }`}
                >
                  Evidence 1
                </button>
                {currentQ.keywords_mapping.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedEvidenceIndex(1)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      selectedEvidenceIndex === 1
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
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

                  {/* Nút 'Phát âm thanh' nhảy đến đúng timestamp */}
                  <button
                    type="button"
                    onClick={() => {
                      const ts = getTimestampForQuestion(currentQ);
                      onPlayAtTime(ts);
                      if (onSelectEvidenceText && currentQ.evidence_text) {
                        onSelectEvidenceText(currentQ.evidence_text);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                    <span>Phát âm thanh</span>
                  </button>
                </div>

                {/* Khung trích dẫn bản ghi âm */}
                <div className="p-3 bg-white rounded-xl border border-blue-200/80 text-sm text-zinc-800 leading-relaxed shadow-2xs">
                  {renderHighlightedEvidence(currentQ.evidence_text, currentQ.keywords_mapping)}
                </div>

                {/* Danh sách các cặp đối chiếu từ khóa */}
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
                          <span className="font-semibold text-zinc-800">
                            [{km.paraphrased_text}]
                          </span>
                          <span className="text-emerald-600 font-bold">≈</span>
                          <span className="font-semibold text-emerald-800">
                            [{km.original_text}]
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: GIẢI THÍCH (4 BƯỚC) */}
          {activeSubTab === 'explanation' && (
            <div className="space-y-3.5 leading-relaxed text-zinc-800">
              {currentQ.explanation_4_steps ? (
                <div className="prose prose-sm max-w-none text-zinc-800 space-y-3">
                  {currentQ.explanation_4_steps.split(/###\s+/).filter(Boolean).map((chunk, cIdx) => {
                    const lines = chunk.trim().split('\n');
                    const title = lines[0] || '';
                    const bodyLines = lines.slice(1);

                    return (
                      <div key={cIdx} className="space-y-1.5">
                        <div className="font-bold text-zinc-900 text-sm flex items-center gap-1.5 text-blue-950">
                          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                          <span>{title}</span>
                        </div>
                        <div className="pl-3.5 text-xs sm:text-sm space-y-2 text-zinc-700">
                          {bodyLines.map((line, lIdx) => {
                            const trimmed = line.trim();
                            if (!trimmed) return null;

                            if (trimmed.startsWith('>')) {
                              return (
                                <div
                                  key={lIdx}
                                  className="my-1.5 p-2.5 rounded-lg border-l-4 border-blue-500 bg-blue-50/60 text-blue-950 italic text-xs sm:text-sm"
                                >
                                  {trimmed.replace(/^>\s*/, '').replace(/\*\*/g, '')}
                                </div>
                              );
                            }

                            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                              return (
                                <div key={lIdx} className="flex items-start gap-1.5 pl-2 text-zinc-800">
                                  <span className="text-blue-500 font-bold">•</span>
                                  <span>{trimmed.replace(/^[-*]\s*/, '').replace(/\*\*/g, '')}</span>
                                </div>
                              );
                            }

                            if (trimmed.includes('✅') || trimmed.includes('Answer:')) {
                              return (
                                <div
                                  key={lIdx}
                                  className="font-bold text-emerald-800 bg-emerald-50/80 border border-emerald-200 p-2 rounded-lg"
                                >
                                  {trimmed.replace(/\*\*/g, '')}
                                </div>
                              );
                            }

                            return (
                              <p key={lIdx} className="leading-normal">
                                {trimmed.replace(/\*\*/g, '')}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-zinc-500 italic text-xs">
                  Không có dữ liệu lời giải chi tiết cho câu hỏi này.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
