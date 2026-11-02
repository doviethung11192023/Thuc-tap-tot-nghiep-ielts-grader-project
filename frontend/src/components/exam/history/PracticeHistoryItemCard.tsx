"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Headphones, PenTool, Mic, Clock, ChevronRight } from "lucide-react";
import type { TimelineHistoryItem } from "@/services/practice-history-cache";

interface PracticeHistoryItemCardProps {
  item: TimelineHistoryItem;
}

export function PracticeHistoryItemCard({ item }: PracticeHistoryItemCardProps) {
  const formatDateTime = (raw: string) => {
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return raw;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      return `${hours}:${mins} ${day}/${month}/${year}`;
    } catch {
      return raw;
    }
  };

  const getSkillIcon = (sk: string) => {
    switch (sk.toLowerCase()) {
      case "listening": return <Headphones className="w-3.5 h-3.5 text-blue-600" />;
      case "writing": return <PenTool className="w-3.5 h-3.5 text-amber-600" />;
      case "speaking": return <Mic className="w-3.5 h-3.5 text-red-600" />;
      default: return <BookOpen className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  const isScored = item.status === "scored";

  const targetUrl = isScored
    ? `/test-practice/${item.skill.toLowerCase()}/${item.test_id}/summary?attemptId=${item.id}&returnUrl=${encodeURIComponent('/test-practice/history')}`
    : `/test-practice/${item.skill.toLowerCase()}/${item.test_id}`;

  return (
    <Link
      href={targetUrl}
      className="group block bg-white rounded-3xl border border-zinc-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all"
    >
      <div className="flex items-start sm:items-center gap-4">
        {/* Score Pill Left */}
        <div className={`w-14 h-12 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-xs transition-colors ${
          item.band >= 5.0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
          item.band > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          isScored ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          'bg-amber-50 text-amber-800 border border-amber-200 text-xs'
        }`}>
          {isScored ? (
            <>
              <span className="text-sm font-black leading-tight">{item.band.toFixed(1)}</span>
              <span className="text-[9px] font-bold uppercase opacity-75">Band</span>
            </>
          ) : (
            <span className="text-[11px] font-bold">Đang làm</span>
          )}
        </div>

        {/* Center Details */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-700">
              {getSkillIcon(item.skill)}
              <span>{item.skill}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
              {item.mode === "mock" ? "Full test" : "Practice by type"}
            </span>
            {item.status === "in_progress" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Đang làm
              </span>
            )}
          </div>

          <h4 className="font-bold text-zinc-900 text-sm sm:text-base group-hover:text-[#2563eb] transition-colors line-clamp-1">
            {item.title}
          </h4>

          {item.sub_type && (
            <p className="text-xs text-zinc-500 line-clamp-1">
              {item.sub_type}
            </p>
          )}
        </div>

        {/* Right Arrow & Date */}
        <div className="hidden sm:flex flex-col items-end justify-between shrink-0 self-stretch text-right">
          <div className="w-8 h-8 rounded-full bg-zinc-50 group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600" />
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-400">
            <Clock className="w-3 h-3" />
            <span>Ngày làm bài: {formatDateTime(item.submitted_at)}</span>
          </div>
        </div>
      </div>

      {/* Mobile Date footer */}
      <div className="sm:hidden flex items-center gap-1 text-[11px] font-medium text-zinc-400 mt-2 pt-2 border-t border-zinc-100">
        <Clock className="w-3 h-3" />
        <span>Ngày làm bài: {formatDateTime(item.submitted_at)}</span>
      </div>
    </Link>
  );
}
