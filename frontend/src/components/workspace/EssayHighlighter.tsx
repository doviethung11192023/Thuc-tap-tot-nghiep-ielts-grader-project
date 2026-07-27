"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { InlineAnnotation } from "./dummy_data";

interface EssayHighlighterProps {
  content: string;
  annotations: InlineAnnotation[];
  onAnnotationClick?: (annotation: InlineAnnotation) => void;
  activeAnnotationId?: string | null;
  activeCategoryFilter?: string | null;
}

// ────────────────────────────────────────────────────────────
// ALGORITHM: Slice text into chunks based on position_start/end
// ────────────────────────────────────────────────────────────
interface Chunk {
  text: string;
  annotation: InlineAnnotation | null;
  start: number;
  end: number;
}

function buildChunks(content: string, annotations: InlineAnnotation[]): Chunk[] {
  if (!annotations.length) {
    return [{ text: content, annotation: null, start: 0, end: content.length }];
  }

  // Handle overlaps: Prioritize smaller ranges (more specific), then by type priority
  const PRIORITY: Record<InlineAnnotation["type"], number> = {
    error: 4,
    logic_issue: 3,
    upgrade: 2,
    strength: 1,
  };

  const sorted = [...annotations]
    .filter((a) => a.position_start >= 0 && a.position_end <= content.length && a.position_start < a.position_end)
    .sort((a, b) => {
      if (a.position_start !== b.position_start) return a.position_start - b.position_start;
      const lenA = a.position_end - a.position_start;
      const lenB = a.position_end - a.position_start;
      if (lenA !== lenB) return lenA - lenB; // Smaller range wins
      return PRIORITY[b.type] - PRIORITY[a.type];
    });

  const merged: InlineAnnotation[] = [];
  let cursor = 0;
  for (const a of sorted) {
    if (a.position_start >= cursor) {
      merged.push(a);
      cursor = a.position_end;
    }
  }

  const chunks: Chunk[] = [];
  let pos = 0;

  for (const a of merged) {
    if (pos < a.position_start) {
      chunks.push({
        text: content.slice(pos, a.position_start),
        annotation: null,
        start: pos,
        end: a.position_start,
      });
    }
    chunks.push({
      text: content.slice(a.position_start, a.position_end),
      annotation: a,
      start: a.position_start,
      end: a.position_end,
    });
    pos = a.position_end;
  }

  if (pos < content.length) {
    chunks.push({
      text: content.slice(pos),
      annotation: null,
      start: pos,
      end: content.length,
    });
  }

  return chunks;
}

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────
export function EssayHighlighter({
  content,
  annotations,
  onAnnotationClick,
  activeAnnotationId,
  activeCategoryFilter,
}: EssayHighlighterProps) {
  const filteredAnnotations = activeCategoryFilter
    ? annotations.filter((a) => a.category === activeCategoryFilter)
    : annotations;

  const chunks = buildChunks(content, filteredAnnotations);

  return (
    <div className="relative">
      <p className="text-zinc-800 text-[15px] leading-[1.9] whitespace-pre-wrap font-sans">
        {chunks.map((chunk, i) => {
          if (!chunk.annotation) {
            return <span key={i}>{chunk.text}</span>;
          }

          const ann = chunk.annotation;
          const isActive = activeAnnotationId === ann.id;

          // 4 Tones Design
          let styleClass = "";
          switch (ann.type) {
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
              onClick={() => onAnnotationClick?.(ann)}
              className={[
                "cursor-pointer rounded-sm transition-all duration-200 px-0.5",
                styleClass,
                isActive ? "ring-2 ring-offset-2 ring-zinc-400 shadow-sm brightness-95" : "hover:brightness-95",
              ].join(" ")}
              title={ann.title || "Nhấn để xem chi tiết"}
            >
              {chunk.text}
            </span>
          );
        })}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// LEGEND
// ────────────────────────────────────────────────────────────
export function HighlightLegend() {
  const items = [
    { bg: "bg-red-100", border: "border-red-400", text: "text-red-700", label: "Lỗi cần sửa" },
    { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-800", label: "Lập luận / Logic" },
    { bg: "bg-purple-50 border-dotted", border: "border-purple-500", text: "text-purple-700", label: "Nâng cấp từ vựng" },
    { bg: "bg-green-100", border: "border-green-400", text: "text-green-800", label: "Điểm sáng" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${item.bg} ${item.border} ${item.text}`}
        >
          <span className={`w-2 h-2 rounded-full ${item.bg} border ${item.border}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
