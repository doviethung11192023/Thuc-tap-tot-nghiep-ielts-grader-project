"use client";

import React, { useState } from "react";
import { ChevronDown, ListTree } from "lucide-react";

// Dàn ý gợi ý của đề (spec 006 US3). Server chỉ gửi khi làm Practice và dàn ý đã được Admin duyệt.
export function WritingOutlineHint({ outline }: { outline: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-blue-200 bg-blue-50/50 rounded-2xl">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 flex items-center justify-between text-sm font-bold text-blue-900 cursor-pointer">
        <span className="flex items-center gap-2"><ListTree className="w-4 h-4" /> Xem gợi ý dàn ý</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="px-5 pb-4 text-xs leading-relaxed text-blue-950 whitespace-pre-line">{outline}</p>
      )}
    </div>
  );
}
