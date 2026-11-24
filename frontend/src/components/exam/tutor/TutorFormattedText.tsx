"use client";

import React from "react";
import { MapPin } from "lucide-react";

const PARA_TAG_REGEX = /(\*{0,2}\[(?:Đoạn|Paragraph)\s+([A-H1-9])\]\*{0,2})/gi;

function renderFormattedLine(
  line: string,
  enableHighlight: boolean,
  onHighlight?: (p: string) => void
) {
  const parts = line.split(PARA_TAG_REGEX);
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    if (!seg) continue;
    const cleanTag = seg.replace(/^\*+|\*+$/g, "");
    if (/^\[(?:Đoạn|Paragraph)\s+[A-H1-9]\]$/i.test(cleanTag)) {
      const label = parts[i + 1]?.toUpperCase() || "A";
      i += 1;
      nodes.push(
        enableHighlight && onHighlight ? (
          <button
            key={`p-${i}`}
            type="button"
            onClick={() => onHighlight(label)}
            className="inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 text-[11px] font-bold transition-colors cursor-pointer align-baseline"
            title={`Highlight đoạn ${label}`}
          >
            <MapPin className="w-3 h-3" />
            {cleanTag.slice(1, -1)}
          </button>
        ) : (
          <span key={`p-${i}`} className="font-bold text-sky-700">{cleanTag}</span>
        )
      );
    } else {
      const boldSplit = seg.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
      boldSplit.forEach((b, idx) => {
        if (b.startsWith("**") && b.endsWith("**")) {
          nodes.push(<strong key={`b-${i}-${idx}`} className="font-bold text-zinc-900">{b.slice(2, -2)}</strong>);
        } else if (b.startsWith("*") && b.endsWith("*") && b.length > 2) {
          nodes.push(<em key={`e-${i}-${idx}`} className="italic text-zinc-800">{b.slice(1, -1)}</em>);
        } else {
          nodes.push(<React.Fragment key={`t-${i}-${idx}`}>{b}</React.Fragment>);
        }
      });
    }
  }
  return nodes;
}

export function TutorFormattedText({
  text,
  enableHighlight,
  onHighlight,
}: {
  text: string;
  enableHighlight: boolean;
  onHighlight?: (p: string) => void;
}) {
  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed text-zinc-700">
      {text.split("\n").map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        const isBullet = /^[-*•]\s+/.test(trimmed);
        return (
          <p key={idx} className={isBullet ? "pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-[#932120] before:font-bold" : ""}>
            {renderFormattedLine(isBullet ? trimmed.replace(/^[-*•]\s+/, "") : trimmed, enableHighlight, onHighlight)}
          </p>
        );
      })}
    </div>
  );
}
