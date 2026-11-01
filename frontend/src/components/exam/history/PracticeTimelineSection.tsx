"use client";

import React from "react";
import { TimelineHistoryItem } from "@/services/practice-history-cache";
import { PracticeHistoryItemCard } from "./PracticeHistoryItemCard";
import { Calendar, Inbox } from "lucide-react";

interface PracticeTimelineSectionProps {
  groups: Record<string, TimelineHistoryItem[]>;
  loading?: boolean;
}

export function PracticeTimelineSection({ groups, loading }: PracticeTimelineSectionProps) {
  const monthKeys = Object.keys(groups);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-36 bg-zinc-200 animate-pulse rounded-md" />
        <div className="space-y-4 pl-4 border-l-2 border-zinc-200">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 bg-white border border-zinc-200/80 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (monthKeys.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-zinc-200/80 p-12 text-center shadow-xs">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4">
          <Inbox className="w-7 h-7" />
        </div>
        <h4 className="text-base font-bold text-zinc-900 mb-1">Chưa có lịch sử làm bài</h4>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          Bạn chưa hoàn thành bài luyện tập nào. Hãy chọn một đề thi tại Test Practice để bắt đầu rèn luyện kỹ năng!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {monthKeys.map((month) => {
        const items = groups[month];
        return (
          <div key={month} className="space-y-4">
            {/* Month Header Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-bold tracking-wide">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{month}</span>
            </div>

            {/* Timeline track with nodes */}
            <div className="relative pl-6 ml-2 space-y-4 before:absolute before:left-1.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-blue-100">
              {items.map((item) => (
                <div key={item.id} className="relative">
                  {/* Timeline dot marker */}
                  <span
                    aria-hidden="true"
                    className="absolute -left-[27px] top-6 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-2xs z-10"
                  />
                  <PracticeHistoryItemCard item={item} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
