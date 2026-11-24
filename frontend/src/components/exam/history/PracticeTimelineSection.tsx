"use client";

import React from "react";
import { TimelineHistoryItem } from "@/services/practice-history-cache";
import { PracticeHistoryItemCard } from "./PracticeHistoryItemCard";
import { Calendar, Inbox } from "lucide-react";
import { BlurFadeCard, ScrollTimelineTrack, StaggerGrid } from "@/components/motion";

interface PracticeTimelineSectionProps {
  groups: Record<string, TimelineHistoryItem[]>;
  loading?: boolean;
  onDeleteItem?: (attemptId: string) => void;
}

export function PracticeTimelineSection({ groups, loading, onDeleteItem }: PracticeTimelineSectionProps) {
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
      <BlurFadeCard inView={false}>
        <div className="bg-white rounded-3xl border border-zinc-200/80 p-12 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4">
            <Inbox className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-zinc-900 mb-1">Chưa có lịch sử làm bài</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Bạn chưa hoàn thành bài luyện tập nào. Hãy chọn một đề thi tại Test Practice để bắt đầu rèn luyện kỹ năng!
          </p>
        </div>
      </BlurFadeCard>
    );
  }

  return (
    <div className="space-y-8">
      {monthKeys.map((month, monthIdx) => {
        const items = groups[month];
        return (
          <div key={month} className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-[#932120]/20 text-[#932120] text-xs font-bold tracking-wide">
              <Calendar className="w-3.5 h-3.5 text-[#932120]" />
              <span>{month}</span>
            </div>

            <ScrollTimelineTrack trackLeftClass="left-1.5" className="ml-2">
              <StaggerGrid sharedSpotlight={false} className="space-y-4">
                {items.map((item, idx) => (
                  <BlurFadeCard key={item.id} index={monthIdx === 0 ? idx : 0} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[24px] top-6 w-3 h-3 rounded-full bg-[#932120] border-2 border-white shadow-2xs z-10"
                    />
                    <PracticeHistoryItemCard item={item} onDelete={onDeleteItem} />
                  </BlurFadeCard>
                ))}
              </StaggerGrid>
            </ScrollTimelineTrack>
          </div>
        );
      })}
    </div>
  );
}
