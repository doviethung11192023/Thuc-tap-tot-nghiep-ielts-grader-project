"use client";

import React, { useState } from "react";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";

interface MultipleChoiceAnswerEditorProps {
  options: string[];
  onOptionsChange: (options: string[]) => void;
  acceptedAnswers: string;
  onAcceptedAnswersChange: (val: string) => void;
  evidence: string;
  onEvidenceChange: (val: string) => void;
  explanation: string;
  onExplanationChange: (val: string) => void;
}

export function MultipleChoiceAnswerEditor({
  options,
  onOptionsChange,
  acceptedAnswers,
  onAcceptedAnswersChange,
  evidence,
  onEvidenceChange,
  explanation,
  onExplanationChange,
}: MultipleChoiceAnswerEditorProps) {
  const [isMultiSelect, setIsMultiSelect] = useState<boolean>(() => acceptedAnswers.includes(","));

  const currentSelectedLetters = acceptedAnswers
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const handleToggleOption = (letter: string) => {
    if (isMultiSelect) {
      const next = currentSelectedLetters.includes(letter)
        ? currentSelectedLetters.filter((l) => l !== letter)
        : [...currentSelectedLetters, letter].sort();
      onAcceptedAnswersChange(next.join(", "));
    } else {
      onAcceptedAnswersChange(letter);
    }
  };

  const handleAddOption = () => {
    onOptionsChange([...options, ""]);
  };

  const handleUpdateOption = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    onOptionsChange(next);
  };

  const handleRemoveOption = (idx: number) => {
    const letter = String.fromCharCode(65 + idx);
    onOptionsChange(options.filter((_, i) => i !== idx));
    onAcceptedAnswersChange(
      currentSelectedLetters.filter((l) => l !== letter).join(", ")
    );
  };

  return (
    <div className="space-y-3.5 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
        <span className="font-bold text-zinc-800">
          Danh sách lựa chọn (Tích tròn/vuông để chọn đáp án đúng):
        </span>
        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-zinc-600">
          <input
            type="checkbox"
            checked={isMultiSelect}
            onChange={(e) => setIsMultiSelect(e.target.checked)}
            className="rounded border-zinc-300 text-[#932120] focus:ring-[#932120]"
          />
          <span>Nhiều đáp án đúng</span>
        </label>
      </div>

      <div className="space-y-2">
        {options.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isCorrect = currentSelectedLetters.includes(letter);

          return (
            <div
              key={idx}
              className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                isCorrect
                  ? "bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400"
                  : "bg-white border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggleOption(letter)}
                className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center transition-colors cursor-pointer ${
                  isCorrect
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
                title="Bấm để đánh dấu đáp án đúng"
              >
                {letter}
              </button>

              <input
                type="text"
                value={opt}
                onChange={(e) => handleUpdateOption(idx, e.target.value)}
                placeholder={`Nội dung lựa chọn ${letter}...`}
                className="flex-1 px-2.5 py-1.5 bg-transparent border-0 focus:outline-none focus:ring-0 text-xs font-medium text-zinc-800"
              />

              {isCorrect && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đúng
                </span>
              )}

              <button
                type="button"
                onClick={() => handleRemoveOption(idx)}
                className="p-1 text-zinc-400 hover:text-red-600 rounded cursor-pointer"
                title="Xóa lựa chọn"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={handleAddOption}
          className="w-full py-2 bg-white border border-dashed border-zinc-300 hover:border-[#932120] text-[#932120] rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm phương án ({String.fromCharCode(65 + options.length)})
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-600">
          Đáp án đúng ghi nhận:
        </label>
        <input
          type="text"
          value={acceptedAnswers}
          onChange={(e) => onAcceptedAnswersChange(e.target.value)}
          placeholder="VD: B hoặc A, C"
          className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white font-mono font-bold text-emerald-700 focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-600">Đoạn dẫn chứng (Evidence):</label>
        <textarea
          rows={2}
          value={evidence}
          onChange={(e) => onEvidenceChange(e.target.value)}
          placeholder="Trích dẫn câu văn trong bài đọc hoặc audio script chứng minh..."
          className="w-full p-2 border border-zinc-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-600">Lời giải chi tiết 4 bước:</label>
        <textarea
          rows={3}
          value={explanation}
          onChange={(e) => onExplanationChange(e.target.value)}
          placeholder="B1: Đọc câu hỏi & xác định từ khóa...&#10;B2: Định vị thông tin...&#10;B3: Loại trừ phương án sai...&#10;B4: Chọn đáp án..."
          className="w-full p-2 border border-zinc-300 rounded-lg bg-white font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>
    </div>
  );
}
