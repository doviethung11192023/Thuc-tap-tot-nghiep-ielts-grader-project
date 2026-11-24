// Lucian UX/UI Prompt #060 inspired · Dual Evaluation Band Compare Card (MIT adapted)
"use client";

import React from 'react';
import { Clock, GraduationCap, Sparkles } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { ExpertHelpfulnessWidget } from './ExpertHelpfulnessWidget';

interface DualEvaluationComparisonCardProps {
  attemptId?: string;
  aiBand?: number | null;
  expertBand?: number | null;
  expertFeedback?: string | null;
  expertReviewStatus?: string | null;
  expertReviewDueAt?: string | null;
  compact?: boolean;
}

function formatDueAtVn(isoStr?: string | null): string | null {
  if (!isoStr) return null;
  try {
    const dt = new Date(isoStr);
    if (isNaN(dt.getTime())) return null;
    return dt.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  } catch {
    return null;
  }
}

/**
 * BR-08 & FR-40: Hiển thị song song điểm AI chẩn đoán + Chuyên gia chính thức và mốc ETA dự kiến.
 */
export function DualEvaluationComparisonCard({
  attemptId,
  aiBand,
  expertBand,
  expertFeedback,
  expertReviewStatus,
  expertReviewDueAt,
  compact = false,
}: DualEvaluationComparisonCardProps) {
  const hasDual = typeof aiBand === 'number' && typeof expertBand === 'number';
  const etaText = formatDueAtVn(expertReviewDueAt);
  const isWaiting = expertReviewStatus === 'waiting' || expertReviewStatus === 'assigned';

  if (!hasDual && !(isWaiting && etaText)) {
    return null;
  }

  const delta = hasDual ? Number((expertBand - aiBand).toFixed(1)) : 0;
  const deltaText = delta > 0 ? `+${delta.toFixed(1)}` : delta < 0 ? delta.toFixed(1) : '0.0 (Khớp AI)';

  return (
    <section
      aria-label="Đối chiếu kết quả AI và Chuyên gia"
      className={`bg-white rounded-2xl border border-zinc-200 shadow-2xs ${compact ? 'p-4 space-y-3' : 'p-5 space-y-4'}`}
    >
      {isWaiting && etaText && !hasDual && (
        <div className="flex items-center gap-2.5 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 font-medium">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Dự kiến có kết quả Chuyên gia trước <strong className="font-bold">{etaText}</strong> (SLA 48h làm việc).
          </span>
        </div>
      )}

      {hasDual && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-zinc-900 uppercase tracking-wider">
              Đối chiếu Điểm AI Chẩn đoán &amp; Chuyên gia (BR-08)
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
              Chênh lệch: {deltaText}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-center space-y-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-600">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> AI Chẩn đoán
              </span>
              <div className="text-2xl font-black text-zinc-800 tabular-nums font-mono">
                <AnimatedNumber value={aiBand} decimals={1} />
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-200 overflow-hidden mt-1">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, (aiBand / 9) * 100))}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-center space-y-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-700" /> Chuyên gia Chính thức
              </span>
              <div className="text-2xl font-black text-[#932120] tabular-nums font-mono">
                <AnimatedNumber value={expertBand} decimals={1} />
              </div>
              <div className="w-full h-1.5 rounded-full bg-emerald-200 overflow-hidden mt-1">
                <div
                  className="h-full bg-[#932120] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, (expertBand / 9) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {!compact && expertFeedback && (
            <p className="text-xs text-zinc-700 bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 leading-relaxed">
              <strong className="text-emerald-900">Nhận xét Chuyên gia:</strong> {expertFeedback}
            </p>
          )}

          {!compact && attemptId && <ExpertHelpfulnessWidget attemptId={attemptId} />}
        </>
      )}
    </section>
  );
}
