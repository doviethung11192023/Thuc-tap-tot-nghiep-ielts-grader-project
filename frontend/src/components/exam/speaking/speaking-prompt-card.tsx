"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, MessageSquareText } from "lucide-react";

export interface SpeakingTestSectionPrompt {
  part_number: number;
  title: string;
  questions: { id: string; order_no: number; prompt: string }[];
}

/** Tách "topic ... You should say: a / b / c" thành topic + danh sách gợi ý Part 2. */
export function splitSpeakingCueCard(prompt: string): { topic: string; bullet_points: string[] } {
  const marker = prompt.search(/you should say:?/i);
  if (marker < 0) return { topic: prompt.trim(), bullet_points: [] };
  const rest = prompt.slice(marker).replace(/you should say:?/i, "");
  return {
    topic: prompt.slice(0, marker).trim(),
    bullet_points: rest
      .split(/\n|•|;/)
      .map((line) => line.replace(/^[\s\-–]+/, "").trim())
      .filter(Boolean),
  };
}

export function SpeakingPromptDisplay({
  part,
  prompt,
  compact = false,
}: {
  part: number;
  prompt: string;
  compact?: boolean;
}) {
  if (part === 2) {
    const { topic, bullet_points } = splitSpeakingCueCard(prompt);
    return (
      <div className={`rounded-xl border border-blue-200 bg-blue-50/60 ${compact ? "p-3" : "p-4"} space-y-2`}>
        <p className="text-sm font-bold text-slate-900 leading-snug">{topic}</p>
        {bullet_points.length > 0 && (
          <div className="space-y-1 text-xs text-slate-700">
            <p className="font-semibold text-slate-800">You should say:</p>
            <ul className="space-y-1 pl-1">
              {bullet_points.map((bp, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold" aria-hidden="true">•</span>
                  <span>{bp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  return <p className="text-sm font-bold text-slate-800 leading-snug">{prompt}</p>;
}

export function SpeakingTestPromptsPanel({ sections }: { sections?: SpeakingTestSectionPrompt[] }) {
  const [open, setOpen] = useState(true);
  if (!sections || sections.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <MessageSquareText className="w-4 h-4 text-blue-600 shrink-0" />
          Đề bài Speaking ({sections.length} phần)
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100">
          {sections.map((sec) => (
            <div key={sec.part_number} className="space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
                {sec.title || `Part ${sec.part_number}`}
              </h3>
              <div className="space-y-2">
                {sec.questions.map((q, idx) => (
                  <div key={q.id || idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
                    {sec.part_number === 2 ? (
                      <SpeakingPromptDisplay part={2} prompt={q.prompt} compact />
                    ) : (
                      <p className="text-xs sm:text-sm text-slate-800 font-medium">
                        <span className="font-bold text-slate-500 mr-1.5">Q{idx + 1}.</span>
                        {q.prompt}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
