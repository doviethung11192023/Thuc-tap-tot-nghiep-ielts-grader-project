"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { InlineAnnotation } from "@/types";

interface EssayHighlighterProps {
  content: string;
  annotations: InlineAnnotation[];
  onAnnotationClick?: (annotation: InlineAnnotation) => void;
  activeAnnotationId?: string | null;
  activeCategoryFilter?: string | null;
  activeTypes?: string[];
}

// ────────────────────────────────────────────────────────────
// ALGORITHM: Slice text into chunks based on position_start/end
// ────────────────────────────────────────────────────────────
interface Chunk {
  text: string;
  annotations: InlineAnnotation[];
  start: number;
  end: number;
}

function buildChunks(content: string, annotations: InlineAnnotation[]): Chunk[] {
  if (!annotations.length) {
    return [{ text: content, annotations: [], start: 0, end: content.length }];
  }

  // 1. Collect all unique boundaries
  const boundaries = new Set<number>();
  boundaries.add(0);
  boundaries.add(content.length);

  for (const a of annotations) {
    if (a.position_start >= 0 && a.position_end <= content.length && a.position_start < a.position_end) {
      boundaries.add(a.position_start);
      boundaries.add(a.position_end);
    }
  }

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
  const chunks: Chunk[] = [];

  // Priority for sorting when multiple annotations overlap
  const PRIORITY: Record<InlineAnnotation["type"], number> = {
    error: 4,
    logic_issue: 3,
    upgrade: 2,
    strength: 1,
  };

  // 2. Build chunks between adjacent boundaries
  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const start = sortedBoundaries[i];
    const end = sortedBoundaries[i + 1];

    if (start === end) continue;

    // Find all annotations that cover this exact chunk
    const activeAnns = annotations.filter(
      (a) => a.position_start <= start && a.position_end >= end
    );

    // Sort activeAnns so the highest priority (or smaller range) is first
    activeAnns.sort((a, b) => {
      const lenA = a.position_end - a.position_start;
      const lenB = b.position_end - b.position_start;
      if (lenA !== lenB) return lenA - lenB; // Smaller range wins
      return PRIORITY[b.type] - PRIORITY[a.type];
    });

    chunks.push({
      text: content.slice(start, end),
      annotations: activeAnns,
      start,
      end,
    });
  }

  return chunks;
}

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────
export const EssayHighlighter = React.memo(function EssayHighlighter({
  content,
  annotations,
  onAnnotationClick,
  activeAnnotationId,
  activeCategoryFilter,
  activeTypes = ['error', 'logic_issue', 'upgrade', 'strength'],
}: EssayHighlighterProps) {
  const filteredAnnotations = annotations.filter((a) => {
    if (activeCategoryFilter && a.category !== activeCategoryFilter) return false;
    if (!activeTypes.includes(a.type)) return false;
    return true;
  });

  const chunks = useMemo(
    () => buildChunks(content, filteredAnnotations),
    [content, filteredAnnotations]
  );

  return (
    <div className="relative">
      <p className="text-zinc-800 text-[15px] leading-[1.9] whitespace-pre-wrap font-sans">
        {chunks.map((chunk, i) => {
          if (chunk.annotations.length === 0) {
            return <span key={i}>{chunk.text}</span>;
          }

          // Check if ANY annotation in this chunk is currently active in the sidebar
          const activeAnn = chunk.annotations.find((a) => a.id === activeAnnotationId);
          const isAnyActive = !!activeAnn;

          // Primary annotation for styling (if an overlapping one is active, use it; otherwise use the highest priority one)
          const primaryAnn = activeAnn || chunk.annotations[0];

          // 4 Tones Design
          let styleClass = "";
          switch (primaryAnn.type) {
            case "error":
              styleClass = "bg-red-100 text-red-900 border-b-2 border-red-200";
              break;
            case "logic_issue":
              styleClass = "bg-orange-100 text-orange-900 border-b-2 border-orange-200";
              break;
            case "strength":
              styleClass = "bg-green-100 text-green-900 border-b-2 border-green-200";
              break;
            case "upgrade":
              styleClass = "border-b-2 border-dotted border-purple-500 font-medium text-purple-900 bg-purple-50/30";
              break;
          }

          return (
            <span
              key={i}
              onClick={() => onAnnotationClick?.(primaryAnn)}
              className={[
                "cursor-pointer rounded-sm transition-all duration-200 px-0.5",
                styleClass,
                isAnyActive ? "ring-2 ring-offset-2 ring-zinc-400 shadow-sm brightness-95" : "hover:brightness-95",
                chunk.annotations.length > 1 && !isAnyActive ? "border-b-[3px]" : "" // Visual hint for multiple overlaps
              ].join(" ")}
              title={chunk.annotations.map(a => `[${a.type.toUpperCase()}] ${a.title || 'Nhận xét'}`).join('\n──────────\n')}
            >
              {chunk.text}
            </span>
          );
        })}
      </p>
    </div>
  );
});

// ────────────────────────────────────────────────────────────
// LEGEND
// ────────────────────────────────────────────────────────────
export const HighlightLegend = React.memo(function HighlightLegend({
  activeTypes = ['error', 'logic_issue', 'upgrade', 'strength'],
  onTypesChange
}: {
  activeTypes?: string[];
  onTypesChange?: (types: string[]) => void;
}) {
  const items = [
    { type: "error", bg: "bg-red-100", border: "border-red-400", text: "text-red-700", label: "Lỗi cần sửa" },
    { type: "logic_issue", bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-800", label: "Lập luận / Logic" },
    { type: "upgrade", bg: "bg-purple-50 border-dotted", border: "border-purple-500", text: "text-purple-700", label: "Nâng cấp từ vựng" },
    { type: "strength", bg: "bg-green-100", border: "border-green-400", text: "text-green-800", label: "Điểm sáng" },
  ];

  const handleToggle = (type: string) => {
    if (!onTypesChange) return;
    if (activeTypes.includes(type)) {
      onTypesChange(activeTypes.filter(t => t !== type));
    } else {
      onTypesChange([...activeTypes, type]);
    }
  };

  const isAllActive = activeTypes.length === items.length;
  const toggleAll = () => {
    if (!onTypesChange) return;
    if (isAllActive) {
      onTypesChange([]); // Deselect all
    } else {
      onTypesChange(items.map(i => i.type)); // Select all
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        onClick={toggleAll}
        className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all duration-200 ${isAllActive ? "bg-zinc-800 text-white border-zinc-800" : "bg-white text-zinc-500 border-zinc-300 hover:bg-zinc-100"} `}
      >
        Tất cả
      </button>
      <div className="w-[1px] h-4 bg-zinc-300 mx-1"></div>

      {items.map((item) => {
        const isActive = activeTypes.includes(item.type);
        return (
          <button
            key={item.label}
            onClick={() => handleToggle(item.type)}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-all duration-200 hover:brightness-95 ${item.bg} ${item.border} ${item.text} ${!isActive ? "opacity-40 grayscale" : ""}`}
          >
            <span className={`w-2 h-2 rounded-full ${item.bg} border ${item.border}`} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
});
