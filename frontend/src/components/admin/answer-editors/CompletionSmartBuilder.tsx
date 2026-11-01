"use client";

import React, { useState } from "react";
import { Sparkles, HelpCircle, Plus, Trash2 } from "lucide-react";

interface CompletionSmartBuilderProps {
  prompt: string;
  onPromptChange: (val: string) => void;
  acceptedAnswers: string;
  onAcceptedAnswersChange: (val: string) => void;
  maxWords?: number;
  onMaxWordsChange: (val: number | undefined) => void;
  evidence: string;
  onEvidenceChange: (val: string) => void;
  explanation: string;
  onExplanationChange: (val: string) => void;
}

export function CompletionSmartBuilder({
  prompt,
  onPromptChange,
  acceptedAnswers,
  onAcceptedAnswersChange,
  maxWords,
  onMaxWordsChange,
  evidence,
  onEvidenceChange,
  explanation,
  onExplanationChange,
}: CompletionSmartBuilderProps) {
  const [blankSnippet, setBlankSnippet] = useState("");

  const WORD_LIMIT_RULES = [
    { value: 1, label: "ONE WORD ONLY (Tối đa 1 từ)" },
    { value: 2, label: "NO MORE THAN TWO WORDS (Tối đa 2 từ)" },
    { value: 3, label: "NO MORE THAN THREE WORDS AND/OR A NUMBER" },
  ];

  const handleAutoExtract = () => {
    if (!blankSnippet.trim()) return;
    const match = blankSnippet.match(/\[(?:(\d+):)?\s*([^\]]+)\]/);
    if (match) {
      const rawAns = match[2];
      const parsedList = rawAns.split(/[/|,]/).map((s) => s.trim()).filter(Boolean);
      onAcceptedAnswersChange(parsedList.join(", "));
      if (!prompt.trim()) {
        const cleanedPrompt = blankSnippet.replace(/\[(?:(\d+):)?\s*[^\]]+\]/, "[...]");
        onPromptChange(cleanedPrompt);
      }
    } else {
      alert("Cú pháp mẫu: [1: R242 / r 242] hoặc [89.99 / eighty nine]");
    }
  };

  const answerItems = acceptedAnswers.split(",").map((s) => s.trim()).filter(Boolean);

  const handleAddAlternate = () => {
    const next = prompt_user_input("Nhập thêm đáp án đồng nghĩa / cách viết khác:");
    if (next && next.trim()) {
      onAcceptedAnswersChange([...answerItems, next.trim()].join(", "));
    }
  };

  const handleRemoveAnswerItem = (idx: number) => {
    const filtered = answerItems.filter((_, i) => i !== idx);
    onAcceptedAnswersChange(filtered.join(", "));
  };

  function prompt_user_input(msg: string): string | null {
    if (typeof window !== "undefined") return window.prompt(msg);
    return null;
  }

  return (
    <div className="space-y-3.5 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
      <div className="p-3 bg-red-50/60 border border-red-200/60 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[#932120] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#932120]" />
            Bóc tách ô trống thông minh (Smart Blank Extractor):
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">VD: [1: R242 / r 242]</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={blankSnippet}
            onChange={(e) => setBlankSnippet(e.target.value)}
            placeholder="Dán câu có ô trống ví dụ: Model Number: [1: R242 / r 242]"
            className="flex-1 px-3 py-1.5 border border-zinc-300 rounded-lg bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#932120]"
          />
          <button
            type="button"
            onClick={handleAutoExtract}
            className="px-3 py-1.5 bg-[#932120] hover:bg-[#7a1a19] text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer shrink-0"
          >
            Trích xuất
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-700">Giới hạn số từ cho phép điền:</label>
        <select
          value={maxWords || 2}
          onChange={(e) => onMaxWordsChange(parseInt(e.target.value) || undefined)}
          className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#932120]"
        >
          {WORD_LIMIT_RULES.map((rule) => (
            <option key={rule.value} value={rule.value}>
              {rule.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-zinc-700">
            Danh sách đáp án chấp nhận (Hệ thống chấm đúng nếu khớp 1 trong các đáp án này):
          </label>
          <button
            type="button"
            onClick={handleAddAlternate}
            className="text-[11px] font-bold text-[#932120] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Thêm biến thể
          </button>
        </div>

        {answerItems.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {answerItems.map((ans, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800 font-bold text-xs"
              >
                <span>{ans}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAnswerItem(idx)}
                  className="hover:text-red-600 cursor-pointer"
                  title="Xóa biến thể này"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-zinc-400 italic">Chưa có đáp án nào được nhập.</p>
        )}

        <input
          type="text"
          value={acceptedAnswers}
          onChange={(e) => onAcceptedAnswersChange(e.target.value)}
          placeholder="Nhập trực tiếp các đáp án cách nhau bằng dấu phẩy: R242, r 242, model r242"
          className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-600">Đoạn dẫn chứng (Evidence):</label>
        <textarea
          rows={2}
          value={evidence}
          onChange={(e) => onEvidenceChange(e.target.value)}
          placeholder="Trích dẫn đoạn văn hoặc audio transcript chứng minh..."
          className="w-full p-2 border border-zinc-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-600">Lời giải chi tiết 4 bước:</label>
        <textarea
          rows={3}
          value={explanation}
          onChange={(e) => onExplanationChange(e.target.value)}
          placeholder="B1: Đọc nhãn ô trống...&#10;B2: Bắt keyword từ audio/bài đọc...&#10;B3: Kiểm tra ngữ pháp & giới hạn từ...&#10;B4: Điền từ chính xác..."
          className="w-full p-2 border border-zinc-300 rounded-lg bg-white font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>
    </div>
  );
}
