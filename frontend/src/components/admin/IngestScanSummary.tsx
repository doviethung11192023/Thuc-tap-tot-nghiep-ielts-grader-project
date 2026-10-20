"use client";

import React from "react";
import { BookOpen, Headphones, PenTool, Mic, CheckCircle2, Clock, Sparkles } from "lucide-react";
import type { DatasetScanResult } from "@/types/exam";

interface IngestScanSummaryProps {
  scanData: DatasetScanResult;
  onlyPending: boolean;
  onToggleOnlyPending: (val: boolean) => void;
  disabled?: boolean;
}

const SKILL_ICONS: Record<string, React.ReactNode> = {
  reading: <BookOpen className="w-4 h-4 text-sky-600" />,
  listening: <Headphones className="w-4 h-4 text-emerald-600" />,
  writing: <PenTool className="w-4 h-4 text-amber-600" />,
  speaking: <Mic className="w-4 h-4 text-rose-600" />
};

const SKILL_LABELS: Record<string, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking"
};

export function IngestScanSummary({
  scanData,
  onlyPending,
  onToggleOnlyPending,
  disabled = false
}: IngestScanSummaryProps) {
  const { total_found, total_imported, total_pending, by_skill } = scanData;

  return (
    <div className="space-y-3.5">
      {/* Top Banner Overview */}
      <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-800">Kho dữ liệu phát hiện:</span>
            <span className="text-xs font-extrabold text-[#932120]">{total_found} đề thi</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Đã đồng bộ vào CSDL: <strong className="text-emerald-700">{total_imported}</strong> | Còn tồn đọng: <strong className="text-amber-700">{total_pending}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none bg-white px-3 py-1.5 rounded-lg border border-zinc-200 shadow-xs hover:border-zinc-300 transition-colors">
            <input
              type="checkbox"
              disabled={disabled}
              checked={onlyPending}
              onChange={(e) => onToggleOnlyPending(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-[#932120] border-zinc-300 focus:ring-[#932120]"
            />
            <span className="text-xs font-semibold text-zinc-700">Chỉ nạp bài mới (khuyến nghị)</span>
          </label>
        </div>
      </div>

      {/* 4 Skill Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {(["reading", "listening", "writing", "speaking"] as const).map((skillKey) => {
          const item = by_skill[skillKey] || { total: 0, imported: 0, pending: 0 };
          const isFull = item.total > 0 && item.pending === 0;

          return (
            <div
              key={skillKey}
              className={`p-3 rounded-xl border transition-all ${
                isFull
                  ? "bg-zinc-50/70 border-zinc-200 opacity-90"
                  : "bg-white border-zinc-200 shadow-xs hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-900">
                  {SKILL_ICONS[skillKey]}
                  <span>{SKILL_LABELS[skillKey]}</span>
                </div>
                <span className="text-[11px] font-semibold text-zinc-500">
                  Tổng: {item.total}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Đã nạp: {item.imported}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border ${
                    item.pending > 0
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-zinc-100 text-zinc-500 border-zinc-200"
                  }`}
                >
                  <Clock className="w-3 h-3" /> Còn: {item.pending}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Samples preview if pending */}
      {scanData.pending_samples && scanData.pending_samples.length > 0 && (
        <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 text-[11px] text-zinc-600">
          <div className="flex items-center gap-1.5 font-bold text-zinc-700 mb-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Xem trước một số bài thi chưa nạp sắp tới:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {scanData.pending_samples.slice(0, 4).map((s, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-white border border-zinc-200 rounded text-zinc-700 truncate max-w-[200px]"
                title={s.title}
              >
                [{s.skill.toUpperCase()}] {s.title}
              </span>
            ))}
            {scanData.pending_samples.length > 4 && (
              <span className="px-1.5 py-0.5 text-zinc-400 font-medium">
                +{scanData.pending_samples.length - 4} bài khác...
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
