"use client";

import React from "react";
import Link from "next/link";
import { Headphones, BookOpen, PenTool, Mic, Crown, Clock, RotateCcw, FileEdit, ChevronRight, Trophy } from "lucide-react";
import type { SkillDetailInTest } from "@/types/test-practice";

interface SkillItemCardProps {
  skillItem: SkillDetailInTest;
  testId: string;
  testTitle: string;
  returnUrl?: string;
  onOpenPrepModal: (skill: "Reading" | "Listening" | "Writing" | "Speaking") => void;
}

export function SkillItemCard({ skillItem, testId, testTitle, returnUrl, onOpenPrepModal }: SkillItemCardProps) {
  const isCompleted = skillItem.status === "completed";
  const isDraft = skillItem.status === "draft";
  const skillRoute = skillItem.skill.toLowerCase();

  const allBands = (skillItem.attempts || []).map((a) => a.bandScore).filter((b) => b !== undefined && b !== null);
  const highestScore = skillItem.highestBandScore !== undefined && skillItem.highestBandScore !== null
    ? skillItem.highestBandScore
    : allBands.length > 0 ? Math.max(...allBands) : (skillItem.latestBandScore ?? 0);
  const totalAttempts = skillItem.attempts?.length || 0;

  const formatSubmittedDate = (rawDate: string) => {
    if (!rawDate) return "Vừa xong";
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return rawDate;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes} • ${day}/${month}/${year}`;
    } catch {
      return rawDate;
    }
  };

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
      <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100">
        <div className="flex items-start sm:items-center gap-3.5">
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

            {isCompleted && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                  <Trophy className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  <span>Điểm cao nhất:</span>
                  <strong className="text-sm font-black text-[#932120]">{highestScore.toFixed(1)}</strong>
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-zinc-100 text-zinc-600">
                  <RotateCcw className="w-3 h-3 text-zinc-400" />
                  <span>Đã làm: <strong className="text-zinc-800">{totalAttempts} lần</strong></span>
                </span>

                {skillItem.latestBandScore !== undefined && skillItem.latestBandScore !== null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-zinc-100 text-zinc-600">
                    <span>Lần gần nhất: <strong className="text-zinc-800">{skillItem.latestBandScore.toFixed(1)}</strong></span>
                  </span>
                )}
              </div>
            )}

            {isDraft && (
              <p className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Đang có bản nháp lưu lúc {skillItem.draftTime || "hôm nay"}</span>
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 self-end md:self-center">
          {isCompleted ? (
            <button
              onClick={() => onOpenPrepModal(skillItem.skill)}
              className="h-9 px-4.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 text-xs font-bold transition-all flex items-center gap-2 shadow-2xs active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm lại</span>
            </button>
          ) : isDraft ? (
            <Link
              href={`/test-practice/${skillRoute}/${testId}${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
              className="h-9 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Tiếp tục làm bài</span>
            </Link>
          ) : (
            <button
              onClick={() => onOpenPrepModal(skillItem.skill)}
              className="h-9 px-6 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
            >
              <span>Làm bài</span>
            </button>
          )}
        </div>
      </div>

      {isCompleted && skillItem.attempts.length > 0 && (
        <div className="bg-zinc-50/60 p-4 sm:px-6 space-y-3">
          {skillItem.attempts.map((att) => {
            const isBest = att.bandScore === highestScore && highestScore > 0;
            return (
              <div
                key={att.id}
                className={`bg-white rounded-2xl border p-3.5 sm:px-4 flex items-center justify-between gap-4 shadow-2xs transition-all ${
                  isBest ? 'border-amber-300 ring-1 ring-amber-200/60 bg-amber-50/20' : 'border-zinc-200/80 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-full border font-black text-sm flex items-center justify-center shrink-0 ${
                    isBest ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs' : 'bg-emerald-100/80 border border-emerald-200 text-emerald-800'
                  }`}>
                    {att.bandScore.toFixed(1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-bold text-zinc-900">Làm bài lần {att.attemptNumber}</p>
                      {isBest && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                          <Trophy className="w-3 h-3 fill-amber-500 text-amber-600" />
                          <span>Điểm cao nhất</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 font-medium">Gửi bài lúc {formatSubmittedDate(att.submittedAt)}</p>
                  </div>
                </div>

                <Link
                  href={`/test-practice/${skillRoute}/${testId}/summary?attemptId=${att.id}${returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
                  className="text-xs font-bold text-[#932120] hover:underline flex items-center gap-1 group/link cursor-pointer"
                >
                  <span>Xem chi tiết</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
