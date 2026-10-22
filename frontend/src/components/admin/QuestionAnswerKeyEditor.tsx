"use client";

import React from "react";

interface QuestionAnswerKeyEditorProps {
  acceptedAnswers: string;
  evidence: string;
  explanation: string;
  onAcceptedAnswersChange: (val: string) => void;
  onEvidenceChange: (val: string) => void;
  onExplanationChange: (val: string) => void;
}

export function QuestionAnswerKeyEditor({
  acceptedAnswers,
  evidence,
  explanation,
  onAcceptedAnswersChange,
  onEvidenceChange,
  onExplanationChange,
}: QuestionAnswerKeyEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block font-semibold text-zinc-700 mb-1 text-xs">
          Đáp án chấp nhận (các đáp án cách nhau bằng dấu phẩy):
        </label>
        <input
          type="text"
          value={acceptedAnswers}
          onChange={(e) => onAcceptedAnswersChange(e.target.value)}
          placeholder="VD: TRUE, T hoặc A hoặc fresh water, clean water"
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#932120] font-medium text-emerald-800 text-xs"
        />
      </div>

      <div>
        <label className="block font-semibold text-zinc-700 mb-1 text-xs">Đoạn dẫn chứng (Evidence):</label>
        <textarea
          rows={2}
          value={evidence}
          onChange={(e) => onEvidenceChange(e.target.value)}
          placeholder="Trích dẫn đoạn văn hoặc câu nói chứng minh đáp án..."
          className="w-full p-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#932120] text-xs"
        />
      </div>

      <div>
        <label className="block font-semibold text-zinc-700 mb-1 text-xs">Lời giải chi tiết 4 bước (Explanation):</label>
        <textarea
          rows={3}
          value={explanation}
          onChange={(e) => onExplanationChange(e.target.value)}
          placeholder="B1: Đọc đề & gạch keyword...&#10;B2: Quét vị trí...&#10;B3: Phân tích paraphrase...&#10;B4: Kết luận..."
          className="w-full p-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#932120] text-xs font-mono"
        />
      </div>
    </div>
  );
}
