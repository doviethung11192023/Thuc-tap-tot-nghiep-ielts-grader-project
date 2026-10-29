"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb, ArrowLeftRight, Compass, FileText } from "lucide-react";
import { CleanExplanationSteps } from "./CleanExplanationSteps";
import { extractCoreReasoning } from "@/utils/explanation-parser";

interface KeywordMapItem {
  original_text: string;
  paraphrased_text: string;
}

interface CleanQuestionDropdownExplanationProps {
  questionNumber: number;
  prompt: string;
  userAnswer?: string;
  correctAnswer: string;
  isCorrect?: boolean;
  explanation4Steps?: string;
  evidenceText?: string;
  keywordsMapping?: KeywordMapItem[];
  onSelectEvidence?: (originalText: string, questionNumber?: number) => void;
  defaultExpanded?: boolean;
}

export function CleanQuestionDropdownExplanation({
  questionNumber,
  prompt,
  explanation4Steps,
  evidenceText,
  keywordsMapping = [],
  onSelectEvidence,
  defaultExpanded = false,
}: CleanQuestionDropdownExplanationProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [showFullSteps, setShowFullSteps] = useState<boolean>(false);

  const coreReasoning = extractCoreReasoning(explanation4Steps);

  const renderHighlightedPrompt = () => {
    if (!keywordsMapping || keywordsMapping.length === 0) {
      return <span>{prompt}</span>;
    }

    const terms = keywordsMapping
      .map((k) => k.paraphrased_text.trim())
      .filter((t) => t.length > 0)
      .sort((a, b) => b.length - a.length);

    if (terms.length === 0) return <span>{prompt}</span>;

    const escapedTerms = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(${escapedTerms.join("|")})`, "gi");
    const parts = prompt.split(regex);

    return (
      <span className="leading-relaxed">
        {parts.map((part, idx) => {
          const isMatch = terms.some((t) => t.toLowerCase() === part.toLowerCase());
          if (isMatch) {
            return (
              <span
                key={idx}
                className="inline-block border border-dashed border-emerald-500 bg-emerald-50 text-emerald-950 rounded px-1.5 py-0.5 mx-0.5 font-bold shadow-2xs"
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
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-left bg-blue-50/80 hover:bg-blue-100/80 transition-colors border-b border-blue-100 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
            <Lightbulb className="w-3 h-3" />
          </div>
          <span className="font-semibold text-xs sm:text-sm text-blue-900">
            Giải thích & Dẫn chứng câu {questionNumber}
          </span>
        </div>
        <div className="text-blue-700">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 bg-white space-y-3.5 text-sm">
          {/* 1. Dẫn chứng đoạn văn + Nút Highlight trực tiếp */}
          {evidenceText && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-600" />
                  Vị trí chứng cứ trên bài đọc
                </span>
                {onSelectEvidence && (
                  <button
                    type="button"
                    onClick={() => onSelectEvidence(evidenceText, questionNumber)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                  >
                    <span>Highlight trên bài 📍</span>
                  </button>
                )}
              </div>
              <p className="text-xs sm:text-sm italic font-serif text-zinc-800 pl-3 border-l-2 border-amber-500 leading-relaxed">
                "{evidenceText}"
              </p>
            </div>
          )}

          {/* 2. Từ khóa chính trong câu hỏi */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-3 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
              Từ khóa chính trong câu hỏi
            </div>
            <div className="text-zinc-800 text-xs sm:text-sm">{renderHighlightedPrompt()}</div>
          </div>

          {/* 3. Đối chiếu Paraphrase */}
          {keywordsMapping && keywordsMapping.length > 0 && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đối chiếu từ khóa (Paraphrase Mapping)</span>
              </div>
              <div className="space-y-1.5 pl-1">
                {keywordsMapping.map((km, kIdx) => (
                  <div
                    key={kIdx}
                    onClick={() => onSelectEvidence && onSelectEvidence(km.original_text, questionNumber)}
                    className="flex items-center gap-2 flex-wrap text-xs cursor-pointer group"
                    title="Bấm để xem và highlight từ khóa trên bài đọc"
                  >
                    <span className="border border-dashed border-emerald-500 bg-white text-emerald-950 rounded px-2 py-0.5 font-bold shadow-2xs">
                      {km.paraphrased_text}
                    </span>
                    <span className="text-emerald-600 font-black">≈</span>
                    <span className="border border-dashed border-emerald-500 bg-white text-emerald-950 rounded px-2 py-0.5 font-bold group-hover:bg-emerald-100 transition-colors shadow-2xs">
                      {km.original_text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Lý giải trọng tâm (Step 4 summary) */}
          {coreReasoning && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-700">
                <Lightbulb className="w-3.5 h-3.5 text-[#932120]" />
                <span>Lý do chọn đáp án</span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-800 leading-relaxed font-sans">{coreReasoning}</p>
            </div>
          )}

          {/* 5. Nút mở rộng 4 bước đầy đủ */}
          {explanation4Steps && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowFullSteps(!showFullSteps)}
                className="w-full py-2 px-3 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-bold text-zinc-600 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{showFullSteps ? "Thu gọn lời giải chi tiết" : "Xem phân tích 4 bước đầy đủ (Steps 1–4)"}</span>
                {showFullSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showFullSteps && (
                <div className="mt-3 pt-3 border-t border-zinc-100">
                  <CleanExplanationSteps explanation4Steps={explanation4Steps} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
