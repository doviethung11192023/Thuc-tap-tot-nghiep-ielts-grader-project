"use client";

import React, { useMemo, useEffect } from "react";
import { CleanReadingQuestion } from "@/mocks/clean-dataset/reading-test-1-clean";

export interface HighlightTarget {
  text: string;
  qNum?: number;
}

interface CleanReadingDetailPassagePaneProps {
  passageIndex: number;
  title: string;
  content: string;
  paragraphs?: Array<{ id: string; text: string }>;
  questions: CleanReadingQuestion[];
  passageScrollRef: React.RefObject<HTMLDivElement | null>;
  highlightedEvidence?: HighlightTarget | null;
}

export function CleanReadingDetailPassagePane({
  passageIndex,
  title,
  content,
  paragraphs,
  questions,
  passageScrollRef,
  highlightedEvidence,
}: CleanReadingDetailPassagePaneProps) {
  // Tự động phân tách đoạn văn từ content nếu chưa có mảng paragraphs
  const effectiveParagraphs = useMemo(() => {
    if (paragraphs && paragraphs.length > 0) return paragraphs;
    return (content || "")
      .split(/\n\s*\n/)
      .map((text, idx) => ({ id: `para_${idx + 1}`, text: text.trim() }))
      .filter((p) => p.text.length > 0);
  }, [paragraphs, content]);

  // Tự động cuộn đến điểm highlight khi highlightedEvidence thay đổi
  useEffect(() => {
    if (!highlightedEvidence?.text) return;
    const timer = setTimeout(() => {
      const el = document.getElementById("active-evidence-highlight");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [highlightedEvidence]);

  const renderParagraphContent = (pText: string) => {
    const target = highlightedEvidence?.text?.trim();

    if (target && target.length > 3 && pText.toLowerCase().includes(target.toLowerCase())) {
      const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "gi");
      const parts = pText.split(regex);
      const qNumBadge = highlightedEvidence?.qNum;

      return (
        <span>
          {parts.map((part, idx) => {
            if (part.toLowerCase() === target.toLowerCase()) {
              return (
                <mark
                  key={idx}
                  id="active-evidence-highlight"
                  className="bg-amber-200/95 text-amber-950 font-medium px-1 py-0.5 rounded border-b-2 border-amber-500 shadow-2xs transition-colors"
                >
                  {qNumBadge && (
                    <span className="inline text-[11px] font-bold text-[#932120] mr-1 select-none">
                      [Câu {qNumBadge}]
                    </span>
                  )}
                  {part}
                </mark>
              );
            }
            return <span key={idx}>{part}</span>;
          })}
        </span>
      );
    }

    return <span>{pText}</span>;
  };

  return (
    <div
      ref={passageScrollRef}
      className="w-1/2 h-full overflow-y-auto bg-white p-6 md:p-8 border-r border-zinc-200 space-y-5 custom-scrollbar"
    >
      <div className="border-b border-zinc-200 pb-4">
        <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-[#932120]">
          READING PASSAGE {passageIndex + 1}
        </h2>
        <h3 className="text-lg md:text-xl font-bold text-center text-zinc-900 mt-2 font-serif">
          {title}
        </h3>
      </div>

      <div className="space-y-5 text-zinc-800 text-sm md:text-base leading-relaxed font-serif">
        {effectiveParagraphs.map((p, pIdx) => (
          <p
            key={p.id || pIdx}
            data-evidence-text={p.text}
            className="leading-relaxed relative font-serif text-zinc-800 text-sm md:text-base text-justify"
          >
            {renderParagraphContent(p.text)}
          </p>
        ))}
      </div>
    </div>
  );
}
