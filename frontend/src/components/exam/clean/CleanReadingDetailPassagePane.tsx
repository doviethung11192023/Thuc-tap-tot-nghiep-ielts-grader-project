"use client";

import React, { useMemo, useEffect } from "react";
import { CleanReadingQuestion } from "@/mocks/clean-dataset/reading-test-1-clean";

export interface HighlightTarget {
  text: string;
  qNum?: number;
}

interface ParsedParagraph {
  id: string;
  label?: string;
  text: string;
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

/**
 * Tách nội dung bài đọc IELTS thành các đoạn văn chuẩn xác:
 * 1. Ưu tiên tách theo double/single newline.
 * 2. Nếu dữ liệu DB bị dính thành 1 khối (không có \n) kèm nhãn đoạn A, B, C...
 *    (ví dụ: "ELECTRORECEPTIONA Open your eyes... B Electroreception..."),
 *    tự động gỡ tiêu đề viết hoa dính đầu đoạn A và tách các đoạn theo nhãn A-H.
 */
function parsePassageParagraphs(
  rawContent: string,
  title: string,
  explicitParagraphs?: Array<{ id: string; text: string }>
): ParsedParagraph[] {
  if (explicitParagraphs && explicitParagraphs.length > 0) {
    return explicitParagraphs.map((p) => {
      const m = p.text.match(/^([A-H])\s+([\s\S]+)$/);
      return m ? { id: p.id, label: m[1], text: m[2].trim() } : { id: p.id, text: p.text };
    });
  }

  let raw = (rawContent || "").trim();
  if (!raw) return [];

  let chunks = raw.split(/\r?\n\s*\r?\n/).map((t) => t.trim()).filter(Boolean);

  if (chunks.length <= 1 && raw.includes("\n")) {
    chunks = raw.split(/\r?\n/).map((t) => t.trim()).filter(Boolean);
  }

  // Fallback cho bài đọc bị mất newline: gỡ tiêu đề ALL-CAPS dính đầu đoạn A và tách theo nhãn A-H
  if (chunks.length <= 1) {
    // Gỡ tiêu đề viết hoa dính liền với nhãn "A " ở đầu (vd: "ELECTRORECEPTIONA Open...")
    raw = raw.replace(/^[A-Z0-9\s:,'’"“”\-–—]{3,}?(?=[A-H]\s+[A-Z“"'(])/, "").trim();

    // Tách tại ranh giới câu kết thúc + khoảng trắng + nhãn đoạn [A-H] + khoảng trắng + chữ hoa
    const inlineSplit = raw
      .split(/(?<=[.!?]["'”’)]?\s+)(?=[A-H]\s+[A-Z“"'(])/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (inlineSplit.length >= 2) {
      chunks = inlineSplit;
    } else {
      chunks = [raw];
    }
  }

  return chunks
    .map((text, idx) => {
      let cleaned = text;

      if (idx === 0 && title) {
        const normTitle = title.trim();
        if (normTitle && cleaned.toLowerCase().startsWith(normTitle.toLowerCase())) {
          cleaned = cleaned.slice(normTitle.length).trim();
        }
      }

      const labelMatch = cleaned.match(/^([A-H])\s+([\s\S]+)$/);
      if (labelMatch) {
        return {
          id: `para_${idx + 1}`,
          label: labelMatch[1],
          text: labelMatch[2].trim(),
        };
      }

      return { id: `para_${idx + 1}`, text: cleaned };
    })
    .filter((p) => p.text.length > 0);
}

export function CleanReadingDetailPassagePane({
  passageIndex,
  title,
  content,
  paragraphs,
  passageScrollRef,
  highlightedEvidence,
}: CleanReadingDetailPassagePaneProps) {
  const effectiveParagraphs = useMemo(
    () => parsePassageParagraphs(content, title, paragraphs),
    [paragraphs, content, title]
  );

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

  const findMatchSegment = (pText: string, target: string): string | null => {
    const lowP = pText.toLowerCase();
    const lowTarget = target.toLowerCase();
    if (lowP.includes(lowTarget)) return target;
    if (target.length > 25) {
      const chunks = target
        .split(/(?<=[.!?])\s+/)
        .map((c) => c.trim())
        .filter((c) => c.length > 15);
      const matched = chunks.find((c) => lowP.includes(c.toLowerCase()));
      if (matched) return matched;
    }
    return null;
  };

  const renderParagraphContent = (pText: string) => {
    const target = highlightedEvidence?.text?.trim();
    const matchText = target && target.length > 3 ? findMatchSegment(pText, target) : null;

    if (matchText) {
      const escaped = matchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "gi");
      const parts = pText.split(regex);
      const qNumBadge = highlightedEvidence?.qNum;

      return (
        <span>
          {parts.map((part, idx) => {
            if (part.toLowerCase() === matchText.toLowerCase()) {
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
      className="w-1/2 h-full overflow-y-auto bg-white p-6 md:p-8 border-r border-zinc-200 space-y-6 custom-scrollbar"
    >
      <div className="border-b border-zinc-200 pb-4 text-center">
        <span className="inline-block text-[11px] font-black uppercase tracking-wider text-[#932120] bg-red-50 px-3 py-1 rounded-full border border-red-100">
          Reading Passage {passageIndex + 1}
        </span>
        <h3 className="text-lg md:text-2xl font-bold text-zinc-900 mt-3 font-serif">
          {title}
        </h3>
      </div>

      <div className="space-y-4 text-zinc-800 text-sm md:text-[15.5px] leading-[1.75] font-serif">
        {effectiveParagraphs.map((p, pIdx) => {
          const target = highlightedEvidence?.text?.trim();
          const hasMatch = Boolean(target && target.length > 3 && findMatchSegment(p.text, target));
          return (
            <div
              key={p.id || pIdx}
              data-evidence-text={p.text}
              className={`rounded-xl px-4 py-3 transition-colors flex items-start gap-3.5 ${
                hasMatch ? "bg-amber-50/60 ring-1 ring-amber-300" : "hover:bg-zinc-50/70"
              }`}
            >
              {p.label && (
                <span className="font-sans font-bold text-[#932120] bg-red-50 border border-red-100 px-2 py-0.5 rounded-md text-xs shrink-0 mt-1 select-none">
                  {p.label}
                </span>
              )}
              <p className="leading-[1.75] flex-1 text-justify">
                {renderParagraphContent(p.text)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
