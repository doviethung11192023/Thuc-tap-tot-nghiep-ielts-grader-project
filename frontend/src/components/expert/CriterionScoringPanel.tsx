"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  BookOpen, 
  AlertTriangle, 
  Check, 
  HelpCircle,
  ChevronDown,
  Info
} from "lucide-react";
import type { CriterionScoreDetail } from "@/types";
import { loadExpertSnippets, SnippetItem } from "@/lib/expert-snippets";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface Props {
  skill: "writing" | "speaking";
  activeTaskNo?: number;
  criteriaList: CriterionScoreDetail[];
  onChangeCriterion: (index: number, updated: CriterionScoreDetail) => void;
  overallBand: number;
  onChangeOverallBand: (band: number) => void;
  aiOverallBand?: number | null;
  changeReason: string;
  onChangeReason: (reason: string) => void;
  onOpenSnippetDrawer: (category: string, onSelect: (text: string) => void) => void;
}

const BAND_CHIPS = [1.0, 2.0, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0];

const QUICK_CHIPS_WRITING = [
  "Lạc đề / Chưa hoàn thành yêu cầu đề (Off-topic)",
  "Thiếu đoạn Overview khái quát (Task 1)",
  "Từ vựng dùng gượng ép, sai collocation",
  "Cấu trúc ngữ pháp đơn điệu, lặp lỗi thì",
  "Liên kết ý rời rạc, lạm dụng liên từ nối"
];

const QUICK_CHIPS_SPEAKING = [
  "Ngập ngừng kéo dài, giảm độ trôi chảy (FC)",
  "Phát âm sai nhiều âm cơ bản, nuốt âm cuối (P)",
  "Thiếu từ vựng chủ đề, lặp lại từ đơn giản",
  "Sai cấu trúc ngữ pháp câu phức"
];

export default function CriterionScoringPanel({
  skill,
  activeTaskNo,
  criteriaList,
  onChangeCriterion,
  overallBand,
  onChangeOverallBand,
  aiOverallBand,
  changeReason,
  onChangeReason,
  onOpenSnippetDrawer
}: Props) {
  const visibleCriteria = criteriaList
    .map((crit, idx) => ({ crit, idx }))
    .filter(({ crit }) => activeTaskNo === undefined || !crit.task_no || crit.task_no === activeTaskNo);
  // Autocomplete popup state for "/"
  const [activeSlashIndex, setActiveSlashIndex] = useState<number | null>(null);
  const [slashQuery, setSlashQuery] = useState("");
  const rawSnippets = loadExpertSnippets();
  const allowedBySkill =
    skill === "writing"
      ? new Set(["TA", "TR", "CC", "LR", "GRA", "GENERAL"])
      : new Set(["FC", "P", "LR", "GRA", "GENERAL"]);
  const allSnippets = rawSnippets.filter(s => allowedBySkill.has(s.category));

  // Check deviation >= 1.0 band
  const deviation = aiOverallBand !== undefined && aiOverallBand !== null 
    ? Math.abs(overallBand - Number(aiOverallBand)) 
    : 0;
  const isDeviationSignificant = deviation >= 1.0;

  const quickChips = skill === "speaking" ? QUICK_CHIPS_SPEAKING : QUICK_CHIPS_WRITING;

  const handleTextareaChange = (index: number, val: string, crit: CriterionScoreDetail) => {
    onChangeCriterion(index, { ...crit, comment: val });

    // Detect if last character typed is "/"
    if (val.endsWith("/")) {
      setActiveSlashIndex(index);
      setSlashQuery("");
    } else if (activeSlashIndex === index && !val.includes("/")) {
      setActiveSlashIndex(null);
    }
  };

  const handleSelectSnippet = (index: number, text: string, crit: CriterionScoreDetail) => {
    const current = crit.comment || "";
    // Replace trailing slash with snippet content
    const updated = current.endsWith("/") ? current.slice(0, -1) + text : current + " " + text;
    onChangeCriterion(index, { ...crit, comment: updated.trim() });
    setActiveSlashIndex(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs flex flex-col h-full overflow-hidden">
      {/* Header: Overall Band Summary */}
      <div className="p-5 border-b border-zinc-200 bg-zinc-50/70 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-500">
              ĐIỂM CHÍNH THỨC CỦA CHUYÊN GIA
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-extrabold text-[#932120] font-mono tabular-nums">
                <AnimatedNumber value={overallBand} decimals={1} />
              </span>
              <span className="text-xs font-bold text-zinc-500">OVERALL BAND</span>
            </div>
          </div>

          {aiOverallBand !== undefined && aiOverallBand !== null && (
            <div className="text-right p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-blue-700 block">AI Gợi ý</span>
              <span className="text-lg font-bold text-blue-900 font-mono">Band {Number(aiOverallBand).toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Overall Band Selector Slider / Chips */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-700 mb-1.5">
            Chọn Band điểm tổng thể (IELTS Rounding 0.5):
          </label>
          <div className="flex flex-wrap gap-1">
            {BAND_CHIPS.map(b => (
              <button
                key={b}
                type="button"
                onClick={() => onChangeOverallBand(b)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  overallBand === b
                    ? "bg-[#932120] text-white shadow-xs scale-105"
                    : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                {b.toFixed(1)}
              </button>
            ))}
          </div>
        </div>

        {/* FR-42: Deviation Alert & Quick Chips if >= 1.0 band */}
        {isDeviationSignificant && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Điểm lệch {deviation.toFixed(1)} band so với AI gợi ý (FR-42).
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Quy định khảo thí yêu cầu Expert giải trình lý do điều chỉnh khi lệch từ 1.0 band trở lên:
            </p>

            {/* Quick Chips (< 3s selection) */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChangeReason(chip)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-medium border transition-colors ${
                    changeReason === chip
                      ? "bg-amber-600 text-white border-amber-700 font-bold"
                      : "bg-white text-amber-900 border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={changeReason}
              onChange={(e) => onChangeReason(e.target.value)}
              placeholder="Hoặc nhập lý do khác..."
              className="w-full text-xs p-2 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}
      </div>

      {/* 4 Cambridge Criteria Scoring Forms */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {activeTaskNo !== undefined && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
            <span className="font-bold text-zinc-700">
              Tiêu chí chấm điểm — Task {activeTaskNo}
            </span>
            <span className="text-[11px] text-zinc-500">
              {visibleCriteria.length} tiêu chí
            </span>
          </div>
        )}
        {visibleCriteria.map(({ crit, idx }) => {
          return (
            <div
              key={`${crit.criterion_id || crit.code}-${crit.task_no ?? idx}-${idx}`}
              className="p-4 bg-white border border-zinc-200 rounded-xl space-y-3 shadow-2xs hover:border-zinc-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-900">
                    {crit.name} ({crit.code})
                  </span>
                  {skill === "writing" && Boolean(crit.task_no) && crit.task_no! > 0 && (
                    <span className="ml-2 text-[10px] text-zinc-500 font-semibold bg-zinc-100 px-1.5 py-0.5 rounded">
                      Task {crit.task_no}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-500">Band:</span>
                  <span className="px-2 py-0.5 bg-rose-50 text-[#932120] font-mono font-bold text-xs rounded-md border border-red-200">
                    {crit.band.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Band selection chips */}
              <div className="flex flex-wrap gap-1">
                {BAND_CHIPS.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => onChangeCriterion(idx, { ...crit, band: b })}
                    className={`px-2 py-0.5 text-[11px] font-mono rounded font-bold transition-all cursor-pointer ${
                      crit.band === b
                        ? "bg-[#932120] text-white shadow-2xs"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    {b.toFixed(1)}
                  </button>
                ))}
              </div>

              {/* Comment Textarea with Slash Command Support */}
              <div className="relative space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-600 flex items-center gap-1">
                    Nhận xét chi tiết (gõ <kbd className="px-1 bg-zinc-200 rounded text-[10px] font-mono">/</kbd> để chèn mẫu):
                  </label>

                  <button
                    type="button"
                    onClick={() => onOpenSnippetDrawer(crit.code, (txt) => handleSelectSnippet(idx, txt, crit))}
                    className="text-[11px] text-[#932120] hover:underline font-bold flex items-center gap-1"
                  >
                    <BookOpen className="w-3 h-3" /> Kho nhận xét mẫu
                  </button>
                </div>

                <textarea
                  value={crit.comment}
                  onChange={(e) => handleTextareaChange(idx, e.target.value, crit)}
                  rows={3}
                  placeholder={`Nhận xét về tiêu chí ${crit.name}... Gõ '/' để gợi ý mẫu`}
                  className="w-full text-xs p-3 border border-zinc-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#932120] leading-relaxed"
                />

                {/* Floating Slash Command Autocomplete Dropdown */}
                {activeSlashIndex === idx && (
                  <div className="absolute z-20 left-0 right-0 bottom-full mb-1.5 bg-white border border-zinc-200 rounded-xl shadow-xl p-2 max-h-40 overflow-y-auto space-y-1 animate-in fade-in">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-bold text-zinc-400">
                        GỢI Ý NHẬN XÉT MẪU [{crit.code}]:
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveSlashIndex(null)}
                        className="text-[10px] text-zinc-400 hover:text-zinc-700 cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                    {allSnippets
                      .filter(s => s.category === crit.code || s.category === "GENERAL")
                      .slice(0, 4)
                      .map(snip => (
                        <button
                          key={snip.id}
                          type="button"
                          onClick={() => handleSelectSnippet(idx, snip.content, crit)}
                          className="w-full text-left p-1.5 hover:bg-red-50 rounded-lg text-xs transition-colors"
                        >
                          <div className="font-bold text-zinc-800 text-[11px]">{snip.title}</div>
                          <div className="text-zinc-500 text-[10px] truncate">{snip.content}</div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
