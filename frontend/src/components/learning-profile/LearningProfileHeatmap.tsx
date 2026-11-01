"use client";

import React from "react";
import type { HeatmapWeek } from "@/types/learning-profile";

interface LearningProfileHeatmapProps {
  heatmapWeeks: HeatmapWeek[];
}

export function LearningProfileHeatmap({ heatmapWeeks }: LearningProfileHeatmapProps) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getCellColor = (minutes: number, isFuture: boolean) => {
    if (isFuture) return "bg-zinc-50 border-zinc-100 text-transparent pointer-events-none";
    if (minutes > 60) return "bg-blue-600 text-white font-bold border-blue-600";
    if (minutes >= 15) return "bg-blue-200 text-blue-900 font-bold border-blue-300";
    if (minutes > 0) return "bg-blue-100 text-blue-800 font-bold border-blue-200";
    return "bg-zinc-100/80 text-transparent border-zinc-100 hover:border-zinc-300";
  };

  return (
    <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-7 shadow-2xs space-y-5 w-full">
      {/* Header and Legend */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-black text-zinc-900 tracking-tight">Tần suất học tập</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Thời lượng làm bài và luyện đề thực tế qua các tuần</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-600 font-medium flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-zinc-100 border border-zinc-200" />
            <span className="text-[11px]">Không có hoạt động</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-blue-100 border border-blue-200" />
            <span className="text-[11px]">&lt;15 phút</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-blue-200 border border-blue-300" />
            <span className="text-[11px]">15-60 phút</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-blue-600" />
            <span className="text-[11px]">&gt;60 phút</span>
          </div>
        </div>
      </div>

      {/* Heatmap Matrix with Scrollbar */}
      <div className="overflow-x-auto pb-3 pt-1">
        <div className="min-w-[850px] space-y-2">
          {/* Month Headers */}
          <div className="flex pl-10 text-[11px] font-bold text-zinc-500">
            {heatmapWeeks.map((w, idx) => (
              <div key={idx} className="flex-1 text-center">
                {w.month_label && <span>{w.month_label}</span>}
              </div>
            ))}
          </div>

          {/* 7 Days Matrix (Mon - Sun) */}
          <div className="space-y-1.5">
            {days.map((dayLabel, dayIndex) => (
              <div key={dayLabel} className="flex items-center gap-2">
                <span className="w-8 text-[11px] font-bold text-zinc-400 shrink-0 text-left">
                  {dayLabel}
                </span>
                <div className="flex-1 flex gap-1.5">
                  {heatmapWeeks.map((week) => {
                    const cell = week.days[dayIndex];
                    if (!cell) return <div key={week.week_index} className="flex-1 h-9" />;

                    return (
                      <div
                        key={week.week_index}
                        className={`flex-1 h-9 rounded-xl border flex items-center justify-center text-xs transition-all cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 ${getCellColor(
                          cell.minutes,
                          cell.is_future
                        )}`}
                        title={`${cell.date}: ${cell.minutes} phút học tập`}
                      >
                        {cell.minutes > 0 ? cell.minutes : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Total Minutes by Week (Hàng Tổng cộng) */}
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
              <span className="w-8 text-[10px] font-black text-zinc-600 shrink-0 text-left leading-tight">
                Tổng<br />cộng
              </span>
              <div className="flex-1 flex gap-1.5">
                {heatmapWeeks.map((week) => (
                  <div
                    key={week.week_index}
                    className="flex-1 text-center text-xs font-bold text-zinc-700 py-1"
                  >
                    {week.total_minutes}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note footer */}
      <p className="text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-100 pt-3">
        <strong>Lưu ý:</strong> Bộ đếm thời gian đang được ghi nhận trực tiếp theo thời lượng làm bài thực tế của bạn. Mọi quyền lợi học tập vẫn được đảm bảo trong quá trình này. Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ hỗ trợ!
      </p>
    </div>
  );
}
