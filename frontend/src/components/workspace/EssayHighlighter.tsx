"use client";

import React, { useState, useCallback } from "react";

// ────────────────────────────────────────────────────────────
// TYPE DEFINITIONS — khớp với mock_essays.json
// ────────────────────────────────────────────────────────────
export interface Highlight {
  id: string;
  type: "grammar_error" | "thesis" | "main_idea" | "supporting";
  text?: string;
  original_text?: string;
  corrected_text?: string;
  explanation: string;
  label?: string;
  position_start: number;
  position_end: number;
  severity?: "minor" | "major" | "critical";
  bg_class: string;
  border_class: string;
  text_class: string;
}

interface Props {
  content: string;
  highlights: Highlight[];
}

// ────────────────────────────────────────────────────────────
// CORE ALGORITHM: cắt text thành chunks theo position
// ────────────────────────────────────────────────────────────
interface Chunk {
  text: string;
  highlight: Highlight | null;
  start: number;
  end: number;
}

function buildChunks(content: string, highlights: Highlight[]): Chunk[] {
  if (!highlights.length) {
    return [{ text: content, highlight: null, start: 0, end: content.length }];
  }

  // Bước 1: Giải quyết overlap — nếu 2 highlight đè lên nhau,
  // ưu tiên: grammar_error > thesis > main_idea > supporting
  const PRIORITY: Record<Highlight["type"], number> = {
    grammar_error: 4,
    thesis: 3,
    main_idea: 2,
    supporting: 1,
  };

  // Sắp xếp theo start, sau đó theo priority (cao hơn ưu tiên hơn)
  const sorted = [...highlights]
    .filter(
      (h) =>
        h.position_start >= 0 &&
        h.position_end <= content.length &&
        h.position_start < h.position_end
    )
    .sort((a, b) =>
      a.position_start !== b.position_start
        ? a.position_start - b.position_start
        : PRIORITY[b.type] - PRIORITY[a.type]
    );

  // Bước 2: Loại bỏ overlap — giữ highlight ưu tiên cao hơn
  const merged: Highlight[] = [];
  let cursor = 0;
  for (const h of sorted) {
    if (h.position_start >= cursor) {
      merged.push(h);
      cursor = h.position_end;
    }
    // Nếu position_start < cursor → overlap → bỏ qua
  }

  // Bước 3: Tạo chunks
  const chunks: Chunk[] = [];
  let pos = 0;

  for (const h of merged) {
    // Text bình thường trước highlight
    if (pos < h.position_start) {
      chunks.push({
        text: content.slice(pos, h.position_start),
        highlight: null,
        start: pos,
        end: h.position_start,
      });
    }
    // Chunk highlight
    chunks.push({
      text: content.slice(h.position_start, h.position_end),
      highlight: h,
      start: h.position_start,
      end: h.position_end,
    });
    pos = h.position_end;
  }

  // Text còn lại sau highlight cuối
  if (pos < content.length) {
    chunks.push({
      text: content.slice(pos),
      highlight: null,
      start: pos,
      end: content.length,
    });
  }

  return chunks;
}

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────
export function EssayHighlighter({ content, highlights }: Props) {
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);

  const chunks = buildChunks(content, highlights);

  const handleClick = useCallback((h: Highlight) => {
    setActiveHighlight((prev) => (prev?.id === h.id ? null : h));
  }, []);

  return (
    <div className="relative">
      {/* Bài viết với màu sắc */}
      <p className="text-zinc-800 text-[15px] leading-[1.9] whitespace-pre-wrap font-sans">
        {chunks.map((chunk, i) => {
          if (!chunk.highlight) {
            return <span key={i}>{chunk.text}</span>;
          }

          const h = chunk.highlight;
          const isActive = activeHighlight?.id === h.id;

          return (
            <span
              key={i}
              onClick={() => handleClick(h)}
              className={[
                "cursor-pointer rounded px-0.5 py-[1px] border-b-2 transition-all duration-150",
                h.bg_class,
                h.border_class,
                h.text_class,
                isActive ? "ring-2 ring-offset-1 ring-zinc-400 shadow-sm" : "hover:brightness-95",
              ].join(" ")}
              title={h.explanation}
            >
              {chunk.text}
            </span>
          );
        })}
      </p>

      {/* Popup tooltip khi click */}
      {activeHighlight && (
        <HighlightPopup
          highlight={activeHighlight}
          onClose={() => setActiveHighlight(null)}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// POPUP — hiện khi click vào highlight
// ────────────────────────────────────────────────────────────
function HighlightPopup({
  highlight: h,
  onClose,
}: {
  highlight: Highlight;
  onClose: () => void;
}) {
  const isError = h.type === "grammar_error";
  const displayText = h.original_text || h.text || "";
  const corrected = h.corrected_text;

  // Badge color theo type
  const typeBadge: Record<Highlight["type"], { label: string; cls: string }> = {
    grammar_error: { label: "Grammar Error", cls: "bg-red-100 text-red-700" },
    thesis: { label: "Thesis", cls: "bg-blue-100 text-blue-700" },
    main_idea: { label: "Main Idea", cls: "bg-green-100 text-green-700" },
    supporting: { label: "Supporting", cls: "bg-yellow-100 text-yellow-700" },
  };
  const badge = typeBadge[h.type];

  return (
    <div className="mt-3 p-4 bg-white border border-zinc-200 rounded-xl shadow-lg text-sm space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded ${badge.cls}`}>
          {h.label || badge.label}
        </span>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 text-xs font-bold px-1"
        >
          ✕
        </button>
      </div>

      {/* Hiển thị lỗi → gợi ý sửa */}
      {isError && displayText && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="line-through text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded">
            {displayText}
          </span>
          {corrected && (
            <>
              <span className="text-zinc-400">→</span>
              <span className="text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded">
                {corrected}
              </span>
            </>
          )}
        </div>
      )}

      {/* Explanation */}
      <p className="text-zinc-600 leading-relaxed">{h.explanation}</p>

      {/* Severity badge nếu là lỗi */}
      {h.severity && (
        <span
          className={[
            "inline-block text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded",
            h.severity === "minor"
              ? "bg-yellow-50 text-yellow-600"
              : h.severity === "critical"
              ? "bg-red-100 text-red-700"
              : "bg-orange-50 text-orange-600",
          ].join(" ")}
        >
          {h.severity} severity
        </span>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// LEGEND — chú thích màu sắc (dùng ở sidebar)
// ────────────────────────────────────────────────────────────
export function HighlightLegend() {
  const items = [
    { bg: "bg-red-100", border: "border-red-400", text: "text-red-700", label: "Grammar / Spelling error" },
    { bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-800", label: "Thesis" },
    { bg: "bg-green-100", border: "border-green-400", text: "text-green-800", label: "Main Idea" },
    { bg: "bg-yellow-100", border: "border-yellow-400", text: "text-yellow-800", label: "Supporting Idea" },
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
