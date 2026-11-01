"use client";

import React from "react";
import { BookOpen, Headphones, PenTool, Mic, Target } from "lucide-react";

interface RadarScoreTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export function RadarScoreTooltip({ active, payload, label }: RadarScoreTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0]?.payload || {};
  const skillName = item.skill || label || "Kỹ năng";
  const scoreVal = typeof item.score === "number" ? item.score : Number(payload[0]?.value || 0);
  const count = item.count;

  const getSkillIcon = (sk: string) => {
    switch (sk.toLowerCase()) {
      case "listening": return <Headphones className="w-4 h-4 text-blue-600" />;
      case "writing": return <PenTool className="w-4 h-4 text-amber-600" />;
      case "speaking": return <Mic className="w-4 h-4 text-red-600" />;
      case "overview": return <Target className="w-4 h-4 text-blue-600" />;
      default: return <BookOpen className="w-4 h-4 text-emerald-600" />;
    }
  };

  const getTierBadge = (val: number) => {
    if (val >= 8.0) return { label: "Xuất sắc (Band 8.0+)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (val >= 6.5) return { label: "Khá tốt (Band 6.5 - 7.5)", color: "bg-blue-50 text-blue-700 border-blue-200" };
    if (val >= 5.0) return { label: "Trung bình (Band 5.0 - 6.0)", color: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "Cần cải thiện (Band < 5.0)", color: "bg-zinc-100 text-zinc-700 border-zinc-200" };
  };

  const tier = getTierBadge(scoreVal);

  return (
    <div className="bg-white/95 backdrop-blur-md border border-zinc-200/90 rounded-2xl p-3.5 shadow-xl text-left pointer-events-none z-50 min-w-[210px] space-y-2">
      <div className="flex items-center gap-2 pb-1.5 border-b border-zinc-100">
        <div className="p-1.5 rounded-lg bg-zinc-100/80 shrink-0">
          {getSkillIcon(skillName)}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-zinc-900 leading-tight truncate">
            {skillName === "Overview" ? "Điểm tổng quan (Overall)" : `Kỹ năng: ${skillName}`}
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">Test Practice thực tế</span>
        </div>
      </div>

      <div className="flex items-baseline justify-between pt-0.5">
        <span className="text-xs text-zinc-500 font-medium">Điểm trung bình:</span>
        <span className="text-lg font-black text-[#2563eb] tracking-tight">
          {scoreVal.toFixed(1)} <span className="text-xs font-semibold text-zinc-400">/ 9.0</span>
        </span>
      </div>

      <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold border inline-block ${tier.color}`}>
        {tier.label}
      </div>

      {typeof count === "number" && (
        <div className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-100/80 flex items-center justify-between">
          <span>Lượt làm bài đã tính:</span>
          <span className="font-bold text-zinc-800">{count} bài</span>
        </div>
      )}
    </div>
  );
}
