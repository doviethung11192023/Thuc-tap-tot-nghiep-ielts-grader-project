"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { FileText, Play } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { CleanListeningSection, CleanListeningQuestion } from "@/types/clean-detail";
import { CleanListeningUtteranceCard } from "./CleanListeningUtteranceCard";

interface CleanListeningTranscriptPaneProps {
  currentSection: CleanListeningSection;
  currentSectionQuestions: CleanListeningQuestion[];
  activeQuestionNumber: number;
  highlightedEvidenceText: string | null;
  onSelectQuestion: (num: number) => void;
  onPlayAtTime: (seconds: number) => void;
}

const VIRTUALIZATION_THRESHOLD = 35;

// LS-02: Chuẩn hóa text để so khớp dẫn chứng chính xác, không bị lỗi do ngoặc kép hoặc dấu câu
function cleanTextForMatching(str: string): string {
  return (str || "")
    .replace(/^[^:]+:\s*/, "")
    .replace(/["'“”‘’«»]/g, "")
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getSpeakerBadge(role: string) {
  const cleanRole = (role || "").toLowerCase();
  if (cleanRole.includes("speaker 1") || cleanRole.includes("kelly")) {
    return {
      bg: "bg-amber-100 text-amber-900 border-amber-300",
      avatarBg: "bg-amber-600 text-white",
      label: "Speaker 1",
    };
  }
  if (cleanRole.includes("speaker 2") || cleanRole.includes("herbert")) {
    return {
      bg: "bg-teal-100 text-teal-900 border-teal-300",
      avatarBg: "bg-teal-600 text-white",
      label: "Speaker 2",
    };
  }
  return {
    bg: "bg-zinc-100 text-zinc-900 border-zinc-300",
    avatarBg: "bg-zinc-700 text-white",
    label: "Narrator",
  };
}

export function CleanListeningTranscriptPane({
  currentSection,
  currentSectionQuestions,
  activeQuestionNumber,
  highlightedEvidenceText,
  onSelectQuestion,
  onPlayAtTime,
}: CleanListeningTranscriptPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const utteranceRows = useMemo(() => {
    const list = currentSection.transcript_utterances || [];
    return list.map((u) => {
      const badge = getSpeakerBadge(u.role || u.speaker_name);
      const cleanUtterance = cleanTextForMatching(u.text);
      const matchingQuestions = currentSectionQuestions.filter((q) => {
        if (!q.evidence_text) return false;
        const cleanEvidence = cleanTextForMatching(q.evidence_text);
        if (!cleanEvidence) return false;
        if (cleanUtterance.includes(cleanEvidence) || cleanEvidence.includes(cleanUtterance)) return true;
        if (cleanEvidence.length >= 15 && cleanUtterance.includes(cleanEvidence.slice(0, 20))) return true;
        const words = cleanEvidence.split(" ").filter((w) => w.length > 2);
        return words.length >= 3 && cleanUtterance.includes(words.slice(0, 3).join(" "));
      });
      const isCurrentActive = matchingQuestions.some((q) => q.question_number === activeQuestionNumber);
      return { u, badge, matchingQuestions, isCurrentActive };
    });
  }, [currentSection.transcript_utterances, currentSectionQuestions, activeQuestionNumber]);

  const useVirtual = utteranceRows.length > VIRTUALIZATION_THRESHOLD;
  const activeUtteranceIdx = useMemo(() => utteranceRows.findIndex((r) => r.isCurrentActive), [utteranceRows]);

  const rowVirtualizer = useVirtualizer({
    count: useVirtual ? utteranceRows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 104,
    overscan: 6,
  });

  useEffect(() => {
    if (!scrollRef.current) return;
    if (useVirtual && activeUtteranceIdx >= 0) {
      rowVirtualizer.scrollToIndex(activeUtteranceIdx, { align: "center", behavior: "smooth" });
      return;
    }
    const activeEl =
      scrollRef.current.querySelector("#active-listening-evidence") ||
      scrollRef.current.querySelector("#active-listening-utterance");
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeQuestionNumber, highlightedEvidenceText, currentSection.section_number, useVirtual, activeUtteranceIdx, rowVirtualizer]);

  return (
    <div
      ref={scrollRef}
      className="w-1/2 h-full overflow-y-auto custom-scrollbar bg-[var(--ux-surface)] p-5 md:p-7 border-r border-[var(--ux-line)] space-y-4"
    >
      <div className="flex items-center justify-between border-b border-[var(--ux-line)] pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#932120]" />
          <h3 className="font-bold text-sm text-[var(--ux-ink)] uppercase tracking-wide">
            Bản ghi âm lời thoại ({currentSection.title})
          </h3>
        </div>
        <span className="text-xs text-[var(--ux-ink-2)] font-medium">
          Click vào mốc thời gian để phát âm thanh
        </span>
      </div>

      {utteranceRows.length > 0 ? (
        useVirtual ? (
          <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
            {rowVirtualizer.getVirtualItems().map((vItem) => {
              const row = utteranceRows[vItem.index];
              if (!row) return null;
              return (
                <div
                  key={row.u.id}
                  ref={rowVirtualizer.measureElement}
                  data-index={vItem.index}
                  className="absolute left-0 right-0 top-0 pb-4"
                  style={{ transform: `translateY(${vItem.start}px)` }}
                >
                  <CleanListeningUtteranceCard
                    utterance={row.u}
                    badge={row.badge}
                    matchingQuestions={row.matchingQuestions}
                    isCurrentActive={row.isCurrentActive}
                    activeQuestionNumber={activeQuestionNumber}
                    highlightedEvidenceText={highlightedEvidenceText}
                    currentSectionQuestions={currentSectionQuestions}
                    onSelectQuestion={onSelectQuestion}
                    onPlayAtTime={onPlayAtTime}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {utteranceRows.map((row) => (
              <CleanListeningUtteranceCard
                key={row.u.id}
                utterance={row.u}
                badge={row.badge}
                matchingQuestions={row.matchingQuestions}
                isCurrentActive={row.isCurrentActive}
                activeQuestionNumber={activeQuestionNumber}
                highlightedEvidenceText={highlightedEvidenceText}
                currentSectionQuestions={currentSectionQuestions}
                onSelectQuestion={onSelectQuestion}
                onPlayAtTime={onPlayAtTime}
              />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-3.5">
          {currentSectionQuestions.map((q) => {
            if (!q.evidence_text) return null;
            const isActive = q.question_number === activeQuestionNumber;
            return (
              <div
                key={q.id}
                id={isActive ? "active-listening-evidence" : undefined}
                className={`p-3.5 rounded-xl border text-xs sm:text-sm transition-all ${
                  isActive
                    ? "border-amber-400 bg-amber-50/70 shadow-sm"
                    : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-zinc-900">Dẫn chứng Câu {q.question_number}</span>
                  <button
                    type="button"
                    onClick={() => onPlayAtTime(0)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#932120] bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Nghe</span>
                  </button>
                </div>
                <p className="text-zinc-700 leading-relaxed italic">&ldquo;{q.evidence_text}&rdquo;</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
