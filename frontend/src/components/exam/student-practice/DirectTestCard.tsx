"use client";

import React from "react";
import { Clock, CheckCircle2, BookOpen, Headphones, PenTool, Mic } from "lucide-react";
import type { PublishedTestItem } from "@/types/test-practice";
import { prefetchExamContent } from "@/services/exam-content-cache";

interface DirectTestCardProps {
  test: PublishedTestItem;
  onOpenTestPrep: (test: PublishedTestItem) => void;
}

export function DirectTestCard({ test, onOpenTestPrep }: DirectTestCardProps) {
  const skillUpper = (test.skill || "reading").toUpperCase();
  const duration = test.duration_min || (test.skill === "reading" || test.skill === "writing" ? 60 : 30);

  const getSkillIcon = (s: string) => {
    switch (s?.toLowerCase()) {
      case "listening": return <Headphones className="w-3.5 h-3.5" />;
      case "writing": return <PenTool className="w-3.5 h-3.5" />;
      case "speaking": return <Mic className="w-3.5 h-3.5" />;
      default: return <BookOpen className="w-3.5 h-3.5" />;
    }
  };

  const getDifficultyBadge = (diff?: string) => {
    switch (diff) {
      case "easy":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Dễ</span>;
      case "hard":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Nâng cao</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Vừa</span>;
    }
  };

  const handleWarmup = () => {
    prefetchExamContent(test.id);
  };

  return (
    <div
      onMouseEnter={handleWarmup}
      onTouchStart={handleWarmup}
      className="bg-white rounded-2xl border border-zinc-200 shadow-2xs hover:shadow-md transition-all group flex flex-col overflow-hidden hover:border-[#932120]/40"
    >
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 bg-[#932120] text-white text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1">
                {getSkillIcon(test.skill)}
                <span>{skillUpper}</span>
              </span>
              {getDifficultyBadge(test.difficulty)}
            </div>
            <span className="text-[11px] font-medium text-zinc-400 truncate max-w-[120px]" title={test.test_sets?.name || "Đề độc lập"}>
              {test.test_sets?.name || "Đề độc lập"}
            </span>
          </div>

          <h3 className="font-bold text-zinc-900 text-sm line-clamp-2 leading-snug group-hover:text-[#932120] transition-colors min-h-[2.5rem]">
            {test.title}
          </h3>

          <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium pt-2 border-t border-zinc-100">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              {duration} phút
            </span>
            <span className="text-zinc-300">•</span>
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã xuất bản
            </span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => onOpenTestPrep(test)}
            onFocus={handleWarmup}
            className="w-full h-9 bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95 flex items-center justify-center text-center cursor-pointer"
          >
            Vào làm bài
          </button>
        </div>
      </div>
    </div>
  );
}
