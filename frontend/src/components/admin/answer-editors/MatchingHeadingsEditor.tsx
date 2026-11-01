"use client";

import React, { useState } from "react";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";

interface MatchingHeadingsEditorProps {
  acceptedAnswers: string;
  onAcceptedAnswersChange: (val: string) => void;
  options: string[];
  onOptionsChange: (options: string[]) => void;
  evidence: string;
  onEvidenceChange: (val: string) => void;
  explanation: string;
  onExplanationChange: (val: string) => void;
}

const DEFAULT_ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];

export function MatchingHeadingsEditor({
  acceptedAnswers,
  onAcceptedAnswersChange,
  options,
  onOptionsChange,
  evidence,
  onEvidenceChange,
  explanation,
  onExplanationChange,
}: MatchingHeadingsEditorProps) {
  const currentSelection = acceptedAnswers.trim().toLowerCase();

  const handleAddHeading = () => {
    onOptionsChange([...options, ""]);
  };

  const handleUpdateHeading = (idx: number, text: string) => {
    const next = [...options];
    next[idx] = text;
    onOptionsChange(next);
  };

  const handleRemoveHeading = (idx: number) => {
    const roman = DEFAULT_ROMAN[idx] || `${idx + 1}`;
    onOptionsChange(options.filter((_, i) => i !== idx));
    if (currentSelection === roman) {
      onAcceptedAnswersChange("");
    }
  };

  return (
    <div className="space-y-3.5 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
        <span className="font-bold text-zinc-800">
          Danh sách Tiêu đề (List of Headings) & Chọn đáp án nối:
        </span>
        <button
          type="button"
          onClick={handleAddHeading}
          className="text-[#932120] font-bold hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm tiêu đề
        </button>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {options.map((headingText, idx) => {
          const roman = DEFAULT_ROMAN[idx] || `${idx + 1}`;
          const isSelected = currentSelection === roman;

          return (
            <div
              key={idx}
              className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                isSelected
                  ? "bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400"
                  : "bg-white border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <button
                type="button"
                onClick={() => onAcceptedAnswersChange(roman)}
                className={`w-7 h-7 rounded-lg font-bold font-serif text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
                title="Bấm để chọn tiêu đề này làm đáp án"
              >
                {roman}
              </button>

              <input
                type="text"
                value={headingText}
                onChange={(e) => handleUpdateHeading(idx, e.target.value)}
                placeholder={`Nội dung tiêu đề ${roman}...`}
                className="flex-1 px-2.5 py-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-xs font-medium text-zinc-800"
              />

              {isSelected && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Khớp
                </span>
              )}

              <button
                type="button"
                onClick={() => handleRemoveHeading(idx)}
                className="p-1 text-zinc-400 hover:text-red-600 rounded cursor-pointer"
                title="Xóa tiêu đề"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-700">
          Tiêu đề khớp đáp án (chữ số La Mã):
        </label>
        <input
          type="text"
          value={acceptedAnswers}
          onChange={(e) => onAcceptedAnswersChange(e.target.value)}
          placeholder="VD: iv hoặc vii"
          className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white font-mono font-bold text-emerald-700 focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-600">Đoạn dẫn chứng (Evidence):</label>
        <textarea
          rows={2}
          value={evidence}
          onChange={(e) => onEvidenceChange(e.target.value)}
          placeholder="Trích dẫn câu chủ đề (topic sentence) hoặc câu tóm ý của đoạn văn..."
          className="w-full p-2 border border-zinc-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-600">Lời giải chi tiết 4 bước:</label>
        <textarea
          rows={3}
          value={explanation}
          onChange={(e) => onExplanationChange(e.target.value)}
          placeholder="B1: Đọc tiêu đề & gạch keyword...&#10;B2: Đọc lướt đoạn văn...&#10;B3: So khớp ý tưởng chính...&#10;B4: Chọn tiêu đề chuẩn..."
          className="w-full p-2 border border-zinc-300 rounded-lg bg-white font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>
    </div>
  );
}
