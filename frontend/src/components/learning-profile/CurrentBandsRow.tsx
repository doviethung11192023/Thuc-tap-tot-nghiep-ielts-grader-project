"use client";

import React from "react";
import { BookOpen, CalendarClock, Headphones, Mic, PenTool } from "lucide-react";
import type { CurrentBands, ExamCountdown, JourneySkill } from "@/types/learning-profile";

const SKILLS: { key: JourneySkill; label: string; Icon: typeof BookOpen }[] = [
  { key: "listening", label: "Listening", Icon: Headphones },
  { key: "reading", label: "Reading", Icon: BookOpen },
  { key: "writing", label: "Writing", Icon: PenTool },
  { key: "speaking", label: "Speaking", Icon: Mic },
];

interface CurrentBandsRowProps {
  bands: CurrentBands;
  exam?: ExamCountdown;
  onOpenGoalModal: () => void;
}

/**
 * Band hiện tại 4 kỹ năng theo BR-12 (spec 005 US1): 3 Mock gần nhất, không có thì 5 Practice gần nhất.
 * Ít bằng chứng thì gắn nhãn "độ tin cậy thấp"; chưa có bài nào thì "chưa đủ dữ liệu", không bịa số.
 */
export function CurrentBandsRow({ bands, exam, onOpenGoalModal }: CurrentBandsRowProps) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 shadow-2xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-zinc-900">Band hiện tại theo kỹ năng</h3>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="text-zinc-600">
            Overall:{" "}
            <span className="font-black text-zinc-900">
              {bands.overall !== null ? bands.overall.toFixed(1) : "chưa đủ dữ liệu"}
            </span>
          </span>
          <ExamBadge exam={exam} onOpenGoalModal={onOpenGoalModal} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SKILLS.map(({ key, label, Icon }) => {
          const b = bands[key];
          return (
            <div key={key} className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600">
                <Icon className="w-3.5 h-3.5 text-[#932120]" /> {label}
              </div>
              {b.band !== null ? (
                <div className="mt-1 text-2xl font-black text-zinc-900">{b.band.toFixed(1)}</div>
              ) : (
                <div className="mt-2 text-xs font-semibold text-zinc-500">Chưa đủ dữ liệu</div>
              )}
              <div className="mt-1 space-y-0.5 text-[11px] text-zinc-500">
                {b.low_confidence && <span className="block font-semibold text-amber-700">Độ tin cậy thấp</span>}
                {b.band !== null && (
                  <span className="block">
                    {b.source === "mock" ? "Thi thử" : "Luyện tập"} · {b.attempts_used} bài
                  </span>
                )}
                {b.target !== null && (
                  <span className="block">
                    Mục tiêu {b.target.toFixed(1)}
                    {b.gap !== null && b.gap > 0 && <> · còn thiếu {b.gap.toFixed(1)}</>}
                    {b.gap !== null && b.gap <= 0 && <> · đã đạt</>}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExamBadge({ exam, onOpenGoalModal }: { exam?: ExamCountdown; onOpenGoalModal: () => void }) {
  const text = !exam?.test_date
    ? "Chọn ngày thi của bạn"
    : exam.date_passed
    ? "Ngày thi đã qua · cập nhật ngày thi"
    : exam.days_left === 0
    ? "Thi hôm nay"
    : `Còn ${exam.days_left} ngày`;
  const clickable = !exam?.test_date || exam.date_passed;
  return (
    <button
      type="button"
      onClick={onOpenGoalModal}
      disabled={!clickable}
      className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-zinc-700 enabled:hover:border-[#932120] enabled:cursor-pointer"
    >
      <CalendarClock className="w-3.5 h-3.5 text-blue-600" /> {text}
    </button>
  );
}
