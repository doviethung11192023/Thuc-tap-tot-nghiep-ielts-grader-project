"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/** Khối JSON gập/mở (output của lượt chấm, before/after của audit log). */
export function JsonDisclosure({ title, value, defaultOpen = false }: { title: string; value: unknown; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const empty = value === null || value === undefined;
  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-zinc-50 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />} {title}
        {empty && <span className="text-xs font-normal text-zinc-400">(trống)</span>}
      </button>
      {open && (
        <pre className="p-4 text-xs bg-zinc-900 text-zinc-100 overflow-auto max-h-96 whitespace-pre-wrap break-words">
          {empty ? "null" : JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}
