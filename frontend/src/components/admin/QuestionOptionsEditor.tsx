"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";

interface QuestionOptionsEditorProps {
  options: string[];
  onChange: (options: string[]) => void;
}

export function QuestionOptionsEditor({ options, onChange }: QuestionOptionsEditorProps) {
  const handleAdd = () => {
    onChange([...options, ""]);
  };

  const handleUpdate = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    onChange(next);
  };

  const handleRemove = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  return (
    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
      <div className="flex items-center justify-between font-semibold text-zinc-700 text-xs">
        <span>Các lựa chọn phương án (A, B, C, D...):</span>
        <button
          type="button"
          onClick={handleAdd}
          className="text-[#932120] font-bold hover:underline flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm lựa chọn
        </button>
      </div>
      {options.map((opt, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="w-6 font-bold text-zinc-500 text-center text-xs">
            {String.fromCharCode(65 + idx)}.
          </span>
          <input
            type="text"
            value={opt}
            onChange={(e) => handleUpdate(idx, e.target.value)}
            placeholder={`Nội dung lựa chọn ${String.fromCharCode(65 + idx)}`}
            className="flex-1 px-2.5 py-1.5 border border-zinc-300 rounded-lg bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#932120]"
          />
          <button
            type="button"
            onClick={() => handleRemove(idx)}
            className="p-1 text-zinc-400 hover:text-red-600"
            title="Xóa lựa chọn"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
