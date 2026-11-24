"use client";

import React from "react";

const BLANK_RUN_RE = /_{3,}/g;
const INLINE_TOKEN_RE = /(\*\*[^*\n]+?\*\*|\*(?:[^\s*\n][^*\n]*[^\s*\n]|[^\s*\n])\*|_(?:[^\s_\n][^_\n]*[^\s_\n]|[^\s_\n])_)/g;
const BLANK_TOKEN_RE = /(\uE000B\d+\uE001)/g;

/**
 * Render Markdown nội tuyến an toàn cho giải thích IELTS (DATA-07):
 * - Bảo vệ chuỗi gạch chân ô trống `______` (`_{3,}`) khỏi bị cắt nhầm thành in nghiêng.
 * - Hỗ trợ `**đậm**`, `*nghiêng*`, và `_nghiêng_`, không vỡ `snake_case`.
 */
export function renderSafeInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  const blanks: string[] = [];
  const protectedText = text.replace(BLANK_RUN_RE, (match) => {
    const idx = blanks.length;
    blanks.push(match);
    return `\uE000B${idx}\uE001`;
  });

  const restoreBlanks = (segment: string, keyBase: string): React.ReactNode => {
    if (!segment.includes("\uE000B")) return segment;
    return segment.split(BLANK_TOKEN_RE).map((part, pIdx) => {
      const m = part.match(/^\uE000B(\d+)\uE001$/);
      if (!m) return <React.Fragment key={`${keyBase}-t-${pIdx}`}>{part}</React.Fragment>;
      return (
        <span
          key={`${keyBase}-b-${pIdx}`}
          className="font-mono tracking-tight text-zinc-800 whitespace-pre"
        >
          {blanks[Number(m[1])]}
        </span>
      );
    });
  };

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  INLINE_TOKEN_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = INLINE_TOKEN_RE.exec(protectedText)) !== null) {
    const token = match[0];
    const start = match.index;
    const end = start + token.length;

    if (token.startsWith("_")) {
      const prevChar = start > 0 ? protectedText[start - 1] : "";
      const nextChar = end < protectedText.length ? protectedText[end] : "";
      if (/[A-Za-z0-9]/.test(prevChar) || /[A-Za-z0-9]/.test(nextChar)) {
        continue;
      }
    }

    if (start > lastIndex) {
      nodes.push(
        <React.Fragment key={`p-${lastIndex}`}>
          {restoreBlanks(protectedText.slice(lastIndex, start), `p-${lastIndex}`)}
        </React.Fragment>
      );
    }

    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`s-${start}`} className="font-bold text-zinc-900">
          {restoreBlanks(token.slice(2, -2), `s-${start}`)}
        </strong>
      );
    } else {
      nodes.push(
        <em key={`e-${start}`} className="italic text-zinc-700 font-medium">
          {restoreBlanks(token.slice(1, -1), `e-${start}`)}
        </em>
      );
    }
    lastIndex = end;
  }

  if (lastIndex < protectedText.length) {
    nodes.push(
      <React.Fragment key={`tail-${lastIndex}`}>
        {restoreBlanks(protectedText.slice(lastIndex), `tail-${lastIndex}`)}
      </React.Fragment>
    );
  }

  return <>{nodes}</>;
}
