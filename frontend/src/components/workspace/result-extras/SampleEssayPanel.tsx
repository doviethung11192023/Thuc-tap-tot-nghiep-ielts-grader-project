import React from "react";

// Bài mẫu Band 8+ của đề (spec 006 US3), đã được Admin duyệt.
export function SampleEssayPanel({ text }: { text: string }) {
  return (
    <div className="space-y-3 pb-10">
      <p className="text-xs text-zinc-500">Bài mẫu tham khảo cho đề này (Band 8+), đã được duyệt.</p>
      <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-sm text-sm leading-relaxed text-zinc-700 whitespace-pre-line">
        {text}
      </div>
    </div>
  );
}
