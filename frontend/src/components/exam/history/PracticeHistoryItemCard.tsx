"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpen, Headphones, PenTool, Mic, Clock, ChevronRight, Trash2 } from "lucide-react";
import { SpotlightCard } from "@/components/motion";
import type { TimelineHistoryItem } from "@/services/practice-history-cache";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface PracticeHistoryItemCardProps {
  item: TimelineHistoryItem;
  /** Chỉ truyền cho bài luyện tập đang làm dở: xoá hẳn bài đó. */
  onDelete?: (attemptId: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  grading: "Đang chấm",
  grading_failed: "Lỗi chấm",
  no_speech: "Không có tiếng",
  waiting_expert: "Chờ C.Gia",
  scored: "Đã nộp",
};

export function PracticeHistoryItemCard({ item, onDelete }: PracticeHistoryItemCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
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

  const isScored = (item.status === "scored" || item.status === "waiting_expert") && item.band !== null;
  const hasRawOnly = item.status === "scored" && item.band === null && item.raw_score != null;
  const isOpen = item.status === "in_progress";
  const statusLabel = STATUS_LABELS[item.status] ?? "Đang làm";

  const resumeMode = item.mode === "mock" ? "exam" : "practice";

  // Bài đã nộp luôn mở trang kết quả, kể cả khi đang chấm: không đưa Learner về phòng thi.
  const targetUrl = !isOpen
    ? `/test-practice/${item.skill.toLowerCase()}/${item.test_id}/summary?attemptId=${item.id}&returnUrl=${encodeURIComponent('/test-practice/history')}`
    : `/test-practice/${item.skill.toLowerCase()}/${item.test_id}?mode=${resumeMode}`;

  return (
    <>
      <SpotlightCard
        tone="crimson"
        className="bg-[var(--ux-surface)] rounded-3xl border border-[var(--ux-line)] shadow-2xs hover:shadow-md hover:border-[#932120]/40 overflow-hidden"
      >
        <Link href={targetUrl} className="group block p-4 sm:p-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
        {/* Score Pill Left */}
        <div className={`w-14 h-12 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-xs transition-colors ${
          isScored
            ? (item.band ?? 0) >= 6.0
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : (item.band ?? 0) >= 4.0
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-rose-100 text-rose-800 border border-rose-300'
            : hasRawOnly
              ? ((item.raw_score ?? 0) / Math.max(1, item.total_questions || 1)) >= 0.65
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : ((item.raw_score ?? 0) / Math.max(1, item.total_questions || 1)) >= 0.4
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              : item.status === 'grading_failed'
                ? 'bg-red-100 text-red-700 border border-red-200 text-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 text-xs'
        }`}>
          {isScored ? (
            <>
              <span className="text-sm font-black leading-tight">{item.band?.toFixed(1)}</span>
              <span className="text-[9px] font-bold uppercase opacity-75">Band</span>
            </>
          ) : hasRawOnly ? (
            <>
              <span className="text-xs font-black leading-tight">{item.raw_score}/{item.total_questions || "?"}</span>
              <span className="text-[9px] font-bold uppercase opacity-75">Câu</span>
            </>
          ) : (
            <span className="text-[11px] font-bold text-center leading-tight">{statusLabel}</span>
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
            {item.status === "in_progress" && item.mode === "practice" && onDelete && (
              <button
                type="button"
                title="Xoá bài luyện tập làm dở"
                aria-label="Xoá bài luyện tập làm dở"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmOpen(true);
                }}
                className="ml-auto p-1.5 rounded-lg text-zinc-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <h4 className="font-bold text-[var(--ux-ink)] text-sm sm:text-base group-hover:text-[#932120] transition-colors line-clamp-1">
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
          <div className="w-8 h-8 rounded-full bg-zinc-50 group-hover:bg-rose-50 group-hover:text-[#932120] flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-[#932120]" />
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-400">
            <Clock className="w-3 h-3" />
            <span>{isOpen ? 'Bắt đầu lúc:' : 'Ngày làm bài:'} {formatDateTime(item.submitted_at)}</span>
          </div>
        </div>
      </div>

      {/* Mobile Date footer */}
      <div className="sm:hidden flex items-center gap-1 text-[11px] font-medium text-zinc-400 mt-2 pt-2 border-t border-zinc-100">
        <Clock className="w-3 h-3" />
        <span>{isOpen ? 'Bắt đầu lúc:' : 'Ngày làm bài:'} {formatDateTime(item.submitted_at)}</span>
      </div>
        </Link>
      </SpotlightCard>

      <ConfirmDialog
        open={confirmOpen}
        title="Xóa bài luyện tập làm dở?"
        description="Bài làm này chưa nộp và sẽ bị xóa hoàn toàn khỏi lịch sử luyện tập của bạn."
        confirmLabel="Xóa bài dở"
        tone="danger"
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete?.(item.id);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
