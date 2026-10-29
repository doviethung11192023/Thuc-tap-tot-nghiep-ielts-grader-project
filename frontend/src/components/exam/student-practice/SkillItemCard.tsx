"use client";

import React from "react";
import Link from "next/link";
import { Headphones, BookOpen, PenTool, Mic, Crown, Clock, RotateCcw, FileEdit, ChevronRight } from "lucide-react";
import type { SkillDetailInTest } from "@/types/test-practice";

interface SkillItemCardProps {
  skillItem: SkillDetailInTest;
  testId: string;
  testTitle: string;
  onOpenPrepModal: (skill: "Reading" | "Listening" | "Writing" | "Speaking") => void;
}

export function SkillItemCard({ skillItem, testId, testTitle, onOpenPrepModal }: SkillItemCardProps) {
  const isCompleted = skillItem.status === "completed";
  const isDraft = skillItem.status === "draft";
  const skillRoute = skillItem.skill.toLowerCase();

  const getSkillIcon = (skill: string) => {
    switch (skill) {
      case "Listening": return <Headphones className="w-5 h-5 text-[#932120]" />;
      case "Writing": return <PenTool className="w-5 h-5 text-[#932120]" />;
      case "Speaking": return <Mic className="w-5 h-5 text-[#932120]" />;
      default: return <BookOpen className="w-5 h-5 text-[#932120]" />;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xs overflow-hidden transition-all hover:border-zinc-300">
      <div className="p-5 sm:p-6 flex items-center justify-between gap-4 border-b border-zinc-100">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
            {getSkillIcon(skillItem.skill)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">{skillItem.skill}</h3>
              {skillItem.hasVirtualRoom && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                  <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>Virtual {skillItem.skill} Room</span>
                </span>
              )}
            </div>
            {isDraft && (
              <p className="text-xs text-amber-600 font-semibold mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Đang có bản nháp lưu lúc {skillItem.draftTime || "hôm nay"}</span>
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {isCompleted ? (
            <button
              onClick={() => onOpenPrepModal(skillItem.skill)}
              className="h-9 px-4.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 text-xs font-bold transition-all flex items-center gap-2 shadow-2xs active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm lại</span>
            </button>
          ) : isDraft ? (
            <Link
              href={`/test-practice/${skillRoute}/${testId}`}
              className="h-9 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs active:scale-95"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Tiếp tục làm bài</span>
            </Link>
          ) : (
            <button
              onClick={() => onOpenPrepModal(skillItem.skill)}
              className="h-9 px-6 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs active:scale-95"
            >
              <span>Làm bài</span>
            </button>
          )}
        </div>
      </div>

      {isCompleted && skillItem.attempts.length > 0 && (
        <div className="bg-zinc-50/60 p-4 sm:px-6 space-y-3">
          {skillItem.attempts.map((att) => (
            <div
              key={att.id}
              className="bg-white rounded-2xl border border-zinc-200/80 p-3.5 sm:px-4 flex items-center justify-between gap-4 shadow-2xs hover:border-zinc-300 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0">
                  {att.bandScore.toFixed(1)}
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-zinc-900">Làm bài lần {att.attemptNumber}</p>
                  <p className="text-[11px] text-zinc-500 font-medium">Gửi bài lúc {att.submittedAt}</p>
                </div>
              </div>

              <Link
                href={`/test-practice/${skillRoute}/${testId}/summary?attemptId=${att.id}`}
                className="text-xs font-bold text-[#932120] hover:underline flex items-center gap-1 group/link"
              >
                <span>Xem chi tiết</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
