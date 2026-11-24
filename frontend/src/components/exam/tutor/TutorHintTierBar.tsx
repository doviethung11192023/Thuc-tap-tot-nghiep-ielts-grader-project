"use client";

import React from "react";
import { Layers } from "lucide-react";

interface Props {
  hintTier: 1 | 2 | 3;
  language: "vi" | "en";
  onChange: (tier: 1 | 2 | 3) => void;
}

const TIERS: { id: 1 | 2 | 3; vi: string; en: string }[] = [
  { id: 1, vi: "T1 · Định vị", en: "T1 · Locate" },
  { id: 2, vi: "T2 · Bẫy từ khóa", en: "T2 · Traps" },
  { id: 3, vi: "T3 · Chấm nháp", en: "T3 · Draft" },
];

export function TutorHintTierBar({ hintTier, language, onChange }: Props) {
  return (
    <div data-testid="ai-tutor-tier-bar" className="bg-zinc-50 border-b border-zinc-200 px-3 py-1.5 flex items-center gap-1.5 shrink-0">
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-500 shrink-0">
        <Layers className="w-3 h-3 text-[#932120]" />
        {language === "en" ? "Level:" : "Mức gợi ý:"}
      </span>
      <div className="flex flex-1 gap-1">
        {TIERS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
              hintTier === t.id
                ? "bg-[#932120] text-white shadow-2xs"
                : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {language === "en" ? t.en : t.vi}
          </button>
        ))}
      </div>
    </div>
  );
}
