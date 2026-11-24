"use client";

import React, { useState } from "react";
import { Snowflake } from "lucide-react";
import type { HeatmapDay, HeatmapWeek } from "@/types/learning-profile";

interface LearningProfileHeatmapProps {
  heatmapWeeks: HeatmapWeek[];
}

export function LearningProfileHeatmap({ heatmapWeeks }: LearningProfileHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getCellColor = (minutes: number, isFuture: boolean, isFrozen?: boolean) => {
    if (isFuture) return "bg-zinc-50 border-zinc-100 text-transparent pointer-events-none";
    if (isFrozen && minutes === 0) return "bg-sky-50 text-sky-700 font-bold border-sky-200 hover:border-sky-400";
    if (minutes > 60) return "bg-[#932120] text-white font-bold border-[#932120]";
    if (minutes >= 15) return "bg-rose-200 text-rose-950 font-bold border-rose-300";
    if (minutes > 0) return "bg-rose-100 text-rose-900 font-bold border-rose-200";
    return "bg-zinc-100/80 text-transparent border-zinc-100 hover:border-zinc-300";
  };

  return (
    <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-7 shadow-2xs space-y-5 w-full">
      {/* Header and Legend */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-black text-zinc-900 tracking-tight">Tần suất học tập</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Thời lượng làm bài và luyện đề thực tế qua các tuần (GMT+7)</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-600 font-medium flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-zinc-100 border border-zinc-200" />
            <span className="text-[11px]">Không có hoạt động</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-rose-100 border border-rose-200" />
            <span className="text-[11px]">&lt;15 phút</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-rose-200 border border-rose-300" />
            <span className="text-[11px]">15-60 phút</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-[#932120]" />
            <span className="text-[11px]">&gt;60 phút</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-sky-50 border border-sky-200 flex items-center justify-center">
              <Snowflake className="w-2.5 h-2.5 text-sky-600" />
            </div>
            <span className="text-[11px]">Freeze</span>
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

                    const isSelected = selectedDay?.date === cell.date;
                    const frozenOnly = Boolean(cell.is_frozen && cell.minutes === 0);
                    return (
                      <button
                        key={week.week_index}
                        type="button"
                        disabled={cell.is_future}
                        onClick={() => setSelectedDay(cell)}
                        aria-label={frozenOnly ? `Ngày ${cell.date}: Đã bảo vệ chuỗi bằng Streak Freeze` : `Ngày ${cell.date}: ${cell.minutes} phút học tập`}
                        aria-pressed={isSelected}
                        className={`flex-1 h-9 rounded-xl border flex items-center justify-center text-xs transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#932120] hover:ring-2 hover:ring-offset-1 hover:ring-[#932120]/50 ${
                          isSelected ? "ring-2 ring-offset-1 ring-[#932120]" : ""
                        } ${getCellColor(cell.minutes, cell.is_future, cell.is_frozen)}`}
                        title={frozenOnly ? `${cell.date}: Đã bảo vệ chuỗi bằng Freeze` : `${cell.date}: ${cell.minutes} phút học tập`}
                      >
                        {frozenOnly ? <Snowflake className="w-3.5 h-3.5 text-sky-600" /> : cell.minutes > 0 ? cell.minutes : ""}
                      </button>
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

      {/* Selected day readout (Accessible for touch & keyboard) + Note footer */}
      {selectedDay && (
        <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-3.5 py-2 text-xs font-semibold text-zinc-700 flex items-center justify-between gap-2">
          <span>
            Ngày <strong className="text-zinc-900">{selectedDay.date}</strong> ({selectedDay.day_of_week}):{" "}
            <strong className="text-[#932120]">{selectedDay.minutes} phút</strong> luyện tập thực tế
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedDay.is_frozen && selectedDay.minutes === 0 ? "bg-sky-100 text-sky-800" : selectedDay.minutes >= 15 ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"}`}>
            {selectedDay.is_frozen && selectedDay.minutes === 0 ? "Bảo vệ bằng Freeze" : selectedDay.minutes >= 15 ? "Đạt mục tiêu ngày" : selectedDay.minutes > 0 ? "Hoạt động nhẹ" : "Chưa có bài nộp"}
          </span>
        </div>
      )}
      <p className="text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-100 pt-3">
        <strong>Lưu ý:</strong> Thời lượng học chỉ ghi nhận từ các bài đã nộp thực tế (giờ Việt Nam GMT+7). Chạm vào từng ô ngày để xem chi tiết.
      </p>
    </div>
  );
}
