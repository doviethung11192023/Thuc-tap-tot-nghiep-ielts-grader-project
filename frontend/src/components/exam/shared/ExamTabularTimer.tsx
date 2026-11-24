// Lucian UX/UI Prompt #100 inspired · Calm Academic Tabular Exam Timer (MIT adapted)
"use client";

import React from "react";
import { Clock } from "lucide-react";

interface ExamTabularTimerProps {
  mode: "exam" | "practice";
  timerSeconds: number;
  capSeconds?: number;
  prefixText?: string;
  overrideLabel?: string;
  isReviewPhase?: boolean;
}

function formatClock(totalSecs: number): string {
  const safe = Math.max(0, Math.floor(totalSecs));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/** Fixed-width monospace tabular countdown timer preventing layout shift in Exam rooms. */
export function ExamTabularTimer({
  mode,
  timerSeconds,
  capSeconds,
  prefixText,
  overrideLabel,
  isReviewPhase = false,
}: ExamTabularTimerProps) {
  const isLowTime = mode === "exam" && !isReviewPhase && timerSeconds > 0 && timerSeconds <= 300;
  const isCritical = mode === "exam" && !isReviewPhase && timerSeconds > 0 && timerSeconds <= 60;

  const toneClass = isReviewPhase
    ? "bg-amber-50 text-amber-900 border-amber-300"
    : isCritical
      ? "bg-red-100 text-red-900 border-red-300 ring-2 ring-red-200/70"
      : isLowTime
        ? "bg-amber-50 text-amber-900 border-amber-300"
        : "bg-rose-50 text-[#932120] border-rose-200/80";

  return (
    <div
      role="timer"
      aria-live="off"
      className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs sm:text-sm font-bold border shadow-2xs transition-colors font-mono tabular-nums ${toneClass}`}
    >
      <Clock
        className={`w-4 h-4 shrink-0 ${
          isReviewPhase || isLowTime ? "text-amber-700" : isCritical ? "text-red-700" : "text-[#932120]"
        }`}
      />
      {overrideLabel ? (
        <span>{overrideLabel}</span>
      ) : (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          {prefixText && <span className="font-sans text-xs font-semibold opacity-80">{prefixText}</span>}
          <span>{formatClock(timerSeconds)}</span>
          {mode === "exam" && typeof capSeconds === "number" && (
            <span className="text-xs opacity-60 font-normal">/ {formatClock(capSeconds)}</span>
          )}
        </span>
      )}
    </div>
  );
}
