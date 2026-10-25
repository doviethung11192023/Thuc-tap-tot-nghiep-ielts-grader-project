"use client";

import React, { useState } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  HelpCircle, 
  ArrowLeftRight, 
  Lightbulb, 
  CheckCircle2, 
  BookOpen, 
  AlertCircle 
} from 'lucide-react';

export interface KeywordMapping {
  original_text: string;
  paraphrased_text: string;
  mapping_type?: string;
}

interface CleanQuestionDropdownExplanationProps {
  questionNumber: number;
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation4Steps: string;
  evidenceText: string;
  keywordsMapping: KeywordMapping[];
  onSelectEvidence?: (originalText: string) => void;
  defaultExpanded?: boolean;
}

export function CleanQuestionDropdownExplanation({
  questionNumber,
  prompt,
  userAnswer,
  correctAnswer,
  isCorrect,
  explanation4Steps,
  evidenceText,
  keywordsMapping,
  onSelectEvidence,
  defaultExpanded = false
}: CleanQuestionDropdownExplanationProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [activeTab, setActiveTab] = useState<'location' | 'explanation'>('explanation');

  // Hàm render prompt với các cụm từ khóa được bọc viền nét đứt xanh lá (Image 2)
  const renderHighlightedPrompt = () => {
    if (!keywordsMapping || keywordsMapping.length === 0) {
      return <span>{prompt}</span>;
    }

    // Tạo regex tìm các paraphrased_text
    const terms = keywordsMapping
      .map(k => k.paraphrased_text.trim())
      .filter(t => t.length > 0)
      .sort((a, b) => b.length - a.length); // dài nhất trước để tránh nuốt chữ

    if (terms.length === 0) return <span>{prompt}</span>;

    const escapedTerms = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
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

  return (
    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/30 overflow-hidden shadow-2xs transition-all">
      {/* Header bar: Icon bóng đèn + Tiêu đề 'Giải thích đáp án' + Chevron icon */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left bg-blue-50/80 hover:bg-blue-100/80 transition-colors border-b border-blue-100"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
            <Lightbulb className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm text-blue-900">
            Giải thích đáp án
          </span>
        </div>
        <div className="text-blue-700">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Body accordion */}
      {isExpanded && (
        <div className="p-4 bg-white/95 space-y-4 text-sm">
          {/* Segmented Switch (Pill): Vị trí đáp án vs Giải thích */}
          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-zinc-200 gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('location')}
                className={`px-6 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'location'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Vị trí đáp án
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('explanation')}
                className={`px-6 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'explanation'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Giải thích
              </button>
            </div>
          </div>

          {/* TAB 1: VỊ TRÍ ĐÁP ÁN (Image 2) */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              {/* Mục 1: Từ khóa chính trong câu hỏi */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900">
                  <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    ?
                  </div>
                  <span>Từ khóa chính trong câu hỏi</span>
                </div>
                <div className="text-zinc-800 text-sm pl-6 font-normal">
                  {renderHighlightedPrompt()}
                </div>
              </div>

              {/* Mục 2: Đối chiếu với bài học */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900">
                  <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                  <span>Đối chiếu với bài học</span>
                </div>

                {keywordsMapping && keywordsMapping.length > 0 ? (
                  <div className="space-y-2 pl-6">
                    {keywordsMapping.map((km, kIdx) => (
                      <div
                        key={kIdx}
                        onClick={() => onSelectEvidence && onSelectEvidence(km.original_text)}
                        className="flex items-center gap-2 flex-wrap text-xs sm:text-sm cursor-pointer group"
                        title="Click để đối chiếu vị trí trên đoạn văn"
                      >
                        <span className="border border-dashed border-emerald-500 bg-emerald-50/80 text-emerald-950 rounded-md px-2 py-0.5 font-medium shadow-2xs">
                          {km.paraphrased_text}
                        </span>
                        <span className="text-emerald-600 font-bold">≈</span>
                        <span className="border border-dashed border-emerald-500 bg-emerald-50/80 text-emerald-950 rounded-md px-2 py-0.5 font-medium shadow-2xs group-hover:bg-emerald-100 transition-colors">
                          {km.original_text}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500 italic pl-6">
                    Vị trí đáp án được xác định tại đoạn văn bên trái.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GIẢI THÍCH (4 BƯỚC) (Image 1) */}
          {activeTab === 'explanation' && (
            <div className="space-y-3.5 leading-relaxed text-zinc-800">
              {explanation4Steps ? (
                <div className="prose prose-sm max-w-none text-zinc-800 space-y-3">
                  {explanation4Steps.split(/###\s+/).filter(Boolean).map((chunk, cIdx) => {
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

                            // Callout blockquote
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

                            // Bullet
                            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                              return (
                                <div key={lIdx} className="flex items-start gap-1.5 pl-2 text-zinc-800">
                                  <span className="text-blue-500 font-bold">•</span>
                                  <span>{trimmed.replace(/^[-*]\s*/, '').replace(/\*\*/g, '')}</span>
                                </div>
                              );
                            }

                            // Bold verdict
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
