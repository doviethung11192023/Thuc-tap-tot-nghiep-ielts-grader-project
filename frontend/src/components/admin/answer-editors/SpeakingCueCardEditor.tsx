"use client";

import React, { useState } from "react";
import { Mic, Lightbulb, Volume2, Plus, Trash2 } from "lucide-react";

interface SpeakingCueCardEditorProps {
  partType: "speaking_part1" | "speaking_part2" | "speaking_part3" | string;
  explanation: string;
  onExplanationChange: (val: string) => void;
  evidence: string;
  onEvidenceChange: (val: string) => void;
  onAcceptedAnswersChange: (val: string) => void;
  options: string[];
  onOptionsChange: (options: string[]) => void;
}

export function SpeakingCueCardEditor({
  partType,
  explanation,
  onExplanationChange,
  evidence,
  onEvidenceChange,
  onAcceptedAnswersChange,
  options,
  onOptionsChange,
}: SpeakingCueCardEditorProps) {
  const isPart2 = partType.includes("part2");

  const handleAddBulletPoint = () => {
    onOptionsChange([...options, ""]);
  };

  const handleUpdateBulletPoint = (idx: number, text: string) => {
    const next = [...options];
    next[idx] = text;
    onOptionsChange(next);
  };

  const handleRemoveBulletPoint = (idx: number) => {
    onOptionsChange(options.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3.5 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
        <span className="font-bold text-zinc-800 flex items-center gap-1.5">
          <Mic className="w-4 h-4 text-[#932120]" />
          Cấu hình Speaking ({isPart2 ? "Part 2 - Cue Card" : partType.includes("part1") ? "Part 1 - Phỏng vấn" : "Part 3 - Thảo luận"}):
        </span>
      </div>

      {isPart2 && (
        <div className="space-y-2 p-3 bg-white border border-zinc-200 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-zinc-700">
              Các gợi ý cho thí sinh (You should say - Bullet points):
            </label>
            <button
              type="button"
              onClick={handleAddBulletPoint}
              className="text-[#932120] font-bold text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Thêm gợi ý
            </button>
          </div>

          <div className="space-y-1.5">
            {options.map((bp, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-4 text-center font-bold text-zinc-400">•</span>
                <input
                  type="text"
                  value={bp}
                  onChange={(e) => handleUpdateBulletPoint(idx, e.target.value)}
                  placeholder="VD: What it was and when it happened..."
                  className="flex-1 px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#932120]"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveBulletPoint(idx)}
                  className="p-1 text-zinc-400 hover:text-red-600 rounded cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-700 flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          Ý tưởng trả lời & Từ vựng ăn điểm (Ideas & Collocations Band 8.0+):
        </label>
        <textarea
          rows={3}
          value={evidence}
          onChange={(e) => onEvidenceChange(e.target.value)}
          placeholder="Gợi ý cấu trúc trả lời: Trực tiếp trả lời -> Mở rộng lý do -> Đưa ví dụ cá nhân&#10;Từ vựng ghi điểm: once in a blue moon, broadens my horizons..."
          className="w-full p-2.5 border border-zinc-300 rounded-xl bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-700 flex items-center gap-1">
          <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
          Bài nói mẫu tham khảo (Sample Band 8.0 Transcript):
        </label>
        <textarea
          rows={5}
          value={explanation}
          onChange={(e) => {
            onExplanationChange(e.target.value);
            onAcceptedAnswersChange("BAND_8_SPEAKING_SAMPLE");
          }}
          placeholder="Well, speaking of..., the very first thing that comes to my mind is... It happened about two years ago when..."
          className="w-full p-2.5 border border-zinc-300 rounded-xl bg-white text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>
    </div>
  );
}
