"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, FileText, Image as ImageIcon, Maximize2, X } from "lucide-react";

export interface WritingPromptChartCardProps {
  taskNo: 1 | 2;
  taskPrompt?: string | null;
  chartImageUrl?: string | null;
  promptCategory?: string | null;
  minWords?: number;
  wordCount?: number;
  studentContent?: string | null;
  defaultOpen?: boolean;
}

export function WritingPromptChartCard({
  taskNo,
  taskPrompt,
  chartImageUrl,
  promptCategory,
  minWords,
  wordCount,
  studentContent,
  defaultOpen = true,
}: WritingPromptChartCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsLightboxOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLightboxOpen]);

  const expectedMin = minWords ?? (taskNo === 1 ? 150 : 250);
  const hasPrompt = Boolean(taskPrompt && taskPrompt.trim().length > 0);
  const hasImage = Boolean(chartImageUrl && chartImageUrl.trim().length > 0);
  const hasEssayText = Boolean(studentContent && studentContent.trim().length > 0);

  if (!hasPrompt && !hasImage && !hasEssayText) return null;

  return (
    <section
      aria-label={`Đề bài và biểu đồ Task ${taskNo}`}
      className="bg-white border border-zinc-200 rounded-2xl shadow-2xs overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 bg-zinc-50/80 hover:bg-zinc-100/80 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#932120]"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#932120]/10 text-[#932120] text-xs font-bold border border-[#932120]/20">
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            Đề bài Task {taskNo}
          </span>
          {promptCategory && (
            <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-semibold uppercase tracking-wide">
              {promptCategory}
            </span>
          )}
          {typeof wordCount === "number" && (
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                wordCount >= expectedMin
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              {wordCount} / ≥{expectedMin} từ
            </span>
          )}
          {hasImage && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200 text-[11px] font-semibold">
              <ImageIcon className="w-3 h-3" aria-hidden="true" />
              Có biểu đồ
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 shrink-0">
          {isOpen ? (
            <>
              Thu gọn <ChevronUp className="w-4 h-4" aria-hidden="true" />
            </>
          ) : (
            <>
              Xem đề bài <ChevronDown className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 sm:p-5 space-y-4 border-t border-zinc-200 bg-white">
          <div className={hasImage ? "grid grid-cols-1 lg:grid-cols-12 gap-4 items-start" : "space-y-4"}>
            {hasPrompt && (
              <div className={hasImage ? "lg:col-span-7" : ""}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Đề bài gốc ({taskNo === 1 ? "Academic Task 1" : "Task 2 Essay"})
                </p>
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-800 leading-relaxed whitespace-pre-line font-normal">
                  {taskPrompt}
                </div>
              </div>
            )}

            {hasImage && (
              <div className={hasPrompt ? "lg:col-span-5" : "max-w-lg"}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Biểu đồ / Hình minh họa Task 1
                </p>
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  aria-label="Phóng to biểu đồ Task 1"
                  className="group relative w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 overflow-hidden hover:border-[#932120]/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#932120]"
                >
                  <img
                    src={chartImageUrl || ""}
                    alt={`Biểu đồ minh họa đề thi Writing Task ${taskNo}`}
                    className="w-full max-h-60 object-contain mx-auto rounded-lg bg-white"
                  />
                  <span className="mt-2 inline-flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-semibold text-zinc-700 group-hover:text-[#932120]">
                    <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Bấm để phóng to toàn màn hình
                  </span>
                </button>
              </div>
            )}
          </div>

          {hasEssayText && (
            <div className="pt-2 border-t border-zinc-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
                Bài làm đã nộp ({wordCount ?? 0} từ)
              </p>
              <div className="p-4 rounded-xl bg-zinc-50/70 border border-zinc-200 text-sm text-zinc-800 leading-relaxed whitespace-pre-line max-h-64 overflow-y-auto">
                {studentContent}
              </div>
            </div>
          )}
        </div>
      )}

      {isLightboxOpen && hasImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem biểu đồ Writing Task 1 phóng to"
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full bg-white rounded-2xl p-3 sm:p-4 shadow-2xl border border-zinc-200"
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Đóng ảnh phóng to"
              className="absolute top-3 right-3 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full bg-zinc-900/85 text-white hover:bg-[#932120] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            <img
              src={chartImageUrl || ""}
              alt={`Biểu đồ phóng to đề thi Writing Task ${taskNo}`}
              className="w-full max-h-[82vh] object-contain rounded-xl bg-white"
            />
          </div>
        </div>
      )}
    </section>
  );
}
