"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface TrueFalseAnswerEditorProps {
  acceptedAnswers: string;
  onAcceptedAnswersChange: (val: string) => void;
  evidence: string;
  onEvidenceChange: (val: string) => void;
  explanation: string;
  onExplanationChange: (val: string) => void;
  isYesNo?: boolean;
}

export function TrueFalseAnswerEditor({
  acceptedAnswers,
  onAcceptedAnswersChange,
  evidence,
  onEvidenceChange,
  explanation,
  onExplanationChange,
  isYesNo = false,
}: TrueFalseAnswerEditorProps) {
  const [mode, setMode] = useState<"TFNG" | "YNNG">(isYesNo ? "YNNG" : "TFNG");

  const currentUpper = acceptedAnswers.toUpperCase().trim();
  const options =
    mode === "TFNG"
      ? [
          { value: "TRUE", aliases: ["TRUE", "T"], label: "TRUE (Đúng)" },
          { value: "FALSE", aliases: ["FALSE", "F"], label: "FALSE (Sai)" },
          { value: "NOT GIVEN", aliases: ["NOT GIVEN", "NG"], label: "NOT GIVEN (Không có)" },
        ]
      : [
          { value: "YES", aliases: ["YES", "Y"], label: "YES (Đúng quan điểm tác giả)" },
          { value: "NO", aliases: ["NO", "N"], label: "NO (Trái quan điểm tác giả)" },
          { value: "NOT GIVEN", aliases: ["NOT GIVEN", "NG"], label: "NOT GIVEN (Không đề cập)" },
        ];

  const handleSelect = (val: string, aliases: string[]) => {
    onAcceptedAnswersChange(aliases.join(", "));
  };

  const isSelected = (aliases: string[]) => {
    return aliases.some((a) => currentUpper.includes(a));
  };

  return (
    <div className="space-y-3.5 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
        <span className="font-bold text-zinc-800">
          Chọn đáp án chuẩn cho dạng {mode === "TFNG" ? "True/False/Not Given" : "Yes/No/Not Given"}:
        </span>
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-zinc-300">
          <button
            type="button"
            onClick={() => setMode("TFNG")}
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              mode === "TFNG" ? "bg-[#932120] text-white" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            T / F / NG
          </button>
          <button
            type="button"
            onClick={() => setMode("YNNG")}
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              mode === "YNNG" ? "bg-[#932120] text-white" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Y / N / NG
          </button>
        </div>
      </div>

      {/* 3 Quick-Select Option Pills */}
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => {
          const active = isSelected(opt.aliases);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value, opt.aliases)}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                active
                  ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-xs ring-1 ring-emerald-500"
                  : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <div className="flex items-center gap-1">
                {active && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                <span className="text-xs font-black">{opt.value}</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium line-clamp-1">{opt.label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-600">
          Chuỗi đáp án chấp nhận (Tự động tạo):
        </label>
        <input
          type="text"
          value={acceptedAnswers}
          onChange={(e) => onAcceptedAnswersChange(e.target.value)}
          placeholder="VD: TRUE, T"
          className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white font-mono font-bold text-emerald-700 focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-600">Đoạn dẫn chứng (Evidence):</label>
        <textarea
          rows={2}
          value={evidence}
          onChange={(e) => onEvidenceChange(e.target.value)}
          placeholder="Trích dẫn câu văn trong bài đọc chứng minh cho đáp án..."
          className="w-full p-2 border border-zinc-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-600">Lời giải chi tiết 4 bước:</label>
        <textarea
          rows={3}
          value={explanation}
          onChange={(e) => onExplanationChange(e.target.value)}
          placeholder="B1: Đọc câu hỏi & xác định từ khóa...&#10;B2: Định vị thông tin...&#10;B3: So sánh đối chiếu nghĩa...&#10;B4: Kết luận..."
          className="w-full p-2 border border-zinc-300 rounded-lg bg-white font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>
    </div>
  );
}
