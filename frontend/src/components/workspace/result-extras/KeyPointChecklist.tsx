import React from "react";
import { CheckCircle2, CircleSlash, XCircle } from "lucide-react";
import type { KeyPointCheck } from "@/types";

// Danh sách ý chính Task 1 (spec 006 US2): có nhắc tới không, và số liệu có đúng với đáp án đã duyệt không.
const fmt = (f: { series: string; label: string; value: number }) => `${f.series} ${f.label}: ${f.value}`;

export function KeyPointChecklist({ check }: { check: KeyPointCheck }) {
  return (
    <div className="space-y-4 pb-10">
      <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-sm">
        <p className="text-sm font-bold text-zinc-800">
          Nhắc tới {check.covered}/{check.total} ý chính · Đúng số liệu {check.accurate}/{check.covered}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          So với đáp án số liệu đã được duyệt cho đề này. Sai lệch nhỏ do đọc biểu đồ (≈5%) vẫn tính là đúng.
        </p>
      </div>
      {check.items.map((item) => {
        const wrong = item.accurate === false;
        const Icon = !item.covered ? CircleSlash : wrong ? XCircle : CheckCircle2;
        const color = !item.covered ? "text-zinc-400" : wrong ? "text-red-600" : "text-emerald-600";
        return (
          <div key={item.id} className={`p-3 rounded-xl border ${wrong ? "border-red-200 bg-red-50/50" : "border-zinc-200 bg-white"}`}>
            <div className="flex gap-2">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
              <div className="text-sm text-zinc-700">
                <p>{item.statement}</p>
                {!item.covered && <p className="text-xs text-zinc-500 mt-1">Bài chưa nhắc tới ý này.</p>}
                {wrong && (
                  <p className="text-xs text-red-700 mt-1">
                    Bài viết: {item.stated.filter((s) => s.wrong).map(fmt).join("; ")} → Đúng là: {item.expected.map(fmt).join("; ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
