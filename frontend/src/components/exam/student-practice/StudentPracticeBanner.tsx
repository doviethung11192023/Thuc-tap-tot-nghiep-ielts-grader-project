"use client";

import React from "react";
import { Award, Sparkles, Target } from "lucide-react";

export function StudentPracticeBanner() {
  return (
    <div className="bg-gradient-to-r from-[#932120] via-[#821d1c] to-[#6a1514] rounded-2xl p-5 md:py-4.5 md:px-7 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
      <div className="relative z-10 space-y-1">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-white/20 text-white backdrop-blur-xs tracking-wider uppercase">
            IELTS Academic & General
          </span>
          <span className="text-white/60 text-xs hidden sm:inline">•</span>
          <span className="text-white/80 text-xs font-medium hidden sm:inline">Chuẩn đề thi quốc tế</span>
        </div>
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
          Kho Luyện Thi IELTS Toàn Diện 4 Kỹ Năng
        </h1>
        <p className="text-white/85 text-xs md:text-sm max-w-xl font-normal leading-relaxed">
          Hệ thống phòng thi chuẩn Cambridge, phân tích bẫy đề thi và AI chấm điểm đa tiêu chí.
        </p>
      </div>

      <div className="relative z-10 flex flex-wrap md:flex-col lg:flex-row items-start md:items-end lg:items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-xs font-medium text-white/95 shadow-2xs">
          <Award className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>4 Kỹ năng Cambridge</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-xs font-medium text-white/95 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-rose-300 shrink-0" />
          <span>AI Chấm điểm chi tiết</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-xs font-medium text-white/95 shadow-2xs">
          <Target className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span>Thi & Luyện tập độc lập</span>
        </div>
      </div>
    </div>
  );
}
