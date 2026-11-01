"use client";

import React, { useState } from "react";
import { BookOpen, Award, FileText } from "lucide-react";

interface WritingModelAnswerEditorProps {
  explanation: string;
  onExplanationChange: (val: string) => void;
  evidence: string;
  onEvidenceChange: (val: string) => void;
  onAcceptedAnswersChange: (val: string) => void;
  taskType?: "task1" | "task2";
}

export function WritingModelAnswerEditor({
  explanation,
  onExplanationChange,
  evidence,
  onEvidenceChange,
  onAcceptedAnswersChange,
  taskType = "task2",
}: WritingModelAnswerEditorProps) {
  const [modelEssay, setModelEssay] = useState(() => explanation || "");
  const [outline, setOutline] = useState(() => evidence || "");

  const wordsCount = modelEssay
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const minTargetWords = taskType === "task1" ? 150 : 250;
  const isSufficientWords = wordsCount >= minTargetWords;

  const handleEssayChange = (text: string) => {
    setModelEssay(text);
    onExplanationChange(text);
    onAcceptedAnswersChange("BAND_8_MODEL_ESSAY");
  };

  const handleOutlineChange = (text: string) => {
    setOutline(text);
    onEvidenceChange(text);
  };

  return (
    <div className="space-y-3.5 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
        <span className="font-bold text-zinc-800 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-[#932120]" />
          Soạn Bài Mẫu Band 8.0+ & Dàn Ý Phân Tích (Writing {taskType === "task1" ? "Task 1" : "Task 2"}):
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
            isSufficientWords
              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
              : "bg-amber-100 text-amber-800 border border-amber-300"
          }`}
        >
          {wordsCount} từ / tối thiểu {minTargetWords} từ
        </span>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-700 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-zinc-500" />
          Bài viết mẫu tham khảo (Model Essay Band 8.0 - 9.0):
        </label>
        <textarea
          rows={7}
          value={modelEssay}
          onChange={(e) => handleEssayChange(e.target.value)}
          placeholder={
            taskType === "task1"
              ? "The chart illustrates... Overall, it is clear that... In terms of the first category..."
              : "In recent years, the debate surrounding... has gained significant traction. While some argue that..., I firmly believe that..."
          }
          className="w-full p-3 border border-zinc-300 rounded-xl bg-white font-serif leading-relaxed text-xs focus:outline-none focus:ring-2 focus:ring-[#932120]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-700 flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
          Dàn ý phân tích (Outline & Key Arguments) & Từ vựng ăn điểm:
        </label>
        <textarea
          rows={3}
          value={outline}
          onChange={(e) => handleOutlineChange(e.target.value)}
          placeholder="Mở bài (Intro): Paraphrase đề bài&#10;Tổng quan (Overview): Điểm nổi bật nhất&#10;Thân bài 1: Luận điểm 1 + dẫn chứng&#10;Thân bài 2: Luận điểm 2 + phản biện&#10;Từ vựng ghi điểm: substantially increase, exponential growth..."
          className="w-full p-2.5 border border-zinc-300 rounded-xl bg-white font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>
    </div>
  );
}
